// Documento do editor de imagens: camadas, seleção, histórico (desfazer/refazer) e composição.
// Os pixels ficam em canvases (não reativos); as propriedades das camadas são runes ($state) para a UI.
import type { BlendMode, Effects, LayerInit, OpenedDoc, Rect, VectorData } from './types.ts';
import { defaultEffects, hasEffects } from './types.ts';
import { makeCanvas, ctx2d, cloneCanvas, rasterizeVector, renderEffects, intersect, contentBounds } from './render.ts';
import { Selection } from './selection.ts';
import { t } from '#lib/i18n/index.svelte.ts';

let seq = 0;
const uid = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export class Layer {
	id = uid();
	name = $state('');
	visible = $state(true);
	opacity = $state(1);
	blend = $state<BlendMode>('source-over');
	locked = $state(false);
	vector = $state<VectorData | null>(null);
	effects = $state<Effects>(defaultEffects());
	/** Revisão do conteúdo raster (miniaturas e caches observam). */
	rev = $state(0);
	canvas: HTMLCanvasElement;
	private vecKey = '';
	private fxKey = '';
	private fx: HTMLCanvasElement | null = null;

	constructor(init: LayerInit) {
		this.name = init.name;
		this.canvas = init.canvas;
		this.visible = init.visible ?? true;
		this.opacity = init.opacity ?? 1;
		this.blend = init.blend ?? 'source-over';
		this.locked = init.locked ?? false;
		this.vector = init.vector ?? null;
		this.effects = init.effects ?? defaultEffects();
	}

	bump() {
		this.rev++;
	}

	/** Garante o raster do vetor atualizado e devolve o canvas a compor (com efeitos, se houver). */
	output(): HTMLCanvasElement {
		if (this.vector) {
			const key = JSON.stringify(this.vector) + this.canvas.width + 'x' + this.canvas.height;
			if (key !== this.vecKey) {
				rasterizeVector(this.canvas, this.vector);
				this.vecKey = key;
			}
		}
		if (!hasEffects(this.effects)) return this.canvas;
		const key = `${JSON.stringify(this.effects)}|${this.rev}|${this.vecKey}|${this.canvas.width}x${this.canvas.height}`;
		if (key !== this.fxKey || !this.fx) {
			this.fx = renderEffects(this.canvas, this.effects, this.fx ?? undefined);
			this.fxKey = key;
		}
		return this.fx;
	}

	/** Invalida caches após editar pixels diretamente. */
	touch() {
		this.fxKey = '';
		this.bump();
	}

	/** Converte em raster (mantém os efeitos aplicados opcionalmente). */
	rasterize(bakeEffects = false) {
		const out = bakeEffects ? cloneCanvas(this.output()) : (this.output(), this.canvas);
		if (bakeEffects) {
			const c = ctx2d(this.canvas);
			c.clearRect(0, 0, this.canvas.width, this.canvas.height);
			c.drawImage(out, 0, 0);
			this.effects = defaultEffects();
		}
		this.vector = null;
		this.vecKey = '';
		this.touch();
	}
}

// ---------- Histórico ----------

type LayerRec = { layer: Layer; name: string; visible: boolean; opacity: number; blend: BlendMode; locked: boolean; vector: VectorData | null; effects: Effects };
type Patch = { layer: Layer; x: number; y: number; canvas: HTMLCanvasElement; fullW: number; fullH: number };
type Entry = { label: string; recs: LayerRec[]; activeId: string; width: number; height: number; patches: Patch[]; sel?: { mask: HTMLCanvasElement | null } };

export type HistoryOpts = { layers?: Layer[] | 'all'; region?: Rect; selection?: boolean };

const MAX_STEPS = 60;
const MAX_BYTES = 700 * 1024 * 1024;

function recOf(l: Layer): LayerRec {
	return { layer: l, name: l.name, visible: l.visible, opacity: l.opacity, blend: l.blend, locked: l.locked, vector: $state.snapshot(l.vector) as VectorData | null, effects: $state.snapshot(l.effects) as Effects };
}

const entryBytes = (e: Entry) => e.patches.reduce((s, p) => s + p.canvas.width * p.canvas.height * 4, 0) + (e.sel?.mask ? e.sel.mask.width * e.sel.mask.height * 4 : 0);

// ---------- Documento ----------

export class ImageDoc {
	name = $state('');
	width = $state(0);
	height = $state(0);
	layers = $state<Layer[]>([]);
	activeId = $state('');
	/** Muda a cada alteração visível (o canvas da tela observa). */
	rev = $state(0);
	/** Muda quando a seleção muda. */
	selRev = $state(0);
	dirty = $state(false);
	selection = new Selection(1, 1);
	/** Rótulos para a UI de histórico. */
	undoLabels = $state<string[]>([]);
	redoLabels = $state<string[]>([]);
	private undoStack: Entry[] = [];
	private redoStack: Entry[] = [];
	private pending: Entry | null = null;

	get active(): Layer | undefined {
		return this.layers.find((l) => l.id === this.activeId) ?? this.layers[this.layers.length - 1];
	}

	get rect(): Rect {
		return { x: 0, y: 0, w: this.width, h: this.height };
	}

	changed() {
		this.rev++;
		this.dirty = true;
	}

	selectionChanged() {
		this.selRev++;
		this.rev++;
	}

	// ----- Criação -----

	create(width: number, height: number, background: string | null, name: string) {
		const base = makeCanvas(width, height);
		if (background) {
			const c = ctx2d(base);
			c.fillStyle = background;
			c.fillRect(0, 0, width, height);
		}
		this.load({ width, height, name, layers: [{ name: '', canvas: base }] }, background ? t('image.layer.background') : `${t('image.layer.layer')} 1`);
	}

	load(d: OpenedDoc, firstName?: string) {
		this.width = d.width;
		this.height = d.height;
		this.name = d.name;
		this.layers = d.layers.map((l, i) => new Layer({ ...l, name: l.name || (i === 0 && firstName) || `${t('image.layer.layer')} ${i + 1}` }));
		this.activeId = this.layers[this.layers.length - 1]?.id ?? '';
		this.selection.resize(d.width, d.height);
		this.undoStack = [];
		this.redoStack = [];
		this.syncLabels();
		this.dirty = false;
		this.selectionChanged();
	}

	// ----- Camadas -----

	newLayerCanvas() {
		return makeCanvas(this.width, this.height);
	}

	addLayer(init?: Partial<LayerInit>, index?: number, label = t('image.hist.newLayer')): Layer {
		this.history(label, { layers: [] });
		const l = new Layer({ name: init?.name || this.nextName(), canvas: init?.canvas ?? this.newLayerCanvas(), ...init } as LayerInit);
		const at = index ?? this.layers.findIndex((x) => x.id === this.activeId) + 1;
		const arr = [...this.layers];
		arr.splice(at <= 0 ? arr.length : at, 0, l);
		this.layers = arr;
		this.activeId = l.id;
		this.changed();
		return l;
	}

	nextName(prefix = t('image.layer.layer')) {
		let n = this.layers.length + 1;
		while (this.layers.some((l) => l.name === `${prefix} ${n}`)) n++;
		return `${prefix} ${n}`;
	}

	removeLayer(id = this.activeId) {
		if (this.layers.length <= 1) return;
		this.history(t('image.hist.deleteLayer'), { layers: [] });
		const i = this.layers.findIndex((l) => l.id === id);
		this.layers = this.layers.filter((l) => l.id !== id);
		this.activeId = this.layers[Math.max(0, i - 1)].id;
		this.changed();
	}

	duplicateLayer(id = this.activeId) {
		const src = this.layers.find((l) => l.id === id);
		if (!src) return;
		const i = this.layers.indexOf(src);
		this.addLayer({ name: `${src.name} (${t('image.layer.copySuffix')})`, canvas: cloneCanvas(src.canvas), opacity: src.opacity, blend: src.blend, visible: src.visible, vector: $state.snapshot(src.vector) as VectorData | null, effects: $state.snapshot(src.effects) as Effects }, i + 1, t('image.hist.duplicateLayer'));
	}

	moveLayer(id: string, to: number) {
		const i = this.layers.findIndex((l) => l.id === id);
		if (i < 0) return;
		to = Math.max(0, Math.min(this.layers.length - 1, to));
		if (to === i) return;
		this.history(t('image.hist.moveLayer'), { layers: [] });
		const arr = [...this.layers];
		const [l] = arr.splice(i, 1);
		arr.splice(to, 0, l);
		this.layers = arr;
		this.changed();
	}

	mergeDown(id = this.activeId) {
		const i = this.layers.findIndex((l) => l.id === id);
		if (i <= 0) return;
		const top = this.layers[i], below = this.layers[i - 1];
		this.history(t('image.hist.mergeDown'), { layers: [below] });
		if (below.vector) below.rasterize(true);
		const c = ctx2d(below.canvas);
		if (top.visible) {
			c.save();
			c.globalAlpha = top.opacity;
			c.globalCompositeOperation = top.blend;
			c.drawImage(top.output(), 0, 0);
			c.restore();
		}
		below.touch();
		this.layers = this.layers.filter((l) => l !== top);
		this.activeId = below.id;
		this.changed();
	}

	flatten() {
		if (this.layers.length < 1) return;
		this.history(t('image.hist.flatten'), { layers: [] });
		const flat = this.flattened();
		this.layers = [new Layer({ name: t('image.layer.background'), canvas: flat })];
		this.activeId = this.layers[0].id;
		this.changed();
	}

	// ----- Composição -----

	/**
	 * Compõe as camadas visíveis em `ctx` (coordenadas do documento).
	 * `hook` permite a uma ferramenta desenhar uma camada do seu jeito (traço em andamento, pixels flutuantes).
	 */
	composite(ctx: CanvasRenderingContext2D, hook?: (l: Layer, ctx: CanvasRenderingContext2D) => boolean, onlyVisible = true) {
		for (const l of this.layers) {
			if (onlyVisible && !l.visible) continue;
			ctx.save();
			ctx.globalAlpha = l.opacity;
			ctx.globalCompositeOperation = l.blend;
			if (!hook?.(l, ctx)) ctx.drawImage(l.output(), 0, 0);
			ctx.restore();
		}
	}

	flattened(): HTMLCanvasElement {
		const c = makeCanvas(this.width, this.height);
		this.composite(ctx2d(c));
		return c;
	}

	// ----- Histórico -----

	/** Registra o estado ANTES de uma alteração. Para traços, use begin/end para recortar a região. */
	history(label: string, opts: HistoryOpts = {}) {
		this.begin(label, opts);
		this.end();
	}

	begin(label: string, opts: HistoryOpts = {}) {
		if (this.pending) this.end();
		const layers = opts.layers === 'all' ? this.layers : (opts.layers ?? (this.active ? [this.active] : []));
		const region = opts.region ? intersect(opts.region, this.rect) : null;
		this.pending = {
			label,
			recs: this.layers.map(recOf),
			activeId: this.activeId,
			width: this.width,
			height: this.height,
			patches: layers.map((l) => ({ layer: l, x: region?.x ?? 0, y: region?.y ?? 0, canvas: cloneCanvas(l.canvas, region ?? undefined), fullW: l.canvas.width, fullH: l.canvas.height })),
			sel: opts.selection ? { mask: this.selection.snapshot() } : undefined
		};
	}

	/** Fecha a entrada aberta. `touched` (opcional) recorta os snapshots para a área alterada. */
	end(touched?: Rect | null) {
		const e = this.pending;
		if (!e) return;
		this.pending = null;
		if (touched !== undefined) {
			const r = touched ? intersect({ x: Math.floor(touched.x), y: Math.floor(touched.y), w: Math.ceil(touched.w) + 1, h: Math.ceil(touched.h) + 1 }, this.rect) : null;
			if (!r && !e.sel) return; // nada mudou
			e.patches = r ? e.patches.map((p) => (p.canvas.width === p.fullW && p.canvas.height === p.fullH && p.x === 0 && p.y === 0 ? { ...p, x: r.x, y: r.y, canvas: cloneCanvas(p.canvas, r) } : p)) : [];
		}
		this.undoStack.push(e);
		this.redoStack = [];
		this.trim();
		this.syncLabels();
		this.dirty = true;
	}

	/** Descarta a entrada aberta (operação cancelada), restaurando os pixels. */
	cancel() {
		const e = this.pending;
		if (!e) return;
		this.pending = null;
		this.applyEntry(e);
	}

	private trim() {
		while (this.undoStack.length > MAX_STEPS) this.undoStack.shift();
		let total = this.undoStack.reduce((s, e) => s + entryBytes(e), 0) + this.redoStack.reduce((s, e) => s + entryBytes(e), 0);
		while (total > MAX_BYTES && this.undoStack.length > 1) total -= entryBytes(this.undoStack.shift()!);
	}

	private syncLabels() {
		this.undoLabels = this.undoStack.map((e) => e.label);
		this.redoLabels = this.redoStack.map((e) => e.label).reverse();
	}

	private capture(like: Entry): Entry {
		return {
			label: like.label,
			recs: this.layers.map(recOf),
			activeId: this.activeId,
			width: this.width,
			height: this.height,
			patches: like.patches.map((p) => {
				const sameSize = p.layer.canvas.width === p.fullW && p.layer.canvas.height === p.fullH;
				const r = sameSize ? { x: p.x, y: p.y, w: p.canvas.width, h: p.canvas.height } : undefined;
				return { layer: p.layer, x: r?.x ?? 0, y: r?.y ?? 0, canvas: cloneCanvas(p.layer.canvas, r), fullW: p.layer.canvas.width, fullH: p.layer.canvas.height };
			}),
			sel: like.sel ? { mask: this.selection.snapshot() } : undefined
		};
	}

	private applyEntry(e: Entry) {
		const sizeChanged = e.width !== this.width || e.height !== this.height;
		this.width = e.width;
		this.height = e.height;
		for (const p of e.patches) {
			const c = p.layer.canvas;
			if (c.width !== p.fullW || c.height !== p.fullH) {
				c.width = p.fullW;
				c.height = p.fullH;
			}
			const x = ctx2d(c);
			x.clearRect(p.x, p.y, p.canvas.width, p.canvas.height);
			x.drawImage(p.canvas, p.x, p.y);
		}
		this.layers = e.recs.map((r) => {
			const l = r.layer;
			l.name = r.name;
			l.visible = r.visible;
			l.opacity = r.opacity;
			l.blend = r.blend;
			l.locked = r.locked;
			l.vector = r.vector ? structuredClone(r.vector) : null;
			l.effects = structuredClone(r.effects);
			l.touch();
			return l;
		});
		this.activeId = e.activeId;
		if (sizeChanged) this.selection.resize(this.width, this.height);
		if (e.sel) this.selection.restore(e.sel.mask);
		this.selectionChanged();
		this.changed();
	}

	get canUndo() {
		return this.undoLabels.length > 0;
	}
	get canRedo() {
		return this.redoLabels.length > 0;
	}

	undo() {
		const e = this.undoStack.pop();
		if (!e) return;
		this.redoStack.push(this.capture(e));
		this.applyEntry(e);
		this.syncLabels();
	}

	redo() {
		const e = this.redoStack.pop();
		if (!e) return;
		this.undoStack.push(this.capture(e));
		this.applyEntry(e);
		this.syncLabels();
	}

	// ----- Operações de imagem -----

	/** Redimensiona todas as camadas (reamostragem em etapas para qualidade). */
	resize(w: number, h: number, quality: ImageSmoothingQuality | 'pixel' = 'high') {
		w = Math.max(1, Math.round(w));
		h = Math.max(1, Math.round(h));
		this.history(t('image.hist.resize'), { layers: 'all', selection: true });
		const sx = w / this.width, sy = h / this.height;
		for (const l of this.layers) {
			const src = l.canvas;
			const out = scaleCanvas(src, w, h, quality);
			src.width = w;
			src.height = h;
			ctx2d(src).drawImage(out, 0, 0);
			if (l.vector) {
				const v = l.vector;
				v.x *= sx; v.y *= sy; v.w *= sx; v.h *= sy;
				if (v.type === 'text') v.size *= Math.min(sx, sy);
				else v.strokeWidth *= Math.min(sx, sy);
			}
			l.touch();
		}
		this.width = w;
		this.height = h;
		this.selection.resize(w, h);
		this.selectionChanged();
		this.changed();
	}

	/** Muda o tamanho da tela (canvas) com âncora (0..1, 0..1). Preenche o fundo com `fill` na camada de baixo. */
	canvasSize(w: number, h: number, ax: number, ay: number, fill: string | null = null) {
		const dx = Math.round((w - this.width) * ax), dy = Math.round((h - this.height) * ay);
		this.reframe({ x: -dx, y: -dy, w, h }, t('image.hist.canvasSize'), fill, true);
	}

	/** Recorta o documento ao retângulo (pode ser maior que a imagem: expande). */
	crop(r: Rect, label = t('image.hist.crop')) {
		this.reframe({ x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) }, label, null, false);
	}

	private reframe(r: Rect, label: string, fill: string | null, keepSelection: boolean) {
		this.history(label, { layers: 'all', selection: true });
		this.layers.forEach((l, i) => {
			const old = cloneCanvas(l.canvas);
			l.canvas.width = r.w;
			l.canvas.height = r.h;
			const c = ctx2d(l.canvas);
			if (fill && i === 0 && !l.vector) {
				c.fillStyle = fill;
				c.fillRect(0, 0, r.w, r.h);
			}
			c.drawImage(old, -r.x, -r.y);
			if (l.vector) {
				l.vector.x -= r.x;
				l.vector.y -= r.y;
			}
			l.touch();
		});
		const sel = this.selection.mask ? cloneCanvas(this.selection.mask) : null;
		this.width = r.w;
		this.height = r.h;
		this.selection.resize(r.w, r.h);
		if (sel && keepSelection) {
			const m = makeCanvas(r.w, r.h);
			ctx2d(m).drawImage(sel, -r.x, -r.y);
			this.selection.restore(m);
		}
		this.selectionChanged();
		this.changed();
	}

	/** Gira 90/180/270 (horário) ou espelha a imagem inteira. */
	transform(kind: 'cw' | 'ccw' | '180' | 'flipH' | 'flipV', only?: Layer) {
		const layers = only ? [only] : this.layers;
		this.history(t(only ? 'image.hist.transformLayer' : 'image.hist.transformImage'), { layers: only ? [only] : 'all', selection: !only });
		const swap = !only && (kind === 'cw' || kind === 'ccw');
		const W = this.width, H = this.height;
		const nw = swap ? H : W, nh = swap ? W : H;
		for (const l of layers) {
			if (l.vector) l.rasterize(true);
			const old = cloneCanvas(l.canvas);
			l.canvas.width = nw;
			l.canvas.height = nh;
			const c = ctx2d(l.canvas);
			c.save();
			if (kind === 'cw') { c.translate(nw, 0); c.rotate(Math.PI / 2); }
			else if (kind === 'ccw') { c.translate(0, nh); c.rotate(-Math.PI / 2); }
			else if (kind === '180') { c.translate(nw, nh); c.rotate(Math.PI); }
			else if (kind === 'flipH') { c.translate(nw, 0); c.scale(-1, 1); }
			else { c.translate(0, nh); c.scale(1, -1); }
			if (only && (kind === 'cw' || kind === 'ccw')) {
				// Camada: gira em torno do centro mantendo o tamanho do documento.
				c.setTransform(1, 0, 0, 1, 0, 0);
				c.translate(nw / 2, nh / 2);
				c.rotate(kind === 'cw' ? Math.PI / 2 : -Math.PI / 2);
				c.drawImage(old, -W / 2, -H / 2);
			} else c.drawImage(old, 0, 0);
			c.restore();
			l.touch();
		}
		if (swap) {
			this.width = nw;
			this.height = nh;
		}
		if (!only) this.selection.resize(this.width, this.height);
		this.selectionChanged();
		this.changed();
	}

	/** Corta o espaço transparente em volta do conteúdo. */
	autoCrop() {
		const b = contentBounds(this.flattened());
		if (b && (b.w !== this.width || b.h !== this.height)) this.crop(b, t('image.hist.autoCrop'));
	}
}

/** Reamostragem com qualidade: reduz pela metade em etapas (evita serrilhado em reduções grandes). */
export function scaleCanvas(src: HTMLCanvasElement, w: number, h: number, quality: ImageSmoothingQuality | 'pixel' = 'high'): HTMLCanvasElement {
	let cur = src;
	if (quality !== 'pixel') {
		while (cur.width / 2 >= w && cur.height / 2 >= h && cur.width > 2) {
			const half = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2));
			const c = ctx2d(half);
			c.imageSmoothingQuality = 'high';
			c.drawImage(cur, 0, 0, half.width, half.height);
			cur = half;
		}
	}
	const out = makeCanvas(w, h);
	const c = ctx2d(out);
	c.imageSmoothingEnabled = quality !== 'pixel';
	if (quality !== 'pixel') c.imageSmoothingQuality = quality;
	c.drawImage(cur, 0, 0, w, h);
	return out;
}

export const doc = new ImageDoc();
