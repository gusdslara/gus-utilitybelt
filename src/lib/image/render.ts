// Render: utilitários de canvas, rasterização de camadas vetoriais (formas e textos) e efeitos de camada.
// Tudo síncrono e no thread principal (canvas 2D acelerado por GPU). Pixel pesado vai para os workers.
import type { Box, Effects, Paint, ShapeData, TextData, VectorData, Rect } from './types.ts';
import { hasEffects } from './types.ts';

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
}

export function ctx2d(c: HTMLCanvasElement, willRead = false): CanvasRenderingContext2D {
	return c.getContext('2d', willRead ? { willReadFrequently: true } : undefined)!;
}

export function cloneCanvas(src: HTMLCanvasElement, r?: Rect): HTMLCanvasElement {
	const x = r?.x ?? 0, y = r?.y ?? 0, w = r?.w ?? src.width, h = r?.h ?? src.height;
	const c = makeCanvas(w, h);
	ctx2d(c).drawImage(src, x, y, w, h, 0, 0, w, h);
	return c;
}

export function clearCanvas(c: HTMLCanvasElement) {
	ctx2d(c).clearRect(0, 0, c.width, c.height);
}

/** Interseção de retângulos (null se vazio). */
export function intersect(a: Rect, b: Rect): Rect | null {
	const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
	const r = Math.min(a.x + a.w, b.x + b.w), btm = Math.min(a.y + a.h, b.y + b.h);
	return r > x && btm > y ? { x, y, w: r - x, h: btm - y } : null;
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
	if (!a) return b;
	if (!b) return a;
	const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
	return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function normRect(x0: number, y0: number, x1: number, y1: number): Rect {
	return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

/** Retângulo com conteúdo não transparente (alpha > 0). null se vazio. */
export function contentBounds(c: HTMLCanvasElement, r?: Rect): Rect | null {
	const area = r ?? { x: 0, y: 0, w: c.width, h: c.height };
	if (area.w < 1 || area.h < 1) return null;
	const d = ctx2d(c, true).getImageData(area.x, area.y, area.w, area.h).data;
	let minX = area.w, minY = area.h, maxX = -1, maxY = -1;
	for (let y = 0; y < area.h; y++) {
		const row = y * area.w * 4;
		for (let x = 0; x < area.w; x++) {
			if (d[row + x * 4 + 3]) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				maxY = y;
			}
		}
	}
	return maxX < 0 ? null : { x: area.x + minX, y: area.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ---------- Paint ----------

export function paintStyle(ctx: CanvasRenderingContext2D, p: Paint, b: { x: number; y: number; w: number; h: number }): string | CanvasGradient | null {
	if (p.kind === 'none') return null;
	if (p.kind === 'solid') return p.color;
	const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
	let g: CanvasGradient;
	if (p.kind === 'linear') {
		const a = (p.angle * Math.PI) / 180;
		const len = (Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a))) / 2;
		g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
	} else {
		g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(b.w, b.h) / 2);
	}
	for (const s of p.stops) g.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color);
	return g;
}

// ---------- Formas ----------

/** Caminho da forma no espaço local (0,0)-(w,h). */
export function shapePath(s: Pick<ShapeData, 'shape' | 'w' | 'h' | 'radius' | 'sides' | 'inner' | 'strokeWidth'>): Path2D {
	const p = new Path2D();
	const { w, h } = s;
	const cx = w / 2, cy = h / 2;
	switch (s.shape) {
		case 'rect':
			p.rect(0, 0, w, h);
			break;
		case 'roundrect':
			p.roundRect(0, 0, w, h, Math.min(s.radius, Math.abs(w) / 2, Math.abs(h) / 2));
			break;
		case 'ellipse':
			p.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
			break;
		case 'line':
			p.moveTo(0, 0);
			p.lineTo(w, h);
			break;
		case 'arrow': {
			const len = Math.hypot(w, h) || 1;
			const head = Math.min(len * 0.35, Math.max(14, s.strokeWidth * 4));
			const a = Math.atan2(h, w);
			p.moveTo(0, 0);
			p.lineTo(w, h);
			p.moveTo(w - head * Math.cos(a - 0.45), h - head * Math.sin(a - 0.45));
			p.lineTo(w, h);
			p.lineTo(w - head * Math.cos(a + 0.45), h - head * Math.sin(a + 0.45));
			break;
		}
		case 'triangle':
			p.moveTo(cx, 0);
			p.lineTo(w, h);
			p.lineTo(0, h);
			p.closePath();
			break;
		case 'polygon':
		case 'star': {
			const n = Math.max(3, Math.round(s.sides));
			const pts = s.shape === 'star' ? n * 2 : n;
			for (let i = 0; i < pts; i++) {
				const r = s.shape === 'star' && i % 2 ? s.inner : 1;
				const a = -Math.PI / 2 + (i * Math.PI * 2) / pts;
				const x = cx + Math.cos(a) * (w / 2) * r, y = cy + Math.sin(a) * (h / 2) * r;
				if (i) p.lineTo(x, y);
				else p.moveTo(x, y);
			}
			p.closePath();
			break;
		}
		case 'heart':
			p.moveTo(cx, h * 0.3);
			p.bezierCurveTo(cx, h * 0.1, w * 0.05, 0, w * 0.05, h * 0.32);
			p.bezierCurveTo(w * 0.05, h * 0.6, cx, h * 0.78, cx, h);
			p.bezierCurveTo(cx, h * 0.78, w * 0.95, h * 0.6, w * 0.95, h * 0.32);
			p.bezierCurveTo(w * 0.95, 0, cx, h * 0.1, cx, h * 0.3);
			p.closePath();
			break;
		case 'speech': {
			const bh = h * 0.78;
			const r = Math.min(s.radius, w / 2, bh / 2);
			p.moveTo(r, 0);
			p.arcTo(w, 0, w, bh, r);
			p.arcTo(w, bh, 0, bh, r);
			p.lineTo(w * 0.42, bh);
			p.lineTo(w * 0.2, h);
			p.lineTo(w * 0.26, bh);
			p.arcTo(0, bh, 0, 0, r);
			p.arcTo(0, 0, w, 0, r);
			p.closePath();
			break;
		}
	}
	return p;
}

export const isOpenShape = (k: ShapeData['shape']) => k === 'line' || k === 'arrow';

// ---------- Texto ----------

export function fontString(t: Pick<TextData, 'italic' | 'weight' | 'size' | 'font'>) {
	return `${t.italic ? 'italic ' : ''}${t.weight} ${t.size}px ${t.font}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function mctx() {
	if (!measureCtx) measureCtx = ctx2d(makeCanvas(1, 1));
	return measureCtx;
}

/** Mede o bloco de texto (largura máx. das linhas e altura). */
export function measureText(t: TextData): { w: number; h: number; lines: string[]; lineH: number } {
	const c = mctx();
	c.font = fontString(t);
	c.letterSpacing = `${t.letterSpacing}px`;
	const lines = t.text.split('\n');
	const lineH = t.size * t.lineHeight;
	let w = 0;
	for (const l of lines) w = Math.max(w, c.measureText(l || ' ').width);
	return { w: Math.ceil(w), h: Math.ceil(lineH * lines.length), lines, lineH };
}

/** Atualiza w/h da caixa do texto a partir da medida (o texto não estica: muda o tamanho da fonte). */
export function fitTextBox(t: TextData) {
	const m = measureText(t);
	t.w = Math.max(1, m.w);
	t.h = Math.max(1, m.h);
}

function drawText(ctx: CanvasRenderingContext2D, t: TextData) {
	const m = measureText(t);
	ctx.font = fontString(t);
	ctx.letterSpacing = `${t.letterSpacing}px`;
	ctx.textBaseline = 'middle';
	ctx.textAlign = t.align;
	const ax = t.align === 'left' ? 0 : t.align === 'center' ? t.w / 2 : t.w;
	const fill = paintStyle(ctx, t.fill, { x: 0, y: 0, w: t.w, h: t.h });
	m.lines.forEach((line, i) => {
		const y = i * m.lineH + m.lineH / 2;
		if (t.stroke && t.strokeWidth > 0) {
			ctx.lineJoin = 'round';
			ctx.lineWidth = t.strokeWidth * 2;
			ctx.strokeStyle = t.stroke;
			ctx.strokeText(line, ax, y);
		}
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fillText(line, ax, y);
		}
	});
}

function drawShape(ctx: CanvasRenderingContext2D, s: ShapeData) {
	const path = shapePath(s);
	const open = isOpenShape(s.shape);
	const fill = open ? null : paintStyle(ctx, s.fill, { x: 0, y: 0, w: s.w, h: s.h });
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fill(path);
	}
	const strokeColor = open ? s.stroke || (s.fill.kind === 'solid' ? s.fill.color : '#000') : s.stroke;
	if (strokeColor && s.strokeWidth > 0) {
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.lineWidth = s.strokeWidth;
		ctx.strokeStyle = strokeColor;
		if (s.dash) ctx.setLineDash([s.strokeWidth * 3, s.strokeWidth * 2]);
		ctx.stroke(path);
		ctx.setLineDash([]);
	}
}

/** Aplica a transformação da caixa (translação + rotação no centro). */
export function applyBox(ctx: CanvasRenderingContext2D, b: Box) {
	const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
	ctx.translate(cx, cy);
	ctx.rotate((b.rotation * Math.PI) / 180);
	ctx.translate(-b.w / 2, -b.h / 2);
}

/** Desenha o vetor em um contexto (coordenadas do documento). */
export function drawVector(ctx: CanvasRenderingContext2D, v: VectorData) {
	ctx.save();
	if (v.type === 'text') fitTextBox(v);
	// Formas com w/h negativos (arrastar para trás) são normalizadas pelo próprio caminho.
	applyBox(ctx, v);
	if (v.type === 'text') drawText(ctx, v);
	else drawShape(ctx, v);
	ctx.restore();
}

/** Rasteriza o vetor na camada (canvas do tamanho do documento). */
export function rasterizeVector(target: HTMLCanvasElement, v: VectorData) {
	const c = ctx2d(target);
	c.clearRect(0, 0, target.width, target.height);
	drawVector(c, v);
}

/** Cantos da caixa rotacionada (para alças e hit-test). */
export function boxCorners(b: Box): [number, number][] {
	const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
	const a = (b.rotation * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
	return [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]].map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos] as [number, number]);
}

/** Ponto do documento para o espaço local da caixa (0..w, 0..h). */
export function toBoxLocal(b: Box, px: number, py: number): [number, number] {
	const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
	const a = (-b.rotation * Math.PI) / 180;
	const dx = px - cx, dy = py - cy;
	return [dx * Math.cos(a) - dy * Math.sin(a) + b.w / 2, dx * Math.sin(a) + dy * Math.cos(a) + b.h / 2];
}

// ---------- Efeitos ----------

function tinted(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
	const c = cloneCanvas(src);
	const x = ctx2d(c);
	x.globalCompositeOperation = 'source-in';
	x.fillStyle = color;
	x.fillRect(0, 0, c.width, c.height);
	return c;
}

function mixColor(hex: string, toward: string, t: number) {
	const a = parseInt(hex.slice(1, 7), 16), b = parseInt(toward.slice(1, 7), 16);
	const ch = (v: number, s: number) => (v >> s) & 255;
	const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
	return `rgb(${m(16)} ${m(8)} ${m(0)})`;
}

/**
 * Renderiza a camada com efeitos em `out` (mesmo tamanho). Ordem: sombra, brilho, extrusão 3D, contorno, conteúdo.
 * Retorna `out` (criado se não for passado).
 */
export function renderEffects(src: HTMLCanvasElement, fx: Effects, out?: HTMLCanvasElement): HTMLCanvasElement {
	const dst = out && out.width === src.width && out.height === src.height ? out : makeCanvas(src.width, src.height);
	const c = ctx2d(dst);
	c.clearRect(0, 0, dst.width, dst.height);
	if (!hasEffects(fx)) {
		c.drawImage(src, 0, 0);
		return dst;
	}
	// Base que recebe sombra/brilho: conteúdo + extrusão + contorno.
	const body = makeCanvas(src.width, src.height);
	const b = ctx2d(body);
	if (fx.extrude.on && fx.extrude.depth > 0) {
		const a = (fx.extrude.angle * Math.PI) / 180;
		const dx = Math.cos(a), dy = Math.sin(a);
		const steps = Math.min(200, Math.round(fx.extrude.depth));
		const base = fx.extrude.color.startsWith('#') ? fx.extrude.color : '#555555';
		for (let i = steps; i >= 1; i--) {
			const shade = mixColor(base, '#000000', (i / steps) * fx.extrude.shade);
			b.drawImage(tinted(src, shade), dx * i, dy * i);
		}
	}
	if (fx.outline.on && fx.outline.width > 0) {
		const ow = tinted(src, fx.outline.color);
		const r = fx.outline.width;
		const n = Math.max(12, Math.round(r * 3));
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			b.drawImage(ow, Math.cos(a) * r, Math.sin(a) * r);
		}
	}
	b.drawImage(src, 0, 0);

	if (fx.glow.on) {
		const g = tinted(body, fx.glow.color);
		c.save();
		c.filter = `blur(${fx.glow.blur}px)`;
		for (let i = 0; i < Math.max(1, Math.round(fx.glow.strength)); i++) c.drawImage(g, 0, 0);
		c.restore();
	}
	if (fx.shadow.on) {
		c.save();
		c.globalAlpha = fx.shadow.opacity;
		c.filter = `blur(${fx.shadow.blur}px)`;
		c.drawImage(tinted(body, fx.shadow.color), fx.shadow.x, fx.shadow.y);
		c.restore();
	}
	c.drawImage(body, 0, 0);
	return dst;
}

// ---------- Fundo xadrez ----------

let checker: CanvasPattern | null = null;
export function checkerPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
	if (checker) return checker;
	const s = 8;
	const c = makeCanvas(s * 2, s * 2);
	const x = ctx2d(c);
	x.fillStyle = '#ffffff';
	x.fillRect(0, 0, s * 2, s * 2);
	x.fillStyle = '#d6d9e0';
	x.fillRect(0, 0, s, s);
	x.fillRect(s, s, s, s);
	checker = ctx.createPattern(c, 'repeat')!;
	return checker;
}

/** Copia de um canvas um retângulo como ImageData. */
export function readPixels(c: HTMLCanvasElement, r?: Rect): ImageData {
	const x = r?.x ?? 0, y = r?.y ?? 0, w = r?.w ?? c.width, h = r?.h ?? c.height;
	return ctx2d(c, true).getImageData(x, y, w, h);
}

export function canvasFromImageData(d: ImageData): HTMLCanvasElement {
	const c = makeCanvas(d.width, d.height);
	ctx2d(c).putImageData(d, 0, 0);
	return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
	return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error(`toBlob ${type} failed`))), type, quality));
}
