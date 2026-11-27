// Filtros de "scan": remove sombra e iluminação irregular estimando a cor do papel por região,
// depois realça (cor), converte para cinza ou binariza (P&B) com borda suave. Puro, opera in-place.
import type { Rgba } from './warp.ts';

export type ScanFilter = 'original' | 'enhance' | 'gray' | 'bw';
export const SCAN_FILTERS: ScanFilter[] = ['original', 'enhance', 'gray', 'bw'];

export type EnhanceOptions = {
	/** P&B: 0 (mais claro, só traço forte) … 100 (mais escuro, pega traço fraco). Padrão 50. */
	threshold?: number;
	/** Remover sombras/iluminação (padrão: sim). */
	shadows?: boolean;
};

const lumOf = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Mapa da cor do papel (fundo) numa grade grossa: por bloco, a média dos pixels mais claros (p90),
 * blocos escuros demais (fotos, mesa) herdam dos vizinhos, depois dilata e suaviza.
 */
function paperMap(img: Rgba) {
	const { data, width: w, height: h } = img;
	const B = Math.max(8, Math.round(Math.max(w, h) / 36));
	const gw = Math.ceil(w / B), gh = Math.ceil(h / B);
	const G = gw * gh;
	const bg = [new Float32Array(G), new Float32Array(G), new Float32Array(G)];
	const lumG = new Float32Array(G);
	const hist = new Uint32Array(256);
	const step = B >= 24 ? 2 : 1;
	for (let by = 0; by < gh; by++) {
		for (let bx = 0; bx < gw; bx++) {
			hist.fill(0);
			const x0 = bx * B, y0 = by * B, x1 = Math.min(w, x0 + B), y1 = Math.min(h, y0 + B);
			let n = 0;
			for (let y = y0; y < y1; y += step) {
				for (let x = x0, i = (y * w + x0) * 4; x < x1; x += step, i += 4 * step) {
					hist[lumOf(data[i], data[i + 1], data[i + 2]) | 0]++;
					n++;
				}
			}
			let acc = 0, p90 = 255;
			for (let v = 255; v >= 0; v--) {
				acc += hist[v];
				if (acc >= n * 0.1) { p90 = v; break; }
			}
			let r = 0, g = 0, b = 0, m = 0;
			for (let y = y0; y < y1; y += step) {
				for (let x = x0, i = (y * w + x0) * 4; x < x1; x += step, i += 4 * step) {
					if (lumOf(data[i], data[i + 1], data[i + 2]) >= p90) { r += data[i]; g += data[i + 1]; b += data[i + 2]; m++; }
				}
			}
			const k = by * gw + bx;
			bg[0][k] = r / m; bg[1][k] = g / m; bg[2][k] = b / m;
			lumG[k] = p90;
		}
	}
	// Blocos muito mais escuros que o papel típico não são papel: preenche pelos vizinhos.
	const sorted = Float32Array.from(lumG).sort();
	const paperLum = sorted[Math.floor(sorted.length * 0.75)];
	const valid = new Uint8Array(G);
	for (let k = 0; k < G; k++) valid[k] = lumG[k] >= paperLum * 0.6 ? 1 : 0;
	for (let pass = 0; pass < gw + gh; pass++) {
		let changed = false;
		const next = valid.slice();
		for (let y = 0; y < gh; y++) {
			for (let x = 0; x < gw; x++) {
				const k = y * gw + x;
				if (valid[k]) continue;
				let r = 0, g = 0, b = 0, m = 0;
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
					const xx = x + dx, yy = y + dy;
					if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
					const kk = yy * gw + xx;
					if (!valid[kk]) continue;
					r += bg[0][kk]; g += bg[1][kk]; b += bg[2][kk]; m++;
				}
				if (m) { bg[0][k] = r / m; bg[1][k] = g / m; bg[2][k] = b / m; next[k] = 1; changed = true; }
			}
		}
		valid.set(next);
		if (!changed) break;
	}
	// Dilata (máx. 3×3) para não confundir texto denso com sombra, e suaviza (caixa 3×3, duas vezes).
	const tmp = new Float32Array(G);
	for (const c of bg) {
		for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
			let m = 0;
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				const xx = Math.min(gw - 1, Math.max(0, x + dx)), yy = Math.min(gh - 1, Math.max(0, y + dy));
				m = Math.max(m, c[yy * gw + xx]);
			}
			tmp[y * gw + x] = m;
		}
		for (let pass = 0; pass < 2; pass++) {
			const src = pass ? c : tmp, dst = pass ? tmp : c;
			for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
				let s = 0, m = 0;
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
					const xx = x + dx, yy = y + dy;
					if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
					s += src[yy * gw + xx]; m++;
				}
				dst[y * gw + x] = s / m;
			}
		}
		c.set(tmp);
	}
	for (const c of bg) for (let k = 0; k < G; k++) c[k] = Math.max(24, c[k]);
	return { bg, gw, gh, B };
}

/** Divide cada pixel pela cor do papel (interpolação bilinear da grade): fundo → branco, sem sombra. */
function flatten(img: Rgba) {
	const { data, width: w, height: h } = img;
	const { bg, gw, gh, B } = paperMap(img);
	const [R, G, Bc] = bg;
	for (let y = 0; y < h; y++) {
		const gyf = Math.min(gh - 1, Math.max(0, (y + 0.5) / B - 0.5));
		const gy0 = gyf | 0, gy1 = Math.min(gh - 1, gy0 + 1), fy = gyf - gy0;
		for (let x = 0; x < w; x++) {
			const gxf = Math.min(gw - 1, Math.max(0, (x + 0.5) / B - 0.5));
			const gx0 = gxf | 0, gx1 = Math.min(gw - 1, gx0 + 1), fx = gxf - gx0;
			const k00 = gy0 * gw + gx0, k10 = gy0 * gw + gx1, k01 = gy1 * gw + gx0, k11 = gy1 * gw + gx1;
			const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
			const i = (y * w + x) * 4;
			const br = R[k00] * w00 + R[k10] * w10 + R[k01] * w01 + R[k11] * w11;
			const bgc = G[k00] * w00 + G[k10] * w10 + G[k01] * w01 + G[k11] * w11;
			const bb = Bc[k00] * w00 + Bc[k10] * w10 + Bc[k01] * w01 + Bc[k11] * w11;
			data[i] = (data[i] / br) * 255;
			data[i + 1] = (data[i + 1] / bgc) * 255;
			data[i + 2] = (data[i + 2] / bb) * 255;
		}
	}
}

/** Percentil da luminância (amostrado). */
function percentile(img: Rgba, pct: number): number {
	const { data } = img;
	const hist = new Uint32Array(256);
	const n = data.length / 4;
	const step = n > 4e6 ? 4 : n > 1e6 ? 2 : 1;
	let m = 0;
	for (let i = 0; i < data.length; i += 4 * step) { hist[lumOf(data[i], data[i + 1], data[i + 2]) | 0]++; m++; }
	let acc = 0;
	for (let v = 0; v < 256; v++) {
		acc += hist[v];
		if (acc >= m * pct) return v;
	}
	return 0;
}

/** Nitidez (unsharp 3×3) aplicada na luminância, somando a mesma diferença aos 3 canais. */
function sharpen(img: Rgba, amount: number) {
	const { data, width: w, height: h } = img;
	const L = new Float32Array(w * h);
	for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = lumOf(data[j], data[j + 1], data[j + 2]);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			const blur = (L[i - w - 1] + L[i - w + 1] + L[i + w - 1] + L[i + w + 1] + 2 * (L[i - 1] + L[i + 1] + L[i - w] + L[i + w]) + 4 * L[i]) / 16;
			const d = (L[i] - blur) * amount;
			const j = i * 4;
			data[j] += d; data[j + 1] += d; data[j + 2] += d;
		}
	}
}

export function enhance(img: Rgba, filter: ScanFilter, opts: EnhanceOptions = {}): Rgba {
	if (filter === 'original') return img;
	const { data } = img;
	const shadows = opts.shadows ?? true;
	if (shadows) flatten(img);
	// Pontos preto e branco: o papel domina a página (mediana ≈ papel) e vira branco puro.
	const lo = Math.min(90, percentile(img, filter === 'enhance' ? 0.005 : 0.01));
	const hi = Math.max(lo + 60, Math.min(250, percentile(img, 0.5) - 6));
	const span = hi - lo;
	if (filter === 'enhance') {
		sharpen(img, 0.6);
		for (let i = 0; i < data.length; i += 4) {
			let r = (data[i] - lo) / span, g = (data[i + 1] - lo) / span, b = (data[i + 2] - lo) / span;
			// curva: escurece o traço sem estourar o papel
			r = r <= 0 ? 0 : r >= 1 ? 1 : Math.pow(r, 1.25);
			g = g <= 0 ? 0 : g >= 1 ? 1 : Math.pow(g, 1.25);
			b = b <= 0 ? 0 : b >= 1 ? 1 : Math.pow(b, 1.25);
			// saturação +35% (carimbos, marca-texto e assinaturas ficam vivos)
			const l = 0.299 * r + 0.587 * g + 0.114 * b;
			data[i] = (l + (r - l) * 1.35) * 255;
			data[i + 1] = (l + (g - l) * 1.35) * 255;
			data[i + 2] = (l + (b - l) * 1.35) * 255;
		}
		return img;
	}
	if (filter === 'gray') {
		sharpen(img, 0.7);
		for (let i = 0; i < data.length; i += 4) {
			let v = (lumOf(data[i], data[i + 1], data[i + 2]) - lo) / span;
			v = v <= 0 ? 0 : v >= 1 ? 255 : Math.pow(v, 1.3) * 255;
			data[i] = data[i + 1] = data[i + 2] = v;
		}
		return img;
	}
	// P&B: limiar sobre o papel já branco, com rampa estreita (bordas suaves, sem serrilhado).
	const t = Math.max(0, Math.min(100, opts.threshold ?? 50));
	const cut = lo + span * (0.5 + 0.4 * (t / 100));
	const ramp = 10;
	for (let i = 0; i < data.length; i += 4) {
		const l = lumOf(data[i], data[i + 1], data[i + 2]);
		const v = l <= cut - ramp ? 0 : l >= cut + ramp ? 255 : ((l - (cut - ramp)) / (2 * ramp)) * 255;
		data[i] = data[i + 1] = data[i + 2] = v;
	}
	return img;
}

/** Empacota em 1 bit por pixel (MSB primeiro, linhas completas em bytes; 1 = branco). */
export function packBits(img: Rgba, cut = 128): Uint8Array {
	const { data, width: w, height: h } = img;
	const stride = Math.ceil(w / 8);
	const out = new Uint8Array(stride * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (data[i] >= cut) out[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
		}
	}
	return out;
}
