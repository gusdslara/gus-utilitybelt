// Testes das ferramentas puras de Lottie com fixtures montadas à mão (formato de terceiros, não o nosso gerador).
import { describe, expect, test } from 'bun:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
	extractColors,
	info,
	listLayers,
	listTexts,
	parseLottieFile,
	removeLayer,
	replaceColor,
	resize,
	setFps,
	setLayerHidden,
	setSpeed,
	setText,
	trim,
	validateLottie,
	writeDotLottie
} from './lottie-tools.ts';
import type { LottieJSON } from './types.ts';

// PNG 1×1 vermelho.
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const PNG_URL = `data:image/png;base64,${PNG_B64}`;

const tr = (p: number[] = [50, 50, 0]) => ({ o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: p }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } });

function fixture(): LottieJSON {
	return {
		v: '5.7.4',
		fr: 30,
		ip: 0,
		op: 60,
		w: 200,
		h: 100,
		nm: 'Teste',
		ddd: 0,
		markers: [{ cm: 'intro', tm: 15, dr: 30 }],
		fonts: { list: [{ fName: 'Arial', fFamily: 'Arial', fStyle: 'Regular', ascent: 70 }] },
		assets: [
			{ id: 'image_0', w: 1, h: 1, u: '', p: PNG_URL, e: 1 },
			{
				id: 'comp_0',
				layers: [
					{ ddd: 0, ind: 1, ty: 4, nm: 'Dentro', ks: tr(), ip: 0, op: 60, st: 0, shapes: [{ ty: 'fl', c: { a: 0, k: [1, 0, 0, 1] }, o: { a: 0, k: 100 } }] },
					{ ddd: 0, ind: 2, ty: 2, nm: 'Foto', refId: 'image_0', ks: tr(), ip: 0, op: 60, st: 0 }
				]
			}
		],
		layers: [
			{
				ddd: 0,
				ind: 1,
				ty: 5,
				nm: 'Título',
				ks: tr(),
				ip: 0,
				op: 60,
				st: 0,
				t: {
					d: { k: [{ s: { t: 'Olá\rmundo', f: 'Arial', s: 24, fc: [1, 0, 0], sc: [0, 0, 1], j: 0 }, t: 0 }] },
					a: [{ nm: 'Animator', s: {}, a: { fc: { a: 1, k: [{ t: 0, s: [0, 1, 0, 1] }, { t: 30, s: [1, 0, 0, 1] }] } } }]
				}
			},
			{
				ddd: 0,
				ind: 2,
				ty: 4,
				nm: 'Forma',
				ks: { ...tr(), p: { a: 1, k: [{ t: 0, s: [0, 0, 0], e: [100, 50, 0] }, { t: 30, s: [100, 50, 0] }] } },
				ip: 0,
				op: 60,
				st: 0,
				shapes: [
					{
						ty: 'gr',
						nm: 'Grupo',
						it: [
							{ ty: 'rc', s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 } },
							{ ty: 'fl', c: { a: 0, k: [1, 0, 0, 1] }, o: { a: 0, k: 100 } },
							{ ty: 'st', c: { a: 1, k: [{ t: 0, s: [1, 0, 0, 1], e: [0, 0, 1, 1] }, { t: 60, s: [0, 0, 1, 1] }] }, w: { a: 0, k: 2 }, o: { a: 0, k: 100 } },
							{ ty: 'gf', g: { p: 2, k: { a: 0, k: [0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1] } }, s: { a: 0, k: [0, 0] }, e: { a: 0, k: [10, 0] }, t: 1, o: { a: 0, k: 100 } },
							{ ty: 'tr', ...tr([0, 0, 0]) }
						]
					}
				]
			},
			{ ddd: 0, ind: 3, ty: 0, nm: 'Precomp', refId: 'comp_0', ks: tr(), w: 200, h: 100, ip: 0, op: 60, st: 0 },
			{ ddd: 0, ind: 4, ty: 1, nm: 'Fundo', sc: '#FF0000', sw: 200, sh: 100, ks: tr(), ip: 0, op: 60, st: 0 },
			{ ddd: 0, ind: 5, ty: 3, nm: 'Nulo', ks: tr(), ip: 0, op: 60, st: 0 }
		]
	};
}

const blob = (s: string | Uint8Array) => new Blob([s as BlobPart]);

describe('parse e validação', () => {
	test('aceita JSON Lottie e rejeita JSON qualquer com mensagem amigável', async () => {
		const p = await parseLottieFile(blob(JSON.stringify(fixture())), 'minha.json');
		expect(p.sourceKind).toBe('json');
		expect(p.name).toBe('minha');
		expect(p.json.w).toBe(200);
		await expect(parseLottieFile(blob('{"a":1}'), 'x.json')).rejects.toThrow(/faltam/);
		await expect(parseLottieFile(blob('nope'), 'x.json')).rejects.toThrow(/JSON válido/);
		await expect(parseLottieFile(blob('{}'), 'x.lottie')).rejects.toThrow(/zip/);
	});

	test('validateLottie', () => {
		expect(validateLottie(fixture())).toEqual([]);
		const bad = fixture();
		bad.op = 0;
		bad.layers[2].refId = 'sumiu';
		bad.assets![0].p = 'img.png';
		const w = validateLottie(bad);
		expect(w.some((x) => x.includes('op'))).toBe(true);
		expect(w.some((x) => x.includes('sumiu'))).toBe(true);
		expect(w.some((x) => x.includes('externa'))).toBe(true);
		expect(validateLottie(null)[0]).toMatch(/objeto/);
	});

	test('info', () => {
		const i = info(fixture());
		expect(i).toMatchObject({ width: 200, height: 100, fps: 30, frames: 60, duration: 2, version: '5.7.4', layers: 7, assets: 2, images: 1, texts: 1, hasExpressions: false });
		expect(i.markers).toEqual([{ name: 'intro', time: 0.5, duration: 1 }]);
		expect(i.bytes).toBeGreaterThan(100);
		const j = fixture();
		j.layers[1].ks.o = { a: 0, k: 100, x: 'value * 0.5' };
		expect(info(j).hasExpressions).toBe(true);
	});
});

describe('cores', () => {
	test('extractColors conta fills, strokes animados, gradientes, sólidos, textos e animadores', () => {
		const c = Object.fromEntries(extractColors(fixture()).map((x) => [x.key, x.count]));
		// vermelho: fill + stroke s[0] + gradiente parada 0 + sólido + texto fc + animador s[1] + fill da precomp
		expect(c['#ff0000']).toBe(7);
		// azul: stroke e[0] + stroke s[1] + texto sc
		expect(c['#0000ff']).toBe(3);
		expect(c['#ffffff']).toBe(1);
		expect(c['#00ff00']).toBe(1);
		expect(extractColors(fixture())[0].key).toBe('#ff0000');
	});

	test('replaceColor troca em todos os lugares e preserva alfa e formato', () => {
		const j = replaceColor(fixture(), '#F00', '#00ff80');
		const c = Object.fromEntries(extractColors(j).map((x) => [x.key, x.count]));
		expect(c['#ff0000']).toBeUndefined();
		expect(c['#00ff80']).toBe(7);
		const it = j.layers[1].shapes[0].it;
		expect(it[1].c.k).toEqual([0, 1, 0.502, 1]);
		expect(it[2].c.k[0].s).toEqual([0, 1, 0.502, 1]);
		expect(it[2].c.k[0].e).toEqual([0, 0, 1, 1]);
		expect(it[3].g.k.k.slice(0, 4)).toEqual([0, 0, 1, 0.502]);
		expect(it[3].g.k.k.slice(8)).toEqual([0, 1, 1, 1]); // opacidades intactas
		expect(j.layers[3].sc).toBe('#00ff80');
		expect(j.layers[0].t.d.k[0].s.fc).toEqual([0, 1, 0.502]);
		expect(j.layers[0].t.a[0].a.fc.k[1].s).toEqual([0, 1, 0.502, 1]);
		expect(j.assets![1].layers[0].shapes[0].c.k).toEqual([0, 1, 0.502, 1]);
	});

	test('cores em escala 0..255 (arquivos antigos)', () => {
		const j = fixture();
		j.layers[1].shapes[0].it[1].c.k = [255, 0, 0, 1];
		replaceColor(j, '#ff0000', '#102030');
		expect(j.layers[1].shapes[0].it[1].c.k).toEqual([16, 32, 48, 1]);
	});
});

describe('textos e camadas', () => {
	test('listTexts / setText mantêm \\r', () => {
		const j = fixture();
		expect(listTexts(j)).toEqual([{ path: '0', layerName: 'Título', text: 'Olá\nmundo', keyframes: 1 }]);
		setText(j, '0', 'Linha 1\nLinha 2');
		expect(j.layers[0].t.d.k[0].s.t).toBe('Linha 1\rLinha 2');
		expect(() => setText(j, '1', 'x')).toThrow(/texto/);
	});

	test('listLayers com precomp', () => {
		const l = listLayers(fixture());
		expect(l.map((x) => [x.path, x.type, x.depth])).toEqual([
			['0', 'text', 0],
			['1', 'shape', 0],
			['2', 'precomp', 0],
			['asset:comp_0/0', 'shape', 1],
			['asset:comp_0/1', 'image', 1],
			['3', 'solid', 0],
			['4', 'null', 0]
		]);
	});

	test('setLayerHidden / removeLayer', () => {
		const j = fixture();
		setLayerHidden(j, 'asset:comp_0/0', true);
		expect(listLayers(j)[3].hidden).toBe(true);
		setLayerHidden(j, 'asset:comp_0/0', false);
		expect(j.assets![1].layers[0].hd).toBeUndefined();
		j.layers[1].parent = 5;
		removeLayer(j, '4');
		expect(j.layers.length).toBe(4);
		expect(j.layers[1].parent).toBeUndefined();
		removeLayer(j, 'asset:comp_0/1');
		expect(j.assets![1].layers.length).toBe(1);
		expect(() => removeLayer(j, '99')).toThrow(/não encontrada/);
	});
});

describe('tempo e tamanho', () => {
	test('setSpeed muda só o fr', () => {
		const j = setSpeed(fixture(), 2);
		expect([j.fr, j.op, info(j).duration]).toEqual([60, 60, 1]);
	});

	test('setFps mantém a duração', () => {
		const j = setFps(fixture(), 60);
		expect([j.fr, j.op, info(j).duration]).toEqual([60, 120, 2]);
		expect(j.layers[1].ks.p.k[1].t).toBe(60);
		expect(j.layers[1].op).toBe(120);
		expect(j.markers[0]).toEqual({ cm: 'intro', tm: 30, dr: 60 });
		expect(j.assets![1].layers[0].op).toBe(120);
	});

	test('trim', () => {
		const j = trim(fixture(), 10, 40);
		expect([j.ip, j.op]).toEqual([10, 40]);
		expect(() => trim(fixture(), 5, 5)).toThrow();
	});

	test('resize canvas centraliza; scale embrulha em precomp', () => {
		const c = resize(fixture(), 400, 200, 'canvas');
		expect([c.w, c.h]).toEqual([400, 200]);
		expect(c.layers[0].ks.p.k).toEqual([150, 100, 0]);
		expect(c.layers[1].ks.p.k[0].s).toEqual([100, 50, 0]);
		expect(c.layers[1].ks.p.k[0].e).toEqual([200, 100, 0]);

		const s = resize(fixture(), 100, 100, 'scale');
		expect([s.w, s.h, s.layers.length]).toEqual([100, 100, 1]);
		expect(s.layers[0].ks.s.k).toEqual([50, 50, 100]);
		expect(s.layers[0].ks.p.k).toEqual([50, 50, 0]);
		const inner = s.assets!.find((a) => a.id === s.layers[0].refId);
		expect(inner.layers.length).toBe(5);
		expect(validateLottie(s)).toEqual([]);
	});
});

describe('dotLottie', () => {
	test('ida e volta: imagens extraídas e reembutidas', async () => {
		const b = await writeDotLottie(fixture(), 'Minha Animação!');
		const files = unzipSync(new Uint8Array(await b.arrayBuffer()));
		const manifest = JSON.parse(strFromU8(files['manifest.json']));
		expect(manifest).toMatchObject({ version: '1', animations: [{ id: 'minha-animacao', speed: 1, loop: true, autoplay: true }] });
		const anim = JSON.parse(strFromU8(files['animations/minha-animacao.json']));
		expect(anim.assets[0]).toMatchObject({ u: '/images/', p: 'img_0.png', e: 0 });
		expect(files['images/img_0.png'][0]).toBe(0x89);

		const p = await parseLottieFile(b, 'x.lottie');
		expect(p.sourceKind).toBe('lottie');
		expect(p.extraAnimations).toBe(0);
		expect(p.json.assets![0]).toMatchObject({ u: '', e: 1, p: PNG_URL });
		expect(p.json.layers.length).toBe(5);
	});

	test('dotLottie v2 (a/ e i/) com várias animações', async () => {
		const j = fixture();
		j.assets![0] = { id: 'image_0', w: 1, h: 1, u: '/i/', p: 'pic.png', e: 0 };
		const z = zipSync({
			'manifest.json': strToU8(JSON.stringify({ version: '2', animations: [{ id: 'b' }, { id: 'a' }] })),
			'a/a.json': strToU8(JSON.stringify({ ...fixture(), nm: 'A' })),
			'a/b.json': strToU8(JSON.stringify(j)),
			'i/pic.png': Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0))
		});
		const p = await parseLottieFile(blob(z));
		expect(p.extraAnimations).toBe(1);
		expect(p.name).toBe('b');
		expect(p.json.assets![0].p).toBe(PNG_URL);
	});

	test('zip sem animações dá erro amigável', async () => {
		const z = zipSync({ 'manifest.json': strToU8('{}') });
		await expect(parseLottieFile(blob(z), 'x.lottie')).rejects.toThrow(/nenhuma animação/);
	});
});
