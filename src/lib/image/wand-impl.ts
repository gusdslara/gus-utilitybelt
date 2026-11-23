// Varinha mágica pura (sem DOM): devolve uma máscara w*h (alfa 0..255).
// Algoritmos: flood (4 vizinhos, scanline), flood8, global, edge (para em bordas Sobel) e cluster (k-means em Lab).
import type { WandMetric, WandOptions } from './types.ts';
import type { PixelBuf } from './filters-impl.ts';

type Prog = (v: number) => void;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ---------- Lab (sRGB → linear → XYZ D65 → CIE Lab) ----------
const LIN = new Float64Array(256);
for (let v = 0; v < 256; v++) {
	const x = v / 255;
	LIN[v] = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
const fLab = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
/** Grava L, a, b em `o[k..k+2]`. */
function lab(r: number, g: number, b: number, o: Float64Array | Float32Array, k = 0) {
	const lr = LIN[r], lg = LIN[g], lb = LIN[b];
	const fx = fLab((0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047);
	const fy = fLab(0.2126 * lr + 0.7152 * lg + 0.0722 * lb);
	const fz = fLab((0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883);
	o[k] = 116 * fy - 16;
	o[k + 1] = 500 * (fx - fy);
	o[k + 2] = 200 * (fy - fz);
}

/** Matiz (0..360) e croma (0..1) de um pixel. */
function hueChroma(r: number, g: number, b: number, o: Float64Array) {
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
	let h = 0;
	if (d > 0) {
		if (mx === r) h = ((g - b) / d) % 6;
		else if (mx === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	o[0] = h;
	o[1] = d / 255;
}

/** Distância normalizada 0..1 entre o pixel `i` e a cor da semente, conforme a métrica. */
export function makeDistance(d: Uint8ClampedArray, seed: number, metric: WandMetric): (i: number) => number {
	const s = seed * 4, sr = d[s], sg = d[s + 1], sb = d[s + 2], sa = d[s + 3];
	switch (metric) {
		case 'rgba':
			return (i) => {
				const p = i * 4, dr = d[p] - sr, dg = d[p + 1] - sg, db = d[p + 2] - sb, da = d[p + 3] - sa;
				return Math.sqrt(dr * dr + dg * dg + db * db + da * da) / 510;
			};
		case 'luma': {
			const ly = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
			return (i) => {
				const p = i * 4;
				return Math.abs(0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2] - ly) / 255;
			};
		}
		case 'max':
			return (i) => {
				const p = i * 4;
				return Math.max(Math.abs(d[p] - sr), Math.abs(d[p + 1] - sg), Math.abs(d[p + 2] - sb), Math.abs(d[p + 3] - sa)) / 255;
			};
		case 'lab': {
			const sl = new Float64Array(3), pl = new Float64Array(3);
			lab(sr, sg, sb, sl);
			return (i) => {
				const p = i * 4;
				if (d[p] === sr && d[p + 1] === sg && d[p + 2] === sb) return 0;
				lab(d[p], d[p + 1], d[p + 2], pl);
				const a = pl[0] - sl[0], b = pl[1] - sl[1], c = pl[2] - sl[2];
				return Math.min(1, Math.sqrt(a * a + b * b + c * c) / 100); // ΔE 100 = preto ↔ branco
			};
		}
		case 'hue': {
			const sh = new Float64Array(2), ph = new Float64Array(2);
			hueChroma(sr, sg, sb, sh);
			return (i) => {
				const p = i * 4;
				hueChroma(d[p], d[p + 1], d[p + 2], ph);
				let hd = Math.abs(ph[0] - sh[0]);
				if (hd > 180) hd = 360 - hd;
				// matiz só pesa quando as duas cores têm croma; cinzas se comparam pela diferença de croma
				return Math.min(1, (hd / 180) * Math.sqrt(ph[1] * sh[1]) + Math.abs(ph[1] - sh[1]) * 0.5);
			};
		}
		default:
			return (i) => {
				const p = i * 4, dr = d[p] - sr, dg = d[p + 1] - sg, db = d[p + 2] - sb;
				return Math.sqrt(dr * dr + dg * dg + db * db) / 441.6729559300637;
			};
	}
}

/** Tolerância 0..100 → limite 0..1 (curva quadrática: mais controle nos valores baixos). */
export const toleranceLimit = (tol: number) => {
	const t = clamp(tol, 0, 100) / 100;
	return t * t;
};

/**
 * Preenchimento por linhas (scanline). `ok(i)` diz se o pixel pode entrar; a semente sempre entra.
 * diag = 8 vizinhos. Devolve 1 = selecionado.
 */
function scanFill(w: number, h: number, seed: number, ok: (i: number) => boolean, diag: boolean, prog: Prog): Uint8Array {
	const n = w * h, state = new Uint8Array(n); // 0 desconhecido, 1 preenchido, 2 rejeitado, 3 aceito e pendente
	let stack = new Int32Array(1024), sp = 0, filled = 0, lastReport = 0;
	const test = (i: number) => {
		let s = state[i];
		if (s === 0) state[i] = s = ok(i) ? 3 : 2;
		return s === 3;
	};
	const push = (i: number) => {
		if (sp === stack.length) {
			const ns = new Int32Array(stack.length * 2);
			ns.set(stack);
			stack = ns;
		}
		stack[sp++] = i;
	};
	state[seed] = 3;
	push(seed);
	while (sp > 0) {
		const i = stack[--sp];
		if (state[i] !== 3) continue;
		const y = (i / w) | 0, row = y * w, x = i - row;
		let lx = x, rx = x;
		while (lx > 0 && test(row + lx - 1)) lx--;
		while (rx < w - 1 && test(row + rx + 1)) rx++;
		for (let k = lx; k <= rx; k++) state[row + k] = 1;
		filled += rx - lx + 1;
		const a = diag && lx > 0 ? lx - 1 : lx, b = diag && rx < w - 1 ? rx + 1 : rx;
		for (let ny = y - 1; ny <= y + 1; ny += 2) {
			if (ny < 0 || ny >= h) continue;
			const nr = ny * w;
			let run = false;
			for (let k = a; k <= b; k++) {
				if (test(nr + k)) {
					if (!run) { push(nr + k); run = true; }
				} else run = false;
			}
		}
		if (filled - lastReport > 65536) { lastReport = filled; prog(Math.min(0.95, filled / n)); }
	}
	const out = new Uint8Array(n);
	for (let i = 0; i < n; i++) if (state[i] === 1) out[i] = 1;
	return out;
}

/** Magnitude do gradiente Sobel da luminância, 0..255. */
function gradient(src: PixelBuf): Uint8Array {
	const { width: w, height: h, data: d } = src, n = w * h, l = new Float32Array(n), g = new Uint8Array(n);
	for (let i = 0; i < n; i++) l[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
	for (let y = 0; y < h; y++) {
		const ym = (y > 0 ? y - 1 : 0) * w, y0 = y * w, yp = (y < h - 1 ? y + 1 : y) * w;
		for (let x = 0; x < w; x++) {
			const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : x;
			const gx = l[ym + xp] + 2 * l[y0 + xp] + l[yp + xp] - l[ym + xm] - 2 * l[y0 + xm] - l[yp + xm];
			const gy = l[yp + xm] + 2 * l[yp + x] + l[yp + xp] - l[ym + xm] - 2 * l[ym + x] - l[ym + xp];
			g[y0 + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 4);
		}
	}
	return g;
}

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

/** k-means em Lab (k-means++ numa amostra, até 12 iterações) e rótulo para todos os pixels. */
export function kmeansLabels(src: PixelBuf, k: number, prog: Prog): Uint8Array {
	const d = src.data, n = src.width * src.height, rnd = rng(12345);
	k = clamp(Math.round(k), 2, 16);
	const m = Math.min(n, 20000), samp = new Float32Array(m * 3);
	for (let j = 0; j < m; j++) {
		const i = m === n ? j : Math.floor(rnd() * n), p = i * 4;
		lab(d[p], d[p + 1], d[p + 2], samp, j * 3);
	}
	// k-means++
	const cent = new Float64Array(k * 3), dist = new Float64Array(m).fill(Infinity);
	let first = Math.floor(rnd() * m);
	cent[0] = samp[first * 3]; cent[1] = samp[first * 3 + 1]; cent[2] = samp[first * 3 + 2];
	for (let c = 1; c < k; c++) {
		let total = 0;
		for (let j = 0; j < m; j++) {
			const a = samp[j * 3] - cent[(c - 1) * 3], b = samp[j * 3 + 1] - cent[(c - 1) * 3 + 1], e = samp[j * 3 + 2] - cent[(c - 1) * 3 + 2];
			const dd = a * a + b * b + e * e;
			if (dd < dist[j]) dist[j] = dd;
			total += dist[j];
		}
		let pick = rnd() * total, j = 0;
		if (total > 0) { while (j < m - 1 && (pick -= dist[j]) > 0) j++; }
		else j = Math.floor(rnd() * m);
		first = j;
		cent[c * 3] = samp[j * 3]; cent[c * 3 + 1] = samp[j * 3 + 1]; cent[c * 3 + 2] = samp[j * 3 + 2];
	}
	const nearest = (L: number, A: number, Bv: number) => {
		let best = 0, bd = Infinity;
		for (let c = 0; c < k; c++) {
			const a = L - cent[c * 3], b = A - cent[c * 3 + 1], e = Bv - cent[c * 3 + 2], dd = a * a + b * b + e * e;
			if (dd < bd) { bd = dd; best = c; }
		}
		return best;
	};
	const sums = new Float64Array(k * 3), cnt = new Int32Array(k);
	for (let it = 0; it < 12; it++) {
		sums.fill(0); cnt.fill(0);
		for (let j = 0; j < m; j++) {
			const c = nearest(samp[j * 3], samp[j * 3 + 1], samp[j * 3 + 2]);
			sums[c * 3] += samp[j * 3]; sums[c * 3 + 1] += samp[j * 3 + 1]; sums[c * 3 + 2] += samp[j * 3 + 2]; cnt[c]++;
		}
		let moved = 0;
		for (let c = 0; c < k; c++) {
			if (!cnt[c]) continue;
			for (let q = 0; q < 3; q++) {
				const v = sums[c * 3 + q] / cnt[c];
				moved = Math.max(moved, Math.abs(v - cent[c * 3 + q]));
				cent[c * 3 + q] = v;
			}
		}
		prog(0.05 + (0.25 * (it + 1)) / 12);
		if (moved < 0.1) break;
	}
	// rótulo de todos os pixels, com cache por cor RGB (imagens costumam repetir cores)
	const cache = new Uint8Array(1 << 24).fill(255), labels = new Uint8Array(n), tmp = new Float64Array(3);
	const step = Math.max(1, n >> 5);
	for (let i = 0; i < n; i++) {
		const p = i * 4, key = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
		let c = cache[key];
		if (c === 255) {
			lab(d[p], d[p + 1], d[p + 2], tmp);
			cache[key] = c = nearest(tmp[0], tmp[1], tmp[2]);
		}
		labels[i] = c;
		if (i % step === 0) prog(0.3 + (0.5 * i) / n);
	}
	return labels;
}

/** Suaviza só a borda: pixels que diferem de algum vizinho recebem a média 3x3 da máscara binária. */
function antialias(sel: Uint8Array, w: number, h: number): Uint8ClampedArray {
	const out = new Uint8ClampedArray(w * h);
	for (let y = 0; y < h; y++) {
		const ym = y > 0 ? y - 1 : 0, yp = y < h - 1 ? y + 1 : y;
		for (let x = 0; x < w; x++) {
			const i = y * w + x, v = sel[i];
			const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : x;
			if (sel[ym * w + x] === v && sel[yp * w + x] === v && sel[y * w + xm] === v && sel[y * w + xp] === v) {
				out[i] = v ? 255 : 0;
				continue;
			}
			let s = 0;
			for (let yy = y - 1; yy <= y + 1; yy++) {
				const ry = (yy < 0 ? 0 : yy >= h ? h - 1 : yy) * w;
				for (let xx = x - 1; xx <= x + 1; xx++) s += sel[ry + (xx < 0 ? 0 : xx >= w ? w - 1 : xx)];
			}
			out[i] = (s * 255) / 9;
		}
	}
	return out;
}

/** Seleção pela varinha mágica no ponto (x, y). Devolve alfa w*h (0..255). */
export function wandSelect(src: PixelBuf, x: number, y: number, o: WandOptions, onProgress?: (v: number) => void): Uint8ClampedArray {
	const { width: w, height: h, data: d } = src, n = w * h;
	const prog: Prog = onProgress ?? (() => {});
	x = Math.floor(x); y = Math.floor(y);
	if (x < 0 || y < 0 || x >= w || y >= h || n === 0) return new Uint8ClampedArray(n);
	const seed = y * w + x;
	let sel: Uint8Array;

	if (o.algo === 'cluster') {
		const labels = kmeansLabels(src, o.clusters, prog), target = labels[seed];
		if (o.contiguous) sel = scanFill(w, h, seed, (i) => labels[i] === target, false, (v) => prog(0.8 + v * 0.15));
		else {
			sel = new Uint8Array(n);
			for (let i = 0; i < n; i++) if (labels[i] === target) sel[i] = 1;
		}
	} else {
		const dist = makeDistance(d, seed, o.metric), lim = toleranceLimit(o.tolerance);
		const match = (i: number) => dist(i) <= lim;
		if (o.algo === 'global') {
			sel = new Uint8Array(n);
			const step = Math.max(1, n >> 5);
			for (let i = 0; i < n; i++) {
				if (match(i)) sel[i] = 1;
				if (i % step === 0) prog((0.9 * i) / n);
			}
		} else if (o.algo === 'edge') {
			const g = gradient(src), thr = 4 + 251 * Math.pow(1 - clamp(o.edge, 0, 100) / 100, 2);
			prog(0.15);
			sel = scanFill(w, h, seed, (i) => g[i] < thr && match(i), false, (v) => prog(0.15 + v * 0.75));
			// a borda em si (gradiente alto) entra se a cor bate e encosta na região: evita encolher 1 px
			const grow: number[] = [];
			for (let yy = 0; yy < h; yy++) {
				for (let xx = 0; xx < w; xx++) {
					const i = yy * w + xx;
					if (sel[i] || g[i] < thr) continue;
					if ((xx > 0 && sel[i - 1]) || (xx < w - 1 && sel[i + 1]) || (yy > 0 && sel[i - w]) || (yy < h - 1 && sel[i + w])) {
						if (match(i)) grow.push(i);
					}
				}
			}
			for (const i of grow) sel[i] = 1;
		} else {
			sel = scanFill(w, h, seed, match, o.algo === 'flood8', (v) => prog(v * 0.9));
		}
	}

	prog(0.95);
	let out: Uint8ClampedArray;
	if (o.antialias) out = antialias(sel, w, h);
	else {
		out = new Uint8ClampedArray(n);
		for (let i = 0; i < n; i++) if (sel[i]) out[i] = 255;
	}
	prog(1);
	return out;
}
