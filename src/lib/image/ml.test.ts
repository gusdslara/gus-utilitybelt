import { describe, expect, test } from 'bun:test';
import { fitSize, resizeAlpha, scalePoint, ML_MODELS } from '#lib/image/ml.ts';

describe('fitSize', () => {
	test('não amplia imagens pequenas', () => expect(fitSize(800, 600, 2048)).toEqual({ w: 800, h: 600, scale: 1 }));
	test('reduz pelo lado maior', () => {
		const r = fitSize(4096, 1024, 2048);
		expect(r).toEqual({ w: 2048, h: 512, scale: 0.5 });
	});
	test('mínimo de 1 px', () => expect(fitSize(100000, 1, 2048).h).toBe(1));
});

describe('scalePoint', () => {
	test('escala por eixo e preserva o rótulo', () => expect(scalePoint({ x: 100, y: 50, label: 0 }, 0.5, 0.25)).toEqual({ x: 50, y: 12.5, label: 0 }));
});

describe('resizeAlpha', () => {
	test('mesmo tamanho devolve a própria entrada', () => {
		const a = new Uint8ClampedArray([1, 2, 3, 4]);
		expect(resizeAlpha(a, 2, 2, 2, 2)).toBe(a);
	});
	test('constante continua constante', () => {
		const out = resizeAlpha(new Uint8ClampedArray(4).fill(200), 2, 2, 7, 5);
		expect(out.length).toBe(35);
		expect([...out].every((v) => v === 200)).toBe(true);
	});
	test('interpola linearmente entre colunas', () => {
		// 2x1: 0 | 255 → 4x1: bordas presas, meio interpolado
		const out = resizeAlpha(new Uint8ClampedArray([0, 255]), 2, 1, 4, 1);
		expect(out[0]).toBe(0);
		expect(out[3]).toBe(255);
		expect(out[1]).toBeGreaterThan(0);
		expect(out[1]).toBeLessThan(out[2]);
	});
	test('redução por 2 tira a média', () => {
		const out = resizeAlpha(new Uint8ClampedArray([0, 255, 0, 255]), 4, 1, 2, 1);
		expect([...out]).toEqual([128, 128]);
	});
});

test('metadados de licença', () => {
	expect(ML_MODELS.rmbg.commercial).toBe(false);
	expect(ML_MODELS.sam.kind).toBe('point');
});
