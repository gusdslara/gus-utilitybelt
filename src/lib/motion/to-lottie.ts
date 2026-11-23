// Cena do Motion → JSON Lottie (bodymovin 5.x) que o lottie-web 5.13 toca nos renderers svg e canvas.
// Puro (sem DOM). `validateLottie` faz uma checagem estrutural usada nos testes e no export.
import { easeSegments, lottieTangents } from './easing.ts';
import { evalProp, hexToRgb, textMetrics } from './scene.ts';
import type { ImageLayer, LottieJSON, MotionLayer, Prop, Scene, ShapeLayer, TextLayer, Vec2 } from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const r3 = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 + 0 : 0); // +0 evita -0
const r5 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100000) / 100000 + 0 : 0);

/** Converte valor do modelo em array de números no espaço do Lottie. */
type ToArr<T> = (v: T) => number[];

/**
 * Prop → propriedade Lottie. Estática: `{a:0,k}` (escalar vira número). Animada: `{a:1,k:[…]}` com
 * tangentes de easing; elastic/bounce expandidos em sub-keyframes; hold → `h:1`; último key só `{t,s}`.
 */
export function lottieProp<T>(p: Prop<T>, toArr: ToArr<T>, scalar = false): Json {
	const keys = p.keys ?? [];
	if (keys.length < 2) {
		const arr = toArr(keys.length ? keys[0].v : p.value).map(r5);
		return { a: 0, k: scalar ? arr[0] : arr };
	}
	const k: Json[] = [];
	for (let n = 0; n < keys.length - 1; n++) {
		const a = keys[n], b = keys[n + 1];
		const A = toArr(a.v), B = toArr(b.v);
		const span = b.t - a.t;
		if (span <= 0) continue; // keys no mesmo frame: o seguinte vence
		if (a.ease === 'hold') {
			k.push({ t: r3(a.t), s: A.map(r5), h: 1 });
			continue;
		}
		for (const seg of easeSegments(a.ease)) {
			const s = A.map((x, i) => r5(x + ((B[i] ?? x) - x) * seg.p));
			k.push({ t: r3(a.t + seg.t * span), s, ...lottieTangents(seg.bez) });
		}
	}
	const last = keys[keys.length - 1];
	k.push({ t: r3(last.t), s: toArr(last.v).map(r5) });
	return { a: 1, k };
}

const num: ToArr<number> = (v) => [v];
const vec3: ToArr<Vec2> = (v) => [v[0], v[1], 0];
const vec2: ToArr<Vec2> = (v) => [v[0], v[1]];
const scale3: ToArr<Vec2> = (v) => [v[0], v[1], 100];
const rgba: ToArr<string> = (c) => {
	const [r, g, b] = hexToRgb(c);
	return [r / 255, g / 255, b / 255, 1];
};
const rgb01 = (c: string): number[] => rgba(c).slice(0, 3).map(r5);
const stat = (k: unknown) => ({ a: 0, k });

/** Prop derivada (mapeia valores e keys mantendo tempos e easings). */
function mapProp<T, U>(p: Prop<T>, f: (v: T) => U): Prop<U> {
	return { value: f(p.value), keys: p.keys.map((k) => ({ t: k.t, v: f(k.v), ease: k.ease })) };
}

function transformKs(l: MotionLayer, anchor: [number, number]): Json {
	const t = l.transform;
	return {
		a: stat([r3(anchor[0]), r3(anchor[1]), 0]),
		p: lottieProp(t.position, vec3),
		s: lottieProp(t.scale, scale3),
		r: lottieProp(t.rotation, num, true),
		o: lottieProp(t.opacity, num, true)
	};
}

const groupTr = (scale: [number, number] = [100, 100]): Json => ({
	ty: 'tr',
	p: stat([0, 0]),
	a: stat([0, 0]),
	s: stat(scale),
	r: stat(0),
	o: stat(100),
	sk: stat(0),
	sa: stat(0),
	nm: 'Transformar'
});

/** Geometria do shape (itens Lottie) + escala extra p/ estrela/polígono não quadrados. */
function geometry(l: ShapeLayer): { items: Json[]; trScale: [number, number] } {
	const p0 = stat([0, 0]);
	switch (l.shape) {
		case 'rect':
			return { items: [{ ty: 'rc', d: 1, nm: 'Retângulo', s: lottieProp(l.size, vec2), p: p0, r: lottieProp(l.radius, num, true) }], trScale: [100, 100] };
		case 'ellipse':
			return { items: [{ ty: 'el', d: 1, nm: 'Elipse', s: lottieProp(l.size, vec2), p: p0 }], trScale: [100, 100] };
		case 'star':
		case 'polygon': {
			const star = l.shape === 'star';
			const outer = mapProp(l.size, (v) => Math.abs(v[0]) / 2);
			const [w, h] = evalProp(l.size, 0);
			const item: Json = {
				ty: 'sr',
				sy: star ? 1 : 2,
				d: 1,
				nm: star ? 'Estrela' : 'Polígono',
				pt: stat(Math.max(3, Math.round(l.points || 5))),
				p: p0,
				r: stat(0),
				or: lottieProp(outer, num, true),
				os: stat(0)
			};
			if (star) {
				item.ir = lottieProp(mapProp(outer, (v) => v * Math.min(1, Math.max(0.05, l.innerRatio || 0.5))), num, true);
				item.is = stat(0);
			}
			return { items: [item], trScale: [100, w ? r3((h / w) * 100) : 100] };
		}
		case 'path':
		default:
			return {
				items: (l.paths ?? []).map((p, i) => ({
					ty: 'sh',
					d: 1,
					nm: `Caminho ${i + 1}`,
					ks: stat({ i: p.i.map(vec2r), o: p.o.map(vec2r), v: p.v.map(vec2r), c: !!p.c })
				})),
				trScale: [100, 100]
			};
	}
}
const vec2r = (v: Vec2) => [r3(v[0]), r3(v[1])];

const LC = { butt: 1, round: 2, square: 3 } as const;
const LJ = { miter: 1, round: 2, bevel: 3 } as const;

function strokeItem(l: ShapeLayer): Json {
	const s = l.stroke;
	const item: Json = {
		ty: 'st',
		nm: 'Traço',
		c: lottieProp(s.color, rgba),
		o: lottieProp(s.opacity, num, true),
		w: lottieProp(s.width, num, true),
		lc: LC[s.cap] ?? 2,
		lj: LJ[s.join] ?? 2,
		ml: 4,
		bm: 0
	};
	const dash = (s.dash ?? []).filter((n) => Number.isFinite(n) && n >= 0);
	if (dash.length && dash.some((n) => n > 0)) {
		const pairs = dash.length % 2 ? [...dash, ...dash] : dash;
		item.d = [
			...pairs.map((n, i) => ({ n: i % 2 ? 'g' : 'd', nm: i % 2 ? 'gap' : 'dash', v: stat(n) })),
			{ n: 'o', nm: 'offset', v: stat(0) }
		];
	}
	return item;
}

const fillItem = (l: ShapeLayer): Json => ({
	ty: 'fl',
	nm: 'Preenchimento',
	c: lottieProp(l.fill.color, rgba),
	o: lottieProp(l.fill.opacity, num, true),
	r: 1,
	bm: 0
});

const trimItem = (l: ShapeLayer): Json => ({
	ty: 'tm',
	nm: 'Aparar',
	s: lottieProp(l.trim.start, num, true),
	e: lottieProp(l.trim.end, num, true),
	// no Lottie o deslocamento do trim é em graus; no modelo é % do contorno
	o: lottieProp(mapProp(l.trim.offset, (v) => v * 3.6), num, true),
	m: 1
});

const group = (nm: string, it: Json[]): Json => ({ ty: 'gr', nm, it, np: it.length - 1, cix: 2, bm: 0, ix: 1, hd: false });

/**
 * Conteúdo do shape. Com trim + traço, o traço vai num grupo próprio (por cima) para o trim não
 * "cortar" o preenchimento; sem isso a ordem é: geometria, trim, traço, preenchimento, tr.
 */
function shapeContents(l: ShapeLayer): Json[] {
	const { items, trScale } = geometry(l);
	if (!items.length) return [];
	const geo = () => structuredClone(items);
	if (l.trim.on && l.stroke.on) {
		const out = [group('Traço', [...geo(), trimItem(l), strokeItem(l), groupTr(trScale)])];
		if (l.fill.on) out.push(group('Preenchimento', [...geo(), fillItem(l), groupTr(trScale)]));
		return out;
	}
	const it: Json[] = [...geo()];
	if (l.trim.on) it.push(trimItem(l));
	if (l.stroke.on) it.push(strokeItem(l));
	if (l.fill.on) it.push(fillItem(l));
	it.push(groupTr(trScale));
	return [group(l.name || 'Forma', it)];
}

// ─────────────────────────── texto ───────────────────────────

/** Nome interno da fonte (único por família + peso + itálico). */
export function fontName(l: Pick<TextLayer, 'font' | 'weight' | 'italic'>): string {
	return `${(l.font || 'sans-serif').replace(/[^\w-]+/g, '')}-${l.weight || 400}${l.italic ? '-Italic' : ''}`;
}
const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Bold', 700: 'Bold', 800: 'Black', 900: 'Black' };

/** Âncora do texto: o Lottie posiciona pela linha de base do 1º parágrafo; a âncora leva a posição ao centro do bloco. */
export function textAnchor(l: TextLayer): [number, number] {
	const m = textMetrics(l);
	const lh = l.lineHeight || l.size * 1.2;
	const ax = l.align === 'left' ? m.w / 2 : l.align === 'right' ? -m.w / 2 : 0;
	const ay = ((m.lines - 1) * lh) / 2 - 0.32 * l.size;
	return [ax, ay];
}

function textAnimators(l: TextLayer): Json[] {
	if (!l.animator || l.animator === 'none') return [];
	const t0 = l.animStart, t1 = Math.max(l.animEnd, l.animStart + 1);
	const sel = (over: Json): Json => ({
		t: 0,
		xe: stat(0),
		ne: stat(0),
		a: stat(100),
		b: 1,
		rn: 0,
		sh: 1,
		s: stat(0),
		e: stat(100),
		o: stat(0),
		r: 1,
		sm: stat(100),
		...over
	});
	const ramp = (w: number) => {
		// rampa (sh 2) de largura w% varrendo o texto: antes da rampa visível, depois invisível
		const off: Prop<number> = { value: -w, keys: [{ t: t0, v: -w, ease: 'linear' }, { t: t1, v: 100, ease: 'linear' }] };
		return sel({ sh: 2, s: stat(0), e: stat(w), o: lottieProp(off, num, true) });
	};
	switch (l.animator) {
		case 'typewriter': {
			const start: Prop<number> = { value: 0, keys: [{ t: t0, v: 0, ease: 'linear' }, { t: t1, v: 100, ease: 'linear' }] };
			return [{ nm: 'Máquina de escrever', s: sel({ s: lottieProp(start, num, true) }), a: { o: stat(0) } }];
		}
		case 'fadeChars':
			return [{ nm: 'Surgir letras', s: ramp(35), a: { o: stat(0) } }];
		case 'slideChars':
			return [{ nm: 'Deslizar letras', s: ramp(30), a: { o: stat(0), p: stat([0, r3(l.size * 0.45), 0]) } }];
		case 'scaleChars':
			return [{ nm: 'Escalar letras', s: ramp(30), a: { o: stat(0), s: stat([0, 0, 100]) } }];
		default:
			return [];
	}
}

function textData(l: TextLayer): Json {
	const doc: Json = {
		s: r3(l.size),
		f: fontName(l),
		t: String(l.text ?? '').replace(/\r\n|\n/g, '\r'),
		j: l.align === 'left' ? 0 : l.align === 'right' ? 1 : 2,
		tr: r3(l.tracking || 0),
		lh: r3(l.lineHeight || l.size * 1.2),
		ls: 0,
		fc: rgb01(l.color),
		of: true
	};
	if (l.strokeColor && l.strokeWidth > 0) {
		doc.sc = rgb01(l.strokeColor);
		doc.sw = r3(l.strokeWidth);
	}
	return {
		d: { k: [{ s: doc, t: 0 }] },
		p: {},
		m: { g: 1, a: stat([0, 0]) },
		a: textAnimators(l)
	};
}

// ─────────────────────────── cena ───────────────────────────

/** Gera o JSON Lottie da cena. Camadas na mesma ordem (a primeira fica por cima). */
export function toLottie(scene: Scene): LottieJSON {
	const assets: Json[] = [];
	const fonts = new Map<string, Json>();
	const layers: Json[] = [];
	const fr = scene.fps > 0 ? scene.fps : 30;
	const op = Math.max(1, Math.round(scene.frames));
	let ind = 1;

	const base = (l: MotionLayer, ty: number, anchor: [number, number]): Json => {
		const ip = Math.max(0, Math.min(l.start, op - 1));
		const lop = Math.max(ip + 1, Math.min(l.end, op));
		const o: Json = { ddd: 0, ind: ind++, ty, nm: l.name || 'Camada', sr: 1, ks: transformKs(l, anchor), ao: 0, ip, op: lop, st: 0, bm: 0 };
		if (!l.visible) o.hd = true;
		return o;
	};

	for (const l of scene.layers) {
		if (l.kind === 'shape') {
			const shapes = shapeContents(l);
			if (!shapes.length) continue;
			layers.push({ ...base(l, 4, [0, 0]), shapes });
		} else if (l.kind === 'text') {
			const fName = fontName(l);
			if (!fonts.has(fName)) {
				const w = Math.round((l.weight || 400) / 100) * 100;
				fonts.set(fName, {
					fName,
					fFamily: l.font || 'sans-serif',
					fStyle: `${WEIGHT_NAMES[w] ?? 'Regular'}${l.italic ? ' Italic' : ''}`,
					fWeight: String(l.weight || 400),
					ascent: 75
				});
			}
			layers.push({ ...base(l, 5, textAnchor(l)), t: textData(l) });
		} else if (l.kind === 'image') {
			const img = l as ImageLayer;
			if (!img.src) continue;
			const id = `img_${assets.length}`;
			assets.push({ id, w: Math.round(img.width), h: Math.round(img.height), u: '', p: img.src, e: 1 });
			layers.push({ ...base(l, 2, [img.width / 2, img.height / 2]), refId: id });
		}
	}

	if (scene.background) {
		layers.push({
			ddd: 0,
			ind: ind++,
			ty: 1,
			nm: 'Fundo',
			sr: 1,
			ks: { a: stat([0, 0, 0]), p: stat([0, 0, 0]), s: stat([100, 100, 100]), r: stat(0), o: stat(100) },
			ao: 0,
			sc: scene.background,
			sw: scene.width,
			sh: scene.height,
			ip: 0,
			op,
			st: 0,
			bm: 0
		});
	}

	const out: LottieJSON = {
		v: '5.12.0',
		fr,
		ip: 0,
		op,
		w: Math.round(scene.width),
		h: Math.round(scene.height),
		nm: scene.name || 'Motion',
		ddd: 0,
		assets,
		layers,
		markers: []
	};
	if (fonts.size) out.fonts = { list: [...fonts.values()] };
	return out;
}

// ─────────────────────────── validação ───────────────────────────

/**
 * Checagem estrutural do JSON Lottie (não substitui o player): chaves obrigatórias, props animáveis
 * `{a,k}`, keyframes `{t,s}` em ordem crescente, op > ip, assets referenciados e números finitos.
 * Retorna a lista de problemas (vazia = ok).
 */
export function validateLottie(json: unknown): string[] {
	const errs: string[] = [];
	const err = (path: string, msg: string) => errs.push(`${path}: ${msg}`);
	if (!json || typeof json !== 'object') return ['raiz: não é objeto'];
	const j = json as Json;
	for (const k of ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers']) if (!(k in j)) err('raiz', `falta "${k}"`);
	if (typeof j.v !== 'string') err('v', 'deve ser string');
	for (const k of ['fr', 'ip', 'op', 'w', 'h']) if (!isFiniteNum(j[k])) err(k, 'número inválido');
	if (!(j.op > j.ip)) err('op', 'op deve ser > ip');
	if (!(j.fr > 0)) err('fr', 'fr deve ser > 0');
	if (!Array.isArray(j.layers)) return [...errs, 'layers: não é array'];

	const assetIds = new Set<string>();
	for (const [i, a] of (j.assets ?? []).entries()) {
		if (!a || typeof a.id !== 'string') err(`assets[${i}]`, 'sem id');
		else assetIds.add(a.id);
	}
	const fontNames = new Set<string>((j.fonts?.list ?? []).map((f: Json) => f?.fName));
	const inds = new Set<number>();

	const checkProp = (p: unknown, path: string, required = true) => {
		if (p == null) {
			if (required) err(path, 'propriedade ausente');
			return;
		}
		const q = p as Json;
		if (!('k' in q)) return err(path, 'sem "k"');
		if (q.a === 1) {
			if (!Array.isArray(q.k) || q.k.length < 1) return err(path, 'animada sem keyframes');
			let prevT = -Infinity;
			q.k.forEach((kf: Json, n: number) => {
				const kp = `${path}.k[${n}]`;
				if (!kf || typeof kf !== 'object') return err(kp, 'keyframe inválido');
				if (!isFiniteNum(kf.t)) err(kp, 't inválido');
				else if (kf.t <= prevT) err(kp, `t fora de ordem (${kf.t} <= ${prevT})`);
				prevT = kf.t;
				if (!Array.isArray(kf.s) && !(kf.s && typeof kf.s === 'object')) err(kp, 's ausente');
				deepFinite(kf.s, `${kp}.s`, err);
				const isLast = n === q.k.length - 1;
				if (!isLast && kf.h !== 1) {
					if (!kf.o || !kf.i) err(kp, 'sem tangentes o/i');
					else {
						deepFinite(kf.o, `${kp}.o`, err);
						deepFinite(kf.i, `${kp}.i`, err);
						for (const x of [...arr(kf.o.x), ...arr(kf.i.x)]) if (x < 0 || x > 1) err(kp, `tangente x fora de 0..1 (${x})`);
					}
				}
			});
		} else deepFinite(q.k, `${path}.k`, err);
	};

	const checkShapes = (items: unknown, path: string) => {
		if (!Array.isArray(items)) return err(path, 'não é array');
		items.forEach((it: Json, n: number) => {
			const ip = `${path}[${n}]`;
			if (!it || typeof it.ty !== 'string') return err(ip, 'item sem ty');
			switch (it.ty) {
				case 'gr':
					checkShapes(it.it, `${ip}.it`);
					if (!Array.isArray(it.it) || it.it[it.it.length - 1]?.ty !== 'tr') err(ip, 'grupo deve terminar com tr');
					break;
				case 'rc':
					['s', 'p', 'r'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'el':
					['s', 'p'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'sr':
					['p', 'or', 'os', 'r', 'pt'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					if (it.sy === 1) ['ir', 'is'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'sh': {
					checkProp(it.ks, `${ip}.ks`);
					const k = it.ks?.k;
					if (it.ks?.a === 0) {
						if (!k || !Array.isArray(k.v) || !Array.isArray(k.i) || !Array.isArray(k.o)) err(ip, 'caminho sem v/i/o');
						else if (k.v.length !== k.i.length || k.v.length !== k.o.length) err(ip, 'v/i/o com tamanhos diferentes');
					}
					break;
				}
				case 'fl':
					['c', 'o'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'st':
					['c', 'o', 'w'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'tm':
					['s', 'e', 'o'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
				case 'tr':
					['p', 'a', 's', 'r', 'o'].forEach((k) => checkProp(it[k], `${ip}.${k}`));
					break;
			}
		});
	};

	j.layers.forEach((l: Json, n: number) => {
		const lp = `layers[${n}]`;
		if (!l || typeof l !== 'object') return err(lp, 'não é objeto');
		for (const k of ['ty', 'ind', 'ip', 'op', 'st', 'ks']) if (!(k in l)) err(lp, `falta "${k}"`);
		if (inds.has(l.ind)) err(lp, `ind duplicado ${l.ind}`);
		inds.add(l.ind);
		if (!(l.op > l.ip)) err(lp, 'op deve ser > ip');
		for (const k of ['ip', 'op', 'st']) if (!isFiniteNum(l[k])) err(`${lp}.${k}`, 'número inválido');
		if (l.ks) for (const k of ['a', 'p', 's', 'r', 'o']) checkProp(l.ks[k], `${lp}.ks.${k}`);
		switch (l.ty) {
			case 4:
				checkShapes(l.shapes, `${lp}.shapes`);
				break;
			case 5: {
				const doc = l.t?.d?.k?.[0]?.s;
				if (!doc) err(lp, 'texto sem documento t.d.k[0].s');
				else {
					if (typeof doc.t !== 'string') err(lp, 'texto sem t');
					if (!isFiniteNum(doc.s)) err(lp, 'texto sem tamanho');
					if (!fontNames.has(doc.f)) err(lp, `fonte "${doc.f}" fora de fonts.list`);
					if (!Array.isArray(doc.fc)) err(lp, 'texto sem fc');
				}
				if (!l.t?.m || !Array.isArray(l.t?.a)) err(lp, 'texto sem m/a');
				(l.t?.a ?? []).forEach((an: Json, i: number) => {
					const ap = `${lp}.t.a[${i}]`;
					if (!an.s || !an.a) return err(ap, 'animador sem s/a');
					checkProp(an.s.a, `${ap}.s.a`);
					for (const k of ['s', 'e', 'o']) checkProp(an.s[k], `${ap}.s.${k}`, false);
					for (const k of Object.keys(an.a)) checkProp(an.a[k], `${ap}.a.${k}`);
				});
				break;
			}
			case 2:
				if (!assetIds.has(l.refId)) err(lp, `refId "${l.refId}" sem asset`);
				break;
			case 1:
				if (typeof l.sc !== 'string' || !isFiniteNum(l.sw) || !isFiniteNum(l.sh)) err(lp, 'sólido sem sc/sw/sh');
				break;
			case 3:
				break;
			default:
				err(lp, `ty desconhecido ${l.ty}`);
		}
	});
	return errs;
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const arr = (v: unknown): number[] => (Array.isArray(v) ? v : [v]) as number[];
function deepFinite(v: unknown, path: string, err: (p: string, m: string) => void, depth = 0): void {
	if (depth > 6) return;
	if (typeof v === 'number') {
		if (!Number.isFinite(v)) err(path, 'número não finito');
	} else if (Array.isArray(v)) v.forEach((x, i) => deepFinite(x, `${path}[${i}]`, err, depth + 1));
	else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) deepFinite(x, `${path}.${k}`, err, depth + 1);
}
