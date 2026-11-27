// Detecção automática do documento na foto (sem OpenCV): bordas por cor → Hough orientado pelo gradiente →
// combinações de 4 retas → o quadrilátero com mais borda real ao longo dos lados, maior e mais "retangular".
// Bordas da foto entram como retas candidatas (documento maior que o enquadramento), com peso menor.
// Rápido o bastante para rodar ao vivo (~320 px) num worker; puro e testável.
import { isConvex, polyArea, quadAngles, type Pt, type Quad } from './geometry.ts';
import type { Rgba } from './warp.ts';

type Line = { t: number; rho: number; votes: number; border?: boolean };

export type Detection = { quad: Quad; score: number };

const DEG = Math.PI / 180;
const COS = new Float32Array(180), SIN = new Float32Array(180);
for (let i = 0; i < 180; i++) {
	COS[i] = Math.cos(i * DEG);
	SIN[i] = Math.sin(i * DEG);
}

function blur5(src: Float32Array, w: number, h: number, tmp: Float32Array) {
	// [1 4 6 4 1] / 16, separável, borda repetida.
	for (let y = 0; y < h; y++) {
		const r = y * w;
		for (let x = 0; x < w; x++) {
			const a = src[r + Math.max(0, x - 2)], b = src[r + Math.max(0, x - 1)], c = src[r + x];
			const d = src[r + Math.min(w - 1, x + 1)], e = src[r + Math.min(w - 1, x + 2)];
			tmp[r + x] = (a + e + 4 * (b + d) + 6 * c) / 16;
		}
	}
	for (let y = 0; y < h; y++) {
		const ym2 = Math.max(0, y - 2) * w, ym1 = Math.max(0, y - 1) * w, y0 = y * w;
		const yp1 = Math.min(h - 1, y + 1) * w, yp2 = Math.min(h - 1, y + 2) * w;
		for (let x = 0; x < w; x++) src[y0 + x] = (tmp[ym2 + x] + tmp[yp2 + x] + 4 * (tmp[ym1 + x] + tmp[yp1 + x]) + 6 * tmp[y0 + x]) / 16;
	}
}

/** Diferença angular entre direções de reta (0..90°), em índices de 1°. */
const angDiff = (a: number, b: number) => {
	const d = Math.abs(a - b) % 180;
	return d > 90 ? 180 - d : d;
};

function intersect(a: Line, b: Line, cx: number, cy: number): Pt | null {
	const c1 = COS[a.t], s1 = SIN[a.t], c2 = COS[b.t], s2 = SIN[b.t];
	const det = c1 * s2 - s1 * c2;
	if (Math.abs(det) < 1e-6) return null;
	return { x: (a.rho * s2 - b.rho * s1) / det + cx, y: (c1 * b.rho - c2 * a.rho) / det + cy };
}

export type DetectOptions = { minArea?: number; maxLines?: number };

export function detectQuad(img: Rgba, opts: DetectOptions = {}): Detection | null {
	const { data, width: w, height: h } = img;
	if (w < 24 || h < 24) return null;
	const N = w * h;
	const minDim = Math.min(w, h);
	const minArea = opts.minArea ?? 0.1;
	const maxLines = opts.maxLines ?? 16;

	// 1) Canais suavizados (a borda pode estar só na cor: papel branco sobre mesa clara).
	const tmp = new Float32Array(N);
	const chans = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
	for (let i = 0, j = 0; i < N; i++, j += 4) {
		chans[0][i] = data[j];
		chans[1][i] = data[j + 1];
		chans[2][i] = data[j + 2];
	}
	for (const c of chans) {
		blur5(c, w, h, tmp);
		blur5(c, w, h, tmp);
	}

	// 2) Sobel: por pixel, o canal de maior gradiente.
	const gx = new Float32Array(N), gy = new Float32Array(N), mag = new Float32Array(N);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			let best = 0, bx = 0, by = 0;
			for (let k = 0; k < 3; k++) {
				const c = chans[k];
				const sx = c[i - w + 1] + 2 * c[i + 1] + c[i + w + 1] - c[i - w - 1] - 2 * c[i - 1] - c[i + w - 1];
				const sy = c[i + w - 1] + 2 * c[i + w] + c[i + w + 1] - c[i - w - 1] - 2 * c[i - w] - c[i - w + 1];
				const m = sx * sx + sy * sy;
				if (m > best) { best = m; bx = sx; by = sy; }
			}
			gx[i] = bx;
			gy[i] = by;
			mag[i] = Math.sqrt(best);
		}
	}

	// 3) Limiar relativo (p99) + supressão de não-máximos → bordas finas com a direção da normal.
	const hist = new Uint32Array(2048);
	let cnt = 0;
	for (let i = 0; i < N; i++) if (mag[i] > 0) { hist[Math.min(2047, mag[i] | 0)]++; cnt++; }
	let acc = 0, p99 = 0;
	for (let b = 2047; b >= 0; b--) {
		acc += hist[b];
		if (acc >= cnt * 0.01) { p99 = b; break; }
	}
	const thr = Math.max(16, p99 * 0.14);
	const edgeAng = new Int16Array(N).fill(-1); // ângulo da normal (0..179) ou -1
	const ex: number[] = [], ey: number[] = [], ea: number[] = [];
	for (let y = 2; y < h - 2; y++) {
		for (let x = 2; x < w - 2; x++) {
			const i = y * w + x;
			const m = mag[i];
			if (m < thr) continue;
			let a = Math.atan2(gy[i], gx[i]);
			if (a < 0) a += Math.PI;
			const q = Math.round(a / (Math.PI / 4)) % 4; // 0: horiz., 1: 45°, 2: vert., 3: 135°
			const off = q === 0 ? 1 : q === 1 ? w + 1 : q === 2 ? w : w - 1;
			if (m < mag[i - off] || m < mag[i + off]) continue;
			const t = Math.round(a / DEG) % 180;
			edgeAng[i] = t;
			ex.push(x);
			ey.push(y);
			ea.push(t);
		}
	}
	if (ex.length < minDim) return null;

	// 4) Hough: cada borda vota só perto da própria orientação (±3°) — rápido e com picos limpos.
	const cx = w / 2, cy = h / 2;
	const R = Math.ceil(Math.hypot(w, h) / 2) + 2;
	const RW = 2 * R + 1;
	const hough = new Uint16Array(180 * RW);
	for (let k = 0; k < ex.length; k++) {
		const xc = ex[k] - cx, yc = ey[k] - cy;
		for (let d = -3; d <= 3; d++) {
			const t = (ea[k] + d + 180) % 180;
			const r = Math.round(xc * COS[t] + yc * SIN[t]) + R;
			hough[t * RW + r]++;
		}
	}
	const minVotes = Math.max(12, minDim * 0.12);
	const cands: Line[] = [];
	for (let t = 0; t < 180; t++) {
		for (let r = 1; r < RW - 1; r++) {
			const v = hough[t * RW + r];
			if (v < minVotes) continue;
			// máximo local 3×3 (θ circular)
			let peak = true;
			for (let dt = -1; dt <= 1 && peak; dt++) {
				const tt = (t + dt + 180) % 180;
				const flip = t + dt < 0 || t + dt >= 180; // ao dar a volta, ρ troca de sinal
				for (let dr = -1; dr <= 1; dr++) {
					if (!dt && !dr) continue;
					const rr = flip ? 2 * R - r - dr : r + dr;
					if (rr < 0 || rr >= RW) continue;
					const o = hough[tt * RW + rr];
					if (o > v || (o === v && (dt < 0 || (dt === 0 && dr < 0)))) { peak = false; break; }
				}
			}
			if (peak) cands.push({ t, rho: r - R, votes: v });
		}
	}
	cands.sort((a, b) => b.votes - a.votes);
	const lines: Line[] = [];
	const rhoTol = Math.max(6, minDim * 0.035);
	for (const c of cands) {
		const dup = lines.some((l) => {
			if (angDiff(l.t, c.t) > 5) return false;
			const same = Math.abs(l.t - c.t) <= 90;
			return Math.abs((same ? c.rho : -c.rho) - l.rho) < rhoTol;
		});
		if (!dup) lines.push(c);
		if (lines.length >= maxLines) break;
	}
	// Bordas da foto (documento cortado pelo enquadramento).
	const borders: Line[] = [
		{ t: 90, rho: -cy + 0.5, votes: 0, border: true },
		{ t: 90, rho: h - 1.5 - cy, votes: 0, border: true },
		{ t: 0, rho: -cx + 0.5, votes: 0, border: true },
		{ t: 0, rho: w - 1.5 - cx, votes: 0, border: true }
	];
	const all = [...lines, ...borders];
	const L = all.length;

	// 5) Suporte de um lado: fração de pontos do segmento com borda alinhada por perto.
	const TOL = 13;
	const segSupport = (p: Pt, q: Pt): number => {
		const dx = q.x - p.x, dy = q.y - p.y;
		const len = Math.hypot(dx, dy);
		if (len < 4) return 0;
		let na = Math.atan2(dx, -dy);
		if (na < 0) na += Math.PI;
		const nt = Math.round(na / DEG) % 180;
		const n = Math.max(8, Math.floor(len / 1.5));
		let hits = 0;
		for (let s = 0; s <= n; s++) {
			const x = Math.round(p.x + (dx * s) / n), y = Math.round(p.y + (dy * s) / n);
			let hit = false;
			for (let oy = -1; oy <= 1 && !hit; oy++) {
				const yy = y + oy;
				if (yy < 0 || yy >= h) continue;
				for (let ox = -1; ox <= 1; ox++) {
					const xx = x + ox;
					if (xx < 0 || xx >= w) continue;
					const a = edgeAng[yy * w + xx];
					if (a >= 0 && angDiff(a, nt) <= TOL) { hit = true; break; }
				}
			}
			if (hit) hits++;
		}
		return hits / (n + 1);
	};
	const BORDER_SUPPORT = 0.5;
	const cache = new Map<number, number>();
	const sideSupport = (li: number, b1: number, b2: number, p: Pt, q: Pt) => {
		if (all[li].border) return BORDER_SUPPORT;
		const key = li * L * L + Math.min(b1, b2) * L + Math.max(b1, b2);
		let v = cache.get(key);
		if (v === undefined) cache.set(key, (v = segSupport(p, q)));
		return v;
	};

	// 6) Pares de retas "opostas" (quase paralelas e afastadas).
	const pairs: [number, number][] = [];
	for (let i = 0; i < L; i++) {
		for (let j = i + 1; j < L; j++) {
			const a = all[i], b = all[j];
			if (a.border && b.border && a.t === b.t) { pairs.push([i, j]); continue; }
			if (angDiff(a.t, b.t) > 40) continue;
			// distância entre as retas perto do centro
			const px = b.rho * COS[b.t], py = b.rho * SIN[b.t];
			const sep = Math.abs(px * COS[a.t] + py * SIN[a.t] - a.rho);
			if (sep < minDim * 0.18) continue;
			pairs.push([i, j]);
		}
	}

	const imgArea = w * h;
	const margin = minDim * 0.04;
	let best: Detection | null = null;
	let bestScore = 0;
	for (let pi = 0; pi < pairs.length; pi++) {
		const [a1, a2] = pairs[pi];
		for (let pj = pi + 1; pj < pairs.length; pj++) {
			const [b1, b2] = pairs[pj];
			if (b1 === a1 || b1 === a2 || b2 === a1 || b2 === a2) continue;
			const A1 = all[a1], A2 = all[a2], B1 = all[b1], B2 = all[b2];
			const cross = Math.min(angDiff(A1.t, B1.t), angDiff(A1.t, B2.t), angDiff(A2.t, B1.t), angDiff(A2.t, B2.t));
			if (cross < 35) continue;
			const borderCount = +!!A1.border + +!!A2.border + +!!B1.border + +!!B2.border;
			if (borderCount > 2) continue;
			const c0 = intersect(A1, B1, cx, cy), c1 = intersect(A1, B2, cx, cy), c2 = intersect(A2, B2, cx, cy), c3 = intersect(A2, B1, cx, cy);
			if (!c0 || !c1 || !c2 || !c3) continue;
			const pts = [c0, c1, c2, c3];
			if (pts.some((p) => p.x < -margin || p.y < -margin || p.x > w - 1 + margin || p.y > h - 1 + margin)) continue;
			for (const p of pts) {
				p.x = Math.min(w - 1, Math.max(0, p.x));
				p.y = Math.min(h - 1, Math.max(0, p.y));
			}
			if (!isConvex(pts)) continue;
			const areaFrac = Math.abs(polyArea(pts)) / imgArea;
			if (areaFrac < minArea) continue;
			// Lados: A1 (c0→c1), B2 (c1→c2), A2 (c2→c3), B1 (c3→c0)
			const s0 = sideSupport(a1, b1, b2, c0, c1);
			if (s0 < 0.3) continue;
			const s2 = sideSupport(a2, b1, b2, c2, c3);
			if (s2 < 0.3) continue;
			const s1 = sideSupport(b2, a1, a2, c1, c2);
			if (s1 < 0.3) continue;
			const s3 = sideSupport(b1, a1, a2, c3, c0);
			if (s3 < 0.3) continue;
			const ordered = orderPts(pts);
			const angles = quadAngles(ordered);
			if (angles.some((a) => a < 45 || a > 135)) continue;
			const l0 = Math.hypot(c1.x - c0.x, c1.y - c0.y), l1 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
			const l2 = Math.hypot(c3.x - c2.x, c3.y - c2.y), l3 = Math.hypot(c0.x - c3.x, c0.y - c3.y);
			const mean = (s0 * l0 + s1 * l1 + s2 * l2 + s3 * l3) / (l0 + l1 + l2 + l3);
			const minS = Math.min(s0, s1, s2, s3);
			const rect = 1 - angles.reduce((s, a) => s + Math.abs(a - 90), 0) / 360; // 1 = retângulo frontal
			const score = mean * Math.sqrt(minS) * (0.5 + 0.5 * Math.sqrt(areaFrac)) * (0.75 + 0.25 * rect) * (1 - 0.1 * borderCount);
			if (score > bestScore) {
				bestScore = score;
				best = { quad: ordered, score };
			}
		}
	}
	if (!best || bestScore < 0.2) return null;
	// Recua ~1 px (na resolução de detecção) para dentro: a borda nunca traz um filete da mesa.
	const qx = best.quad.reduce((s, p) => s + p.x, 0) / 4, qy = best.quad.reduce((s, p) => s + p.y, 0) / 4;
	const inset = best.quad.map((p) => {
		const d = Math.hypot(p.x - qx, p.y - qy) || 1;
		const k = Math.max(0, 1 - 1.5 / d - 0.004);
		return { x: (qx + (p.x - qx) * k) / w, y: (qy + (p.y - qy) * k) / h };
	});
	return { quad: inset as Quad, score: bestScore };
}

function orderPts(pts: Pt[]): Quad {
	const cx = pts.reduce((s, p) => s + p.x, 0) / 4, cy = pts.reduce((s, p) => s + p.y, 0) / 4;
	const s = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
	let start = 0;
	for (let i = 1; i < 4; i++) if (s[i].x + s[i].y < s[start].x + s[start].y) start = i;
	return [0, 1, 2, 3].map((k) => ({ ...s[(start + k) % 4] })) as Quad;
}
