// Controlador do editor de imagens: estado das ferramentas, visualização (zoom/pan), eventos de ponteiro
// (mouse, caneta e toque, com pinça para zoom), render da tela e comandos (copiar/colar, seleção, camadas).
import { doc, Layer } from './doc.svelte.ts';
import type { Box, Rect, SelectMode, ShapeData, TextData, ToolId, VectorData, WandOptions, LayerInit } from './types.ts';
import { defaultWand, defaultEffects } from './types.ts';
import { makeCanvas, ctx2d, cloneCanvas, readPixels, normRect, intersect, contentBounds, checkerPattern, applyBox, boxCorners, toBoxLocal, canvasToBlob, unionRect, fitTextBox } from './render.ts';
import { clipToSelection } from './selection.ts';
import { colors, toCss, toHex, type RGBA } from './colors.svelte.ts';
import { dragHandle, hitHandle, handlePoints, normalizeBox, HANDLE_CURSOR, type Handle } from './transform.ts';
import { runWand, withJob, isAbort, stopOps } from './jobs.svelte.ts';
import { t, type MessageKey } from '#lib/i18n/index.svelte.ts';

export type Pt = { x: number; y: number };
type Action = { move?: (p: Pt, e: PointerEvent) => void; up?: (p: Pt, e: PointerEvent) => void; cancel?: () => void };
type Floating = { layer: Layer; src: HTMLCanvasElement; mask: HTMLCanvasElement | null; box: Box; start: Box };
export type Toast = { kind: 'ok' | 'info' | 'error'; text: string; action?: { label: string; run: () => void } };
export type Dialog =
	| { kind: 'new' }
	| { kind: 'resize' }
	| { kind: 'canvas' }
	| { kind: 'export' }
	| { kind: 'filter'; id: string }
	| { kind: 'number'; title: string; label: string; value: number; min: number; max: number; unit?: string; run: (v: number) => void }
	| { kind: 'ai'; model: 'sam' | 'modnet' | 'rmbg'; resolve: (ok: boolean) => void }
	| { kind: 'shortcuts' };
export type Sheet = null | 'menu' | 'layers' | 'colors' | 'props' | 'history' | 'options';
export type WandEngine = 'classic' | 'sam' | 'subject';

const HISTORY_PROPS_MS = 900;
const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);

class Editor {
	// ----- Ferramenta e opções -----
	tool = $state<ToolId>('brush');
	selectMode = $state<SelectMode>('replace');
	selectFeather = $state(0);
	selectAntialias = $state(true);
	brush = $state({ size: 16, hardness: 0.85, opacity: 1, flow: 1, smoothing: 0.35, pressure: true });
	eraser = $state({ size: 32, hardness: 0.85, opacity: 1 });
	cloneOpts = $state({ size: 32, hardness: 0.6, opacity: 1, sampleAll: false });
	cloneSource = $state<Pt | null>(null);
	cloneSetting = $state(false);
	fillOpts = $state({ tolerance: 24, contiguous: true, sampleAll: false, antialias: true });
	gradient = $state({ type: 'linear' as 'linear' | 'radial' | 'conic' | 'reflected', toTransparent: false, reverse: false });
	wand = $state<WandOptions>(defaultWand());
	wandSample = $state<'layer' | 'image'>('layer');
	wandEngine = $state<WandEngine>('classic');
	aiDevice = $state<'auto' | 'webgpu' | 'wasm'>('auto');
	aiMatteModel = $state<'modnet' | 'rmbg'>('modnet');
	samPoints = $state<{ x: number; y: number; label: 0 | 1 }[]>([]);
	pickerSample = $state<'layer' | 'image'>('image');
	pickerSize = $state(1);
	shape = $state({ kind: 'rect' as ShapeData['shape'], mode: 'fill' as 'fill' | 'stroke' | 'both', strokeWidth: 6, radius: 24, sides: 5, inner: 0.5, dash: false });
	text = $state({ font: 'Inter, system-ui, sans-serif', size: 72, weight: 800, italic: false, align: 'left' as TextData['align'] });
	cropAspect = $state<'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16' | '4:5'>('free');
	cropBox = $state<Box | null>(null);
	moveMode = $state<'pixels' | 'selection'>('pixels');

	// ----- Visualização -----
	zoom = $state(1);
	panX = $state(0);
	panY = $state(0);
	viewW = $state(0);
	viewH = $state(0);
	pixelGrid = $state(true);
	cursor = $state<Pt | null>(null);
	hoverCursor = $state('default');
	spaceDown = $state(false);

	// ----- UI -----
	toast = $state<Toast | null>(null);
	dialog = $state<Dialog | null>(null);
	sheet = $state<Sheet>(null);
	textEditing = $state<string | null>(null);
	hasFloating = $state(false);
	busy = $state(false);
	lastFilter = $state<{ id: string; params: Record<string, number | string | boolean> } | null>(null);
	/** Prévia de filtro: a camada é desenhada com este canvas no lugar. */
	filterPreview: { layer: Layer; canvas: HTMLCanvasElement } | null = null;

	// ----- Interno -----
	private base: HTMLCanvasElement | null = null;
	private overlay: HTMLCanvasElement | null = null;
	private comp: HTMLCanvasElement | null = null;
	private dpr = 1;
	private compDirty = true;
	private frame = 0;
	private overlayOnly = false;
	private action: Action | null = null;
	private live: { layer: Layer; draw: (ctx: CanvasRenderingContext2D) => void } | null = null;
	private floating: Floating | null = null;
	private pointers = new Map<number, Pt>();
	private pinch: { d: number; zoom: number; mid: Pt; panX: number; panY: number } | null = null;
	private panDrag: { sx: number; sy: number; px: number; py: number } | null = null;
	private actionStartedAt = 0;
	private selPreview: { kind: 'rect' | 'ellipse'; r: Rect } | null = null;
	private lassoPts: Pt[] | null = null;
	private gradLine: [Pt, Pt] | null = null;
	private antsPhase = 0;
	private antsTimer: ReturnType<typeof setInterval> | undefined;
	private toastTimer: ReturnType<typeof setTimeout> | undefined;
	private propsAt = 0;
	private propsLabel = '';
	private clip: { canvas: HTMLCanvasElement; x: number; y: number } | null = null;
	private aiOk = false;

	// =============== Montagem e render ===============

	attach(base: HTMLCanvasElement, overlay: HTMLCanvasElement) {
		this.base = base;
		this.overlay = overlay;
		this.comp = makeCanvas(1, 1);
		this.antsTimer = setInterval(() => {
			if (doc.selection.outline && !this.floating && doc.selection.segments < 200000) {
				this.antsPhase = (this.antsPhase + 1) % 8;
				this.requestRender(true);
			}
		}, 140);
		this.requestRender();
	}

	detach() {
		clearInterval(this.antsTimer);
		cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.base = this.overlay = null;
	}

	setViewSize(w: number, h: number, dpr: number) {
		const first = !this.viewW;
		this.viewW = w;
		this.viewH = h;
		this.dpr = dpr;
		for (const c of [this.base, this.overlay]) {
			if (!c) continue;
			c.width = Math.max(1, Math.round(w * dpr));
			c.height = Math.max(1, Math.round(h * dpr));
		}
		if (first) this.fit();
		this.requestRender();
	}

	/** Conteúdo mudou (recompõe as camadas). */
	invalidate() {
		this.compDirty = true;
		this.requestRender();
	}

	requestRender(overlayOnly = false) {
		if (!overlayOnly) this.overlayOnly = false;
		else if (!this.frame) this.overlayOnly = true;
		if (this.frame || typeof requestAnimationFrame === 'undefined') return;
		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			if (!this.overlayOnly) this.renderBase();
			this.renderOverlay();
			this.overlayOnly = false;
		});
	}

	private hook = (l: Layer, ctx: CanvasRenderingContext2D) => {
		if (this.filterPreview?.layer === l) {
			ctx.drawImage(this.filterPreview.canvas, 0, 0);
			return true;
		}
		if (this.live?.layer === l) {
			this.live.draw(ctx);
			return true;
		}
		return false;
	};

	private renderBase() {
		const cv = this.base, comp = this.comp;
		if (!cv || !comp) return;
		const c = ctx2d(cv);
		const z = this.zoom;
		c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		c.clearRect(0, 0, this.viewW, this.viewH);
		if (!doc.width) return;
		if (this.compDirty || comp.width !== doc.width || comp.height !== doc.height) {
			if (comp.width !== doc.width || comp.height !== doc.height) {
				comp.width = doc.width;
				comp.height = doc.height;
			}
			const cc = ctx2d(comp);
			cc.clearRect(0, 0, comp.width, comp.height);
			doc.composite(cc, this.hook);
			this.compDirty = false;
		}
		c.save();
		c.translate(Math.round(this.panX), Math.round(this.panY));
		c.shadowColor = 'rgb(0 0 0 / 0.45)';
		c.shadowBlur = 24;
		c.fillStyle = checkerPattern(c);
		c.fillRect(0, 0, doc.width * z, doc.height * z);
		c.shadowColor = 'transparent';
		c.scale(z, z);
		c.imageSmoothingEnabled = z < 2;
		c.imageSmoothingQuality = 'high';
		c.drawImage(comp, 0, 0);
		if (this.pixelGrid && z >= 10) {
			c.beginPath();
			c.lineWidth = 1 / z;
			c.strokeStyle = 'rgb(128 128 128 / 0.35)';
			const x0 = Math.max(0, Math.floor(-this.panX / z)), x1 = Math.min(doc.width, Math.ceil((this.viewW - this.panX) / z));
			const y0 = Math.max(0, Math.floor(-this.panY / z)), y1 = Math.min(doc.height, Math.ceil((this.viewH - this.panY) / z));
			for (let x = x0; x <= x1; x++) { c.moveTo(x, y0); c.lineTo(x, y1); }
			for (let y = y0; y <= y1; y++) { c.moveTo(x0, y); c.lineTo(x1, y); }
			c.stroke();
		}
		c.restore();
	}

	private sx = (x: number) => this.panX + x * this.zoom;
	private sy = (y: number) => this.panY + y * this.zoom;

	private renderOverlay() {
		const cv = this.overlay;
		if (!cv) return;
		const c = ctx2d(cv);
		const z = this.zoom;
		c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		c.clearRect(0, 0, this.viewW, this.viewH);
		if (!doc.width) return;
		const docSpace = (fn: () => void) => {
			c.save();
			c.translate(this.panX, this.panY);
			c.scale(z, z);
			fn();
			c.restore();
		};
		// Seleção (formigas).
		const sel = doc.selection;
		if (sel.outline && !this.floating) {
			docSpace(() => {
				c.lineWidth = 1 / z;
				c.setLineDash([4 / z, 4 / z]);
				c.strokeStyle = '#000';
				c.lineDashOffset = -this.antsPhase / z;
				c.stroke(sel.outline!);
				c.strokeStyle = '#fff';
				c.lineDashOffset = -(this.antsPhase + 4) / z;
				c.stroke(sel.outline!);
			});
		}
		// Prévia de seleção retangular/elíptica e laço.
		const dashed = (draw: () => void) => {
			c.save();
			c.lineWidth = 1;
			c.setLineDash([5, 4]);
			c.strokeStyle = '#000';
			draw();
			c.stroke();
			c.strokeStyle = '#fff';
			c.lineDashOffset = 5;
			c.stroke();
			c.restore();
		};
		if (this.selPreview) {
			const r = this.selPreview.r;
			dashed(() => {
				c.beginPath();
				if (this.selPreview!.kind === 'rect') c.rect(this.sx(r.x) + 0.5, this.sy(r.y) + 0.5, r.w * z, r.h * z);
				else c.ellipse(this.sx(r.x + r.w / 2), this.sy(r.y + r.h / 2), (r.w * z) / 2, (r.h * z) / 2, 0, 0, Math.PI * 2);
			});
			this.sizeLabel(c, `${Math.round(r.w)} × ${Math.round(r.h)}`, this.sx(r.x + r.w), this.sy(r.y + r.h));
		}
		if (this.lassoPts && this.lassoPts.length > 1) {
			dashed(() => {
				c.beginPath();
				this.lassoPts!.forEach((p, i) => (i ? c.lineTo(this.sx(p.x), this.sy(p.y)) : c.moveTo(this.sx(p.x), this.sy(p.y))));
			});
		}
		// Recorte: escurece fora e mostra regra dos terços.
		if (this.tool === 'crop' && this.cropBox) {
			const b = normalizeBox(this.cropBox);
			c.save();
			c.fillStyle = 'rgb(0 0 0 / 0.55)';
			c.beginPath();
			c.rect(0, 0, this.viewW, this.viewH);
			c.rect(this.sx(b.x), this.sy(b.y), b.w * z, b.h * z);
			c.fill('evenodd');
			c.strokeStyle = 'rgb(255 255 255 / 0.35)';
			c.lineWidth = 1;
			c.beginPath();
			for (let i = 1; i < 3; i++) {
				c.moveTo(this.sx(b.x + (b.w * i) / 3), this.sy(b.y));
				c.lineTo(this.sx(b.x + (b.w * i) / 3), this.sy(b.y + b.h));
				c.moveTo(this.sx(b.x), this.sy(b.y + (b.h * i) / 3));
				c.lineTo(this.sx(b.x + b.w), this.sy(b.y + (b.h * i) / 3));
			}
			c.stroke();
			c.restore();
			this.drawHandles(c, b, false);
			this.sizeLabel(c, `${Math.round(b.w)} × ${Math.round(b.h)}`, this.sx(b.x + b.w), this.sy(b.y + b.h));
		}
		// Caixa de transformação (pixels flutuantes ou camada vetorial).
		const tb = this.transformBox();
		if (tb) this.drawHandles(c, tb, true);
		// Gradiente.
		if (this.gradLine) {
			const [a, b] = this.gradLine;
			c.save();
			c.lineWidth = 2;
			c.strokeStyle = '#fff';
			c.shadowColor = '#000';
			c.shadowBlur = 3;
			c.beginPath();
			c.moveTo(this.sx(a.x), this.sy(a.y));
			c.lineTo(this.sx(b.x), this.sy(b.y));
			c.stroke();
			for (const p of [a, b]) {
				c.beginPath();
				c.arc(this.sx(p.x), this.sy(p.y), 6, 0, Math.PI * 2);
				c.fillStyle = p === a ? colors.primaryCss : colors.secondaryCss;
				c.fill();
				c.stroke();
			}
			c.restore();
		}
		// Pontos da IA (Segment Anything).
		if (this.tool === 'wand' && this.wandEngine === 'sam') {
			for (const p of this.samPoints) {
				c.beginPath();
				c.arc(this.sx(p.x), this.sy(p.y), 7, 0, Math.PI * 2);
				c.fillStyle = p.label ? '#3ddc97' : '#ff5c6c';
				c.strokeStyle = '#fff';
				c.lineWidth = 2;
				c.fill();
				c.stroke();
			}
		}
		// Origem do carimbo.
		if (this.tool === 'clone' && this.cloneSource) {
			const x = this.sx(this.cloneSource.x), y = this.sy(this.cloneSource.y);
			c.save();
			c.strokeStyle = '#fff';
			c.shadowColor = '#000';
			c.shadowBlur = 2;
			c.beginPath();
			c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.moveTo(x, y - 8); c.lineTo(x, y + 8);
			c.stroke();
			c.restore();
		}
		// Cursor do pincel.
		const size = this.tool === 'brush' ? this.brush.size : this.tool === 'eraser' ? this.eraser.size : this.tool === 'clone' ? this.cloneOpts.size : 0;
		if (size && this.cursor && !this.pinch) {
			c.save();
			c.beginPath();
			c.arc(this.sx(this.cursor.x), this.sy(this.cursor.y), Math.max(1.5, (size * z) / 2), 0, Math.PI * 2);
			c.lineWidth = 1;
			c.strokeStyle = 'rgb(0 0 0 / 0.8)';
			c.stroke();
			c.beginPath();
			c.arc(this.sx(this.cursor.x), this.sy(this.cursor.y), Math.max(0.5, (size * z) / 2 - 1), 0, Math.PI * 2);
			c.strokeStyle = 'rgb(255 255 255 / 0.9)';
			c.stroke();
			c.restore();
		}
	}

	private sizeLabel(c: CanvasRenderingContext2D, text: string, x: number, y: number) {
		c.save();
		c.font = '600 11px Inter, system-ui, sans-serif';
		const w = c.measureText(text).width + 12;
		const px = Math.min(this.viewW - w - 4, x + 8), py = Math.min(this.viewH - 24, y + 8);
		c.fillStyle = 'rgb(12 14 20 / 0.85)';
		c.beginPath();
		c.roundRect(px, py, w, 20, 6);
		c.fill();
		c.fillStyle = '#fff';
		c.fillText(text, px + 6, py + 14);
		c.restore();
	}

	private drawHandles(c: CanvasRenderingContext2D, b: Box, rotate: boolean) {
		const pts = boxCorners(b).map(([x, y]) => [this.sx(x), this.sy(y)]);
		c.save();
		c.lineWidth = 1.5;
		c.strokeStyle = '#dd206b';
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.stroke();
		const touch = matchMedia('(pointer: coarse)').matches;
		const r = touch ? 7 : 5;
		for (const h of handlePoints(b, this.rotateOffset())) {
			if (h.h === 'rotate' && !rotate) continue;
			const x = this.sx(h.x), y = this.sy(h.y);
			if (h.h === 'rotate') {
				const n = handlePoints(b, 0).find((p) => p.h === 'n')!;
				c.beginPath();
				c.moveTo(this.sx(n.x), this.sy(n.y));
				c.lineTo(x, y);
				c.stroke();
			}
			c.beginPath();
			if (h.h === 'rotate') c.arc(x, y, r + 1, 0, Math.PI * 2);
			else c.rect(x - r, y - r, r * 2, r * 2);
			c.fillStyle = '#fff';
			c.fill();
			c.stroke();
		}
		c.restore();
	}

	private rotateOffset() {
		return 28 / this.zoom;
	}

	private handleTol() {
		const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
		return (touch ? 18 : 9) / this.zoom;
	}

	/** Caixa de transformação ativa: pixels flutuantes, ou camada vetorial com move/forma/texto. */
	transformBox(): Box | null {
		if (this.floating) return this.floating.box;
		const l = doc.active;
		if (l?.vector && l.visible && (this.tool === 'move' || (this.tool === 'shape' && l.vector.type === 'shape') || (this.tool === 'text' && l.vector.type === 'text'))) {
			if (l.vector.type === 'text') fitTextBox(l.vector);
			return l.vector;
		}
		return null;
	}

	// =============== Visualização ===============

	toDoc(sx: number, sy: number): Pt {
		return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
	}

	fit() {
		if (!doc.width || !this.viewW) return;
		const pad = this.viewW < 600 ? 16 : 48;
		const z = Math.min((this.viewW - pad * 2) / doc.width, (this.viewH - pad * 2) / doc.height, 8);
		this.zoom = Math.max(0.01, z);
		this.center();
	}

	center() {
		this.panX = (this.viewW - doc.width * this.zoom) / 2;
		this.panY = (this.viewH - doc.height * this.zoom) / 2;
		this.requestRender();
	}

	actualSize() {
		this.zoomAt(this.viewW / 2, this.viewH / 2, 1);
	}

	zoomAt(sx: number, sy: number, z: number) {
		z = Math.min(64, Math.max(0.02, z));
		this.panX = sx - ((sx - this.panX) * z) / this.zoom;
		this.panY = sy - ((sy - this.panY) * z) / this.zoom;
		this.zoom = z;
		this.requestRender();
	}

	zoomStep(dir: 1 | -1, sx = this.viewW / 2, sy = this.viewH / 2) {
		const steps = [0.02, 0.05, 0.1, 0.125, 0.167, 0.25, 0.333, 0.5, 0.667, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32, 48, 64];
		const z = this.zoom;
		const next = dir > 0 ? steps.find((s) => s > z * 1.001) : [...steps].reverse().find((s) => s < z * 0.999);
		this.zoomAt(sx, sy, next ?? z);
	}

	wheel(e: WheelEvent, sx: number, sy: number) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
			this.zoomAt(sx, sy, this.zoom * f);
		} else {
			const k = e.deltaMode === 1 ? 16 : 1;
			this.panX -= (e.shiftKey ? e.deltaY : e.deltaX) * k;
			this.panY -= (e.shiftKey ? 0 : e.deltaY) * k;
			this.requestRender();
		}
	}

	// =============== Ponteiro ===============

	private modeFrom(e: PointerEvent | MouseEvent): SelectMode {
		if (e.shiftKey && e.altKey) return 'intersect';
		if (e.shiftKey || ((e.ctrlKey || e.metaKey) && !isMac)) return 'add';
		if (e.altKey) return 'subtract';
		return this.selectMode;
	}

	pointerDown(e: PointerEvent, sx: number, sy: number) {
		this.pointers.set(e.pointerId, { x: sx, y: sy });
		// Segundo dedo: cancela o que o primeiro começou e vira pinça (zoom + pan).
		if (this.pointers.size === 2 && e.pointerType === 'touch') {
			if (this.action) {
				this.action.cancel?.();
				this.action = null;
			}
			const [a, b] = [...this.pointers.values()];
			this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, panX: this.panX, panY: this.panY };
			return;
		}
		if (this.pointers.size > 1) return;
		if (e.button === 1 || this.spaceDown || this.tool === 'hand') {
			this.panDrag = { sx, sy, px: this.panX, py: this.panY };
			this.hoverCursor = 'grabbing';
			return;
		}
		if (e.button !== 0 && e.button !== 2) return;
		const p = this.toDoc(sx, sy);
		this.actionStartedAt = performance.now();
		this.action = this.startTool(p, e) ?? null;
		this.requestRender(true);
	}

	pointerMove(e: PointerEvent, sx: number, sy: number) {
		if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: sx, y: sy });
		if (this.pinch && this.pointers.size >= 2) {
			const [a, b] = [...this.pointers.values()];
			const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
			const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
			const z = Math.min(64, Math.max(0.02, this.pinch.zoom * (d / this.pinch.d)));
			// Mantém o ponto do documento sob o centro da pinça.
			const docX = (this.pinch.mid.x - this.pinch.panX) / this.pinch.zoom, docY = (this.pinch.mid.y - this.pinch.panY) / this.pinch.zoom;
			this.zoom = z;
			this.panX = mid.x - docX * z;
			this.panY = mid.y - docY * z;
			this.requestRender();
			return;
		}
		if (this.panDrag) {
			this.panX = this.panDrag.px + (sx - this.panDrag.sx);
			this.panY = this.panDrag.py + (sy - this.panDrag.sy);
			this.requestRender();
			return;
		}
		const p = this.toDoc(sx, sy);
		this.cursor = e.pointerType === 'touch' && !this.action ? null : p;
		if (this.action?.move) {
			// Eventos combinados (caneta/mouse de alta frequência): traço mais fiel.
			const evs = this.action && 'getCoalescedEvents' in e && (this.tool === 'brush' || this.tool === 'eraser' || this.tool === 'clone') ? e.getCoalescedEvents() : [];
			if (evs.length > 1) {
				const rect = (e.target as HTMLElement).getBoundingClientRect();
				for (const ce of evs) this.action.move(this.toDoc(ce.clientX - rect.left, ce.clientY - rect.top), ce);
			} else this.action.move(p, e);
		} else this.updateHoverCursor(p, e);
		this.requestRender(true);
	}

	pointerUp(e: PointerEvent, sx: number, sy: number) {
		this.pointers.delete(e.pointerId);
		if (this.pinch) {
			if (this.pointers.size < 2) this.pinch = null;
			return;
		}
		if (this.panDrag) {
			this.panDrag = null;
			this.hoverCursor = this.tool === 'hand' || this.spaceDown ? 'grab' : 'default';
			return;
		}
		const a = this.action;
		this.action = null;
		if (a?.up) a.up(this.toDoc(sx, sy), e);
		if (e.pointerType === 'touch') this.cursor = null;
		this.requestRender(true);
	}

	pointerCancel(e: PointerEvent) {
		this.pointers.delete(e.pointerId);
		if (this.pointers.size < 2) this.pinch = null;
		this.panDrag = null;
		if (this.action) {
			this.action.cancel?.();
			this.action = null;
		}
	}

	pointerLeave() {
		this.cursor = null;
		this.requestRender(true);
	}

	private updateHoverCursor(p: Pt, e: PointerEvent) {
		if (this.spaceDown || this.tool === 'hand') return void (this.hoverCursor = 'grab');
		const tb = this.transformBox() ?? (this.tool === 'crop' && this.cropBox ? normalizeBox(this.cropBox) : null);
		if (tb) {
			const h = hitHandle(tb, p.x, p.y, this.handleTol(), this.rotateOffset(), this.tool !== 'crop');
			if (h) return void (this.hoverCursor = HANDLE_CURSOR[h]);
		}
		const map: Partial<Record<ToolId, string>> = {
			'select-rect': 'crosshair', 'select-ellipse': 'crosshair', 'select-lasso': 'crosshair', wand: 'crosshair', crop: 'crosshair',
			brush: 'none', eraser: 'none', clone: this.cloneSetting || e.altKey ? 'copy' : 'none', fill: 'cell', gradient: 'crosshair', picker: 'crosshair',
			text: 'text', shape: 'crosshair', zoom: e.altKey ? 'zoom-out' : 'zoom-in', move: 'move'
		};
		this.hoverCursor = map[this.tool] ?? 'default';
	}

	// =============== Ferramentas ===============

	setTool(t: ToolId) {
		if (t === this.tool) return;
		this.commitFloating();
		this.finishText();
		if (this.tool === 'wand') this.samPoints = [];
		this.tool = t;
		if (t === 'crop') this.cropBox = doc.selection.bounds ? { ...doc.selection.bounds, rotation: 0 } : { x: 0, y: 0, w: doc.width, h: doc.height, rotation: 0 };
		else this.cropBox = null;
		this.hoverCursor = 'default';
		this.requestRender(true);
	}

	private startTool(p: Pt, e: PointerEvent): Action | void {
		switch (this.tool) {
			case 'select-rect':
			case 'select-ellipse':
				return this.selectShapeAction(p, e);
			case 'select-lasso':
				return this.lassoAction(p, e);
			case 'wand':
				return void this.wandClick(p, this.modeFrom(e));
			case 'move':
				return this.moveAction(p, e);
			case 'brush':
			case 'eraser':
			case 'clone':
				return this.strokeAction(p, e);
			case 'fill':
				return void this.bucket(p, e.button === 2);
			case 'gradient':
				return this.gradientAction(p, e);
			case 'picker':
				return void this.pick(p, e.button === 2 || e.altKey ? 'secondary' : 'primary');
			case 'text':
				return this.textAction(p, e);
			case 'shape':
				return this.shapeAction(p, e);
			case 'crop':
				return this.cropAction(p, e);
			case 'zoom':
				return void this.zoomStep(e.altKey || e.button === 2 ? -1 : 1, this.sx(p.x), this.sy(p.y));
		}
	}

	// ----- Seleção retangular / elíptica -----

	private selectShapeAction(p0: Pt, e: PointerEvent): Action {
		const mode = this.modeFrom(e);
		const kind = this.tool === 'select-ellipse' ? 'ellipse' : 'rect';
		this.commitFloating();
		return {
			move: (p, ev) => {
				let x1 = p.x, y1 = p.y;
				if (ev.shiftKey && mode !== 'add' && mode !== 'intersect') {
					const s = Math.max(Math.abs(x1 - p0.x), Math.abs(y1 - p0.y));
					x1 = p0.x + Math.sign(x1 - p0.x || 1) * s;
					y1 = p0.y + Math.sign(y1 - p0.y || 1) * s;
				}
				const r = normRect(Math.round(p0.x), Math.round(p0.y), Math.round(x1), Math.round(y1));
				this.selPreview = { kind, r };
			},
			up: () => {
				const pr = this.selPreview;
				this.selPreview = null;
				if (!pr || pr.r.w < 1 || pr.r.h < 1) {
					if (mode === 'replace') this.deselect();
					return;
				}
				const r = pr.r;
				this.selectionEdit(() =>
					doc.selection.apply(mode, (c) => {
						if (this.selectFeather) c.filter = `blur(${this.selectFeather}px)`;
						c.beginPath();
						if (kind === 'rect') c.rect(r.x, r.y, r.w, r.h);
						else c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
						c.fill();
					})
				);
				if (!this.selectAntialias && !this.selectFeather) doc.selection.harden();
			},
			cancel: () => (this.selPreview = null)
		};
	}

	private lassoAction(p0: Pt, e: PointerEvent): Action {
		const mode = this.modeFrom(e);
		this.commitFloating();
		this.lassoPts = [p0];
		return {
			move: (p) => {
				const last = this.lassoPts![this.lassoPts!.length - 1];
				if (Math.hypot(p.x - last.x, p.y - last.y) * this.zoom >= 2) this.lassoPts!.push(p);
			},
			up: () => {
				const pts = this.lassoPts ?? [];
				this.lassoPts = null;
				if (pts.length < 3) {
					if (mode === 'replace') this.deselect();
					return;
				}
				this.selectionEdit(() =>
					doc.selection.apply(mode, (c) => {
						if (this.selectFeather) c.filter = `blur(${this.selectFeather}px)`;
						c.beginPath();
						pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
						c.closePath();
						c.fill();
					})
				);
				if (!this.selectAntialias && !this.selectFeather) doc.selection.harden();
			},
			cancel: () => (this.lassoPts = null)
		};
	}

	/** Mudança de seleção com histórico. */
	selectionEdit(fn: () => void, label: MessageKey = 'image.hist.select') {
		doc.history(t(label), { layers: [], selection: true });
		fn();
		doc.selectionChanged();
		this.invalidate();
	}

	// ----- Varinha mágica (clássica e IA) -----

	private sampleCanvas(which: 'layer' | 'image'): HTMLCanvasElement | null {
		if (which === 'image') return doc.flattened();
		return doc.active?.output() ?? null;
	}

	async wandClick(p: Pt, mode: SelectMode) {
		const x = Math.floor(p.x), y = Math.floor(p.y);
		if (this.wandEngine === 'classic' && (x < 0 || y < 0 || x >= doc.width || y >= doc.height)) return;
		this.commitFloating();
		if (this.wandEngine === 'sam') return this.samClick(p, mode);
		if (this.wandEngine === 'subject') return this.selectSubject(mode);
		const src = this.sampleCanvas(this.wandSample);
		if (!src) return;
		try {
			const img = readPixels(src);
			const alpha = await withJob(t('image.job.wand'), (prog) => runWand(img, x, y, $state.snapshot(this.wand) as WandOptions, (v) => prog(v)));
			this.selectionEdit(() => doc.selection.applyAlpha(mode, alpha), 'image.hist.wand');
		} catch (err) {
			this.jobError(err);
		}
	}

	private samBase: HTMLCanvasElement | null = null;
	private samMode: SelectMode = 'replace';

	private async samClick(p: Pt, mode: SelectMode) {
		if (p.x < 0 || p.y < 0 || p.x >= doc.width || p.y >= doc.height) return;
		if (!(await this.confirmAi('sam'))) return;
		if (!this.samPoints.length) {
			this.samBase = doc.selection.snapshot();
			this.samMode = mode === 'subtract' ? 'replace' : mode;
		}
		const label: 0 | 1 = mode === 'subtract' ? 0 : 1;
		this.samPoints = [...this.samPoints, { x: p.x, y: p.y, label }];
		await this.runSam();
	}

	async runSam() {
		if (!this.samPoints.length) return;
		const src = this.sampleCanvas('image');
		if (!src) return;
		try {
			const ml = await import('./ml.ts');
			const img = readPixels(src);
			const key = `${doc.rev}:${doc.width}x${doc.height}`;
			const points = $state.snapshot(this.samPoints) as { x: number; y: number; label: 0 | 1 }[];
			const res = await withJob(t('imageAi.models.sam.title'), (prog) => ml.segmentPoints(img, points, { imageKey: this.samKey ?? (this.samKey = key), device: this.aiDevice, onProgress: (q) => prog(q.value, t(`imageAi.stage.${q.stage}`)) }), () => ml.mlStop(), 0);
			const base = this.samBase;
			this.selectionEdit(() => {
				doc.selection.restore(base);
				doc.selection.applyAlpha(this.samMode, res.alpha);
			}, 'image.hist.aiSelect');
			this.notify('ok', t('imageAi.done', { ms: Math.round(res.ms) }));
		} catch (err) {
			this.samPoints = this.samPoints.slice(0, -1);
			this.jobError(err);
		}
	}

	private samKey: string | null = null;

	resetSam() {
		this.samPoints = [];
		this.samKey = null;
		this.samBase = null;
		this.requestRender(true);
	}

	async selectSubject(mode: SelectMode = 'replace') {
		const alpha = await this.matte();
		if (alpha) this.selectionEdit(() => doc.selection.applyAlpha(mode, alpha), 'image.hist.aiSelect');
	}

	/** Remove o fundo da camada ativa usando o recorte da IA. */
	async removeBackground() {
		const l = this.editableLayer();
		if (!l) return;
		const alpha = await this.matte(l.canvas);
		if (!alpha) return;
		doc.history(t('image.hist.removeBg'), { layers: [l] });
		const m = makeCanvas(doc.width, doc.height);
		const img = new ImageData(doc.width, doc.height);
		for (let i = 0; i < alpha.length; i++) img.data[i * 4 + 3] = alpha[i];
		ctx2d(m).putImageData(img, 0, 0);
		const c = ctx2d(l.canvas);
		c.save();
		c.globalCompositeOperation = 'destination-in';
		c.drawImage(m, 0, 0);
		c.restore();
		l.touch();
		doc.changed();
		this.invalidate();
	}

	private async matte(source?: HTMLCanvasElement): Promise<Uint8ClampedArray | null> {
		const model = this.aiMatteModel;
		if (!(await this.confirmAi(model))) return null;
		const src = source ?? this.sampleCanvas('image');
		if (!src) return null;
		try {
			const ml = await import('./ml.ts');
			const img = readPixels(src);
			const res = await withJob(t(`imageAi.models.${model}.title`), (prog) => ml.matteSubject(img, model, { device: this.aiDevice, onProgress: (q) => prog(q.value, t(`imageAi.stage.${q.stage}`)) }), () => ml.mlStop(), 0);
			this.notify('ok', t('imageAi.done', { ms: Math.round(res.ms) }));
			return res.alpha;
		} catch (err) {
			this.jobError(err);
			return null;
		}
	}

	/** Pergunta antes de usar IA (uma vez por sessão, a menos que o usuário marque "não perguntar"). */
	confirmAi(model: 'sam' | 'modnet' | 'rmbg'): Promise<boolean> {
		if (this.aiOk) return Promise.resolve(true);
		try {
			if (sessionStorage.getItem('ub_image_ai_ok') === '1') return Promise.resolve((this.aiOk = true));
		} catch {
			/* sem storage */
		}
		return new Promise((resolve) => {
			this.dialog = {
				kind: 'ai',
				model,
				resolve: (ok) => {
					this.dialog = null;
					resolve(ok);
				}
			};
		});
	}

	acceptAi(remember: boolean) {
		this.aiOk = true;
		if (remember) {
			try {
				sessionStorage.setItem('ub_image_ai_ok', '1');
			} catch {
				/* sem storage */
			}
		}
	}

	private jobError(err: unknown) {
		if (isAbort(err)) this.notify('info', t('imageAi.stopped'));
		else {
			console.error(err);
			this.notify('error', t('imageAi.error', { message: err instanceof Error ? err.message : String(err) }));
		}
	}

	// ----- Mover (pixels, seleção, camada vetorial) -----

	private moveAction(p0: Pt, e: PointerEvent): Action | void {
		const tb = this.transformBox();
		if (tb) {
			const h = hitHandle(tb, p0.x, p0.y, this.handleTol(), this.rotateOffset());
			if (h) return this.boxDrag(h, p0);
		}
		const l = doc.active;
		if (!l) return;
		if (this.floating) this.commitFloating();
		// Camada vetorial: clicar fora da caixa ainda move a camada inteira.
		if (l.vector) return this.boxDrag('move', p0);
		if (this.moveMode === 'selection' && doc.selection.active) return this.moveSelectionOutline(p0);
		if (l.locked) return void this.notify('error', t('image.toast.locked'));
		if (!this.lift(l)) return;
		return this.boxDrag('move', p0);
	}

	/** Arraste de alça sobre a caixa ativa (vetor ou flutuante). */
	private boxDrag(h: Handle, p0: Pt): Action {
		const fl = this.floating;
		const l = doc.active!;
		const start = fl ? { ...fl.box } : ({ ...(l.vector as VectorData) } as Box);
		const startSize = l.vector?.type === 'text' ? l.vector.size : 0;
		if (!fl) doc.begin(t('image.hist.transform'), { layers: [] });
		let moved = false;
		return {
			move: (p, ev) => {
				moved = true;
				const nb = dragHandle(start, h, p0.x, p0.y, p.x, p.y, { keepAspect: ev.shiftKey || (l.vector?.type === 'text' && h.length === 2), fromCenter: ev.altKey, snapAngle: ev.shiftKey });
				if (fl) {
					fl.box = nb;
					this.invalidate();
				} else if (l.vector) {
					const v = l.vector;
					if (v.type === 'text' && h !== 'move' && h !== 'rotate') {
						// Texto: redimensionar muda o tamanho da fonte (proporcional à altura).
						v.size = Math.max(4, (startSize * Math.abs(nb.h)) / Math.max(1, Math.abs(start.h)));
						fitTextBox(v);
						const a = (start.rotation * Math.PI) / 180;
						const cx = nb.x + nb.w / 2, cy = nb.y + nb.h / 2;
						v.x = cx - v.w / 2;
						v.y = cy - v.h / 2;
						void a;
					} else Object.assign(v, nb);
					doc.changed();
				}
			},
			up: () => {
				if (fl) return;
				if (l.vector && l.vector.type === 'shape' && moved) Object.assign(l.vector, normalizeBox(l.vector));
				// Sem movimento: descarta a entrada (end(null) = nada mudou).
				doc.end(moved ? undefined : null);
			},
			cancel: () => {
				if (fl) fl.box = start;
				else doc.cancel();
				this.invalidate();
			}
		};
	}

	/** Levanta os pixels selecionados (ou a camada inteira) para uma camada flutuante transformável. */
	lift(l: Layer): boolean {
		const sel = doc.selection;
		const region = sel.active ? intersect(sel.bounds!, doc.rect) : contentBounds(l.canvas);
		if (!region) return false;
		doc.begin(t('image.hist.movePixels'), { layers: [l], selection: true });
		const src = cloneCanvas(l.canvas, region);
		let mask: HTMLCanvasElement | null = null;
		if (sel.active && sel.mask) {
			mask = cloneCanvas(sel.mask, region);
			const sc = ctx2d(src);
			sc.globalCompositeOperation = 'destination-in';
			sc.drawImage(mask, 0, 0);
			const lc = ctx2d(l.canvas);
			lc.save();
			lc.globalCompositeOperation = 'destination-out';
			lc.drawImage(sel.mask, 0, 0);
			lc.restore();
		} else ctx2d(l.canvas).clearRect(region.x, region.y, region.w, region.h);
		l.touch();
		const box = { ...region, rotation: 0 };
		this.floating = { layer: l, src, mask, box, start: { ...box } };
		this.hasFloating = true;
		this.live = {
			layer: l,
			draw: (c) => {
				const f = this.floating!;
				c.drawImage(l.canvas, 0, 0);
				c.save();
				c.imageSmoothingQuality = 'high';
				const nb = f.box;
				applyBox(c, nb);
				c.drawImage(f.src, 0, 0, nb.w, nb.h);
				c.restore();
			}
		};
		this.invalidate();
		return true;
	}

	/** Grava os pixels flutuantes na camada. */
	commitFloating() {
		const f = this.floating;
		if (!f) return;
		this.floating = null;
		this.hasFloating = false;
		this.live = null;
		const c = ctx2d(f.layer.canvas);
		c.save();
		c.imageSmoothingQuality = 'high';
		applyBox(c, f.box);
		c.drawImage(f.src, 0, 0, f.box.w, f.box.h);
		c.restore();
		f.layer.touch();
		if (f.mask) {
			const m = makeCanvas(doc.width, doc.height);
			const mc = ctx2d(m);
			applyBox(mc, f.box);
			mc.drawImage(f.mask, 0, 0, f.box.w, f.box.h);
			doc.selection.restore(m);
		}
		const b = normalizeBox(f.box);
		doc.end(unionRect(f.start, { x: b.x - b.w, y: b.y - b.h, w: b.w * 3, h: b.h * 3 }));
		doc.selectionChanged();
		this.invalidate();
	}

	cancelFloating() {
		if (!this.floating) return;
		this.floating = null;
		this.hasFloating = false;
		this.live = null;
		doc.cancel();
		this.invalidate();
	}

	private moveSelectionOutline(p0: Pt): Action {
		const mask = doc.selection.mask!;
		doc.begin(t('image.hist.moveSelection'), { layers: [], selection: true });
		const orig = cloneCanvas(mask);
		return {
			move: (p) => {
				const m = makeCanvas(doc.width, doc.height);
				ctx2d(m).drawImage(orig, Math.round(p.x - p0.x), Math.round(p.y - p0.y));
				doc.selection.mask = m;
				doc.selection.update();
				doc.selectionChanged();
				this.requestRender(true);
			},
			up: () => doc.end(),
			cancel: () => {
				doc.cancel();
				this.invalidate();
			}
		};
	}

	// ----- Pincel, borracha, carimbo -----

	/** Camada pronta para pintar (não bloqueada, raster). Mostra aviso e devolve null se não der. */
	editableLayer(): Layer | null {
		const l = doc.active;
		if (!l) return null;
		if (l.locked) {
			this.notify('error', t('image.toast.locked'));
			return null;
		}
		if (l.vector) {
			this.notify('info', t('image.toast.vectorLayer'), {
				label: t('image.cmd.rasterize'),
				run: () => this.rasterizeActive()
			});
			return null;
		}
		return l;
	}

	private strokeAction(p0: Pt, e: PointerEvent): Action | void {
		if (this.tool === 'clone' && (e.altKey || this.cloneSetting)) {
			this.cloneSource = { x: p0.x, y: p0.y };
			this.cloneSetting = false;
			this.notify('info', t('image.toast.cloneSource'));
			return;
		}
		if (this.tool === 'clone' && !this.cloneSource) {
			this.notify('info', t('image.toast.cloneNeedSource'));
			return;
		}
		const l = this.editableLayer();
		if (!l) return;
		this.commitFloating();
		const tool = this.tool as 'brush' | 'eraser' | 'clone';
		const o = tool === 'brush' ? this.brush : tool === 'eraser' ? this.eraser : this.cloneOpts;
		const color = e.button === 2 ? colors.secondaryCss : colors.primaryCss;
		const stroke = makeCanvas(doc.width, doc.height);
		const sc = ctx2d(stroke);
		const scratch = makeCanvas(doc.width, doc.height);
		const xc = ctx2d(scratch);
		const tipCache = new Map<number, HTMLCanvasElement>();
		const tipFor = (size: number) => {
			const k = Math.max(1, Math.round(size * 2) / 2);
			let tip = tipCache.get(k);
			if (!tip) {
				tip = makeTip(k, o.hardness, tool === 'brush' ? color : '#000');
				tipCache.set(k, tip);
			}
			return tip;
		};
		const flow = tool === 'brush' ? this.brush.flow : 1;
		const cloneSrc = tool === 'clone' ? (this.cloneOpts.sampleAll ? doc.flattened() : cloneCanvas(l.canvas)) : null;
		const offset = tool === 'clone' && this.cloneSource ? { x: this.cloneSource.x - p0.x, y: this.cloneSource.y - p0.y } : { x: 0, y: 0 };
		const dab = makeCanvas(1, 1);
		let bbox: Rect | null = null;
		const usePressure = e.pointerType === 'pen' && (tool !== 'brush' || this.brush.pressure);
		const stamp = (x: number, y: number, pressure: number) => {
			const size = Math.max(1, o.size * (usePressure ? Math.max(0.05, pressure) : 1));
			const r = size / 2;
			const tip = tipFor(size);
			sc.globalAlpha = flow;
			if (tool === 'clone' && cloneSrc) {
				const s = Math.ceil(size);
				if (dab.width !== s) dab.width = dab.height = s;
				const dc = ctx2d(dab);
				dc.globalCompositeOperation = 'source-over';
				dc.clearRect(0, 0, s, s);
				dc.drawImage(cloneSrc, x + offset.x - r, y + offset.y - r, s, s, 0, 0, s, s);
				dc.globalCompositeOperation = 'destination-in';
				dc.drawImage(tip, 0, 0, s, s);
				sc.drawImage(dab, x - r, y - r);
			} else sc.drawImage(tip, x - r, y - r, size, size);
			bbox = unionRect(bbox, { x: x - r - 1, y: y - r - 1, w: size + 2, h: size + 2 });
		};
		let last = { ...p0 };
		let smooth = { ...p0 };
		let carry = 0;
		const segment = (to: Pt, pressure: number) => {
			const dx = to.x - last.x, dy = to.y - last.y;
			const dist = Math.hypot(dx, dy);
			const spacing = Math.max(0.5, o.size * 0.12 * (usePressure ? Math.max(0.2, pressure) : 1));
			let d = spacing - carry;
			while (d <= dist) {
				stamp(last.x + (dx * d) / dist, last.y + (dy * d) / dist, pressure);
				d += spacing;
			}
			carry = dist - (d - spacing);
			last = { ...to };
		};
		doc.begin(t(`image.tools.${tool}`), { layers: [l] });
		stamp(p0.x, p0.y, e.pressure || 0.5);
		const masked = () => {
			// Traço recortado pela seleção, no canvas auxiliar.
			if (!doc.selection.active) return stroke;
			xc.globalCompositeOperation = 'copy';
			xc.drawImage(stroke, 0, 0);
			xc.globalCompositeOperation = 'source-over';
			clipToSelection(xc, doc.selection);
			return scratch;
		};
		const opacity = o.opacity;
		const view = makeCanvas(doc.width, doc.height);
		const vc = ctx2d(view);
		this.live = {
			layer: l,
			draw: (c) => {
				const s = masked();
				if (tool === 'eraser') {
					vc.globalCompositeOperation = 'copy';
					vc.drawImage(l.canvas, 0, 0);
					vc.globalCompositeOperation = 'destination-out';
					vc.globalAlpha = opacity;
					vc.drawImage(s, 0, 0);
					vc.globalAlpha = 1;
					c.drawImage(view, 0, 0);
				} else {
					c.drawImage(l.canvas, 0, 0);
					const a = c.globalAlpha;
					c.globalAlpha = a * opacity;
					c.drawImage(s, 0, 0);
					c.globalAlpha = a;
				}
			}
		};
		this.invalidate();
		const smoothing = tool === 'brush' ? this.brush.smoothing : 0.15;
		return {
			move: (p, ev) => {
				smooth = { x: smooth.x + (p.x - smooth.x) * (1 - smoothing * 0.85), y: smooth.y + (p.y - smooth.y) * (1 - smoothing * 0.85) };
				segment(smooth, ev.pressure || 0.5);
				this.invalidate();
			},
			up: (p) => {
				segment(p, 0.5);
				const s = masked();
				const c = ctx2d(l.canvas);
				c.save();
				c.globalAlpha = opacity;
				c.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
				c.drawImage(s, 0, 0);
				c.restore();
				this.live = null;
				l.touch();
				doc.end(bbox);
				doc.changed();
				if (tool === 'brush') colors.use(e.button === 2 ? colors.secondary : colors.primary);
				this.invalidate();
			},
			cancel: () => {
				this.live = null;
				doc.cancel();
				this.invalidate();
			}
		};
	}

	// ----- Balde de tinta -----

	async bucket(p: Pt, secondary: boolean) {
		const x = Math.floor(p.x), y = Math.floor(p.y);
		if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return;
		if (doc.selection.active && !doc.selection.contains(x, y)) return;
		const l = this.editableLayer();
		if (!l) return;
		const src = this.fillOpts.sampleAll ? doc.flattened() : l.canvas;
		const color = secondary ? colors.secondaryCss : colors.primaryCss;
		try {
			const opts: WandOptions = { ...defaultWand(), algo: this.fillOpts.contiguous ? 'flood' : 'global', metric: 'rgba', tolerance: this.fillOpts.tolerance, antialias: this.fillOpts.antialias };
			const alpha = await withJob(t('image.tools.fill'), (prog) => runWand(readPixels(src), x, y, opts, (v) => prog(v)));
			const m = alphaCanvas(alpha, doc.width, doc.height);
			const mc = ctx2d(m);
			mc.globalCompositeOperation = 'source-in';
			mc.fillStyle = color;
			mc.fillRect(0, 0, doc.width, doc.height);
			clipToSelection(mc, doc.selection);
			doc.history(t('image.tools.fill'), { layers: [l] });
			ctx2d(l.canvas).drawImage(m, 0, 0);
			l.touch();
			doc.changed();
			colors.use(secondary ? colors.secondary : colors.primary);
			this.invalidate();
		} catch (err) {
			this.jobError(err);
		}
	}

	// ----- Gradiente -----

	private gradientAction(p0: Pt, e: PointerEvent): Action | void {
		const l = this.editableLayer();
		if (!l) return;
		const swap = e.button === 2 !== this.gradient.reverse;
		const ca = swap ? colors.secondaryCss : colors.primaryCss;
		const cb = this.gradient.toTransparent ? 'rgb(0 0 0 / 0)' : swap ? colors.primaryCss : colors.secondaryCss;
		const g = makeCanvas(doc.width, doc.height);
		const render = (a: Pt, b: Pt) => {
			const c = ctx2d(g);
			c.clearRect(0, 0, g.width, g.height);
			const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
			let grad: CanvasGradient;
			if (this.gradient.type === 'radial') grad = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, len);
			else if (this.gradient.type === 'conic') grad = c.createConicGradient(Math.atan2(b.y - a.y, b.x - a.x), a.x, a.y);
			else if (this.gradient.type === 'reflected') {
				grad = c.createLinearGradient(a.x - (b.x - a.x), a.y - (b.y - a.y), b.x, b.y);
				grad.addColorStop(0, cb);
				grad.addColorStop(0.5, ca);
				grad.addColorStop(1, cb);
			} else grad = c.createLinearGradient(a.x, a.y, b.x, b.y);
			if (this.gradient.type !== 'reflected') {
				grad.addColorStop(0, ca);
				grad.addColorStop(1, cb);
			}
			c.fillStyle = grad;
			c.fillRect(0, 0, g.width, g.height);
			clipToSelection(c, doc.selection);
		};
		doc.begin(t('image.tools.gradient'), { layers: [l] });
		this.gradLine = [p0, p0];
		this.live = {
			layer: l,
			draw: (c) => {
				c.drawImage(l.canvas, 0, 0);
				c.drawImage(g, 0, 0);
			}
		};
		return {
			move: (p, ev) => {
				let q = p;
				if (ev.shiftKey) {
					const a = Math.round(Math.atan2(p.y - p0.y, p.x - p0.x) / (Math.PI / 12)) * (Math.PI / 12);
					const d = Math.hypot(p.x - p0.x, p.y - p0.y);
					q = { x: p0.x + Math.cos(a) * d, y: p0.y + Math.sin(a) * d };
				}
				this.gradLine = [p0, q];
				render(p0, q);
				this.invalidate();
			},
			up: () => {
				const line = this.gradLine;
				this.gradLine = null;
				this.live = null;
				if (!line || Math.hypot(line[1].x - line[0].x, line[1].y - line[0].y) < 1) {
					doc.cancel();
					this.invalidate();
					return;
				}
				ctx2d(l.canvas).drawImage(g, 0, 0);
				l.touch();
				doc.end();
				doc.changed();
				this.invalidate();
			},
			cancel: () => {
				this.gradLine = null;
				this.live = null;
				doc.cancel();
				this.invalidate();
			}
		};
	}

	// ----- Conta-gotas -----

	pick(p: Pt, which: 'primary' | 'secondary') {
		const src = this.sampleCanvas(this.pickerSample);
		if (!src) return;
		const s = Math.max(1, this.pickerSize), h = Math.floor(s / 2);
		const x = Math.floor(p.x) - h, y = Math.floor(p.y) - h;
		const r = intersect({ x, y, w: s, h: s }, { x: 0, y: 0, w: src.width, h: src.height });
		if (!r) return;
		const d = readPixels(src, r).data;
		let R = 0, G = 0, B = 0, A = 0;
		for (let i = 0; i < d.length; i += 4) {
			const a = d[i + 3];
			R += d[i] * a; G += d[i + 1] * a; B += d[i + 2] * a; A += a;
		}
		const n = d.length / 4;
		const c: RGBA = A ? { r: R / A, g: G / A, b: B / A, a: A / n / 255 } : { r: 0, g: 0, b: 0, a: 0 };
		colors.set(which, { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: +c.a.toFixed(3) });
		colors.save();
	}

	// ----- Texto -----

	private textAction(p: Pt, e: PointerEvent): Action | void {
		const tb = this.transformBox();
		if (tb) {
			const h = hitHandle(tb, p.x, p.y, this.handleTol(), this.rotateOffset());
			if (h && h !== 'move') return this.boxDrag(h, p);
			if (h === 'move') {
				// Clique dentro do texto ativo: edita; arrastar move.
				const startAt = performance.now();
				const drag = this.boxDrag('move', p);
				let moved = false;
				return {
					move: (q, ev) => {
						if (Math.hypot(q.x - p.x, q.y - p.y) * this.zoom > 3) moved = true;
						if (moved) drag.move?.(q, ev);
					},
					up: (q, ev) => {
						drag.up?.(q, ev);
						if (!moved && performance.now() - startAt < 600) this.textEditing = doc.active?.id ?? null;
					},
					cancel: drag.cancel
				};
			}
		}
		// Clicou num texto existente?
		for (let i = doc.layers.length - 1; i >= 0; i--) {
			const l = doc.layers[i];
			if (l.vector?.type === 'text' && l.visible) {
				const [lx, ly] = toBoxLocal(l.vector, p.x, p.y);
				if (lx >= 0 && ly >= 0 && lx <= l.vector.w && ly <= l.vector.h) {
					this.finishText();
					doc.activeId = l.id;
					this.textEditing = l.id;
					this.requestRender(true);
					return;
				}
			}
		}
		this.finishText();
		const fill = e.button === 2 ? colors.secondaryCss : colors.primaryCss;
		const v: TextData = { type: 'text', text: '', x: p.x, y: p.y - this.text.size * 0.6, w: 1, h: 1, rotation: 0, font: this.text.font, size: this.text.size, weight: this.text.weight, italic: this.text.italic, align: this.text.align, lineHeight: 1.15, letterSpacing: 0, fill: { kind: 'solid', color: fill }, stroke: '', strokeWidth: 0 };
		const l = doc.addLayer({ name: t('image.layer.text'), vector: v, effects: defaultEffects() }, undefined, t('image.hist.addText'));
		this.textEditing = l.id;
		this.invalidate();
	}

	/** Encerra a edição de texto (apaga a camada se ficou vazia). */
	finishText() {
		const id = this.textEditing;
		if (!id) return;
		this.textEditing = null;
		const l = doc.layers.find((x) => x.id === id);
		if (l?.vector?.type === 'text' && !l.vector.text.trim() && doc.layers.length > 1) {
			doc.layers = doc.layers.filter((x) => x !== l);
			doc.activeId = doc.layers[doc.layers.length - 1].id;
			doc.changed();
			this.invalidate();
		}
	}

	// ----- Formas -----

	private shapeAction(p0: Pt, e: PointerEvent): Action | void {
		const tb = this.transformBox();
		if (tb) {
			const h = hitHandle(tb, p0.x, p0.y, this.handleTol(), this.rotateOffset());
			if (h) return this.boxDrag(h, p0);
		}
		const o = this.shape;
		const primary = e.button === 2 ? colors.secondaryCss : colors.primaryCss;
		const secondary = e.button === 2 ? colors.primaryCss : colors.secondaryCss;
		const open = o.kind === 'line' || o.kind === 'arrow';
		let layer: Layer | null = null;
		const make = (b: Box): ShapeData => ({
			type: 'shape', shape: o.kind, ...b,
			fill: open || o.mode === 'stroke' ? { kind: 'none' } : { kind: 'solid', color: primary },
			stroke: open ? primary : o.mode === 'fill' ? '' : o.mode === 'stroke' ? primary : secondary,
			strokeWidth: o.strokeWidth, radius: o.radius, sides: o.sides, inner: o.inner, dash: o.dash
		});
		return {
			move: (p, ev) => {
				let w = p.x - p0.x, h = p.y - p0.y;
				if (ev.shiftKey) {
					if (open) {
						const a = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(w, h);
						w = Math.cos(a) * d;
						h = Math.sin(a) * d;
					} else {
						const s = Math.max(Math.abs(w), Math.abs(h));
						w = Math.sign(w || 1) * s;
						h = Math.sign(h || 1) * s;
					}
				}
				let b: Box = { x: p0.x, y: p0.y, w, h, rotation: 0 };
				if (ev.altKey) b = { x: p0.x - w, y: p0.y - h, w: w * 2, h: h * 2, rotation: 0 };
				if (!layer) {
					if (Math.hypot(w, h) * this.zoom < 4) return;
					layer = doc.addLayer({ name: t(`image.shapes.${o.kind}`), vector: make(b), effects: defaultEffects() }, undefined, t('image.hist.addShape'));
				} else if (layer.vector) Object.assign(layer.vector, b);
				doc.changed();
			},
			up: () => {
				if (layer?.vector && !open) Object.assign(layer.vector, normalizeBox(layer.vector));
				this.invalidate();
			},
			cancel: () => {
				if (layer) doc.undo();
			}
		};
	}

	// ----- Recorte -----

	private cropAspectRatio(): number | null {
		const a = this.cropAspect;
		if (a === 'free') return null;
		if (a === 'original') return doc.width / doc.height;
		const [w, h] = a.split(':').map(Number);
		return w / h;
	}

	private cropAction(p0: Pt, e: PointerEvent): Action | void {
		void e;
		const cb = this.cropBox ? normalizeBox(this.cropBox) : null;
		const ratio = this.cropAspectRatio();
		if (cb) {
			const h = hitHandle(cb, p0.x, p0.y, this.handleTol(), this.rotateOffset(), false);
			if (h) {
				const start = { ...cb };
				return {
					move: (p, ev) => {
						const nb = dragHandle(start, h, p0.x, p0.y, p.x, p.y, { aspect: h === 'move' ? null : ratio, keepAspect: ev.shiftKey, fromCenter: ev.altKey });
						this.cropBox = { ...nb, x: Math.round(nb.x), y: Math.round(nb.y), w: Math.round(nb.w), h: Math.round(nb.h) };
					},
					up: () => this.cropBox && (this.cropBox = normalizeBox(this.cropBox))
				};
			}
		}
		return {
			move: (p) => {
				let w = p.x - p0.x, h = p.y - p0.y;
				if (ratio) {
					if (Math.abs(w) / ratio > Math.abs(h)) h = (Math.sign(h) || 1) * Math.abs(w) / ratio;
					else w = (Math.sign(w) || 1) * Math.abs(h) * ratio;
				}
				const r = normRect(Math.round(p0.x), Math.round(p0.y), Math.round(p0.x + w), Math.round(p0.y + h));
				if (r.w >= 1 && r.h >= 1) this.cropBox = { ...r, rotation: 0 };
			}
		};
	}

	applyCrop() {
		if (!this.cropBox) return;
		const b = normalizeBox(this.cropBox);
		if (b.w < 1 || b.h < 1) return;
		doc.crop(b);
		this.cropBox = { x: 0, y: 0, w: doc.width, h: doc.height, rotation: 0 };
		this.fit();
		this.invalidate();
	}

	// =============== Comandos ===============

	notify(kind: Toast['kind'], text: string, action?: Toast['action'], ms = 3600) {
		clearTimeout(this.toastTimer);
		this.toast = { kind, text, action };
		this.toastTimer = setTimeout(() => (this.toast = null), action ? ms + 3000 : ms);
	}

	/** Histórico para edições contínuas de propriedades (sliders): agrupa mudanças próximas. */
	propsHistory(label: string, layers: Layer[] | 'all' = []) {
		const now = performance.now();
		if (now - this.propsAt > HISTORY_PROPS_MS || label !== this.propsLabel) doc.history(label, { layers });
		this.propsAt = now;
		this.propsLabel = label;
	}

	undo() {
		if (this.action) return;
		if (this.floating) return this.cancelFloating();
		this.finishText();
		doc.undo();
		this.invalidate();
	}

	redo() {
		if (this.action) return;
		this.commitFloating();
		doc.redo();
		this.invalidate();
	}

	selectAll() {
		this.commitFloating();
		this.selectionEdit(() => doc.selection.all());
	}

	deselect() {
		this.commitFloating();
		if (!doc.selection.active) return;
		this.selectionEdit(() => doc.selection.clear(), 'image.hist.deselect');
	}

	invertSelection() {
		this.commitFloating();
		this.selectionEdit(() => doc.selection.invert(), 'image.hist.invert');
	}

	selectLayerAlpha() {
		const l = doc.active;
		if (!l) return;
		const d = readPixels(l.output()).data;
		const a = new Uint8ClampedArray(doc.width * doc.height);
		for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
		this.selectionEdit(() => doc.selection.applyAlpha('replace', a));
	}

	/** Recorte da camada (ou imagem mesclada) pela seleção. */
	private extract(merged: boolean): { canvas: HTMLCanvasElement; x: number; y: number } | null {
		const l = doc.active;
		if (!l) return null;
		const src = merged ? doc.flattened() : l.output();
		const sel = doc.selection;
		const r = sel.active ? intersect(sel.bounds!, doc.rect) : contentBounds(src) ?? doc.rect;
		if (!r) return null;
		const c = cloneCanvas(src, r);
		if (sel.active) clipToSelection(ctx2d(c), sel, { x: r.x, y: r.y });
		return { canvas: c, x: r.x, y: r.y };
	}

	async copy(merged = false) {
		this.commitFloating();
		const ex = this.extract(merged);
		if (!ex) return this.notify('info', t('image.toast.nothingToCopy'));
		this.clip = ex;
		try {
			const blob = canvasToBlob(ex.canvas, 'image/png');
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			this.notify('ok', t('image.toast.copied', { w: ex.canvas.width, h: ex.canvas.height }));
		} catch {
			// Sem permissão do clipboard do sistema: fica no clipboard interno do editor.
			this.notify('info', t('image.toast.copiedInternal'));
		}
	}

	async cut() {
		await this.copy(false);
		this.eraseSelection(t('image.cmd.cut'));
	}

	eraseSelection(label = t('image.cmd.delete')) {
		this.commitFloating();
		const l = this.editableLayer();
		if (!l) return;
		doc.history(label, { layers: [l] });
		const c = ctx2d(l.canvas);
		if (doc.selection.active && doc.selection.mask) {
			c.save();
			c.globalCompositeOperation = 'destination-out';
			c.drawImage(doc.selection.mask, 0, 0);
			c.restore();
		} else c.clearRect(0, 0, doc.width, doc.height);
		l.touch();
		doc.changed();
		this.invalidate();
	}

	fillSelection(which: 'primary' | 'secondary' = 'primary') {
		this.commitFloating();
		const l = this.editableLayer();
		if (!l) return;
		doc.history(t('image.cmd.fillSelection'), { layers: [l] });
		const m = makeCanvas(doc.width, doc.height);
		const mc = ctx2d(m);
		mc.fillStyle = which === 'primary' ? colors.primaryCss : colors.secondaryCss;
		mc.fillRect(0, 0, doc.width, doc.height);
		clipToSelection(mc, doc.selection);
		ctx2d(l.canvas).drawImage(m, 0, 0);
		l.touch();
		doc.changed();
		this.invalidate();
	}

	/** Lê uma imagem do clipboard do sistema (com fallback para o interno). */
	private async readClipboard(): Promise<{ canvas: HTMLCanvasElement; x?: number; y?: number } | null> {
		try {
			const items = await navigator.clipboard.read();
			for (const it of items) {
				const type = it.types.find((ty) => ty.startsWith('image/'));
				if (type) {
					const blob = await it.getType(type);
					return { canvas: await blobToCanvas(blob) };
				}
			}
		} catch {
			/* sem permissão / sem suporte */
		}
		return this.clip ? { canvas: this.clip.canvas, x: this.clip.x, y: this.clip.y } : null;
	}

	async paste(target: 'layer' | 'newLayer' | 'newImage' = 'newLayer', provided?: Blob) {
		const got = provided ? { canvas: await blobToCanvas(provided) } : await this.readClipboard();
		if (!got) return this.notify('info', t('image.toast.clipboardEmpty'));
		this.pasteCanvas(got.canvas, target, got.x, got.y);
	}

	pasteCanvas(src: HTMLCanvasElement, target: 'layer' | 'newLayer' | 'newImage' = 'newLayer', x?: number, y?: number) {
		this.commitFloating();
		this.finishText();
		if (target === 'newImage' || !doc.width) {
			doc.load({ width: src.width, height: src.height, name: t('image.untitled'), layers: [{ name: '', canvas: cloneCanvas(src) }] });
			this.fit();
			this.invalidate();
			return;
		}
		if (src.width > doc.width || src.height > doc.height) {
			this.notify('info', t('image.toast.pasteLarger'), { label: t('image.cmd.expandCanvas'), run: () => this.canvasToFit(src.width, src.height) });
		}
		// Posição: a original (se couber) ou o centro da área visível.
		const view = this.toDoc(this.viewW / 2, this.viewH / 2);
		const px = x ?? Math.round(Math.min(Math.max(0, view.x - src.width / 2), Math.max(0, doc.width - src.width)));
		const py = y ?? Math.round(Math.min(Math.max(0, view.y - src.height / 2), Math.max(0, doc.height - src.height)));
		let l = doc.active;
		if (target === 'newLayer' || !l || l.vector || l.locked) l = doc.addLayer({ name: t('image.layer.pasted') }, undefined, t('image.cmd.paste'));
		doc.begin(t('image.cmd.paste'), { layers: [l], selection: true });
		const c = ctx2d(l.canvas);
		c.drawImage(src, px, py);
		l.touch();
		doc.end();
		doc.selection.clear();
		this.selectionEdit(() => doc.selection.apply('replace', (sc) => sc.fillRect(px, py, src.width, src.height)));
		this.setTool('move');
		this.lift(l);
		this.notify('ok', t('image.toast.pasted'));
	}

	private canvasToFit(w: number, h: number) {
		this.commitFloating();
		doc.canvasSize(Math.max(w, doc.width), Math.max(h, doc.height), 0, 0);
		this.fit();
		this.invalidate();
	}

	cropToSelection() {
		this.commitFloating();
		const b = doc.selection.bounds;
		if (!b) return this.notify('info', t('image.toast.noSelection'));
		const mask = doc.selection.mask ? cloneCanvas(doc.selection.mask, b) : null;
		doc.crop(b, t('image.cmd.cropToSelection'));
		// Fora da seleção (não retangular) vira transparente.
		if (mask) {
			for (const l of doc.layers) {
				if (l.vector) continue;
				const c = ctx2d(l.canvas);
				c.save();
				c.globalCompositeOperation = 'destination-in';
				c.drawImage(mask, 0, 0);
				c.restore();
				l.touch();
			}
		}
		this.fit();
		this.invalidate();
	}

	layerFromSelection(cut = false) {
		this.commitFloating();
		const ex = this.extract(false);
		if (!ex) return;
		if (cut) this.eraseSelection(t('image.cmd.layerViaCut'));
		const c = makeCanvas(doc.width, doc.height);
		ctx2d(c).drawImage(ex.canvas, ex.x, ex.y);
		doc.addLayer({ name: t('image.layer.fromSelection'), canvas: c }, undefined, t('image.cmd.layerFromSelection'));
		this.invalidate();
	}

	rasterizeActive(bake = false) {
		const l = doc.active;
		if (!l) return;
		doc.history(t('image.cmd.rasterize'), { layers: [l] });
		l.rasterize(bake);
		doc.changed();
		this.invalidate();
	}

	bakeEffects() {
		this.rasterizeActive(true);
	}

	addLayer() {
		this.commitFloating();
		doc.addLayer(undefined, undefined, t('image.cmd.addLayer'));
		this.invalidate();
	}

	/** Adiciona camadas vindas de um arquivo (abrir como camada). */
	addLayersFrom(opened: { layers: LayerInit[]; width: number; height: number }) {
		this.commitFloating();
		for (const li of opened.layers) {
			const c = makeCanvas(doc.width, doc.height);
			const x = Math.round((doc.width - opened.width) / 2), y = Math.round((doc.height - opened.height) / 2);
			ctx2d(c).drawImage(li.canvas, Math.max(0, x), Math.max(0, y));
			doc.addLayer({ ...li, canvas: c }, undefined, t('image.cmd.openLayer'));
		}
		this.invalidate();
	}

	/** Atalhos de teclado (estilo Paint.NET / Photoshop). Retorna true se tratou. */
	key(e: KeyboardEvent, run: (cmd: string) => void): boolean {
		const target = e.target as HTMLElement | null;
		if (target && (target.closest('input, textarea, select, [contenteditable="true"]'))) return false;
		const mod = e.ctrlKey || e.metaKey;
		const k = e.key.toLowerCase();
		if (e.key === ' ' && !mod) {
			if (!this.spaceDown) {
				this.spaceDown = true;
				this.hoverCursor = 'grab';
			}
			return true;
		}
		if (mod) {
			const map: Record<string, string> = {
				z: e.shiftKey ? 'redo' : 'undo', y: 'redo', a: 'selectAll', d: 'deselect', i: e.shiftKey ? 'invert' : '',
				c: e.shiftKey ? 'copyMerged' : 'copy', x: e.shiftKey ? 'cropToSelection' : 'cut', v: e.shiftKey ? 'pasteNewImage' : e.altKey ? 'pasteNewLayer' : '',
				n: e.shiftKey ? 'addLayer' : 'new', o: 'open', s: 'export', r: e.shiftKey ? 'canvasSize' : 'resize', j: 'duplicateLayer',
				e: 'mergeDown', f: 'repeatFilter', '0': 'fit', '1': 'actualSize', '=': 'zoomIn', '+': 'zoomIn', '-': 'zoomOut', b: 'autoCrop'
			};
			const cmd = map[k];
			// Ctrl+V sem modificador: tratado pelo evento "paste" (funciona sem pedir permissão).
			if (cmd) {
				run(cmd);
				return true;
			}
			return false;
		}
		if (e.altKey) return false;
		switch (e.key) {
			case 'Escape':
				if (this.dialog || this.sheet) return false;
				if (this.textEditing) this.finishText();
				else if (this.floating) this.cancelFloating();
				else if (this.samPoints.length) this.resetSam();
				else if (this.tool === 'crop') this.setTool('move');
				else this.deselect();
				return true;
			case 'Enter':
				if (this.floating) this.commitFloating();
				else if (this.tool === 'crop') this.applyCrop();
				else if (this.samPoints.length) this.resetSam();
				else return false;
				return true;
			case 'Delete':
				this.eraseSelection();
				return true;
			case 'Backspace':
				this.fillSelection(e.shiftKey ? 'secondary' : 'primary');
				return true;
			case '[':
			case ']': {
				const o = this.tool === 'eraser' ? this.eraser : this.tool === 'clone' ? this.cloneOpts : this.brush;
				o.size = Math.max(1, Math.min(1000, Math.round(o.size * (e.key === ']' ? 1.2 : 1 / 1.2)) + (e.key === ']' ? 1 : -1)));
				this.requestRender(true);
				return true;
			}
			case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
				return this.nudge(e.key, e.shiftKey ? 10 : 1);
		}
		const tools: Record<string, ToolId[]> = {
			v: ['move'], m: ['select-rect', 'select-ellipse'], l: ['select-lasso'], w: ['wand'], c: ['crop'], b: ['brush'], e: ['eraser'],
			g: ['fill', 'gradient'], i: ['picker'], k: ['picker'], t: ['text'], u: ['shape'], s: ['clone'], h: ['hand'], z: ['zoom'], o: ['shape']
		};
		if (tools[k]) {
			const list = tools[k];
			const i = list.indexOf(this.tool);
			this.setTool(list[(i + 1) % list.length]);
			return true;
		}
		if (k === 'x') return colors.swap(), true;
		if (k === 'd') return colors.reset(), true;
		return false;
	}

	keyUp(e: KeyboardEvent) {
		if (e.key === ' ') {
			this.spaceDown = false;
			this.hoverCursor = 'default';
		}
	}

	private nudge(key: string, n: number): boolean {
		const dx = key === 'ArrowLeft' ? -n : key === 'ArrowRight' ? n : 0;
		const dy = key === 'ArrowUp' ? -n : key === 'ArrowDown' ? n : 0;
		if (this.floating) {
			this.floating.box = { ...this.floating.box, x: this.floating.box.x + dx, y: this.floating.box.y + dy };
			this.invalidate();
			return true;
		}
		const l = doc.active;
		if (this.tool === 'move' && l?.vector) {
			this.propsHistory(t('image.hist.transform'));
			l.vector.x += dx;
			l.vector.y += dy;
			doc.changed();
			return true;
		}
		if (this.tool === 'move' && l && !l.locked && this.lift(l)) {
			this.floating!.box = { ...this.floating!.box, x: this.floating!.box.x + dx, y: this.floating!.box.y + dy };
			this.invalidate();
			return true;
		}
		return false;
	}

	/** Cor de texto para contraste sobre uma cor. */
	hex(c: RGBA) {
		return toHex(c);
	}
	css(c: RGBA) {
		return toCss(c);
	}

	stopAll() {
		stopOps();
	}
}

/** Ponta de pincel: disco com borda suave conforme a dureza. */
function makeTip(size: number, hardness: number, color: string): HTMLCanvasElement {
	const s = Math.max(1, Math.ceil(size));
	const c = makeCanvas(s, s);
	const x = ctx2d(c);
	const r = s / 2;
	if (s <= 2) {
		x.fillStyle = color;
		x.fillRect(0, 0, s, s);
		return c;
	}
	const g = x.createRadialGradient(r, r, 0, r, r, r);
	const hard = Math.min(0.99, Math.max(0, hardness));
	g.addColorStop(0, color);
	g.addColorStop(hard, color);
	g.addColorStop(1, transparentOf(color));
	x.fillStyle = g;
	x.beginPath();
	x.arc(r, r, r, 0, Math.PI * 2);
	x.fill();
	return c;
}

function transparentOf(color: string) {
	const c = document.createElement('canvas').getContext('2d')!;
	c.fillStyle = color;
	const hex = c.fillStyle as string; // normalizado (#rrggbb ou rgba())
	if (hex.startsWith('#')) return `${hex}00`;
	return hex.replace(/rgba?\(([^)]+)\)/, (_m, inner: string) => {
		const p = inner.split(',').slice(0, 3).join(',');
		return `rgba(${p},0)`;
	});
}

export function alphaCanvas(alpha: ArrayLike<number>, w: number, h: number): HTMLCanvasElement {
	const img = new ImageData(w, h);
	for (let i = 0; i < w * h; i++) img.data[i * 4 + 3] = alpha[i];
	const c = makeCanvas(w, h);
	ctx2d(c).putImageData(img, 0, 0);
	return c;
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
	const bmp = await createImageBitmap(blob);
	const c = makeCanvas(bmp.width, bmp.height);
	ctx2d(c).drawImage(bmp, 0, 0);
	bmp.close();
	return c;
}

export const editor = new Editor();
