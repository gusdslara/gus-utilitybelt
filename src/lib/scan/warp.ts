// Recorte com correção de perspectiva (homografia + bilinear) e giro em múltiplos de 90°. Puro.
import { homography, type Quad, type Rotation } from './geometry.ts';

export type Rgba = { data: Uint8ClampedArray; width: number; height: number };

/**
 * Gera uma imagem `ow`×`oh` com o conteúdo do quadrilátero `q` (em px da imagem de origem).
 * Amostragem bilinear no centro de cada pixel; fora da origem repete a borda.
 */
export function warpPerspective(src: Rgba, q: Quad, ow: number, oh: number): Rgba {
	const h = homography(
		[{ x: 0, y: 0 }, { x: ow, y: 0 }, { x: ow, y: oh }, { x: 0, y: oh }],
		q
	);
	if (!h) throw new Error('Recorte inválido.');
	const { data: s, width: sw, height: sh } = src;
	const out = new Uint8ClampedArray(ow * oh * 4);
	const maxX = sw - 1, maxY = sh - 1;
	let o = 0;
	for (let v = 0; v < oh; v++) {
		const vy = v + 0.5;
		// Termos constantes na linha.
		const bx = h[1] * vy + h[2], by = h[4] * vy + h[5], bw = h[7] * vy + h[8];
		for (let u = 0; u < ow; u++) {
			const ux = u + 0.5;
			const w = h[6] * ux + bw;
			let x = (h[0] * ux + bx) / w - 0.5;
			let y = (h[3] * ux + by) / w - 0.5;
			if (x < 0) x = 0; else if (x > maxX) x = maxX;
			if (y < 0) y = 0; else if (y > maxY) y = maxY;
			const x0 = x | 0, y0 = y | 0;
			const x1 = x0 < maxX ? x0 + 1 : x0, y1 = y0 < maxY ? y0 + 1 : y0;
			const fx = x - x0, fy = y - y0;
			const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
			const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
			out[o] = s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11;
			out[o + 1] = s[i00 + 1] * w00 + s[i10 + 1] * w10 + s[i01 + 1] * w01 + s[i11 + 1] * w11;
			out[o + 2] = s[i00 + 2] * w00 + s[i10 + 2] * w10 + s[i01 + 2] * w01 + s[i11 + 2] * w11;
			out[o + 3] = 255;
			o += 4;
		}
	}
	return { data: out, width: ow, height: oh };
}

/** Gira no sentido horário. */
export function rotateRgba(img: Rgba, r: Rotation): Rgba {
	if (r === 0) return img;
	const { data: s, width: w, height: h } = img;
	const s32 = new Uint32Array(s.buffer, s.byteOffset, w * h);
	const ow = r === 180 ? w : h, oh = r === 180 ? h : w;
	const out = new Uint8ClampedArray(w * h * 4);
	const o32 = new Uint32Array(out.buffer);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let nx: number, ny: number;
			if (r === 90) { nx = h - 1 - y; ny = x; }
			else if (r === 180) { nx = w - 1 - x; ny = h - 1 - y; }
			else { nx = y; ny = w - 1 - x; }
			o32[ny * ow + nx] = s32[y * w + x];
		}
	}
	return { data: out, width: ow, height: oh };
}

/** Redução por média de área (box filter) — boa qualidade para encolher bastante. */
export function downscale(img: Rgba, ow: number, oh: number): Rgba {
	const { data: s, width: w, height: h } = img;
	if (ow >= w && oh >= h) return img;
	const out = new Uint8ClampedArray(ow * oh * 4);
	const sx = w / ow, sy = h / oh;
	for (let y = 0; y < oh; y++) {
		const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.min(h, Math.floor((y + 1) * sy)));
		for (let x = 0; x < ow; x++) {
			const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.min(w, Math.floor((x + 1) * sx)));
			let r = 0, g = 0, b = 0, n = 0;
			for (let yy = y0; yy < y1; yy++) {
				let i = (yy * w + x0) * 4;
				for (let xx = x0; xx < x1; xx++, i += 4) {
					r += s[i]; g += s[i + 1]; b += s[i + 2]; n++;
				}
			}
			const o = (y * ow + x) * 4;
			out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
		}
	}
	return { data: out, width: ow, height: oh };
}
