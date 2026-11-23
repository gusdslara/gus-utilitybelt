/// <reference types="bun" />
// bun test — partes puras do I/O de imagens (sem canvas): BMP, ICO, caminhos SVG, escape XML, mesclagem.
import { describe, expect, test } from 'bun:test';
import {
	encodeBmp,
	encodeIco,
	escapeXml,
	shapeToSvgPath,
	blendToPsd,
	blendFromPsd,
	splitColor,
	svgRasterSize,
	svgLength,
	suggestName,
	effectsFilter,
	mixHex,
	EXPORT_FORMATS
} from './io.ts';
import { BLEND_MODES, SHAPES, defaultEffects } from './types.ts';
import type { ShapeData } from './types.ts';

const dv = (u: Uint8Array) => new DataView(u.buffer, u.byteOffset, u.byteLength);

describe('BMP', () => {
	// 2×2: linha de cima vermelho / verde, linha de baixo azul / branco
	const opaque = { width: 2, height: 2, data: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) };

	test('24 bits sem alfa: cabeçalho, padding e linhas de baixo para cima', () => {
		const b = encodeBmp(opaque);
		const v = dv(b);
		expect(String.fromCharCode(b[0], b[1])).toBe('BM');
		const stride = 8; // 2*3 = 6 → alinhado a 4
		expect(b.length).toBe(14 + 40 + stride * 2);
		expect(v.getUint32(2, true)).toBe(b.length);
		expect(v.getUint32(10, true)).toBe(54);
		expect(v.getUint32(14, true)).toBe(40);
		expect(v.getInt32(18, true)).toBe(2);
		expect(v.getInt32(22, true)).toBe(2);
		expect(v.getUint16(26, true)).toBe(1);
		expect(v.getUint16(28, true)).toBe(24);
		expect(v.getUint32(30, true)).toBe(0);
		expect(v.getUint32(34, true)).toBe(stride * 2);
		// primeira linha gravada = linha de baixo (azul, branco) em BGR
		expect([...b.slice(54, 60)]).toEqual([255, 0, 0, 255, 255, 255]);
		expect([...b.slice(60, 62)]).toEqual([0, 0]); // padding
		// segunda linha = topo (vermelho, verde)
		expect([...b.slice(62, 68)]).toEqual([0, 0, 255, 0, 255, 0]);
	});

	test('32 bits com alfa: BITMAPV4HEADER + BI_BITFIELDS + máscaras', () => {
		const img = { width: 1, height: 2, data: new Uint8Array([10, 20, 30, 128, 40, 50, 60, 0]) };
		const b = encodeBmp(img);
		const v = dv(b);
		expect(v.getUint32(10, true)).toBe(14 + 108);
		expect(v.getUint32(14, true)).toBe(108);
		expect(v.getUint16(28, true)).toBe(32);
		expect(v.getUint32(30, true)).toBe(3);
		expect(v.getUint32(54, true)).toBe(0x00ff0000);
		expect(v.getUint32(58, true)).toBe(0x0000ff00);
		expect(v.getUint32(62, true)).toBe(0x000000ff);
		expect(v.getUint32(66, true)).toBe(0xff000000);
		expect(v.getUint32(70, true)).toBe(0x73524742);
		expect(b.length).toBe(122 + 8);
		expect([...b.slice(122, 126)]).toEqual([60, 50, 40, 0]); // baixo
		expect([...b.slice(126, 130)]).toEqual([30, 20, 10, 128]); // topo
	});

	test('alfa forçado em imagem opaca', () => {
		expect(dv(encodeBmp(opaque, true)).getUint16(28, true)).toBe(32);
	});
});

describe('ICO', () => {
	test('diretório com entradas PNG e 256 → 0', () => {
		const a = new Uint8Array([1, 2, 3]);
		const b = new Uint8Array([4, 5, 6, 7, 8]);
		const ico = encodeIco([
			{ width: 16, height: 16, png: a },
			{ width: 256, height: 256, png: b }
		]);
		const v = dv(ico);
		expect(v.getUint16(0, true)).toBe(0);
		expect(v.getUint16(2, true)).toBe(1);
		expect(v.getUint16(4, true)).toBe(2);
		expect(ico[6]).toBe(16);
		expect(ico[7]).toBe(16);
		expect(v.getUint16(6 + 4, true)).toBe(1);
		expect(v.getUint16(6 + 6, true)).toBe(32);
		expect(v.getUint32(6 + 8, true)).toBe(3);
		expect(v.getUint32(6 + 12, true)).toBe(6 + 32);
		expect(ico[22]).toBe(0);
		expect(ico[23]).toBe(0);
		expect(v.getUint32(22 + 8, true)).toBe(5);
		expect(v.getUint32(22 + 12, true)).toBe(6 + 32 + 3);
		expect([...ico.slice(38)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});
});

describe('XML', () => {
	test('escape', () => {
		expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
		expect(escapeXml('a\u0001b\u000bc\td')).toBe('abc\td');
	});

	test('cores separam alfa', () => {
		expect(splitColor('#ff000080')).toEqual({ color: '#ff0000', opacity: 0.502 });
		expect(splitColor('#abc')).toEqual({ color: '#aabbcc', opacity: 1 });
		expect(splitColor('rgba(255, 0, 10, 0.5)')).toEqual({ color: '#ff000a', opacity: 0.5 });
		expect(splitColor('rgb(0 128 255 / 25%)')).toEqual({ color: '#0080ff', opacity: 0.25 });
		expect(splitColor('red')).toEqual({ color: 'red', opacity: 1 });
	});

	test('mixHex', () => {
		expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080');
	});
});

describe('caminhos SVG', () => {
	const base: Omit<ShapeData, 'shape'> = {
		type: 'shape', x: 0, y: 0, w: 100, h: 80, rotation: 0, fill: { kind: 'solid', color: '#000' },
		stroke: '', strokeWidth: 2, radius: 10, sides: 5, inner: 0.5, dash: false
	};
	const path = (shape: ShapeData['shape'], extra: Partial<ShapeData> = {}) => shapeToSvgPath({ ...base, shape, ...extra });

	test('todas as formas geram d válido', () => {
		for (const s of SHAPES) {
			const d = path(s);
			expect(d).toMatch(/^M[-\d.]+ [-\d.]+/);
			expect(d).not.toMatch(/NaN|Infinity/);
		}
	});

	test('retângulo', () => {
		expect(path('rect')).toBe('M0 0L100 0L100 80L0 80Z');
	});

	test('retângulo arredondado tem 4 arcos', () => {
		const d = path('roundrect');
		expect(d.match(/A10 10/g)?.length).toBe(4);
		expect(d.startsWith('M10 0L90 0A10 10 0 0 1 100 10')).toBe(true);
	});

	test('elipse com dois arcos', () => {
		expect(path('ellipse')).toBe('M100 40A50 40 0 1 1 0 40A50 40 0 1 1 100 40Z');
	});

	test('estrela tem 2n vértices e polígono n', () => {
		expect(path('star').match(/[ML]/g)?.length).toBe(10);
		expect(path('polygon', { sides: 6 }).match(/[ML]/g)?.length).toBe(6);
		expect(path('polygon').startsWith('M50 0')).toBe(true);
	});

	test('balão: arcTo vira linha + arco tangente', () => {
		const d = path('speech', { w: 100, h: 100, radius: 10 });
		expect(d.startsWith('M10 0L90 0A10 10 0 0 1 100 10')).toBe(true);
		expect(d.match(/A/g)?.length).toBe(4);
	});

	test('seta: linha + ponta (3 subcaminhos de 2)', () => {
		const d = path('arrow', { w: 100, h: 0 });
		expect(d.match(/M/g)?.length).toBe(2);
		expect(d.startsWith('M0 0L100 0M')).toBe(true);
	});

	test('coração usa curvas', () => {
		expect(path('heart').match(/C/g)?.length).toBe(4);
	});
});

describe('filtro de efeitos', () => {
	test('gera primitivas para cada efeito ligado', () => {
		const fx = defaultEffects();
		fx.shadow.on = fx.glow.on = fx.outline.on = fx.extrude.on = true;
		fx.extrude.depth = 3;
		const f = effectsFilter('fx1', fx, { x: -10, y: -10, w: 120, h: 120 });
		expect(f.startsWith('<filter id="fx1"')).toBe(true);
		expect(f).toContain('feMorphology');
		expect(f).toContain('feGaussianBlur');
		expect(f.match(/<feOffset in="SourceAlpha"/g)?.length).toBe(3);
		expect(f).toContain('<feMergeNode in="SourceGraphic"/>');
	});
});

describe('mesclagem', () => {
	test('ida e volta para todos os modos', () => {
		for (const m of BLEND_MODES) expect(blendFromPsd(blendToPsd(m))).toBe(m);
	});
	test('modos sem equivalente caem em source-over', () => {
		expect(blendFromPsd('linear burn')).toBe('source-over');
		expect(blendFromPsd('pass through')).toBe('source-over');
		expect(blendFromPsd(undefined)).toBe('source-over');
		expect(blendToPsd('color-dodge')).toBe('color dodge');
	});
});

describe('SVG de entrada', () => {
	test('comprimentos', () => {
		expect(svgLength('100')).toBe(100);
		expect(svgLength('1in')).toBe(96);
		expect(svgLength('50%')).toBeNull();
		expect(svgLength(null)).toBeNull();
	});
	test('tamanho de rasterização', () => {
		expect(svgRasterSize('800', '600', null)).toEqual({ w: 800, h: 600 });
		expect(svgRasterSize(null, null, '0 0 400 300')).toEqual({ w: 400, h: 300 });
		expect(svgRasterSize(null, null, null)).toEqual({ w: 1024, h: 1024 });
		expect(svgRasterSize('100%', '100%', '0 0 2000 1000')).toEqual({ w: 2000, h: 1000 });
		expect(svgRasterSize(null, null, '0 0 24 24')).toEqual({ w: 1024, h: 1024 }); // ícone ampliado
		expect(svgRasterSize('20000', '10000', null)).toEqual({ w: 8192, h: 4096 }); // limite
	});
});

describe('nomes', () => {
	test('troca extensão e higieniza', () => {
		expect(suggestName('foto.png', 'jpeg')).toBe('foto.jpg');
		expect(suggestName('a/b:c', 'psd')).toBe('a-b-c.psd');
		expect(suggestName('', 'svg')).toBe('imagem.svg');
		expect(EXPORT_FORMATS.map((f) => f.id)).toContain('ico');
	});
});
