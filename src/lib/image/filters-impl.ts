// Implementação pura dos filtros (sem DOM): roda no worker e no Bun (testes).
// Convenções:
// - Entrada/saída em RGBA 8 bits não pré-multiplicado (como ImageData). A saída é sempre um buffer novo.
// - Desfoques e reamostragens trabalham em float pré-multiplicado, para pixels transparentes não vazarem halo escuro.
// - Tudo em typed arrays, sem alocação por pixel. Desfoques grandes usam caixas deslizantes (O(n) independente do raio).
import { filterById, defaultParams } from './filters.ts';

export type PixelBuf = { data: Uint8ClampedArray; width: number; height: number };
export type FilterParams = Record<string, number | string | boolean>;
type Prog = (v: number) => void;

const noop: Prog = () => {};
/** Sub-faixa de progresso [a, b] dentro do progresso total. */
const sub = (p: Prog, a: number, b: number): Prog => (v) => p(a + (b - a) * v);
/** Reporta a cada ~1/40 das linhas. */
const ticker = (p: Prog, h: number) => {
	const step = Math.max(1, Math.floor(h / 40));
	return (y: number) => {
		if (y % step === 0) p(y / h);
	};
};

const blank = (src: PixelBuf): PixelBuf => ({ data: new Uint8ClampedArray(src.data.length), width: src.width, height: src.height });
const copyBuf = (src: PixelBuf): PixelBuf => ({ data: new Uint8ClampedArray(src.data), width: src.width, height: src.height });
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const DEG = Math.PI / 180;

/** PRNG determinístico (mulberry32): a prévia e o resultado final usam a mesma sequência. */
function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const hexToRgb = (hex: string): [number, number, number] => {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	const n = m ? parseInt(m[1], 16) : 0;
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// ---------- HSL (saída em variáveis de módulo para não alocar) ----------
let H = 0, S = 0, L = 0, R = 0, G = 0, B = 0;
function rgbToHsl(r: number, g: number, b: number) {
	r /= 255; g /= 255; b /= 255;
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
	L = (mx + mn) / 2;
	if (mx === mn) { H = 0; S = 0; return; }
	const d = mx - mn;
	S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
	if (mx === r) H = (g - b) / d + (g < b ? 6 : 0);
	else if (mx === g) H = (b - r) / d + 2;
	else H = (r - g) / d + 4;
	H /= 6;
}
const hue2rgb = (p: number, q: number, t: number) => {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
};
function hslToRgb(h: number, s: number, l: number) {
	if (s === 0) { R = G = B = l * 255; return; }
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
	R = hue2rgb(p, q, h + 1 / 3) * 255;
	G = hue2rgb(p, q, h) * 255;
	B = hue2rgb(p, q, h - 1 / 3) * 255;
}

// ---------- Utilitários de pixel ----------
type PixelFn = (d: Uint8ClampedArray, o: Uint8ClampedArray, i: number) => void;
function perPixel(src: PixelBuf, prog: Prog, fn: PixelFn): PixelBuf {
	const out = blank(src), d = src.data, o = out.data, w = src.width, h = src.height, tick = ticker(prog, h);
	for (let y = 0; y < h; y++) {
		tick(y);
		const end = (y + 1) * w * 4;
		for (let i = y * w * 4; i < end; i += 4) fn(d, o, i);
	}
	return out;
}
/** Aplica uma tabela por canal (RGB); alfa preservado. */
function applyLut(src: PixelBuf, prog: Prog, lr: ArrayLike<number>, lg = lr, lb = lr): PixelBuf {
	return perPixel(src, prog, (d, o, i) => {
		o[i] = lr[d[i]]; o[i + 1] = lg[d[i + 1]]; o[i + 2] = lb[d[i + 2]]; o[i + 3] = d[i + 3];
	});
}
const makeLut = (fn: (v: number) => number) => {
	const t = new Float32Array(256);
	for (let v = 0; v < 256; v++) t[v] = fn(v);
	return t;
};
const luma709 = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Contraste/brilho estilo "Brilho e contraste": brilho desloca, contraste escala em torno do meio-tom. */
const bcLut = (brightness: number, contrast: number) => {
	const bOff = brightness * 1.275;
	const c = clamp(contrast, -100, 100) * 2.55 * 0.99;
	const f = (259 * (c + 255)) / (255 * (259 - c));
	return makeLut((v) => f * (v + bOff - 128) + 128);
};

function toPremul(d: Uint8ClampedArray): Float32Array {
	const f = new Float32Array(d.length);
	for (let i = 0; i < d.length; i += 4) {
		const a = d[i + 3], k = a / 255;
		f[i] = d[i] * k; f[i + 1] = d[i + 1] * k; f[i + 2] = d[i + 2] * k; f[i + 3] = a;
	}
	return f;
}
/** Volta de pré-multiplicado para RGBA 8 bits. */
function fromPremul(f: Float32Array, w: number, h: number): PixelBuf {
	const o = new Uint8ClampedArray(f.length);
	for (let i = 0; i < f.length; i += 4) {
		const a = f[i + 3];
		if (a < 0.01) continue; // totalmente transparente: zeros
		const k = 255 / a;
		o[i] = f[i] * k; o[i + 1] = f[i + 1] * k; o[i + 2] = f[i + 2] * k; o[i + 3] = a;
	}
	return { data: o, width: w, height: h };
}
/** Versão "reta" (não pré-multiplicada) em float, para comparar com a imagem original. */
function unpremulFloat(f: Float32Array): Float32Array {
	const o = new Float32Array(f.length);
	for (let i = 0; i < f.length; i += 4) {
		const a = f[i + 3];
		o[i + 3] = a;
		if (a < 0.01) continue;
		const k = 255 / a;
		o[i] = f[i] * k; o[i + 1] = f[i + 1] * k; o[i + 2] = f[i + 2] * k;
	}
	return o;
}

// ---------- Desfoques base ----------
/** Caixa horizontal deslizante (raio inteiro r ≥ 1), bordas estendidas. */
function boxH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
	const norm = 1 / (2 * r + 1), last = w - 1;
	for (let y = 0; y < h; y++) {
		const base = y * w * 4;
		let s0 = (r + 1) * src[base], s1 = (r + 1) * src[base + 1], s2 = (r + 1) * src[base + 2], s3 = (r + 1) * src[base + 3];
		for (let k = 1; k <= r; k++) {
			const j = base + (k < last ? k : last) * 4;
			s0 += src[j]; s1 += src[j + 1]; s2 += src[j + 2]; s3 += src[j + 3];
		}
		for (let x = 0; x < w; x++) {
			const o = base + x * 4;
			dst[o] = s0 * norm; dst[o + 1] = s1 * norm; dst[o + 2] = s2 * norm; dst[o + 3] = s3 * norm;
			const xa = x + r + 1, xr = x - r;
			const a = base + (xa < last ? xa : last) * 4, rm = base + (xr > 0 ? xr : 0) * 4;
			s0 += src[a] - src[rm]; s1 += src[a + 1] - src[rm + 1]; s2 += src[a + 2] - src[rm + 2]; s3 += src[a + 3] - src[rm + 3];
		}
	}
}
/** Caixa vertical deslizante percorrendo linhas inteiras (amigável ao cache). */
function boxV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
	const rw = w * 4, norm = 1 / (2 * r + 1), last = h - 1;
	const acc = new Float64Array(rw);
	for (let i = 0; i < rw; i++) acc[i] = (r + 1) * src[i];
	for (let k = 1; k <= r; k++) {
		const row = (k < last ? k : last) * rw;
		for (let i = 0; i < rw; i++) acc[i] += src[row + i];
	}
	for (let y = 0; y < h; y++) {
		const o = y * rw, ya = y + r + 1, yr = y - r;
		const add = (ya < last ? ya : last) * rw, rem = (yr > 0 ? yr : 0) * rw;
		for (let i = 0; i < rw; i++) {
			dst[o + i] = acc[i] * norm;
			acc[i] += src[add + i] - src[rem + i];
		}
	}
}
/** Convolução separável com kernel explícito (para sigmas pequenos, onde a caixa é grosseira). */
function convSep(f: Float32Array, tmp: Float32Array, w: number, h: number, k: Float32Array, prog: Prog) {
	const kr = (k.length - 1) >> 1, lastX = w - 1, lastY = h - 1;
	for (let y = 0; y < h; y++) {
		const base = y * w * 4;
		for (let x = 0; x < w; x++) {
			let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
			for (let j = -kr; j <= kr; j++) {
				const xx = x + j, q = base + (xx < 0 ? 0 : xx > lastX ? lastX : xx) * 4, kv = k[j + kr];
				s0 += f[q] * kv; s1 += f[q + 1] * kv; s2 += f[q + 2] * kv; s3 += f[q + 3] * kv;
			}
			const o = base + x * 4;
			tmp[o] = s0; tmp[o + 1] = s1; tmp[o + 2] = s2; tmp[o + 3] = s3;
		}
	}
	prog(0.5);
	const rw = w * 4;
	for (let y = 0; y < h; y++) {
		const o = y * rw;
		for (let i = 0; i < rw; i++) f[o + i] = 0;
		for (let j = -kr; j <= kr; j++) {
			const yy = y + j, row = (yy < 0 ? 0 : yy > lastY ? lastY : yy) * rw, kv = k[j + kr];
			for (let i = 0; i < rw; i++) f[o + i] += tmp[row + i] * kv;
		}
	}
	prog(1);
}
/** Tamanhos de caixa para aproximar uma gaussiana com n passes (Kovesi). */
function boxesForGauss(sigma: number, n: number): number[] {
	const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
	let wl = Math.floor(wIdeal);
	if (wl % 2 === 0) wl--;
	const wu = wl + 2;
	const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
	const r: number[] = [];
	for (let i = 0; i < n; i++) r.push(((i < m ? wl : wu) - 1) / 2);
	return r;
}
/** Desfoque gaussiano in-place sobre float pré-multiplicado. sigma ≤ 3: kernel exato; acima: 3 caixas. */
function gaussInPlace(f: Float32Array, w: number, h: number, sigma: number, prog: Prog) {
	if (sigma < 0.2) { prog(1); return; }
	const tmp = new Float32Array(f.length);
	if (sigma <= 3) {
		const kr = Math.max(1, Math.ceil(sigma * 3));
		const k = new Float32Array(2 * kr + 1);
		let sum = 0;
		for (let i = -kr; i <= kr; i++) sum += k[i + kr] = Math.exp((-i * i) / (2 * sigma * sigma));
		for (let i = 0; i < k.length; i++) k[i] /= sum;
		convSep(f, tmp, w, h, k, prog);
		return;
	}
	const boxes = boxesForGauss(sigma, 3);
	boxes.forEach((r, i) => {
		if (r >= 1) { boxH(f, tmp, w, h, r); boxV(tmp, f, w, h, r); }
		prog((i + 1) / 3);
	});
}
function boxInPlace(f: Float32Array, w: number, h: number, r: number) {
	if (r < 1) return;
	const tmp = new Float32Array(f.length);
	boxH(f, tmp, w, h, r);
	boxV(tmp, f, w, h, r);
}

/**
 * Média de amostras transformadas, composta em passes. Cada pass é uma lista de afins [a, b, c, d, tx, ty]
 * (x' = a·x + b·y + tx, y' = c·x + d·y + ty); amostragem bilinear com borda estendida.
 * Truque: um borrão de linha/rotação/zoom com T^m amostras vira m passes de T amostras (as transformações compõem).
 */
function affinePasses(f: Float32Array, w: number, h: number, passes: Float64Array[][], prog: Prog): Float32Array {
	let src: Float32Array = f, dst: Float32Array = new Float32Array(f.length);
	const lastX = w - 1, lastY = h - 1;
	passes.forEach((xfs, pi) => {
		const T = xfs.length, inv = 1 / T, p = sub(prog, pi / passes.length, (pi + 1) / passes.length), tick = ticker(p, h);
		for (let y = 0; y < h; y++) {
			tick(y);
			for (let x = 0; x < w; x++) {
				let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
				for (let t = 0; t < T; t++) {
					const m = xfs[t];
					let sx = m[0] * x + m[1] * y + m[4], sy = m[2] * x + m[3] * y + m[5];
					sx = sx < 0 ? 0 : sx > lastX ? lastX : sx;
					sy = sy < 0 ? 0 : sy > lastY ? lastY : sy;
					const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
					const x1 = x0 < lastX ? x0 + 1 : x0, y1 = y0 < lastY ? y0 + 1 : y0;
					const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
					const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
					s0 += src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
					s1 += src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
					s2 += src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
					s3 += src[i00 + 3] * w00 + src[i10 + 3] * w10 + src[i01 + 3] * w01 + src[i11 + 3] * w11;
				}
				const o = (y * w + x) * 4;
				dst[o] = s0 * inv; dst[o + 1] = s1 * inv; dst[o + 2] = s2 * inv; dst[o + 3] = s3 * inv;
			}
		}
		const t = src; src = dst; dst = t; // `f` é temporário nosso: pode ser reaproveitado
	});
	return src;
}
/** Quantos passes de T amostras para que o passo final fique ≤ 1 px (extent = deslocamento máximo em px). */
const passCount = (extent: number, T: number, max = 4) => clamp(Math.ceil(Math.log(Math.max(extent, 1.0001)) / Math.log(T)), 1, max);

/** Reamostra por mapeamento inverso: `map(x, y)` grava a coordenada de origem em `pt`. */
function remap(src: PixelBuf, prog: Prog, map: (x: number, y: number, pt: Float64Array) => void): PixelBuf {
	const { width: w, height: h } = src, f = toPremul(src.data), o = new Float32Array(f.length), pt = new Float64Array(2);
	const lastX = w - 1, lastY = h - 1, tick = ticker(prog, h);
	for (let y = 0; y < h; y++) {
		tick(y);
		for (let x = 0; x < w; x++) {
			map(x, y, pt);
			let sx = pt[0], sy = pt[1];
			sx = sx < 0 ? 0 : sx > lastX ? lastX : sx;
			sy = sy < 0 ? 0 : sy > lastY ? lastY : sy;
			const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
			const x1 = x0 < lastX ? x0 + 1 : x0, y1 = y0 < lastY ? y0 + 1 : y0;
			const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
			const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy, q = (y * w + x) * 4;
			for (let c = 0; c < 4; c++) o[q + c] = f[i00 + c] * w00 + f[i10 + c] * w10 + f[i01 + c] * w01 + f[i11 + c] * w11;
		}
	}
	return fromPremul(o, w, h);
}

/** Desfoque bilateral separável (aproximação do "desfoque de superfície"): peso por canal cai com a diferença de cor. */
function bilateral(src: PixelBuf, r: number, thr: number, prog: Prog): PixelBuf {
	const { width: w, height: h, data: d } = src;
	const a = new Float32Array(d.length);
	for (let i = 0; i < d.length; i++) a[i] = d[i];
	const b = new Float32Array(d.length);
	const k = 1 / (2.5 * Math.max(1, thr));
	// pass(linhas, comprimento, passo entre linhas, passo dentro da linha) em unidades de pixel
	const pass = (inp: Float32Array, out: Float32Array, lines: number, len: number, lineStep: number, step: number, p: Prog) => {
		const tick = ticker(p, lines), last = len - 1;
		for (let l = 0; l < lines; l++) {
			tick(l);
			for (let pos = 0; pos < len; pos++) {
				const ci = (l * lineStep + pos * step) * 4;
				const c0 = inp[ci], c1 = inp[ci + 1], c2 = inp[ci + 2];
				let s0 = 0, s1 = 0, s2 = 0, w0 = 0, w1 = 0, w2 = 0;
				for (let j = -r; j <= r; j++) {
					const pp = pos + j, qi = (l * lineStep + (pp < 0 ? 0 : pp > last ? last : pp) * step) * 4;
					const al = d[qi + 3] / 255;
					if (al === 0 && j !== 0) continue;
					const v0 = inp[qi], v1 = inp[qi + 1], v2 = inp[qi + 2];
					let t = 1 - Math.abs(v0 - c0) * k; if (t > 0) { t *= al; s0 += v0 * t; w0 += t; }
					t = 1 - Math.abs(v1 - c1) * k; if (t > 0) { t *= al; s1 += v1 * t; w1 += t; }
					t = 1 - Math.abs(v2 - c2) * k; if (t > 0) { t *= al; s2 += v2 * t; w2 += t; }
				}
				out[ci] = w0 > 0 ? s0 / w0 : c0; out[ci + 1] = w1 > 0 ? s1 / w1 : c1; out[ci + 2] = w2 > 0 ? s2 / w2 : c2;
				out[ci + 3] = inp[ci + 3];
			}
		}
	};
	pass(a, b, h, w, w, 1, sub(prog, 0, 0.5));
	pass(b, a, w, h, 1, w, sub(prog, 0.5, 1));
	return { data: new Uint8ClampedArray(a), width: w, height: h };
}

/** Grade de células (quadrada ou hexagonal) com cor média ponderada pelo alfa. */
function pixelate(src: PixelBuf, size: number, hex: boolean, prog: Prog): PixelBuf {
	const { width: w, height: h, data: d } = src, n = w * h, cell = new Int32Array(n);
	let cells: number;
	if (!hex) {
		const cols = Math.ceil(w / size);
		cells = cols * Math.ceil(h / size);
		for (let y = 0; y < h; y++) {
			const row = Math.floor(y / size) * cols;
			for (let x = 0; x < w; x++) cell[y * w + x] = row + Math.floor(x / size);
		}
	} else {
		// Hexágonos "pointy-top" em coordenadas axiais, com arredondamento cúbico.
		const Rh = size / Math.sqrt(3);
		const qMin = Math.floor(-h / 3 / Rh) - 2, qMax = Math.ceil((Math.sqrt(3) / 3) * w / Rh) + 2;
		const rMax = Math.ceil(((2 / 3) * h) / Rh) + 2, rMin = -2, qn = qMax - qMin + 1;
		cells = qn * (rMax - rMin + 1);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const qf = ((Math.sqrt(3) / 3) * x - y / 3) / Rh, rf = ((2 / 3) * y) / Rh, sf = -qf - rf;
				let q = Math.round(qf), r = Math.round(rf);
				const s = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
				if (dq > dr && dq > ds) q = -r - s;
				else if (dr > ds) r = -q - s;
				cell[y * w + x] = (r - rMin) * qn + (q - qMin);
			}
		}
	}
	prog(0.3);
	const acc = new Float64Array(cells * 4);
	for (let i = 0; i < n; i++) {
		const c = cell[i] * 4, p = i * 4, a = d[p + 3];
		acc[c] += d[p] * a; acc[c + 1] += d[p + 1] * a; acc[c + 2] += d[p + 2] * a; acc[c + 3] += a;
	}
	const cnt = new Int32Array(cells);
	for (let i = 0; i < n; i++) cnt[cell[i]]++;
	prog(0.6);
	const out = blank(src), o = out.data;
	for (let i = 0; i < n; i++) {
		const ci = cell[i], c = ci * 4, p = i * 4, sa = acc[c + 3];
		if (sa > 0) { o[p] = acc[c] / sa; o[p + 1] = acc[c + 1] / sa; o[p + 2] = acc[c + 2] / sa; }
		o[p + 3] = sa / cnt[ci];
	}
	prog(1);
	return out;
}

/** Mediana/percentil com histograma deslizante (Huang) + histograma grosso de 16 faixas. O(r) por pixel. */
function medianFilter(src: PixelBuf, r: number, pct: number, prog: Prog): PixelBuf {
	const { width: w, height: h, data: d } = src, out = blank(src), o = out.data;
	const hist = new Int32Array(4 * 256), coarse = new Int32Array(4 * 16), rows = new Int32Array(2 * r + 1);
	const win = (2 * r + 1) * (2 * r + 1), rank = clamp(Math.round((pct / 100) * (win - 1)), 0, win - 1);
	const tick = ticker(prog, h), lastX = w - 1;
	const col = (cx: number, s: number) => {
		const x = cx < 0 ? 0 : cx > lastX ? lastX : cx;
		for (let k = 0; k < rows.length; k++) {
			const i = (rows[k] + x) * 4;
			for (let c = 0; c < 4; c++) {
				const v = d[i + c];
				hist[c * 256 + v] += s;
				coarse[c * 16 + (v >> 4)] += s;
			}
		}
	};
	for (let y = 0; y < h; y++) {
		tick(y);
		for (let k = 0; k < rows.length; k++) rows[k] = clamp(y - r + k, 0, h - 1) * w;
		hist.fill(0); coarse.fill(0);
		for (let cx = -r; cx <= r; cx++) col(cx, 1);
		for (let x = 0; x < w; x++) {
			const p = (y * w + x) * 4;
			for (let c = 0; c < 4; c++) {
				let acc = 0, b = 0;
				const cb = c * 16, hb = c * 256;
				while (b < 15 && acc + coarse[cb + b] <= rank) acc += coarse[cb + b++];
				let v = b * 16;
				while (v < 255 && acc + hist[hb + v] <= rank) acc += hist[hb + v++];
				o[p + c] = v;
			}
			if (x < lastX) { col(x - r, -1); col(x + r + 1, 1); }
		}
	}
	return out;
}

/** Pintura a óleo: em cada janela, a faixa de intensidade mais frequente define a cor (média das cores dessa faixa). */
function oilPaint(src: PixelBuf, r: number, levels: number, prog: Prog): PixelBuf {
	const { width: w, height: h, data: d } = src, n = w * h, out = blank(src), o = out.data;
	const bin = new Uint8Array(n);
	for (let i = 0; i < n; i++) bin[i] = Math.min(levels - 1, ((luma709(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * levels) / 256) | 0);
	const cnt = new Int32Array(levels), sr = new Int32Array(levels), sg = new Int32Array(levels), sb = new Int32Array(levels);
	const rows = new Int32Array(2 * r + 1), lastX = w - 1, tick = ticker(prog, h);
	const col = (cx: number, s: number) => {
		const x = cx < 0 ? 0 : cx > lastX ? lastX : cx;
		for (let k = 0; k < rows.length; k++) {
			const pi = rows[k] + x, i = pi * 4;
			if (d[i + 3] === 0) continue;
			const b = bin[pi];
			cnt[b] += s; sr[b] += s * d[i]; sg[b] += s * d[i + 1]; sb[b] += s * d[i + 2];
		}
	};
	for (let y = 0; y < h; y++) {
		tick(y);
		for (let k = 0; k < rows.length; k++) rows[k] = clamp(y - r + k, 0, h - 1) * w;
		cnt.fill(0); sr.fill(0); sg.fill(0); sb.fill(0);
		for (let cx = -r; cx <= r; cx++) col(cx, 1);
		for (let x = 0; x < w; x++) {
			let best = 0, bc = -1;
			for (let b = 0; b < levels; b++) if (cnt[b] > bc) { bc = cnt[b]; best = b; }
			const p = (y * w + x) * 4;
			if (bc > 0) { o[p] = sr[best] / bc; o[p + 1] = sg[best] / bc; o[p + 2] = sb[best] / bc; }
			o[p + 3] = d[p + 3];
			if (x < lastX) { col(x - r, -1); col(x + r + 1, 1); }
		}
	}
	return out;
}

/** Gradiente Sobel da luminância (gx, gy). */
function sobelLuma(src: PixelBuf): { gx: Float32Array; gy: Float32Array } {
	const { width: w, height: h, data: d } = src, n = w * h, l = new Float32Array(n);
	for (let i = 0; i < n; i++) l[i] = luma709(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
	const gx = new Float32Array(n), gy = new Float32Array(n);
	for (let y = 0; y < h; y++) {
		const ym = (y > 0 ? y - 1 : 0) * w, y0 = y * w, yp = (y < h - 1 ? y + 1 : y) * w;
		for (let x = 0; x < w; x++) {
			const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : x;
			gx[y0 + x] = l[ym + xp] + 2 * l[y0 + xp] + l[yp + xp] - l[ym + xm] - 2 * l[y0 + xm] - l[yp + xm];
			gy[y0 + x] = l[yp + xm] + 2 * l[yp + x] + l[yp + xp] - l[ym + xm] - 2 * l[ym + x] - l[ym + xp];
		}
	}
	return { gx, gy };
}

// ---------- Filtros ----------
type Impl = (src: PixelBuf, p: FilterParams, prog: Prog) => PixelBuf;
const num = (p: FilterParams, k: string) => Number(p[k]) || 0;

const IMPL: Record<string, Impl> = {
	'brightness-contrast': (src, p, prog) => {
		const b = num(p, 'brightness'), c = num(p, 'contrast');
		return b === 0 && c === 0 ? copyBuf(src) : applyLut(src, prog, bcLut(b, c));
	},
	'hue-saturation': (src, p, prog) => {
		const dh = num(p, 'hue') / 360, ds = num(p, 'saturation') / 100, dl = num(p, 'lightness') / 100;
		if (dh === 0 && ds === 0 && dl === 0) return copyBuf(src);
		return perPixel(src, prog, (d, o, i) => {
			rgbToHsl(d[i], d[i + 1], d[i + 2]);
			let h = H + dh;
			h -= Math.floor(h);
			const s = clamp(S * (1 + ds), 0, 1), l = dl < 0 ? L * (1 + dl) : L + (1 - L) * dl;
			hslToRgb(h, s, l);
			o[i] = R; o[i + 1] = G; o[i + 2] = B; o[i + 3] = d[i + 3];
		});
	},
	levels: (src, p, prog) => {
		const ib = num(p, 'inBlack'), iw = Math.max(ib + 1, num(p, 'inWhite')), g = Math.max(0.01, num(p, 'gamma') || 1);
		const ob = num(p, 'outBlack'), ow = num(p, 'outWhite');
		return applyLut(src, prog, makeLut((v) => ob + Math.pow(clamp((v - ib) / (iw - ib), 0, 1), 1 / g) * (ow - ob)));
	},
	exposure: (src, p, prog) => {
		const e = Math.pow(2, num(p, 'exposure')), off = num(p, 'offset'), g = Math.max(0.01, num(p, 'gamma') || 1);
		return applyLut(src, prog, makeLut((v) => {
			let x = v / 255;
			x = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
			x = clamp(x * e + off, 0, 1);
			x = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
			return Math.pow(x, 1 / g) * 255;
		}));
	},
	vibrance: (src, p, prog) => {
		const V = num(p, 'vibrance') / 100;
		return perPixel(src, prog, (d, o, i) => {
			const r = d[i], g = d[i + 1], b = d[i + 2];
			const s = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
			// positivo: realça mais as cores pouco saturadas (preserva tons já vivos e de pele)
			const f = V >= 0 ? 1 + V * (1 - s) * (1 - s) * 1.5 : 1 + V;
			const l = luma709(r, g, b);
			o[i] = l + (r - l) * f; o[i + 1] = l + (g - l) * f; o[i + 2] = l + (b - l) * f; o[i + 3] = d[i + 3];
		});
	},
	temperature: (src, p, prog) => {
		const t = num(p, 'temperature') / 100, ti = num(p, 'tint') / 100;
		return applyLut(
			src, prog,
			makeLut((v) => v * (1 + 0.2 * t) * (1 + 0.05 * ti)),
			makeLut((v) => v * (1 - 0.15 * ti)),
			makeLut((v) => v * (1 - 0.2 * t) * (1 + 0.05 * ti))
		);
	},
	'auto-level': (src, _p, prog) => {
		const d = src.data, hist = new Int32Array(768);
		let n = 0;
		for (let i = 0; i < d.length; i += 4) {
			if (d[i + 3] === 0) continue;
			hist[d[i]]++; hist[256 + d[i + 1]]++; hist[512 + d[i + 2]]++; n++;
		}
		if (!n) return copyBuf(src);
		const cut = n * 0.005, luts: Float32Array[] = [];
		for (let c = 0; c < 3; c++) {
			let lo = 0, hi = 255, acc = 0;
			while (lo < 255 && acc + hist[c * 256 + lo] <= cut) acc += hist[c * 256 + lo++];
			acc = 0;
			while (hi > 0 && acc + hist[c * 256 + hi] <= cut) acc += hist[c * 256 + hi--];
			luts.push(hi > lo ? makeLut((v) => ((v - lo) * 255) / (hi - lo)) : makeLut((v) => v));
		}
		return applyLut(src, prog, luts[0], luts[1], luts[2]);
	},
	invert: (src, _p, prog) => applyLut(src, prog, makeLut((v) => 255 - v)),
	grayscale: (src, p, prog) => {
		const mode = String(p.mode);
		return perPixel(src, prog, (d, o, i) => {
			const r = d[i], g = d[i + 1], b = d[i + 2];
			const v = mode === 'average' ? (r + g + b) / 3 : mode === 'desaturate' ? (Math.max(r, g, b) + Math.min(r, g, b)) / 2 : luma709(r, g, b);
			o[i] = o[i + 1] = o[i + 2] = v; o[i + 3] = d[i + 3];
		});
	},
	sepia: (src, p, prog) => {
		const a = clamp(num(p, 'amount') / 100, 0, 1), k = 1 - a;
		return perPixel(src, prog, (d, o, i) => {
			const r = d[i], g = d[i + 1], b = d[i + 2];
			o[i] = r * k + (0.393 * r + 0.769 * g + 0.189 * b) * a;
			o[i + 1] = g * k + (0.349 * r + 0.686 * g + 0.168 * b) * a;
			o[i + 2] = b * k + (0.272 * r + 0.534 * g + 0.131 * b) * a;
			o[i + 3] = d[i + 3];
		});
	},
	posterize: (src, p, prog) => {
		const n = clamp(Math.round(num(p, 'levels')), 2, 256) - 1;
		return applyLut(src, prog, makeLut((v) => (Math.round((v / 255) * n) / n) * 255));
	},
	threshold: (src, p, prog) => {
		const t = num(p, 'level');
		return perPixel(src, prog, (d, o, i) => {
			o[i] = o[i + 1] = o[i + 2] = luma709(d[i], d[i + 1], d[i + 2]) >= t ? 255 : 0; o[i + 3] = d[i + 3];
		});
	},
	colorize: (src, p, prog) => {
		const [cr, cg, cb] = hexToRgb(String(p.color)), a = clamp(num(p, 'amount') / 100, 0, 1);
		rgbToHsl(cr, cg, cb);
		const ch = H, cs = S;
		return perPixel(src, prog, (d, o, i) => {
			const r = d[i], g = d[i + 1], b = d[i + 2];
			hslToRgb(ch, cs, luma709(r, g, b) / 255);
			o[i] = r + (R - r) * a; o[i + 1] = g + (G - g) * a; o[i + 2] = b + (B - b) * a; o[i + 3] = d[i + 3];
		});
	},

	// ---------- desfoques ----------
	'gaussian-blur': (src, p, prog) => {
		const f = toPremul(src.data);
		gaussInPlace(f, src.width, src.height, num(p, 'radius'), prog);
		return fromPremul(f, src.width, src.height);
	},
	'box-blur': (src, p, prog) => {
		const f = toPremul(src.data);
		boxInPlace(f, src.width, src.height, Math.round(num(p, 'radius')));
		prog(1);
		return fromPremul(f, src.width, src.height);
	},
	'motion-blur': (src, p, prog) => {
		const len = Math.max(0, num(p, 'distance')), a = num(p, 'angle') * DEG;
		if (len < 1) return copyBuf(src);
		// eixo y para baixo: ângulo positivo = anti-horário na tela
		const ux = Math.cos(a), uy = -Math.sin(a), T = 8, m = passCount(len, T);
		const centered = p.centered !== false;
		const total = len - len / Math.pow(T, m);
		const passes: Float64Array[][] = [];
		for (let k = 0; k < m; k++) {
			const step = len / Math.pow(T, k + 1), off = k === 0 ? (centered ? -total / 2 : -total) : 0;
			const list: Float64Array[] = [];
			for (let i = 0; i < T; i++) {
				const s = off + i * step;
				list.push(Float64Array.of(1, 0, 0, 1, ux * s, uy * s));
			}
			passes.push(list);
		}
		return fromPremul(affinePasses(toPremul(src.data), src.width, src.height, passes, prog), src.width, src.height);
	},
	'radial-blur': (src, p, prog) => {
		const { width: w, height: h } = src, A = num(p, 'angle') * DEG;
		if (A <= 0) return copyBuf(src);
		const cx = (num(p, 'centerX') / 100) * (w - 1), cy = (num(p, 'centerY') / 100) * (h - 1);
		const maxR = Math.hypot(Math.max(cx, w - 1 - cx), Math.max(cy, h - 1 - cy));
		const T = p.quality === 'low' ? 4 : p.quality === 'high' ? 12 : 8, m = passCount(A * maxR, T, p.quality === 'high' ? 4 : 3);
		const total = A - A / Math.pow(T, m), passes: Float64Array[][] = [];
		for (let k = 0; k < m; k++) {
			const step = A / Math.pow(T, k + 1), off = k === 0 ? -total / 2 : 0, list: Float64Array[] = [];
			for (let i = 0; i < T; i++) {
				const t = off + i * step, c = Math.cos(t), s = Math.sin(t);
				// rotação em torno do centro: p' = C + Rot(t)(p - C)
				list.push(Float64Array.of(c, -s, s, c, cx - c * cx + s * cy, cy - s * cx - c * cy));
			}
			passes.push(list);
		}
		return fromPremul(affinePasses(toPremul(src.data), w, h, passes, prog), w, h);
	},
	'zoom-blur': (src, p, prog) => {
		const { width: w, height: h } = src, amt = num(p, 'amount') / 100;
		if (amt <= 0) return copyBuf(src);
		const cx = (num(p, 'centerX') / 100) * (w - 1), cy = (num(p, 'centerY') / 100) * (h - 1);
		const maxR = Math.hypot(Math.max(cx, w - 1 - cx), Math.max(cy, h - 1 - cy));
		const lnZ = Math.log(1 + amt * 0.6), T = 8, m = passCount(maxR * lnZ, T);
		const passes: Float64Array[][] = [];
		for (let k = 0; k < m; k++) {
			const step = lnZ / Math.pow(T, k + 1), list: Float64Array[] = [];
			for (let i = 0; i < T; i++) {
				const s = Math.exp(-i * step); // amostra em direção ao centro → rastro para fora
				list.push(Float64Array.of(s, 0, 0, s, cx - s * cx, cy - s * cy));
			}
			passes.push(list);
		}
		return fromPremul(affinePasses(toPremul(src.data), w, h, passes, prog), w, h);
	},
	'surface-blur': (src, p, prog) => bilateral(src, Math.max(1, Math.round(num(p, 'radius'))), num(p, 'threshold'), prog),

	// ---------- nitidez ----------
	sharpen: (src, p, prog) => unsharp(src, (num(p, 'amount') / 100) * 2, 1, 0, prog),
	'unsharp-mask': (src, p, prog) => unsharp(src, num(p, 'amount') / 100, num(p, 'radius'), num(p, 'threshold'), prog),

	// ---------- ruído ----------
	'add-noise': (src, p, prog) => {
		const sigma = num(p, 'amount'), sat = clamp(num(p, 'saturation') / 100, 0, 1), mono = p.mono === true;
		const rnd = rng(0x9e3779b9);
		// aproximação gaussiana: soma de 3 uniformes (média 0, desvio ≈ 1)
		const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2;
		return perPixel(src, prog, (d, o, i) => {
			const n = gauss() * sigma;
			if (mono) {
				o[i] = d[i] + n; o[i + 1] = d[i + 1] + n; o[i + 2] = d[i + 2] + n;
			} else {
				const k = sigma * sat;
				o[i] = d[i] + n + gauss() * k; o[i + 1] = d[i + 1] + n + gauss() * k; o[i + 2] = d[i + 2] + n + gauss() * k;
			}
			o[i + 3] = d[i + 3];
		});
	},
	median: (src, p, prog) => medianFilter(src, Math.max(1, Math.round(num(p, 'radius'))), num(p, 'percentile'), prog),
	'reduce-noise': (src, p, prog) => {
		const s = clamp(num(p, 'strength'), 0, 100);
		if (s === 0) return copyBuf(src);
		const res = bilateral(src, 1 + Math.round(s / 40), 6 + s * 0.5, prog);
		// força baixa: mistura com o original
		const k = Math.min(1, s / 50), d = src.data, o = res.data;
		if (k < 1) for (let i = 0; i < d.length; i++) o[i] = d[i] + (o[i] - d[i]) * k;
		return res;
	},

	// ---------- estilizar ----------
	emboss: (src, p, prog) => {
		const { gx, gy } = sobelLuma(src), a = num(p, 'angle') * DEG, k = num(p, 'strength') / 8;
		const ux = Math.cos(a), uy = -Math.sin(a);
		prog(0.5);
		return perPixel(src, noop, (d, o, i) => {
			const j = i >> 2;
			o[i] = o[i + 1] = o[i + 2] = 128 + (gx[j] * ux + gy[j] * uy) * k; o[i + 3] = d[i + 3];
		});
	},
	relief: (src, p, prog) => {
		const { gx, gy } = sobelLuma(src), a = num(p, 'angle') * DEG, k = num(p, 'strength') / 8;
		const ux = Math.cos(a), uy = -Math.sin(a);
		prog(0.5);
		return perPixel(src, noop, (d, o, i) => {
			const j = i >> 2, v = (gx[j] * ux + gy[j] * uy) * k;
			o[i] = d[i] + v; o[i + 1] = d[i + 1] + v; o[i + 2] = d[i + 2] + v; o[i + 3] = d[i + 3];
		});
	},
	'edge-detect': (src, p, prog) => {
		const { width: w, height: h, data: d } = src, out = blank(src), o = out.data, lap = p.mode === 'laplacian', inv = p.invert === true;
		const tick = ticker(prog, h);
		for (let y = 0; y < h; y++) {
			tick(y);
			const ym = (y > 0 ? y - 1 : 0) * w, y0 = y * w, yp = (y < h - 1 ? y + 1 : y) * w;
			for (let x = 0; x < w; x++) {
				const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : x, q = (y0 + x) * 4;
				const a = (ym + xm) * 4, b = (ym + x) * 4, cc = (ym + xp) * 4, dl = (y0 + xm) * 4, dr = (y0 + xp) * 4;
				const e1 = (yp + xm) * 4, f1 = (yp + x) * 4, g1 = (yp + xp) * 4;
				for (let c = 0; c < 3; c++) {
					let e: number;
					if (lap) e = Math.abs(4 * d[q + c] - d[b + c] - d[f1 + c] - d[dl + c] - d[dr + c]) * 2;
					else {
						const gx = d[cc + c] + 2 * d[dr + c] + d[g1 + c] - d[a + c] - 2 * d[dl + c] - d[e1 + c];
						const gy = d[e1 + c] + 2 * d[f1 + c] + d[g1 + c] - d[a + c] - 2 * d[b + c] - d[cc + c];
						e = Math.sqrt(gx * gx + gy * gy) / 2;
					}
					o[q + c] = inv ? 255 - e : e;
				}
				o[q + 3] = d[q + 3];
			}
		}
		return out;
	},
	pixelate: (src, p, prog) => pixelate(src, Math.max(1, num(p, 'size')), p.shape === 'hex', prog),
	vignette: (src, p, prog) => {
		const { width: w, height: h } = src, amt = clamp(num(p, 'amount') / 100, 0, 1), rad = Math.max(0.01, num(p, 'radius') / 100);
		const inner = clamp(1 - num(p, 'softness') / 100, 0, 0.999), [vr, vg, vb] = hexToRgb(String(p.color));
		const cx = (w - 1) / 2, cy = (h - 1) / 2, hx = Math.max(1, w / 2), hy = Math.max(1, h / 2);
		return perPixel(src, prog, (d, o, i) => {
			const j = i >> 2, x = j % w, y = (j - x) / w;
			const nx = (x - cx) / hx, ny = (y - cy) / hy;
			const dist = Math.sqrt((nx * nx + ny * ny) / 2) / rad; // 1 = canto da imagem com raio 100%
			let t = clamp((dist - inner) / (1 - inner), 0, 1);
			t = t * t * (3 - 2 * t) * amt;
			o[i] = d[i] + (vr - d[i]) * t; o[i + 1] = d[i + 1] + (vg - d[i + 1]) * t; o[i + 2] = d[i + 2] + (vb - d[i + 2]) * t; o[i + 3] = d[i + 3];
		});
	},
	glow: (src, p, prog) => {
		const f = toPremul(src.data);
		gaussInPlace(f, src.width, src.height, num(p, 'radius'), sub(prog, 0, 0.8));
		const bl = unpremulFloat(f), lut = bcLut(num(p, 'brightness'), num(p, 'contrast'));
		return perPixel(src, sub(prog, 0.8, 1), (d, o, i) => {
			for (let c = 0; c < 3; c++) {
				const b = clamp(lut[clamp(Math.round(bl[i + c]), 0, 255)], 0, 255);
				o[i + c] = 255 - ((255 - d[i + c]) * (255 - b)) / 255; // tela (screen)
			}
			o[i + 3] = d[i + 3];
		});
	},

	// ---------- distorcer ----------
	twist: (src, p, prog) => {
		const { width: w, height: h } = src, a = num(p, 'angle') * DEG;
		const cx = (num(p, 'centerX') / 100) * (w - 1), cy = (num(p, 'centerY') / 100) * (h - 1);
		const Rr = Math.max(1, (num(p, 'radius') / 100) * Math.hypot(w, h) / 2);
		return remap(src, prog, (x, y, pt) => {
			const dx = x - cx, dy = y - cy, dd = Math.sqrt(dx * dx + dy * dy);
			if (dd >= Rr) { pt[0] = x; pt[1] = y; return; }
			const t = 1 - dd / Rr, th = a * t * t, c = Math.cos(th), s = Math.sin(th);
			pt[0] = cx + dx * c - dy * s; pt[1] = cy + dx * s + dy * c;
		});
	},
	bulge: (src, p, prog) => bulge(src, num(p, 'amount') / 100, p, prog),
	pinch: (src, p, prog) => bulge(src, -num(p, 'amount') / 100, p, prog),
	'frosted-glass': (src, p, prog) => {
		const amt = Math.max(0, num(p, 'amount')), rnd = rng(0x51ed270b);
		return remap(src, prog, (x, y, pt) => {
			pt[0] = x + (rnd() * 2 - 1) * amt; pt[1] = y + (rnd() * 2 - 1) * amt;
		});
	},
	'tile-reflection': (src, p, prog) => {
		const { width: w, height: h } = src, size = Math.max(2, num(p, 'size')), a = num(p, 'angle') * DEG;
		const k = 1 - clamp(num(p, 'curvature') / 100, -1, 1), c = Math.cos(a), s = Math.sin(a);
		const cx = (w - 1) / 2, cy = (h - 1) / 2;
		return remap(src, prog, (x, y, pt) => {
			const dx = x - cx, dy = y - cy;
			const u = dx * c + dy * s, v = -dx * s + dy * c; // espaço girado
			const cu = (Math.floor(u / size) + 0.5) * size, cv = (Math.floor(v / size) + 0.5) * size;
			const u2 = cu + (u - cu) * k, v2 = cv + (v - cv) * k;
			pt[0] = cx + u2 * c - v2 * s; pt[1] = cy + u2 * s + v2 * c;
		});
	},
	polar: (src, p, prog) => {
		const { width: w, height: h } = src, cx = (w - 1) / 2, cy = (h - 1) / 2, hx = Math.max(1, w / 2), hy = Math.max(1, h / 2);
		const toPolar = p.direction !== 'from-polar';
		return remap(src, prog, (x, y, pt) => {
			if (toPolar) {
				// retângulo → círculo: ângulo vira x de origem, raio vira y de origem
				const nx = (x - cx) / hx, ny = (y - cy) / hy;
				const ang = Math.atan2(nx, -ny); // 0 no topo, sentido horário
				pt[0] = ((ang / (2 * Math.PI) + 1) % 1) * (w - 1);
				pt[1] = Math.min(1, Math.hypot(nx, ny)) * (h - 1);
			} else {
				const ang = (x / Math.max(1, w - 1)) * 2 * Math.PI, r = y / Math.max(1, h - 1);
				pt[0] = cx + Math.sin(ang) * r * hx; pt[1] = cy - Math.cos(ang) * r * hy;
			}
		});
	},

	// ---------- artístico ----------
	'oil-paint': (src, p, prog) => oilPaint(src, Math.max(1, Math.round(num(p, 'radius'))), clamp(Math.round(num(p, 'levels')), 2, 255), prog),
	'pencil-sketch': (src, p, prog) => {
		const { width: w, height: h, data: d } = src, n = w * h;
		// cinza → inverte → desfoca → "subexposição de cor" (color dodge) entre o cinza e o inverso desfocado
		const gray = new Float32Array(n), inv = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const g = luma709(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
			gray[i] = g;
			inv[i * 4] = 255 - g; inv[i * 4 + 3] = 255;
		}
		gaussInPlace(inv, w, h, Math.max(0.5, num(p, 'radius')), sub(prog, 0, 0.8));
		const lut = bcLut(0, num(p, 'contrast'));
		return perPixel(src, sub(prog, 0.8, 1), (dd, o, i) => {
			const j = i >> 2, bl = inv[i];
			const v = bl >= 254.5 ? 255 : Math.min(255, (gray[j] * 255) / (255 - bl));
			o[i] = o[i + 1] = o[i + 2] = lut[Math.round(v)]; o[i + 3] = dd[i + 3];
		});
	},
	halftone: (src, p, prog) => {
		const { width: w, height: h } = src, size = Math.max(2, num(p, 'size')), a = num(p, 'angle') * DEG, colored = p.colored === true;
		const f = toPremul(src.data);
		gaussInPlace(f, w, h, size / 3, sub(prog, 0, 0.6));
		const bl = unpremulFloat(f), c = Math.cos(a), s = Math.sin(a), maxR = size * Math.SQRT1_2;
		return perPixel(src, sub(prog, 0.6, 1), (d, o, i) => {
			const j = i >> 2, x = j % w, y = (j - x) / w;
			const u = x * c + y * s, v = -x * s + y * c;
			const cu = (Math.floor(u / size) + 0.5) * size, cv = (Math.floor(v / size) + 0.5) * size;
			const sx = clamp(Math.round(cu * c - cv * s), 0, w - 1), sy = clamp(Math.round(cu * s + cv * c), 0, h - 1);
			const q = (sy * w + sx) * 4, r = bl[q], g = bl[q + 1], b = bl[q + 2];
			const dark = 1 - luma709(r, g, b) / 255;
			const rad = maxR * Math.sqrt(clamp(dark, 0, 1)), dist = Math.hypot(u - cu, v - cv);
			const cov = clamp(rad - dist + 0.5, 0, 1);
			if (colored) {
				// ponto com a cor da célula, saturada para compensar o branco ao redor
				const k = dark > 0 ? Math.min(1, 1 / Math.max(dark, 0.3)) : 1;
				o[i] = 255 + ((255 - (255 - r) * k) - 255) * cov;
				o[i + 1] = 255 + ((255 - (255 - g) * k) - 255) * cov;
				o[i + 2] = 255 + ((255 - (255 - b) * k) - 255) * cov;
			} else {
				o[i] = o[i + 1] = o[i + 2] = 255 * (1 - cov);
			}
			o[i + 3] = d[i + 3];
		});
	}
};

function unsharp(src: PixelBuf, amount: number, radius: number, threshold: number, prog: Prog): PixelBuf {
	if (amount === 0 || radius <= 0) return copyBuf(src);
	const f = toPremul(src.data);
	gaussInPlace(f, src.width, src.height, radius, sub(prog, 0, 0.85));
	const bl = unpremulFloat(f);
	return perPixel(src, sub(prog, 0.85, 1), (d, o, i) => {
		for (let c = 0; c < 3; c++) {
			const diff = d[i + c] - bl[i + c];
			o[i + c] = Math.abs(diff) >= threshold ? d[i + c] + diff * amount : d[i + c];
		}
		o[i + 3] = d[i + 3];
	});
}

/** Abaulamento (k > 0) ou pinçamento (k < 0) dentro de um raio. */
function bulge(src: PixelBuf, k: number, p: FilterParams, prog: Prog): PixelBuf {
	const { width: w, height: h } = src;
	const cx = (num(p, 'centerX') / 100) * (w - 1), cy = (num(p, 'centerY') / 100) * (h - 1);
	const Rr = Math.max(1, (num(p, 'radius') / 100) * Math.hypot(w, h) / 2), kk = clamp(k, -1, 1) * 0.75;
	return remap(src, prog, (x, y, pt) => {
		const dx = x - cx, dy = y - cy, dd = Math.sqrt(dx * dx + dy * dy);
		if (dd >= Rr) { pt[0] = x; pt[1] = y; return; }
		const t = 1 - dd / Rr, s = 1 - kk * t * t;
		pt[0] = cx + dx * s; pt[1] = cy + dy * s;
	});
}

/**
 * Aplica um filtro. `params` ausentes usam o padrão do filtro. `scale` multiplica os parâmetros em px
 * listados em `scaled` (prévia reduzida). Lança erro para id desconhecido.
 */
export function applyFilter(id: string, src: PixelBuf, params: FilterParams, opts: { scale?: number; onProgress?: (v: number) => void } = {}): PixelBuf {
	const def = filterById(id), impl = IMPL[id];
	if (!def || !impl) throw new Error(`Filtro desconhecido: ${id}`);
	if (src.data.length !== src.width * src.height * 4) throw new Error('Buffer de pixels com tamanho inválido');
	const p: FilterParams = { ...defaultParams(def), ...params };
	const scale = opts.scale ?? 1;
	if (scale !== 1) for (const k of def.scaled ?? []) p[k] = num(p, k) * scale;
	const report = opts.onProgress ?? noop;
	if (src.width === 0 || src.height === 0) return copyBuf(src);
	const out = impl(src, p, (v) => report(clamp(v, 0, 1)));
	report(1);
	return out;
}

/** Ids implementados (para testes). */
export const IMPLEMENTED = Object.keys(IMPL);
