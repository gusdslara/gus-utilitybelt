// Geometria do scanner: quadriláteros, homografia (perspectiva) e proporção real do documento.
// Funções puras (rodam no worker, na thread principal e nos testes).

export type Pt = { x: number; y: number };
/** Cantos na ordem: superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo. */
export type Quad = [Pt, Pt, Pt, Pt];
export type Rotation = 0 | 90 | 180 | 270;

export const FULL_QUAD: Quad = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 1, y: 1 },
	{ x: 0, y: 1 }
];

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Área com sinal (shoelace); positiva em sentido horário no sistema de tela (y para baixo). */
export function polyArea(p: Pt[]): number {
	let s = 0;
	for (let i = 0; i < p.length; i++) {
		const a = p[i], b = p[(i + 1) % p.length];
		s += a.x * b.y - b.x * a.y;
	}
	return s / 2;
}

export function isConvex(q: Pt[]): boolean {
	let sign = 0;
	for (let i = 0; i < q.length; i++) {
		const a = q[i], b = q[(i + 1) % q.length], c = q[(i + 2) % q.length];
		const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
		if (Math.abs(z) < 1e-12) continue;
		const s = Math.sign(z);
		if (sign && s !== sign) return false;
		sign = s;
	}
	return sign !== 0;
}

/** Ordena 4 pontos quaisquer como TL, TR, BR, BL (sentido horário na tela). */
export function orderQuad(pts: Pt[]): Quad {
	const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
	const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
	const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
	// sorted começa no ângulo mais negativo (em cima à esquerda, aprox.); acha o TL como o de menor x+y.
	let start = 0;
	for (let i = 1; i < 4; i++) if (sorted[i].x + sorted[i].y < sorted[start].x + sorted[start].y) start = i;
	return [0, 1, 2, 3].map((k) => sorted[(start + k) % 4]) as Quad;
}

/** Ângulo interno (graus) em cada canto. */
export function quadAngles(q: Quad): number[] {
	return q.map((b, i) => {
		const a = q[(i + 3) % 4], c = q[(i + 1) % 4];
		const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
		const cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1);
		return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
	});
}

export const scaleQuad = (q: Quad, sx: number, sy: number): Quad => q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad;

/** Gira um ponto normalizado (0..1) no sentido horário. */
export function rotatePt(p: Pt, r: Rotation): Pt {
	switch (r) {
		case 90: return { x: 1 - p.y, y: p.x };
		case 180: return { x: 1 - p.x, y: 1 - p.y };
		case 270: return { x: p.y, y: 1 - p.x };
		default: return { ...p };
	}
}
export const unrotatePt = (p: Pt, r: Rotation): Pt => rotatePt(p, ((360 - r) % 360) as Rotation);

/** Quad em coordenadas da imagem original → coordenadas da imagem girada (e reordena os cantos). */
export const rotateQuad = (q: Quad, r: Rotation): Quad => orderQuad(q.map((p) => rotatePt(p, r)));
export const unrotateQuad = (q: Quad, r: Rotation): Quad => orderQuad(q.map((p) => unrotatePt(p, r)));

export const isFullQuad = (q: Quad | null, eps = 0.002) => !q || q.every((p, i) => Math.abs(p.x - FULL_QUAD[i].x) < eps && Math.abs(p.y - FULL_QUAD[i].y) < eps);

// =====================================================================
// Homografia
// =====================================================================

/** Resolve A·x = b (Gauss com pivoteamento parcial). Retorna null se singular. */
function solve(A: number[][], b: number[]): number[] | null {
	const n = b.length;
	const M = A.map((row, i) => [...row, b[i]]);
	for (let c = 0; c < n; c++) {
		let piv = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
		if (Math.abs(M[piv][c]) < 1e-12) return null;
		[M[c], M[piv]] = [M[piv], M[c]];
		for (let r = 0; r < n; r++) {
			if (r === c) continue;
			const f = M[r][c] / M[c][c];
			if (!f) continue;
			for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
		}
	}
	return M.map((row, i) => row[n] / row[i]);
}

/** Homografia 3×3 (linha a linha, h8 = 1) que leva `from[i]` → `to[i]`. */
export function homography(from: Pt[], to: Pt[]): number[] | null {
	const A: number[][] = [];
	const b: number[] = [];
	for (let i = 0; i < 4; i++) {
		const { x, y } = from[i], { x: u, y: v } = to[i];
		A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
		b.push(u);
		A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
		b.push(v);
	}
	const h = solve(A, b);
	return h ? [...h, 1] : null;
}

export function applyH(h: number[], p: Pt): Pt {
	const w = h[6] * p.x + h[7] * p.y + h[8];
	return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

// =====================================================================
// Proporção real do retângulo fotografado em perspectiva
// (Zhang & He, "Whiteboard scanning and image enhancement", 2007)
// =====================================================================

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Largura/altura do documento real, a partir do quad em pixels e do tamanho da foto.
 * Estima a distância focal pelos pontos de fuga; se a perspectiva for fraca demais (quase frontal), usa os lados.
 */
export function rectAspect(q: Quad, imgW: number, imgH: number): number {
	const fallback = () => {
		const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
		const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
		return h > 0 ? w / h : 1;
	};
	const u0 = imgW / 2, v0 = imgH / 2;
	const s = Math.max(imgW, imgH); // normaliza para estabilidade numérica
	const m = (p: Pt): V3 => [(p.x - u0) / s, (p.y - v0) / s, 1];
	// Notação do artigo: m1 = TL, m2 = TR, m3 = BL, m4 = BR.
	const m1 = m(q[0]), m2 = m(q[1]), m3 = m(q[3]), m4 = m(q[2]);
	const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
	const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
	if (!isFinite(k2) || !isFinite(k3)) return fallback();
	const n2: V3 = [k2 * m2[0] - m1[0], k2 * m2[1] - m1[1], k2 * m2[2] - m1[2]];
	const n3: V3 = [k3 * m3[0] - m1[0], k3 * m3[1] - m1[1], k3 * m3[2] - m1[2]];
	const den = n2[2] * n3[2];
	if (Math.abs(den) < 1e-9) return fallback();
	const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / den;
	// Focal plausível: entre ~0,3× e ~5× a maior dimensão (normalizada = 1).
	if (!(f2 > 0.09 && f2 < 25)) return fallback();
	const a = (n2[0] * n2[0] + n2[1] * n2[1]) / f2 + n2[2] * n2[2];
	const b = (n3[0] * n3[0] + n3[1] * n3[1]) / f2 + n3[2] * n3[2];
	const r = Math.sqrt(a / b);
	if (!isFinite(r) || r <= 0) return fallback();
	// Sanidade: não pode divergir muito da medida ingênua.
	const fb = fallback();
	return r / fb > 2 || fb / r > 2 ? fb : r;
}

/** Proporções de papel comuns (largura/altura em retrato). */
const PAPER = [1 / Math.SQRT2, 8.5 / 11, 8.5 / 14, 85.6 / 53.98 /* cartão */];

/** Aproxima para A4/Carta/Ofício/cartão quando a diferença é pequena (< tol). */
export function snapAspect(r: number, tol = 0.035): number {
	for (const p of PAPER) {
		for (const target of [p, 1 / p]) if (Math.abs(r / target - 1) < tol) return target;
	}
	return r;
}

/** Tamanho de saída (px) do recorte: proporção estimada e resolução próxima à da foto. */
export function outputSize(q: Quad, imgW: number, imgH: number, maxSide = Infinity, snap = true, upscale = 1): { w: number; h: number } {
	let r = rectAspect(q, imgW, imgH);
	if (snap) r = snapAspect(r);
	// Resolução: a maior aresta medida na foto (só amplia quando pedido, ex.: P&B).
	const longest = Math.max(dist(q[0], q[1]), dist(q[3], q[2]), dist(q[0], q[3]), dist(q[1], q[2]));
	const L = Math.max(16, Math.min(maxSide, longest * upscale));
	return r >= 1 ? { w: Math.round(L), h: Math.max(1, Math.round(L / r)) } : { w: Math.max(1, Math.round(L * r)), h: Math.round(L) };
}
