/// <reference types="bun" />
// bun test — varinha mágica: algoritmos, métricas, tolerância e desempenho.
import { describe, expect, test } from 'bun:test';
import { wandSelect } from './wand-impl.ts';
import { defaultWand, type WandAlgo, type WandMetric, type WandOptions } from './types.ts';
import type { PixelBuf } from './filters-impl.ts';

const opts = (o: Partial<WandOptions>): WandOptions => ({ ...defaultWand(), antialias: false, ...o });
const count = (m: Uint8ClampedArray) => m.reduce((s, v) => s + (v === 255 ? 1 : 0), 0);

/** 20x20: metade esquerda vermelha, direita azul; e um quadrado vermelho isolado dentro do azul. */
function twoColor(): PixelBuf {
	const w = 20, h = 20, data = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4, red = x < 10 || (x >= 14 && x < 17 && y >= 4 && y < 7);
			data.set(red ? [220, 20, 20, 255] : [20, 20, 220, 255], i);
		}
	return { data, width: w, height: h };
}

describe('varinha', () => {
	test('flood num desenho de 2 cores seleciona exatamente uma região', () => {
		const m = wandSelect(twoColor(), 2, 2, opts({ algo: 'flood' }));
		expect(count(m)).toBe(200);
		expect(m[2 * 20 + 2]).toBe(255);
		expect(m[5 * 20 + 15]).toBe(0); // quadrado isolado fica de fora
		const blue = wandSelect(twoColor(), 19, 19, opts({ algo: 'flood' }));
		expect(count(blue)).toBe(200 - 9);
	});
	test('global também pega a ilha desconexa', () => {
		const m = wandSelect(twoColor(), 2, 2, opts({ algo: 'global' }));
		expect(count(m)).toBe(209);
		expect(m[5 * 20 + 15]).toBe(255);
	});
	test('flood8 atravessa diagonais, flood não', () => {
		const w = 3, h = 3, data = new Uint8ClampedArray(36);
		for (let i = 0; i < 9; i++) data.set(i === 0 || i === 4 || i === 8 ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4);
		const img = { data, width: w, height: h };
		expect(count(wandSelect(img, 0, 0, opts({ algo: 'flood' })))).toBe(1);
		expect(count(wandSelect(img, 0, 0, opts({ algo: 'flood8' })))).toBe(3);
	});
	test('tolerância 0 só pega a cor exata; 100 pega tudo', () => {
		const w = 16, h = 1, data = new Uint8ClampedArray(w * 4);
		for (let x = 0; x < w; x++) data.set([100 + x, 100, 100, 255], x * 4);
		data.set([100, 100, 100, 255], 15 * 4);
		const img = { data, width: w, height: h };
		const metrics: WandMetric[] = ['rgb', 'rgba', 'lab', 'hue', 'luma', 'max'];
		for (const metric of metrics) {
			const g = wandSelect(img, 0, 0, opts({ algo: 'global', metric, tolerance: 0 }));
			if (metric !== 'hue') expect(count(g)).toBe(2);
			expect(g[0]).toBe(255);
			expect(g[15 * 4 / 4]).toBe(255);
			expect(count(wandSelect(img, 0, 0, opts({ algo: 'global', metric, tolerance: 100 })))).toBe(16);
		}
	});
	test('edge para em borda forte mesmo com tolerância alta', () => {
		const img = twoColor();
		const m = wandSelect(img, 2, 2, opts({ algo: 'edge', tolerance: 100, edge: 80 }));
		expect(m[2 * 20 + 2]).toBe(255);
		expect(m[2 * 20 + 18]).toBe(0);
		expect(count(m)).toBeGreaterThanOrEqual(180);
		expect(count(m)).toBeLessThanOrEqual(210);
	});
	test('cluster devolve máscara não vazia contendo o clique', () => {
		for (const contiguous of [false, true]) {
			const m = wandSelect(twoColor(), 15, 5, opts({ algo: 'cluster', clusters: 3, contiguous }));
			expect(m[5 * 20 + 15]).toBe(255);
			expect(count(m)).toBe(contiguous ? 9 : 209);
		}
	});
	test('antialias suaviza só a borda', () => {
		const m = wandSelect(twoColor(), 2, 2, opts({ algo: 'flood', antialias: true }));
		expect(m[2 * 20 + 2]).toBe(255);
		expect(m[2 * 20 + 9]).toBeGreaterThan(0);
		expect(m[2 * 20 + 9]).toBeLessThan(255);
		expect(m[2 * 20 + 10]).toBeGreaterThan(0);
		expect(m[2 * 20 + 15]).toBe(0);
	});
	test('clique fora da imagem = máscara vazia', () => {
		expect(count(wandSelect(twoColor(), -1, 3, opts({})))).toBe(0);
	});
	test('todos os algoritmos em 2000x2000 rodam rápido', () => {
		const w = 2000, h = 2000, data = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) data.set([(x >> 4) & 255, (y >> 4) & 255, 128, 255], (y * w + x) * 4);
		const img = { data, width: w, height: h };
		const algos: WandAlgo[] = ['flood', 'flood8', 'global', 'edge', 'cluster'];
		for (const algo of algos) {
			const t0 = performance.now();
			let last = 0;
			const m = wandSelect(img, 1000, 1000, opts({ algo, tolerance: 40, antialias: true }), (v) => (last = v));
			expect(m.length).toBe(w * h);
			expect(m[1000 * w + 1000]).toBe(255);
			expect(last).toBe(1);
			expect(performance.now() - t0).toBeLessThan(2500);
		}
	});
});
