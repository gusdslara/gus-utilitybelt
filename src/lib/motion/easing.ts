// Curvas de easing do app Motion: avaliação numérica (`ease`) para o preview do editor e
// tradução para tangentes de keyframe do Lottie (`o`/`i`). Curvas que não cabem numa cúbica
// (elastic/bounce) são EXPANDIDAS em vários sub-keyframes, para o Lottie tocar igual ao `ease(t)`.
import type { Easing } from './types.ts';

export type Bezier = [number, number, number, number];

/** Lista para a UI (ordem de exibição). `bezier` custom é editado à parte. */
export const EASINGS: Easing[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'backIn', 'backOut', 'elastic', 'bounce', 'hold'];

export const EASING_LABELS: Record<string, string> = {
	linear: 'Linear',
	easeIn: 'Acelerar',
	easeOut: 'Desacelerar',
	easeInOut: 'Suave',
	backIn: 'Recuo (entrada)',
	backOut: 'Ultrapassar',
	elastic: 'Elástico',
	bounce: 'Quicar',
	hold: 'Segurar',
	bezier: 'Bezier'
};

/** Cúbicas "de motion design" (quint-ish), mais vivas que as do CSS. back* cabem numa cúbica com y fora de 0..1. */
const CURVES: Record<string, Bezier> = {
	linear: [0, 0, 1, 1],
	easeIn: [0.64, 0, 0.78, 0],
	easeOut: [0.22, 1, 0.36, 1],
	easeInOut: [0.65, 0, 0.35, 1],
	backIn: [0.36, 0, 0.66, -0.56],
	backOut: [0.34, 1.56, 0.64, 1]
};

export const easingName = (e: Easing): string => (typeof e === 'string' ? e : 'bezier');

/** Pontos de controle cúbicos da curva; `null` para hold/elastic/bounce (não são uma cúbica só). */
export function easingBezier(e: Easing): Bezier | null {
	if (typeof e === 'object' && e && Array.isArray(e.bezier)) {
		const [x1, y1, x2, y2] = e.bezier;
		return [clamp01(x1), fin(y1), clamp01(x2), fin(y2)];
	}
	return CURVES[e as string] ?? null;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const fin = (n: number) => (Number.isFinite(n) ? n : 0);

/** Resolve cubic-bezier(x1,y1,x2,y2) em t (x = tempo). Newton + bissecção, como no navegador. */
export function cubicBezierAt(b: Bezier, t: number): number {
	const [x1, y1, x2, y2] = b;
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	if (x1 === y1 && x2 === y2) return t;
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
	const dsx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
	let s = t;
	for (let i = 0; i < 8; i++) {
		const err = sx(s) - t;
		if (Math.abs(err) < 1e-7) return ((ay * s + by) * s + cy) * s;
		const d = dsx(s);
		if (Math.abs(d) < 1e-6) break;
		s -= err / d;
	}
	let lo = 0, hi = 1;
	s = t;
	for (let i = 0; i < 40; i++) {
		const x = sx(s);
		if (Math.abs(x - t) < 1e-7) break;
		if (x < t) lo = s;
		else hi = s;
		s = (lo + hi) / 2;
	}
	return ((ay * s + by) * s + cy) * s;
}

// easeOutElastic / easeOutBounce clássicos (easings.net).
const C4 = (2 * Math.PI) / 3;
function elasticOut(t: number): number {
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * C4) + 1;
}
function bounceOut(t: number): number {
	const n1 = 7.5625, d1 = 2.75;
	if (t < 1 / d1) return n1 * t * t;
	if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
	if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
	return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

/** t (0..1) → progresso com easing. Pode passar de 0..1 (back, elastic). `hold` = 0 até o fim do trecho. */
export function ease(e: Easing, t: number): number {
	if (!Number.isFinite(t)) return 0;
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	if (e === 'hold') return 0;
	if (e === 'elastic') return elasticOut(t);
	if (e === 'bounce') return bounceOut(t);
	const b = easingBezier(e);
	return b ? cubicBezierAt(b, t) : t;
}

/** Tangentes Lottie para um trecho cúbico (arrays de 1 valor: o lottie-web aplica a todas as dimensões). */
export function lottieTangents(b: Bezier): { o: { x: number[]; y: number[] }; i: { x: number[]; y: number[] } } {
	const r = (n: number) => Math.round(n * 10000) / 10000;
	return { o: { x: [r(b[0])], y: [r(b[1])] }, i: { x: [r(b[2])], y: [r(b[3])] } };
}

/** Um sub-trecho da expansão: começa em `t` (0..1 do trecho original), com progresso `p` e curva `bez` até o próximo. */
export type EaseSegment = { t: number; p: number; bez: Bezier };

/**
 * Divide a curva em trechos cúbicos. Curvas que já são cúbicas → 1 trecho. elastic/bounce → vários,
 * cortados nos extremos/batidas e ajustados por Hermite (x linear: controles em 1/3 e 2/3), o que é exato
 * nos trechos parabólicos do bounce e fica a <0,5% do elastic. `hold` não entra aqui (vira `h: 1`).
 */
export function easeSegments(e: Easing): EaseSegment[] {
	const b = easingBezier(e);
	if (b) return [{ t: 0, p: 0, bez: b }];
	if (e === 'bounce') {
		const d = 2.75;
		return hermite(bounceOut, [0, 1 / d, 1.5 / d, 2 / d, 2.25 / d, 2.5 / d, 2.625 / d, 1]);
	}
	if (e === 'elastic') return hermite(elasticOut, elasticBreaks());
	return [{ t: 0, p: 0, bez: CURVES.linear }];
}

let _elasticBreaks: number[] | null = null;
/** Extremos locais do elastic (derivada zero), até a oscilação ficar imperceptível. */
function elasticBreaks(): number[] {
	if (_elasticBreaks) return _elasticBreaks;
	const out = [0];
	const N = 4000;
	let prev = elasticOut(1 / N) - elasticOut(0);
	for (let k = 1; k < N; k++) {
		const t = k / N;
		const d = elasticOut((k + 1) / N) - elasticOut(t);
		if (Math.sign(d) !== Math.sign(prev) && d !== 0) {
			if (Math.abs(elasticOut(t) - 1) < 0.004) break;
			out.push(t);
		}
		prev = d;
	}
	out.push(1);
	return (_elasticBreaks = out);
}

function hermiteSeg(f: (t: number) => number, t0: number, t1: number): EaseSegment {
	const h = 1e-5;
	const v0 = f(t0), v1 = f(t1);
	const dv = v1 - v0, dt = t1 - t0;
	// derivadas unilaterais (dentro do trecho) — o bounce tem quinas nas batidas
	const d0 = (f(t0 + h) - f(t0)) / h;
	const d1 = (f(t1) - f(t1 - h)) / h;
	// trecho quase parado (cauda do elastic): derivadas normalizadas explodem → curva suave sem tangente
	if (Math.abs(dv) < 0.01) return { t: t0, p: v0, bez: [1 / 3, 0, 2 / 3, 1] };
	const m0 = (d0 * dt) / dv, m1 = (d1 * dt) / dv;
	return { t: t0, p: v0, bez: [1 / 3, m0 / 3, 2 / 3, 1 - m1 / 3] };
}

/** Erro máximo do trecho Hermite contra a curva real. */
function segError(f: (t: number) => number, s: EaseSegment, t1: number, p1: number): number {
	let worst = 0;
	for (let k = 1; k < 16; k++) {
		const t = s.t + ((t1 - s.t) * k) / 16;
		const v = s.p + (p1 - s.p) * cubicBezierAt(s.bez, k / 16);
		worst = Math.max(worst, Math.abs(v - f(t)));
	}
	return worst;
}

/** Ajusta trechos Hermite entre os cortes, subdividindo ao meio onde o erro passa de 1%. */
function hermite(f: (t: number) => number, breaks: number[]): EaseSegment[] {
	const segs: EaseSegment[] = [];
	const fit = (t0: number, t1: number, depth: number) => {
		const s = hermiteSeg(f, t0, t1);
		if (depth < 2 && segError(f, s, t1, f(t1)) > 0.01) {
			const mid = (t0 + t1) / 2;
			fit(t0, mid, depth + 1);
			fit(mid, t1, depth + 1);
		} else segs.push(s);
	};
	for (let k = 0; k < breaks.length - 1; k++) fit(breaks[k], breaks[k + 1], 0);
	return segs;
}
