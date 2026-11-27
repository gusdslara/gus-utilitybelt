import { describe, expect, test } from 'bun:test';
import { applyH, homography, orderQuad, outputSize, rectAspect, rotateQuad, unrotateQuad, type Quad } from './geometry.ts';
import { detectQuad } from './detect.ts';
import { downscale, rotateRgba, warpPerspective, type Rgba } from './warp.ts';
import { enhance, packBits } from './enhance.ts';
import { buildPdfParts, concatParts, jpegInfo, pdfText } from '../pdf/writer.ts';
import { layoutPage, targetPixels, defaultPdfSettings } from '../pdf/layout.ts';

/** Projeta um retângulo W×H (proporção real) numa "foto" com câmera em perspectiva simples. */
function project(W: number, H: number, imgW: number, imgH: number, tilt = 0.35, yaw = 0.15, f = 1.1): Quad {
	const pts = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(([x, y]) => {
		// gira em torno de X (tilt) e Y (yaw), afasta da câmera
		const y1 = y * Math.cos(tilt), z1 = y * Math.sin(tilt);
		const x2 = x * Math.cos(yaw) + z1 * Math.sin(yaw), z2 = -x * Math.sin(yaw) + z1 * Math.cos(yaw) + 2.2;
		const s = Math.max(imgW, imgH);
		return { x: imgW / 2 + (f * s * x2) / z2, y: imgH / 2 + (f * s * y1) / z2 };
	});
	return orderQuad(pts);
}

/** Foto sintética: mesa texturizada escura + folha clara com "texto" e sombra. */
function synth(q: Quad, w: number, h: number): Rgba {
	const data = new Uint8ClampedArray(w * h * 4);
	const H = homography(q, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])!;
	let seed = 7;
	const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const p = applyH(H, { x: x + 0.5, y: y + 0.5 });
			const inside = p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
			let r: number, g: number, b: number;
			if (inside) {
				const shade = 1 - 0.35 * p.x * p.y; // sombra num canto
				const line = Math.floor(p.y * 30) % 2 === 0 && p.x > 0.1 && p.x < 0.9 && (p.y * 30) % 1 > 0.55 && Math.sin(p.x * 90) > -0.3;
				const v = line ? 40 : 235;
				r = v * shade; g = v * shade; b = (v - 5) * shade;
			} else {
				const n = rnd() * 30;
				r = 120 + n + 20 * Math.sin(x / 7); g = 80 + n; b = 50 + n;
			}
			data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
		}
	}
	return { data, width: w, height: h };
}

const maxErr = (a: Quad, b: Quad, w: number, h: number) => Math.max(...a.map((p, i) => Math.hypot((p.x - b[i].x) * w, (p.y - b[i].y) * h)));

describe('geometria', () => {
	test('orderQuad devolve TL, TR, BR, BL', () => {
		const q = orderQuad([{ x: 10, y: 90 }, { x: 90, y: 10 }, { x: 5, y: 5 }, { x: 95, y: 95 }]);
		expect(q).toEqual([{ x: 5, y: 5 }, { x: 90, y: 10 }, { x: 95, y: 95 }, { x: 10, y: 90 }]);
	});

	test('rotateQuad/unrotateQuad são inversos', () => {
		const q: Quad = [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.15 }, { x: 0.9, y: 0.9 }, { x: 0.05, y: 0.8 }];
		for (const r of [90, 180, 270] as const) {
			const back = unrotateQuad(rotateQuad(q, r), r);
			back.forEach((p, i) => {
				expect(p.x).toBeCloseTo(q[i].x, 9);
				expect(p.y).toBeCloseTo(q[i].y, 9);
			});
		}
	});

	test('proporção real de um A4 em perspectiva forte', () => {
		const q = project(0.21, 0.297, 1200, 900, 0.6, 0.25);
		const naive = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) / (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y));
		const r = rectAspect(q, 1200, 900);
		expect(Math.abs(r - 0.21 / 0.297)).toBeLessThan(0.02);
		expect(Math.abs(naive - 0.21 / 0.297)).toBeGreaterThan(Math.abs(r - 0.21 / 0.297));
		const out = outputSize(q, 1200, 900);
		expect(out.w / out.h).toBeCloseTo(1 / Math.SQRT2, 3); // encaixou no A4
	});
});

describe('detecção', () => {
	test('acha a folha em perspectiva com sombra', () => {
		const w = 320, h = 240;
		const truth = project(0.9, 1.2728, w, h, 0.45, 0.2, 0.95);
		const img = synth(truth, w, h);
		const det = detectQuad(img);
		expect(det).not.toBeNull();
		const norm = truth.map((p) => ({ x: p.x / w, y: p.y / h })) as Quad;
		expect(maxErr(det!.quad, norm, w, h)).toBeLessThan(4);
	});

	test('folha cortada pela borda da foto usa a borda como lado', () => {
		const w = 320, h = 240;
		const truth: Quad = [{ x: 60, y: -40 }, { x: 270, y: -30 }, { x: 280, y: 210 }, { x: 50, y: 220 }];
		const img = synth(truth, w, h);
		const det = detectQuad(img);
		expect(det).not.toBeNull();
		expect(det!.quad[0].y).toBeLessThan(0.02);
		expect(det!.quad[1].y).toBeLessThan(0.02);
		expect(Math.abs(det!.quad[3].x * w - 50)).toBeLessThan(5);
	});

	test('imagem lisa não detecta nada', () => {
		const data = new Uint8ClampedArray(200 * 150 * 4).fill(128);
		expect(detectQuad({ data, width: 200, height: 150 })).toBeNull();
	});
});

describe('warp e filtros', () => {
	test('warp recupera o conteúdo do quad', () => {
		const w = 320, h = 240;
		const truth = project(0.9, 1.2728, w, h, 0.4, 0.1, 0.95);
		const img = synth(truth, w, h);
		const out = warpPerspective(img, truth, 105, 148);
		// cantos da saída são papel (claro), nada da mesa marrom
		for (const [x, y] of [[3, 3], [100, 3], [100, 144], [3, 144]]) {
			const i = (y * 105 + x) * 4;
			expect(Math.abs(out.data[i] - out.data[i + 2])).toBeLessThan(25);
		}
	});

	test('rotateRgba 90 + 270 volta ao original', () => {
		const img: Rgba = { data: new Uint8ClampedArray(3 * 2 * 4).map((_, i) => i), width: 3, height: 2 };
		const r = rotateRgba(rotateRgba(img, 90), 270);
		expect(r.width).toBe(3);
		expect([...r.data]).toEqual([...img.data]);
		expect(rotateRgba(img, 90).width).toBe(2);
	});

	test('enhance remove a sombra (papel uniforme)', () => {
		const w = 200, h = 200;
		const data = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const v = 230 * (1 - 0.5 * (x / w)); // sombra lateral forte
			data[i] = data[i + 1] = data[i + 2] = v;
			data[i + 3] = 255;
		}
		const img = enhance({ data, width: w, height: h }, 'gray');
		expect(img.data[(100 * w + 10) * 4]).toBeGreaterThan(240);
		expect(img.data[(100 * w + 190) * 4]).toBeGreaterThan(240);
	});

	test('P&B empacota 1 bit (1 = branco)', () => {
		const img: Rgba = { data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255]), width: 3, height: 1 };
		expect([...packBits(img)]).toEqual([0b01000000]);
	});

	test('downscale por média', () => {
		const img: Rgba = { data: new Uint8ClampedArray([0, 0, 0, 255, 200, 200, 200, 255]), width: 2, height: 1 };
		expect([...downscale(img, 1, 1).data]).toEqual([100, 100, 100, 255]);
	});
});

describe('PDF', () => {
	test('estrutura e xref válidos', () => {
		const bits = new Uint8Array([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]);
		const pages = [
			{ width: 595.28, height: 841.89, rect: { x: 0, y: 0, w: 595.28, h: 841.89 }, image: { kind: 'flate' as const, bytes: bits, width: 8, height: 1, bpc: 1 as const, colors: 1 as const } },
			{ width: 100, height: 50, rect: { x: 0, y: -10, w: 100, h: 70 }, clip: { x: 0, y: 0, w: 100, h: 50 }, image: { kind: 'jpeg' as const, bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 1, height: 1 } }
		];
		const pdf = new TextDecoder('latin1').decode(concatParts(buildPdfParts(pages, { title: 'Relatório ✓' })));
		expect(pdf.startsWith('%PDF-1.4')).toBe(true);
		expect(pdf).toContain('/Count 2');
		expect(pdf).toContain('/BitsPerComponent 1');
		expect(pdf).toContain('re W n');
		expect(pdf).toContain('/Title <FEFF');
		// cada entrada do xref aponta para "N 0 obj"
		const xrefAt = Number(/startxref\n(\d+)/.exec(pdf)![1]);
		const lines = pdf.slice(xrefAt).split('\n');
		const count = Number(lines[1].split(' ')[1]);
		for (let i = 1; i < count; i++) {
			const off = Number(lines[2 + i].slice(0, 10));
			expect(pdf.slice(off, off + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
		}
	});

	test('pdfText escapa ASCII e usa UTF-16 quando precisa', () => {
		expect(pdfText('a(b)')).toBe('(a\\(b\\))');
		expect(pdfText('ç')).toBe('<FEFF00E7>');
	});

	test('jpegInfo lê SOF e orientação EXIF', () => {
		// SOI, APP1 Exif (II, orientação 6), SOF0 10x20 3 componentes
		const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
		const app1 = [0xff, 0xe1, 0, exif.length + 2, ...exif];
		const sof = [0xff, 0xc0, 0, 17, 8, 0, 20, 0, 10, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
		const info = jpegInfo(new Uint8Array([0xff, 0xd8, ...app1, ...sof, 0xff, 0xd9]));
		expect(info).toEqual({ width: 10, height: 20, components: 3, orientation: 6, progressive: false });
	});

	test('layout: A4 automático vira paisagem para foto larga; cover recorta', () => {
		const s = defaultPdfSettings();
		const l = layoutPage(4000, 3000, s);
		expect(l.width).toBeGreaterThan(l.height);
		const c = layoutPage(1000, 1000, { ...s, fit: 'cover', margin: 10 });
		expect(c.clip).toBeDefined();
		expect(c.rect.w).toBeGreaterThan(c.clip!.w);
		const fit = layoutPage(1000, 2000, { ...s, size: 'fit' });
		expect(fit.height).toBeCloseTo(841.89, 1);
		expect(targetPixels(4000, 3000, l.rect, 150).w).toBeLessThan(4000);
	});
});
