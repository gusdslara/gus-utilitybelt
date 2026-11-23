// Alças de transformação (mover, redimensionar, girar) para caixas rotacionadas:
// usadas por camadas vetoriais, pixels flutuantes (mover seleção) e pela ferramenta de recorte.
import type { Box } from './types.ts';
import { boxCorners, toBoxLocal } from './render.ts';

export type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'rotate';

/** Posições das alças em coordenadas do documento. */
export function handlePoints(b: Box, rotateOffsetDoc: number): { h: Handle; x: number; y: number }[] {
	const [tl, tr, br, bl] = boxCorners(b);
	const mid = (a: [number, number], c: [number, number]) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2] as [number, number];
	const n = mid(tl, tr), s = mid(bl, br), e = mid(tr, br), w = mid(tl, bl);
	const a = (b.rotation * Math.PI) / 180;
	const sign = b.h < 0 ? 1 : -1;
	// Alça de giro: acima da borda superior, perpendicular à caixa.
	const rot: [number, number] = [n[0] - Math.sin(a) * rotateOffsetDoc * sign, n[1] + Math.cos(a) * rotateOffsetDoc * sign];
	return [
		{ h: 'nw', x: tl[0], y: tl[1] }, { h: 'n', x: n[0], y: n[1] }, { h: 'ne', x: tr[0], y: tr[1] },
		{ h: 'e', x: e[0], y: e[1] }, { h: 'se', x: br[0], y: br[1] }, { h: 's', x: s[0], y: s[1] },
		{ h: 'sw', x: bl[0], y: bl[1] }, { h: 'w', x: w[0], y: w[1] }, { h: 'rotate', x: rot[0], y: rot[1] }
	];
}

/** Qual alça está sob o ponto (doc). `tol` em unidades do documento. */
export function hitHandle(b: Box, px: number, py: number, tol: number, rotateOffsetDoc: number, allowRotate = true): Handle | null {
	for (const p of handlePoints(b, rotateOffsetDoc)) {
		if (!allowRotate && p.h === 'rotate') continue;
		if (Math.hypot(px - p.x, py - p.y) <= tol) return p.h;
	}
	const [lx, ly] = toBoxLocal(b, px, py);
	const x0 = Math.min(0, b.w), x1 = Math.max(0, b.w), y0 = Math.min(0, b.h), y1 = Math.max(0, b.h);
	if (lx >= x0 - tol / 2 && lx <= x1 + tol / 2 && ly >= y0 - tol / 2 && ly <= y1 + tol / 2) return 'move';
	return null;
}

export const HANDLE_CURSOR: Record<Handle, string> = {
	move: 'move', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
	ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', rotate: 'grab'
};

/**
 * Nova caixa ao arrastar uma alça. `start` é a caixa no início do arraste, (px,py) o ponteiro em doc.
 * keepAspect: mantém proporção (cantos); fromCenter: redimensiona a partir do centro.
 */
export function dragHandle(start: Box, h: Handle, sx: number, sy: number, px: number, py: number, opts: { keepAspect?: boolean; fromCenter?: boolean; snapAngle?: boolean; aspect?: number | null } = {}): Box {
	if (h === 'move') return { ...start, x: start.x + (px - sx), y: start.y + (py - sy) };
	const cx = start.x + start.w / 2, cy = start.y + start.h / 2;
	if (h === 'rotate') {
		const a0 = Math.atan2(sy - cy, sx - cx), a1 = Math.atan2(py - cy, px - cx);
		let r = start.rotation + ((a1 - a0) * 180) / Math.PI;
		r = ((r % 360) + 540) % 360 - 180;
		if (opts.snapAngle) r = Math.round(r / 15) * 15;
		return { ...start, rotation: r };
	}
	// Trabalha no espaço local da caixa inicial (0..w, 0..h).
	const [lx, ly] = toBoxLocal(start, px, py);
	let x0 = 0, y0 = 0, x1 = start.w, y1 = start.h;
	if (h.includes('w')) x0 = lx;
	if (h.includes('e')) x1 = lx;
	if (h.includes('n')) y0 = ly;
	if (h.includes('s')) y1 = ly;
	if (opts.fromCenter) {
		if (h.includes('w')) x1 = start.w - x0;
		if (h.includes('e')) x0 = start.w - x1;
		if (h.includes('n')) y1 = start.h - y0;
		if (h.includes('s')) y0 = start.h - y1;
	}
	const ratio = opts.aspect ?? (opts.keepAspect && start.h ? start.w / start.h : null);
	if (ratio) {
		let w = x1 - x0, hh = y1 - y0;
		const corner = h.length === 2;
		if (corner) {
			if (Math.abs(w) / ratio > Math.abs(hh)) hh = (Math.sign(hh) || 1) * Math.abs(w) / ratio;
			else w = (Math.sign(w) || 1) * Math.abs(hh) * ratio;
		} else if (h === 'n' || h === 's') w = (Math.sign(w) || 1) * Math.abs(hh) * ratio;
		else hh = (Math.sign(hh) || 1) * Math.abs(w) / ratio;
		if (h.includes('w')) x0 = x1 - w;
		else if (h === 'n' || h === 's') {
			const mid = start.w / 2;
			x0 = mid - w / 2;
			x1 = mid + w / 2;
		} else x1 = x0 + w;
		if (h.includes('n')) y0 = y1 - hh;
		else if (h === 'e' || h === 'w') {
			const mid = start.h / 2;
			y0 = mid - hh / 2;
			y1 = mid + hh / 2;
		} else y1 = y0 + hh;
	}
	const w = x1 - x0, hh = y1 - y0;
	// Centro novo (local) → mundo.
	const lcx = x0 + w / 2 - start.w / 2, lcy = y0 + hh / 2 - start.h / 2;
	const a = (start.rotation * Math.PI) / 180;
	const ncx = cx + lcx * Math.cos(a) - lcy * Math.sin(a);
	const ncy = cy + lcx * Math.sin(a) + lcy * Math.cos(a);
	return { x: ncx - w / 2, y: ncy - hh / 2, w, h: hh, rotation: start.rotation };
}

/** Caixa normalizada (w/h positivos), preservando a posição visual. */
export function normalizeBox(b: Box): Box {
	return { x: Math.min(b.x, b.x + b.w), y: Math.min(b.y, b.y + b.h), w: Math.abs(b.w), h: Math.abs(b.h), rotation: b.rotation };
}
