/// <reference types="bun" />
// bun test — núcleo do app Motion: easing, keyframes, SVG → caminhos, presets, modelos e export Lottie.
import { describe, expect, test } from 'bun:test';
import { ease, easeSegments, EASINGS, cubicBezierAt } from './easing.ts';
import {
	evalProp, hasKey, isAnimated, layerBounds, layerProps, moveKey, newLayer, newScene, parseScene, pathsBBox, prop,
	removeKey, serializeScene, setKey, svgToPaths
} from './scene.ts';
import { applyPreset, clearAnimation, PRESETS, presetDuration, TEMPLATES } from './presets.ts';
import { lottieProp, toLottie, validateLottie } from './to-lottie.ts';
import type { MotionLayer, Prop, Scene } from './types.ts';

describe('easing', () => {
	test('extremos 0 → 0 e 1 → 1', () => {
		for (const e of EASINGS) {
			expect(ease(e, 0)).toBe(0);
			expect(ease(e, 1)).toBe(1);
		}
	});
	test('monótonas onde devem ser', () => {
		for (const e of ['linear', 'easeIn', 'easeOut', 'easeInOut'] as const) {
			let prev = -1;
			for (let i = 0; i <= 100; i++) {
				const v = ease(e, i / 100);
				expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
				prev = v;
			}
		}
	});
	test('back ultrapassa, elastic oscila, bounce fica em 0..1, hold segura', () => {
		expect(Math.max(...Array.from({ length: 99 }, (_, i) => ease('backOut', (i + 1) / 100)))).toBeGreaterThan(1.05);
		expect(Math.min(...Array.from({ length: 99 }, (_, i) => ease('backIn', (i + 1) / 100)))).toBeLessThan(-0.05);
		expect(Math.max(...Array.from({ length: 99 }, (_, i) => ease('elastic', (i + 1) / 100)))).toBeGreaterThan(1.1);
		for (let i = 0; i <= 100; i++) {
			const b = ease('bounce', i / 100);
			expect(b).toBeGreaterThanOrEqual(0);
			expect(b).toBeLessThanOrEqual(1 + 1e-9);
		}
		expect(ease('hold', 0.99)).toBe(0);
		expect(ease({ bezier: [0.25, 0.1, 0.25, 1] }, 0.5)).toBeCloseTo(0.8024, 3); // CSS "ease"
	});
	test('expansão (sub-keys) reproduz ease(t) para elastic e bounce', () => {
		for (const e of ['elastic', 'bounce'] as const) {
			const segs = easeSegments(e);
			expect(segs.length).toBeGreaterThanOrEqual(4);
			expect(segs.length).toBeLessThanOrEqual(10);
			for (let i = 0; i <= 200; i++) {
				const t = i / 200;
				let k = segs.length - 1;
				while (k > 0 && segs[k].t > t) k--;
				const t0 = segs[k].t, t1 = k + 1 < segs.length ? segs[k + 1].t : 1;
				const p0 = segs[k].p, p1 = k + 1 < segs.length ? segs[k + 1].p : 1;
				const v = p0 + (p1 - p0) * cubicBezierAt(segs[k].bez, (t - t0) / (t1 - t0));
				expect(Math.abs(v - ease(e, t))).toBeLessThan(0.02);
			}
		}
	});
});

describe('keyframes', () => {
	test('evalProp interpola número, vetor e cor; antes/depois fixa', () => {
		const p = prop(0);
		setKey(p, 10, 0, 'linear');
		setKey(p, 20, 100, 'linear');
		expect(evalProp(p, 0)).toBe(0);
		expect(evalProp(p, 15)).toBe(50);
		expect(evalProp(p, 99)).toBe(100);
		const v = prop<[number, number]>([0, 0]);
		setKey(v, 0, [0, 10], 'linear');
		setKey(v, 10, [100, 20], 'linear');
		expect(evalProp(v, 5)).toEqual([50, 15]);
		const c = prop('#000000');
		setKey(c, 0, '#000000', 'linear');
		setKey(c, 10, '#ffffff', 'linear');
		expect(evalProp(c, 5)).toBe('#808080');
	});
	test('hold segura até o próximo key', () => {
		const p = prop(0);
		setKey(p, 0, 1, 'hold');
		setKey(p, 10, 5, 'linear');
		expect(evalProp(p, 9.9)).toBe(1);
		expect(evalProp(p, 10)).toBe(5);
	});
	test('setKey ordena/substitui, moveKey e removeKey', () => {
		const p = prop(0);
		setKey(p, 20, 2);
		setKey(p, 10, 1);
		setKey(p, 10, 9);
		expect(p.keys.map((k) => [k.t, k.v])).toEqual([[10, 9], [20, 2]]);
		expect(hasKey(p, 10)).toBe(true);
		expect(moveKey(p, 10, 30)).toBe(true);
		expect(p.keys.map((k) => k.t)).toEqual([20, 30]);
		moveKey(p, 20, 30); // substitui o de 30
		expect(p.keys.map((k) => [k.t, k.v])).toEqual([[30, 2]]);
		expect(removeKey(p, 30)).toBe(true);
		expect(isAnimated(p)).toBe(false);
		expect(p.value).toBe(2);
	});
	test('layerProps e bounds', () => {
		const s = newScene();
		const sh = newLayer('shape', s);
		const tx = newLayer('text', s, { text: 'Olá\nmundo' });
		expect(layerProps(sh).map((p) => p.path)).toContain('trim.end');
		expect(layerProps(tx).length).toBe(4);
		const b = layerBounds(sh, 0);
		expect(b).toMatchObject({ cx: 540, cy: 540, w: 200, h: 200, rotation: 0 });
		const bt = layerBounds(tx, 0);
		expect(bt.h).toBeCloseTo(96 * 2 * 1.2, 5);
	});
	test('serializa e lê de volta; rejeita lixo e versão futura', () => {
		const s = TEMPLATES[0].make();
		const back = parseScene(serializeScene(s));
		expect(back).toEqual(s);
		expect(() => parseScene('{')).toThrow();
		expect(() => parseScene(JSON.stringify({ format: 'gus-motion', version: 9, scene: {} }))).toThrow();
		const fixed = parseScene({ width: 'x', layers: [{ kind: 'shape', transform: { opacity: { value: 'a', keys: [] } } }, { kind: '??' }] });
		expect(fixed.width).toBe(1080);
		expect(fixed.layers.length).toBe(1);
		expect(fixed.layers[0].transform.opacity.value).toBe(100);
	});
});

describe('svgToPaths', () => {
	test('ícone estilo Lucide com arcos e comandos relativos', () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/><path d="M12 2a10 10 0 0110 10h-2a8 8 0 00-8-8z"/></svg>`;
		const r = svgToPaths(svg);
		expect(r.width).toBe(24);
		expect(r.height).toBe(24);
		expect(r.fill).toBe('none');
		expect(r.stroke).toBe('currentColor');
		expect(r.strokeWidth).toBe(2);
		expect(r.paths.length).toBe(3);
		const [circle, check, wedge] = r.paths;
		expect(circle.c).toBe(true);
		expect(circle.v.length).toBe(4);
		expect(check.c).toBe(false);
		expect(check.v).toEqual([[-3, 0], [-1, 2], [3, -2]]);
		expect(wedge.c).toBe(true);
		const b = pathsBBox([circle])!;
		expect(b.minX).toBeCloseTo(-10, 2);
		expect(b.maxX).toBeCloseTo(10, 2);
		expect(b.minY).toBeCloseTo(-10, 2);
		const bw = pathsBBox([wedge])!;
		expect(bw.minX).toBeCloseTo(0, 2);
		expect(bw.maxX).toBeCloseTo(10, 2);
		expect(bw.minY).toBeCloseTo(-10, 2);
		expect(bw.maxY).toBeCloseTo(0, 2);
	});
	test('rect, rect arredondado, polygon, curvas S/Q/T, transform e escala', () => {
		const svg = `<svg viewBox="0 0 100 50"><g transform="translate(10 0)"><rect x="0" y="0" width="40" height="20" fill="#f00"/></g><rect x="50" y="0" width="40" height="40" rx="8"/><polygon points="0,50 10,40 20,50"/><path d="M0 0Q10 10 20 0T40 0S50 10 60 0"/></svg>`;
		const r = svgToPaths(svg, { size: 200 });
		expect(r.fill).toBe('#ff0000');
		expect(r.width).toBe(200);
		expect(r.height).toBe(100);
		const [rect, rrect, poly, curve] = r.paths;
		expect(rect.v.length).toBe(4);
		expect(rect.c).toBe(true);
		const b = pathsBBox([rect])!;
		// (10..50, 0..20) no viewBox → centro (50,25) → ×2
		expect([b.minX, b.maxX, b.minY, b.maxY]).toEqual([-80, 0, -50, -10]);
		expect(rrect.v.length).toBe(8);
		expect(poly.v.length).toBe(3);
		expect(poly.c).toBe(true);
		expect(curve.v.length).toBe(4);
		expect(curve.c).toBe(false);
	});
	test('flags de arco coladas', () => {
		const r = svgToPaths('<svg viewBox="0 0 10 10"><path d="M0 5a5 5 0 1010 0a5 5 0 10-10 0z"/></svg>');
		const b = pathsBBox(r.paths)!;
		expect(b.maxX - b.minX).toBeCloseTo(10, 2);
		expect(b.maxY - b.minY).toBeCloseTo(10, 2);
	});
});

const keysOf = (l: MotionLayer): number[] => layerProps(l).flatMap((p) => (p.prop as Prop<unknown>).keys.map((k) => k.t));

describe('presets', () => {
	const kinds = ['shape', 'text', 'image'] as const;
	for (const def of PRESETS) {
		for (const kind of def.layerKinds) {
			test(`${def.id} em ${kind}`, () => {
				const s = newScene({ frames: 300 });
				const l = newLayer(kind, s);
				const at = 20, d = presetDuration(def.id, 30);
				applyPreset(l, def.id, at, d, s);
				const ts = keysOf(l);
				const hi = def.group === 'loop' ? l.end : at + d;
				for (const t of ts) {
					expect(t).toBeGreaterThanOrEqual(at);
					expect(t).toBeLessThanOrEqual(hi + 1e-6);
				}
				if (def.group === 'loop') expect(Math.max(...ts)).toBeGreaterThan(l.end - d - 1e-6);
				if (l.kind === 'text' && (def.id === 'typewriter' || def.id === 'blurReveal')) expect(l.animator).not.toBe('none');
				else expect(ts.length).toBeGreaterThan(0);
				// entrada termina no repouso; saída começa nele
				if (def.group === 'entrance') expect(evalProp(l.transform.opacity, at + d)).toBe(100);
				if (def.group === 'exit') expect(evalProp(l.transform.opacity, at)).toBe(100);
				if (def.group === 'emphasis') expect(evalProp(l.transform.scale, at + d)).toEqual([100, 100]);
				expect(validateLottie(toLottie({ ...s, layers: [l.kind === 'image' ? { ...l, src: 'data:image/png;base64,AA==' } : l] }))).toEqual([]);
			});
		}
	}
	test('não apaga keys fora do intervalo nem de outras props', () => {
		const s = newScene({ frames: 200 });
		const l = newLayer('shape', s);
		setKey(l.transform.rotation, 5, 10);
		setKey(l.transform.opacity, 150, 50);
		applyPreset(l, 'fadeIn', 20, 15, s);
		expect(l.transform.rotation.keys.length).toBe(1);
		expect(hasKey(l.transform.opacity, 150)).toBe(true);
		clearAnimation(l);
		expect(keysOf(l)).toEqual([]);
	});
	test('preset recusa tipo errado', () => {
		const s = newScene();
		expect(() => applyPreset(newLayer('image', s), 'drawStroke', 0, 10, s)).toThrow();
		void kinds;
	});
});

describe('toLottie', () => {
	test('cada modelo gera Lottie válido', () => {
		for (const t of TEMPLATES) {
			const scene: Scene = t.make();
			const json = toLottie(scene);
			expect({ id: t.id, errs: validateLottie(json) }).toEqual({ id: t.id, errs: [] });
			expect(json.layers.length).toBeGreaterThanOrEqual(scene.layers.length);
			expect(JSON.parse(JSON.stringify(json))).toEqual(json);
		}
	});
	test('keyframes: estático, tangentes, hold e expansão de bounce', () => {
		const p = prop(0);
		expect(lottieProp(p, (v) => [v], true)).toEqual({ a: 0, k: 0 });
		setKey(p, 0, 0, 'easeOut');
		setKey(p, 10, 100, 'hold');
		setKey(p, 20, 50, 'bounce');
		setKey(p, 30, 0);
		const k = lottieProp(p, (v) => [v], true).k;
		expect(k[0]).toMatchObject({ t: 0, s: [0], o: { x: [0.22], y: [1] }, i: { x: [0.36], y: [1] } });
		expect(k[1]).toEqual({ t: 10, s: [100], h: 1 });
		expect(k.length).toBe(2 + 7 + 1);
		expect(k[k.length - 1]).toEqual({ t: 30, s: [0] });
	});
	test('validador acusa problemas', () => {
		const bad = { v: '5.12.0', fr: 30, ip: 0, op: 0, w: 10, h: 10, layers: [{ ty: 2, ind: 1, ip: 0, op: 10, st: 0, refId: 'x', ks: { a: { a: 1, k: [{ t: 5, s: [0] }, { t: 2, s: [NaN] }] } } }] };
		const errs = validateLottie(bad);
		expect(errs.some((e) => e.includes('op deve'))).toBe(true);
		expect(errs.some((e) => e.includes('fora de ordem'))).toBe(true);
		expect(errs.some((e) => e.includes('não finito'))).toBe(true);
		expect(errs.some((e) => e.includes('sem asset'))).toBe(true);
	});
});
