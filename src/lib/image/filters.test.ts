/// <reference types="bun" />
// bun test — filtros: todos rodam, mantêm tamanho e faixa; testes numéricos básicos; rótulos i18n completos.
import { describe, expect, test } from 'bun:test';
import { FILTERS, defaultParams, filterById } from './filters.ts';
import { applyFilter, IMPLEMENTED, type PixelBuf } from './filters-impl.ts';
import imageFx from '../i18n/messages/imageFx.ts';

function randomBuf(w: number, h: number, seed = 1, opaque = false): PixelBuf {
	let s = seed;
	const r = () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 16) & 255;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i++) data[i] = opaque && i % 4 === 3 ? 255 : r();
	return { data, width: w, height: h };
}
function flat(w: number, h: number, c: [number, number, number, number]): PixelBuf {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i += 4) data.set(c, i);
	return { data, width: w, height: h };
}
const maxDiff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
	let m = 0;
	for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
	return m;
};

describe('metadados', () => {
	test('ids únicos e todos implementados', () => {
		const ids = FILTERS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(IMPLEMENTED).toContain(id);
		for (const id of IMPLEMENTED) expect(filterById(id)).toBeDefined();
	});
	test('padrões dentro das faixas e `scaled` aponta para parâmetros existentes', () => {
		for (const f of FILTERS) {
			for (const p of f.params) {
				if (p.type === 'range') expect(p.default >= p.min && p.default <= p.max).toBe(true);
				if (p.type === 'select') expect(p.options).toContain(p.default);
				if (p.type === 'color') expect(p.default).toMatch(/^#[0-9a-f]{6}$/i);
			}
			for (const k of f.scaled ?? []) expect(f.params.some((p) => p.key === k)).toBe(true);
		}
	});
});

describe('todos os filtros', () => {
	const src = randomBuf(23, 17, 7);
	for (const f of FILTERS) {
		test(f.id, () => {
			const copy = new Uint8ClampedArray(src.data);
			let last = -1;
			const out = applyFilter(f.id, src, defaultParams(f), { onProgress: (v) => (last = v) });
			expect(out.width).toBe(src.width);
			expect(out.height).toBe(src.height);
			expect(out.data.length).toBe(src.data.length);
			expect(out.data).not.toBe(src.data);
			expect(src.data).toEqual(copy); // entrada intacta
			expect(last).toBe(1);
			// com escala de prévia e em imagem 1x1 também não pode quebrar
			applyFilter(f.id, src, defaultParams(f), { scale: 0.25 });
			applyFilter(f.id, randomBuf(1, 1), defaultParams(f));
		});
	}
});

describe('sanidade numérica', () => {
	test('inverter duas vezes = identidade', () => {
		const src = randomBuf(16, 16, 3);
		const twice = applyFilter('invert', applyFilter('invert', src, {}, {}), {}, {});
		expect(twice.data).toEqual(src.data);
	});
	test('brilho/contraste 0 = identidade', () => {
		const src = randomBuf(16, 16, 4);
		expect(applyFilter('brightness-contrast', src, { brightness: 0, contrast: 0 }, {}).data).toEqual(src.data);
	});
	test('matiz/saturação 0 e níveis neutros = identidade', () => {
		const src = randomBuf(16, 16, 5, true);
		expect(maxDiff(applyFilter('hue-saturation', src, { hue: 0, saturation: 0, lightness: 0 }, {}).data, src.data)).toBe(0);
		const lv = applyFilter('levels', src, { inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 }, {});
		expect(maxDiff(lv.data, src.data)).toBe(0);
		expect(maxDiff(applyFilter('exposure', src, { exposure: 0, offset: 0, gamma: 1 }, {}).data, src.data)).toBeLessThanOrEqual(1);
	});
	test('desfoques de cor chapada mantêm a cor', () => {
		const src = flat(40, 30, [200, 100, 50, 255]);
		for (const id of ['gaussian-blur', 'box-blur', 'motion-blur', 'radial-blur', 'zoom-blur', 'surface-blur', 'median']) {
			for (const radius of [1, 2.5, 9]) {
				const out = applyFilter(id, src, { radius, distance: radius * 4 }, {});
				expect(maxDiff(out.data, src.data)).toBeLessThanOrEqual(1);
			}
		}
	});
	test('desfoque pré-multiplicado não escurece a borda transparente', () => {
		const src = flat(20, 1, [255, 255, 255, 255]);
		for (let x = 10; x < 20; x++) src.data[x * 4 + 3] = 0, src.data[x * 4] = src.data[x * 4 + 1] = src.data[x * 4 + 2] = 0;
		const out = applyFilter('gaussian-blur', src, { radius: 3 }, {});
		for (let x = 0; x < 20; x++) if (out.data[x * 4 + 3] > 2) expect(out.data[x * 4]).toBeGreaterThanOrEqual(250);
	});
	test('desfoque gaussiano conserva a média', () => {
		const src = randomBuf(64, 64, 9, true);
		const out = applyFilter('gaussian-blur', src, { radius: 6 }, {});
		const mean = (d: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); };
		expect(Math.abs(mean(out.data) - mean(src.data))).toBeLessThan(2);
	});
	test('limiar só produz preto ou branco; posterizar limita níveis', () => {
		const src = randomBuf(16, 16, 11);
		const t = applyFilter('threshold', src, { level: 128 }, {});
		for (let i = 0; i < t.data.length; i += 4) expect([0, 255]).toContain(t.data[i]);
		const p = applyFilter('posterize', src, { levels: 4 }, {});
		const vals = new Set<number>();
		for (let i = 0; i < p.data.length; i += 4) vals.add(p.data[i]);
		expect(vals.size).toBeLessThanOrEqual(4);
	});
	test('escala multiplica os parâmetros em px', () => {
		const src = randomBuf(32, 32, 13, true);
		const a = applyFilter('gaussian-blur', src, { radius: 8 }, { scale: 0.5 });
		const b = applyFilter('gaussian-blur', src, { radius: 4 }, {});
		expect(a.data).toEqual(b.data);
	});
	test('filtro desconhecido lança erro', () => {
		expect(() => applyFilter('nope', randomBuf(2, 2), {}, {})).toThrow();
	});
	test('desfoque grande em 1000x1000 é rápido (caixas deslizantes)', () => {
		const src = randomBuf(1000, 1000, 17, true);
		const t0 = performance.now();
		applyFilter('gaussian-blur', src, { radius: 80 }, {});
		expect(performance.now() - t0).toBeLessThan(1500);
	});
});

describe('i18n imageFx', () => {
	const langs = ['pt', 'en', 'es', 'fr'] as const;
	test('todo grupo, filtro, parâmetro e opção tem rótulo nos 4 idiomas', () => {
		for (const lang of langs) {
			const m = imageFx[lang] as unknown as {
				groups: Record<string, string>;
				filters: Record<string, { title: string; description: string }>;
				params: Record<string, string>;
				options: Record<string, string>;
			};
			for (const f of FILTERS) {
				expect(m.groups[f.group], `${lang} grupo ${f.group}`).toBeTruthy();
				expect(m.filters[f.id]?.title, `${lang} ${f.id}`).toBeTruthy();
				expect(m.filters[f.id]?.description, `${lang} ${f.id}`).toBeTruthy();
				for (const p of f.params) {
					expect(m.params[p.key], `${lang} param ${p.key}`).toBeTruthy();
					if (p.type === 'select') for (const o of p.options) expect(m.options[o], `${lang} opção ${o}`).toBeTruthy();
				}
			}
		}
	});
});
