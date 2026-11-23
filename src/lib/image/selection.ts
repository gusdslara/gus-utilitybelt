// Seleção como máscara alfa (canvas do tamanho do documento): suporta suavização (antialias/feather),
// combinação por modo (substituir, somar, subtrair, interseção) e contorno animado ("formigas").
import type { Rect, SelectMode } from './types.ts';
import { makeCanvas, ctx2d, cloneCanvas, contentBounds } from './render.ts';

export class Selection {
	mask: HTMLCanvasElement | null = null;
	bounds: Rect | null = null;
	outline: Path2D | null = null;
	/** Número de segmentos do contorno (para decidir se anima). */
	segments = 0;

	constructor(public w: number, public h: number) {}

	get active() {
		return !!this.mask && !!this.bounds;
	}

	resize(w: number, h: number) {
		this.w = w;
		this.h = h;
		this.clear();
	}

	clear() {
		this.mask = null;
		this.bounds = null;
		this.outline = null;
		this.segments = 0;
	}

	all() {
		this.mask = makeCanvas(this.w, this.h);
		const c = ctx2d(this.mask);
		c.fillStyle = '#000';
		c.fillRect(0, 0, this.w, this.h);
		this.update();
	}

	/** Combina uma forma desenhada por `draw` (preto opaco = selecionado) com a seleção atual. */
	apply(mode: SelectMode, draw: (ctx: CanvasRenderingContext2D) => void) {
		const shape = makeCanvas(this.w, this.h);
		const sc = ctx2d(shape);
		sc.fillStyle = '#000';
		sc.strokeStyle = '#000';
		draw(sc);
		this.combine(mode, shape);
	}

	/** Combina uma máscara de 1 byte por pixel (0..255) com a seleção. `at` posiciona máscaras parciais. */
	applyAlpha(mode: SelectMode, alpha: ArrayLike<number>, mw = this.w, mh = this.h, at = { x: 0, y: 0 }) {
		const img = new ImageData(mw, mh);
		const d = img.data;
		for (let i = 0, n = mw * mh; i < n; i++) d[i * 4 + 3] = alpha[i];
		const shape = makeCanvas(this.w, this.h);
		ctx2d(shape).putImageData(img, at.x, at.y);
		this.combine(mode, shape);
	}

	combine(mode: SelectMode, shape: HTMLCanvasElement) {
		if (mode === 'replace' || !this.mask) {
			if (mode === 'subtract' || mode === 'intersect') {
				// Subtrair/intersectar sem seleção: nada a fazer / vazio.
				if (!this.mask) return this.clear();
			}
			this.mask = shape;
		} else {
			const c = ctx2d(this.mask);
			c.save();
			c.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'subtract' ? 'destination-out' : 'destination-in';
			c.drawImage(shape, 0, 0);
			c.restore();
		}
		this.update();
	}

	invert() {
		const inv = makeCanvas(this.w, this.h);
		const c = ctx2d(inv);
		c.fillStyle = '#000';
		c.fillRect(0, 0, this.w, this.h);
		if (this.mask) {
			c.globalCompositeOperation = 'destination-out';
			c.drawImage(this.mask, 0, 0);
		}
		this.mask = inv;
		this.update();
	}

	/** Suaviza a borda (desfoque gaussiano da máscara). */
	feather(px: number) {
		if (!this.mask || px <= 0) return;
		const out = makeCanvas(this.w, this.h);
		const c = ctx2d(out);
		c.filter = `blur(${px}px)`;
		c.drawImage(this.mask, 0, 0);
		this.mask = out;
		this.update();
	}

	/** Expande (px > 0) ou contrai (px < 0) a seleção: desfoque + limiar. */
	grow(px: number) {
		if (!this.mask || !px) return;
		const r = Math.abs(px);
		const blurred = makeCanvas(this.w, this.h);
		const c = ctx2d(blurred, true);
		c.filter = `blur(${r / 2}px)`;
		c.drawImage(this.mask, 0, 0);
		const img = c.getImageData(0, 0, this.w, this.h);
		const d = img.data;
		const th = px > 0 ? 8 : 247;
		for (let i = 3; i < d.length; i += 4) d[i] = d[i] > th ? 255 : 0;
		c.putImageData(img, 0, 0);
		// Expande mais um pouco com desfoque repetido quando o raio é grande.
		this.mask = blurred;
		this.update();
	}

	/** Endurece a borda (remove antialias). */
	harden() {
		if (!this.mask) return;
		const c = ctx2d(this.mask, true);
		const img = c.getImageData(0, 0, this.w, this.h);
		const d = img.data;
		for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
		c.putImageData(img, 0, 0);
		this.update();
	}

	contains(x: number, y: number) {
		if (!this.mask || !this.bounds) return false;
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
		return ctx2d(this.mask, true).getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] >= 128;
	}

	/** Alfa da máscara (1 byte por pixel) no retângulo. */
	alpha(r: Rect = { x: 0, y: 0, w: this.w, h: this.h }): Uint8ClampedArray {
		const out = new Uint8ClampedArray(r.w * r.h);
		if (!this.mask) return out.fill(255);
		const d = ctx2d(this.mask, true).getImageData(r.x, r.y, r.w, r.h).data;
		for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
		return out;
	}

	snapshot(): HTMLCanvasElement | null {
		return this.mask ? cloneCanvas(this.mask) : null;
	}

	restore(m: HTMLCanvasElement | null) {
		if (m && (m.width !== this.w || m.height !== this.h)) {
			this.w = m.width;
			this.h = m.height;
		}
		this.mask = m ? cloneCanvas(m) : null;
		this.update();
	}

	/** Recalcula limites e o contorno (bordas entre pixel dentro/fora, com limiar 50%). */
	update() {
		if (!this.mask) return this.clear();
		const b = contentBounds(this.mask);
		if (!b) return this.clear();
		this.bounds = b;
		const x0 = Math.max(0, b.x - 1), y0 = Math.max(0, b.y - 1);
		const x1 = Math.min(this.w, b.x + b.w + 1), y1 = Math.min(this.h, b.y + b.h + 1);
		const W = x1 - x0, H = y1 - y0;
		const d = ctx2d(this.mask, true).getImageData(x0, y0, W, H).data;
		const inside = new Uint8Array(W * H);
		for (let i = 0; i < inside.length; i++) inside[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
		const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : inside[y * W + x]);
		const p = new Path2D();
		let segs = 0;
		// Bordas horizontais (no topo de cada linha y), juntando trechos contínuos.
		for (let y = 0; y <= H; y++) {
			let start = -1;
			for (let x = 0; x <= W; x++) {
				const edge = x < W && at(x, y) !== at(x, y - 1);
				if (edge && start < 0) start = x;
				else if (!edge && start >= 0) {
					p.moveTo(x0 + start, y0 + y);
					p.lineTo(x0 + x, y0 + y);
					segs++;
					start = -1;
				}
			}
		}
		// Bordas verticais (à esquerda de cada coluna x).
		for (let x = 0; x <= W; x++) {
			let start = -1;
			for (let y = 0; y <= H; y++) {
				const edge = y < H && at(x, y) !== at(x - 1, y);
				if (edge && start < 0) start = y;
				else if (!edge && start >= 0) {
					p.moveTo(x0 + x, y0 + start);
					p.lineTo(x0 + x, y0 + y);
					segs++;
					start = -1;
				}
			}
		}
		this.outline = p;
		this.segments = segs;
	}
}

/** Desenha a seleção como máscara de recorte: mantém em `ctx` só o que está selecionado. */
export function clipToSelection(ctx: CanvasRenderingContext2D, sel: Selection, offset = { x: 0, y: 0 }) {
	if (!sel.mask) return;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'destination-in';
	ctx.drawImage(sel.mask, -offset.x, -offset.y);
	ctx.restore();
}
