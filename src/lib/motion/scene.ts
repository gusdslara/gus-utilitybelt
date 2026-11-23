// Núcleo puro da cena do app Motion: fábricas, avaliação/edição de keyframes, bounds aproximados,
// (de)serialização e importação de SVG para caminhos bezier. Sem DOM: roda no Bun e no navegador.
import { ease } from './easing.ts';
import type {
	BezierPath, ColorHex, Easing, ImageLayer, Key, LayerBase, MotionLayer, Prop, Scene, ShapeKind, ShapeLayer,
	TextLayer, Transform, Vec2
} from './types.ts';

// ───────────────────────────── fábricas ─────────────────────────────

let idCounter = 0;
export const newId = (prefix = 'l'): string =>
	`${prefix}${(++idCounter).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const prop = <T>(value: T): Prop<T> => ({ value, keys: [] });

export function newScene(partial: Partial<Scene> = {}): Scene {
	return {
		version: 1,
		name: 'Nova animação',
		width: 1080,
		height: 1080,
		fps: 30,
		frames: 90,
		background: null,
		layers: [],
		...partial
	};
}

const newTransform = (scene: Scene): Transform => ({
	position: prop<Vec2>([scene.width / 2, scene.height / 2]),
	scale: prop<Vec2>([100, 100]),
	rotation: prop(0),
	opacity: prop(100)
});

type LayerKind = MotionLayer['kind'];
type LayerOf<K extends LayerKind> = Extract<MotionLayer, { kind: K }>;
/** Opções extras: campos do layer; `position`/`scale`/… aceitam valor cru (vira Prop estático). */
export type NewLayerOpts<K extends LayerKind> = Partial<Omit<LayerOf<K>, 'kind'>> & {
	at?: Vec2;
	shapeKind?: ShapeKind;
};

const NAMES: Record<string, string> = {
	rect: 'Retângulo', ellipse: 'Elipse', star: 'Estrela', polygon: 'Polígono', path: 'Forma', text: 'Texto', image: 'Imagem'
};

export function newLayer<K extends LayerKind>(kind: K, scene: Scene, opts: NewLayerOpts<K> = {}): LayerOf<K> {
	const { at, shapeKind, ...rest } = opts as NewLayerOpts<K> & Record<string, unknown>;
	const base: LayerBase = {
		id: newId(),
		name: '',
		visible: true,
		locked: false,
		start: 0,
		end: scene.frames,
		transform: newTransform(scene)
	};
	if (at) base.transform.position.value = [at[0], at[1]];
	let layer: MotionLayer;
	if (kind === 'shape') {
		const shape: ShapeKind = shapeKind ?? (rest.shape as ShapeKind) ?? 'rect';
		layer = {
			...base,
			kind: 'shape',
			name: NAMES[shape],
			shape,
			size: prop<Vec2>([200, 200]),
			radius: prop(shape === 'rect' ? 24 : 0),
			points: shape === 'polygon' ? 6 : 5,
			innerRatio: 0.5,
			paths: [],
			fill: { on: true, color: prop('#dd206b'), opacity: prop(100) },
			stroke: { on: false, color: prop('#ffffff'), width: prop(6), opacity: prop(100), cap: 'round', join: 'round', dash: [] },
			trim: { on: false, start: prop(0), end: prop(100), offset: prop(0) }
		} satisfies ShapeLayer;
	} else if (kind === 'text') {
		const size = typeof rest.size === 'number' ? rest.size : 96;
		layer = {
			...base,
			kind: 'text',
			name: NAMES.text,
			text: 'Texto',
			font: 'Inter',
			weight: 700,
			italic: false,
			size,
			color: '#ffffff',
			strokeColor: null,
			strokeWidth: 0,
			align: 'center',
			tracking: 0,
			lineHeight: Math.round(size * 1.2),
			animator: 'none',
			animStart: 0,
			animEnd: Math.min(scene.frames, 30)
		} satisfies TextLayer;
	} else {
		layer = {
			...base,
			kind: 'image',
			name: NAMES.image,
			src: '',
			width: 200,
			height: 200
		} satisfies ImageLayer;
	}
	Object.assign(layer, rest);
	if (!layer.name) layer.name = NAMES[kind];
	return layer as LayerOf<K>;
}

// ─────────────────────────── avaliação ───────────────────────────

const isNum = (v: unknown): v is number => typeof v === 'number';
const isVec = (v: unknown): v is number[] => Array.isArray(v);
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#/.test(v);

export function hexToRgb(hex: ColorHex): [number, number, number] {
	let h = String(hex || '').trim().replace(/^#/, '');
	if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
	const n = parseInt(h.slice(0, 6), 16);
	if (!/^[0-9a-f]{6}/i.test(h) || !Number.isFinite(n)) return [0, 0, 0];
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): ColorHex {
	const c = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
	return `#${c(r)}${c(g)}${c(b)}`;
}

/** Interpola dois valores do mesmo tipo. Cores: componentes sRGB lineares (igual ao Lottie). */
export function lerpValue<T>(a: T, b: T, p: number): T {
	if (isNum(a) && isNum(b)) return (a + (b - a) * p) as T;
	if (isVec(a) && isVec(b)) return a.map((x, i) => (x as number) + (((b[i] as number) ?? (x as number)) - (x as number)) * p) as T;
	if (isColor(a) && isColor(b)) {
		const A = hexToRgb(a), B = hexToRgb(b);
		return rgbToHex(A[0] + (B[0] - A[0]) * p, A[1] + (B[1] - A[1]) * p, A[2] + (B[2] - A[2]) * p) as T;
	}
	return (p < 1 ? a : b) as T;
}

/** Valor de uma Prop no frame. Antes do 1º key = 1º valor; depois do último = último; hold respeitado. */
export function evalProp<T>(p: Prop<T>, frame: number): T {
	const ks = p.keys;
	if (!ks || ks.length === 0) return p.value;
	if (frame <= ks[0].t) return ks[0].v;
	const last = ks[ks.length - 1];
	if (frame >= last.t) return last.v;
	let i = 0;
	while (i < ks.length - 2 && ks[i + 1].t <= frame) i++;
	const a = ks[i], b = ks[i + 1];
	const span = b.t - a.t;
	if (span <= 0) return b.v;
	return lerpValue(a.v, b.v, ease(a.ease, (frame - a.t) / span));
}

const sortKeys = <T>(p: Prop<T>) => p.keys.sort((a, b) => a.t - b.t);
const sameFrame = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Insere (ou substitui) key no frame. Mantém ordenado. Sem `ease`, herda a do key substituído ou 'easeInOut'. */
export function setKey<T>(p: Prop<T>, frame: number, value: T, easing?: Easing): Key<T> {
	const existing = p.keys.find((k) => sameFrame(k.t, frame));
	if (existing) {
		existing.v = value;
		if (easing) existing.ease = easing;
		return existing;
	}
	const k: Key<T> = { t: frame, v: value, ease: easing ?? 'easeInOut' };
	p.keys.push(k);
	sortKeys(p);
	return k;
}

/** Remove key do frame. Se era o último, o valor fixo passa a ser o dele (não "pula" a camada). */
export function removeKey<T>(p: Prop<T>, frame: number): boolean {
	const i = p.keys.findIndex((k) => sameFrame(k.t, frame));
	if (i < 0) return false;
	const [k] = p.keys.splice(i, 1);
	if (p.keys.length === 0) p.value = k.v;
	return true;
}

/** Move key de `from` para `to` (substitui o que houver em `to`). */
export function moveKey<T>(p: Prop<T>, from: number, to: number): boolean {
	const k = p.keys.find((x) => sameFrame(x.t, from));
	if (!k) return false;
	if (sameFrame(from, to)) return true;
	p.keys = p.keys.filter((x) => x === k || !sameFrame(x.t, to));
	k.t = to;
	sortKeys(p);
	return true;
}

export const hasKey = <T>(p: Prop<T>, frame: number): boolean => p.keys.some((k) => sameFrame(k.t, frame));
export const isAnimated = <T>(p: Prop<T>): boolean => p.keys.length > 0;

/** Define o valor no frame: se a prop é animada, grava key; senão muda o valor fixo. */
export function setValueAt<T>(p: Prop<T>, frame: number, value: T): void {
	if (isAnimated(p)) setKey(p, frame, value);
	else p.value = value;
}

// ─────────────────────── trilhas da timeline ───────────────────────

export type PropKind = 'vec2' | 'number' | 'color';
export type LayerPropRef = { path: string; label: string; prop: Prop<unknown>; kind: PropKind };

/** Props animáveis da camada, na ordem das trilhas da timeline. `path` é estável (usar em getProp). */
export function layerProps(layer: MotionLayer): LayerPropRef[] {
	const t = layer.transform;
	const out: LayerPropRef[] = [
		{ path: 'transform.position', label: 'Posição', prop: t.position as Prop<unknown>, kind: 'vec2' },
		{ path: 'transform.scale', label: 'Escala', prop: t.scale as Prop<unknown>, kind: 'vec2' },
		{ path: 'transform.rotation', label: 'Rotação', prop: t.rotation as Prop<unknown>, kind: 'number' },
		{ path: 'transform.opacity', label: 'Opacidade', prop: t.opacity as Prop<unknown>, kind: 'number' }
	];
	if (layer.kind === 'shape') {
		const add = (path: string, label: string, p: Prop<unknown>, kind: PropKind) => out.push({ path, label, prop: p, kind });
		if (layer.shape !== 'path') add('size', 'Tamanho', layer.size as Prop<unknown>, 'vec2');
		if (layer.shape === 'rect') add('radius', 'Cantos', layer.radius as Prop<unknown>, 'number');
		add('fill.color', 'Cor do preenchimento', layer.fill.color as Prop<unknown>, 'color');
		add('fill.opacity', 'Opacidade do preenchimento', layer.fill.opacity as Prop<unknown>, 'number');
		add('stroke.color', 'Cor do traço', layer.stroke.color as Prop<unknown>, 'color');
		add('stroke.width', 'Espessura do traço', layer.stroke.width as Prop<unknown>, 'number');
		add('stroke.opacity', 'Opacidade do traço', layer.stroke.opacity as Prop<unknown>, 'number');
		add('trim.start', 'Traço: início', layer.trim.start as Prop<unknown>, 'number');
		add('trim.end', 'Traço: fim', layer.trim.end as Prop<unknown>, 'number');
		add('trim.offset', 'Traço: deslocamento', layer.trim.offset as Prop<unknown>, 'number');
	}
	return out;
}

/** Acha uma Prop pelo `path` de layerProps. */
export function getProp(layer: MotionLayer, path: string): Prop<unknown> | null {
	let cur: unknown = layer;
	for (const part of path.split('.')) {
		if (!cur || typeof cur !== 'object') return null;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur && typeof cur === 'object' && 'keys' in cur && 'value' in cur ? (cur as Prop<unknown>) : null;
}

// ─────────────────────────── bounds ───────────────────────────

/** Medidas de texto estimadas (sem DOM): largura ≈ size·0,55 por caractere (+ tracking). */
export function textMetrics(l: Pick<TextLayer, 'text' | 'size' | 'tracking' | 'lineHeight'>): { w: number; h: number; lines: number } {
	const lines = String(l.text ?? '').split(/\r\n|\r|\n/);
	const maxChars = Math.max(1, ...lines.map((s) => [...s].length));
	const w = maxChars * l.size * (0.55 + (l.tracking || 0) / 1000);
	const h = l.size * lines.length * 1.2;
	return { w: Math.max(1, w), h, lines: lines.length };
}

/** Bounding box local (antes da escala) do conteúdo da camada, relativa ao centro (posição). */
export function layerLocalBox(layer: MotionLayer, frame: number): { x: number; y: number; w: number; h: number } {
	if (layer.kind === 'image') return { x: -layer.width / 2, y: -layer.height / 2, w: layer.width, h: layer.height };
	if (layer.kind === 'text') {
		const m = textMetrics(layer);
		return { x: -m.w / 2, y: -m.h / 2, w: m.w, h: m.h };
	}
	if (layer.shape === 'path') {
		const b = pathsBBox(layer.paths);
		if (!b) return { x: 0, y: 0, w: 0, h: 0 };
		return { x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY };
	}
	const [w, h] = evalProp(layer.size, frame);
	return { x: -w / 2, y: -h / 2, w, h };
}

/** Bounds aproximados no frame, em coordenadas da composição (para alças de seleção). */
export function layerBounds(layer: MotionLayer, frame: number): { cx: number; cy: number; w: number; h: number; rotation: number } {
	const [px, py] = evalProp(layer.transform.position, frame);
	const [sx, sy] = evalProp(layer.transform.scale, frame);
	const rotation = evalProp(layer.transform.rotation, frame);
	const box = layerLocalBox(layer, frame);
	const kx = sx / 100, ky = sy / 100;
	// centro do box local, escalado e girado em volta da posição
	const lx = (box.x + box.w / 2) * kx, ly = (box.y + box.h / 2) * ky;
	const r = (rotation * Math.PI) / 180;
	const cx = px + lx * Math.cos(r) - ly * Math.sin(r);
	const cy = py + lx * Math.sin(r) + ly * Math.cos(r);
	return { cx, cy, w: Math.abs(box.w * kx), h: Math.abs(box.h * ky), rotation };
}

/** BBox dos caminhos (inclui pontos de controle: aproximação conservadora). */
export function pathsBBox(paths: BezierPath[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	const add = (x: number, y: number) => {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	};
	for (const p of paths) {
		const n = p.v.length;
		for (let k = 0; k < n; k++) {
			const [x, y] = p.v[k];
			add(x, y);
			const next = k + 1 < n ? k + 1 : p.c ? 0 : -1;
			if (next < 0) continue;
			// extremos reais da cúbica (não só controles)
			const P0 = p.v[k], P3 = p.v[next];
			const P1: Vec2 = [P0[0] + p.o[k][0], P0[1] + p.o[k][1]];
			const P2: Vec2 = [P3[0] + p.i[next][0], P3[1] + p.i[next][1]];
			for (const t of cubicExtrema(P0, P1, P2, P3)) {
				const pt = cubicAt(P0, P1, P2, P3, t);
				add(pt[0], pt[1]);
			}
		}
	}
	return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

function cubicAt(a: Vec2, b: Vec2, c: Vec2, d: Vec2, t: number): Vec2 {
	const u = 1 - t;
	const f = (i: 0 | 1) => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i];
	return [f(0), f(1)];
}
function cubicExtrema(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number[] {
	const out: number[] = [];
	for (const i of [0, 1] as const) {
		// derivada: 3[(−a+3b−3c+d)t² + 2(a−2b+c)t + (b−a)]
		const A = -a[i] + 3 * b[i] - 3 * c[i] + d[i];
		const B = 2 * (a[i] - 2 * b[i] + c[i]);
		const C = b[i] - a[i];
		if (Math.abs(A) < 1e-12) {
			if (Math.abs(B) > 1e-12) out.push(-C / B);
		} else {
			const disc = B * B - 4 * A * C;
			if (disc >= 0) {
				const s = Math.sqrt(disc);
				out.push((-B + s) / (2 * A), (-B - s) / (2 * A));
			}
		}
	}
	return out.filter((t) => t > 0 && t < 1);
}

// ─────────────────────── clone / (de)serialização ───────────────────────

export const cloneScene = (s: Scene): Scene => structuredClone(s);
export const cloneLayer = <L extends MotionLayer>(l: L): L => structuredClone(l);

export const SCENE_FORMAT = 'gus-motion';

export function serializeScene(scene: Scene): string {
	return JSON.stringify({ format: SCENE_FORMAT, version: 1, scene });
}

/** Lê JSON de cena (embrulhado ou cru), validando e completando campos faltantes. Lança Error se inválido. */
export function parseScene(json: string | unknown): Scene {
	let data: unknown = json;
	if (typeof json === 'string') {
		try {
			data = JSON.parse(json);
		} catch {
			throw new Error('Arquivo de cena inválido (JSON malformado).');
		}
	}
	if (!data || typeof data !== 'object') throw new Error('Arquivo de cena inválido.');
	let raw = data as Record<string, unknown>;
	if (raw.format === SCENE_FORMAT || ('scene' in raw && raw.scene && typeof raw.scene === 'object')) {
		if (typeof raw.version === 'number' && raw.version > 1) throw new Error(`Versão de cena ${raw.version} não suportada.`);
		raw = raw.scene as Record<string, unknown>;
	}
	if (typeof raw.version === 'number' && raw.version > 1) throw new Error(`Versão de cena ${raw.version} não suportada.`);
	if ('layers' in raw && !Array.isArray(raw.layers)) throw new Error('Cena sem lista de camadas.');
	if ('v' in raw && 'fr' in raw && !('fps' in raw)) throw new Error('Isto é um JSON Lottie, não uma cena do Motion.');

	const num = (v: unknown, d: number, min = -Infinity, max = Infinity) =>
		typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
	const scene = newScene({
		name: typeof raw.name === 'string' ? raw.name : 'Animação',
		width: Math.round(num(raw.width, 1080, 1, 8192)),
		height: Math.round(num(raw.height, 1080, 1, 8192)),
		fps: num(raw.fps, 30, 1, 120),
		frames: Math.round(num(raw.frames, 90, 1, 100000)),
		background: typeof raw.background === 'string' && isColor(raw.background) ? raw.background : null
	});
	for (const l of (raw.layers as unknown[]) ?? []) {
		const fixed = fixLayer(l, scene);
		if (fixed) scene.layers.push(fixed);
	}
	return scene;
}

/** Mescla um layer cru sobre os padrões do tipo; descarta o que não dá pra salvar. */
function fixLayer(l: unknown, scene: Scene): MotionLayer | null {
	if (!l || typeof l !== 'object') return null;
	const r = l as Record<string, unknown>;
	const kind = r.kind;
	if (kind !== 'shape' && kind !== 'text' && kind !== 'image') return null;
	const def = newLayer(kind, scene, kind === 'shape' && typeof r.shape === 'string' ? { shapeKind: r.shape as ShapeKind } : {});
	const out = mergeDefaults(def, r) as MotionLayer;
	if (typeof out.id !== 'string' || !out.id) out.id = newId();
	if (out.end <= out.start) out.end = out.start + 1;
	if (out.kind === 'shape' && !['rect', 'ellipse', 'star', 'polygon', 'path'].includes(out.shape)) out.shape = 'rect';
	if (out.kind === 'shape') out.paths = (out.paths ?? []).filter(isBezierPath);
	return out;
}

function isBezierPath(p: unknown): p is BezierPath {
	if (!p || typeof p !== 'object') return false;
	const b = p as BezierPath;
	const ok = (a: unknown) => Array.isArray(a) && a.every((v) => Array.isArray(v) && v.length >= 2 && v.every(Number.isFinite));
	return ok(b.v) && ok(b.i) && ok(b.o) && b.v.length === b.i.length && b.v.length === b.o.length;
}

function isPropLike(v: unknown): v is Prop<unknown> {
	return !!v && typeof v === 'object' && 'value' in v && 'keys' in v;
}

/** Mescla recursiva tipo-segura: só aceita valores do mesmo "formato" do padrão. */
function mergeDefaults(def: unknown, raw: unknown): unknown {
	if (isPropLike(def)) {
		if (!isPropLike(raw)) return def;
		const value = sameShape(def.value, raw.value) ? raw.value : def.value;
		const keys = Array.isArray(raw.keys)
			? raw.keys
					.filter((k): k is Key<unknown> => !!k && typeof k === 'object' && Number.isFinite((k as Key<unknown>).t) && sameShape(def.value, (k as Key<unknown>).v))
					.map((k) => ({ t: k.t, v: k.v, ease: validEase(k.ease) }))
					.sort((a, b) => a.t - b.t)
			: [];
		return { value, keys };
	}
	if (Array.isArray(def)) return Array.isArray(raw) ? raw : def;
	if (def && typeof def === 'object') {
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
		const out: Record<string, unknown> = {};
		const d = def as Record<string, unknown>, r = raw as Record<string, unknown>;
		for (const k of Object.keys(d)) out[k] = k in r ? mergeDefaults(d[k], r[k]) : d[k];
		return out;
	}
	if (def === null) return typeof raw === 'string' && isColor(raw) ? raw : null; // strokeColor
	if (typeof def === 'number') return typeof raw === 'number' && Number.isFinite(raw) ? raw : def;
	return typeof raw === typeof def ? raw : def;
}

function sameShape(a: unknown, b: unknown): boolean {
	if (typeof a === 'number') return typeof b === 'number' && Number.isFinite(b);
	if (Array.isArray(a)) return Array.isArray(b) && b.length === a.length && b.every((x) => typeof x === 'number' && Number.isFinite(x));
	if (typeof a === 'string') return typeof b === 'string';
	return false;
}

function validEase(e: unknown): Easing {
	const names = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'backIn', 'backOut', 'elastic', 'bounce', 'hold'];
	if (typeof e === 'string' && names.includes(e)) return e as Easing;
	if (e && typeof e === 'object' && Array.isArray((e as { bezier: unknown }).bezier)) {
		const b = (e as { bezier: unknown[] }).bezier;
		if (b.length === 4 && b.every((n) => typeof n === 'number' && Number.isFinite(n))) return { bezier: b as [number, number, number, number] };
	}
	return 'easeInOut';
}

// ─────────────────────────── SVG → caminhos ───────────────────────────

export type SvgImport = {
	paths: BezierPath[];
	width: number;
	height: number;
	/** '#rrggbb', 'none', 'currentColor' ou undefined (não informado → padrão do SVG é preto). */
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
};

type M = [number, number, number, number, number, number]; // matriz afim a b c d e f
const IDENT: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
	m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
	m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
	m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
];
const apply = (m: M, x: number, y: number): Vec2 => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(s: string | undefined): M {
	let m: M = IDENT;
	if (!s) return m;
	const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
	let r: RegExpExecArray | null;
	while ((r = re.exec(s))) {
		const a = (r[2].match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
		let n: M = IDENT;
		switch (r[1]) {
			case 'matrix':
				if (a.length === 6) n = a as M;
				break;
			case 'translate':
				n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
				break;
			case 'scale':
				n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
				break;
			case 'rotate': {
				const t = ((a[0] ?? 0) * Math.PI) / 180, c = Math.cos(t), si = Math.sin(t);
				n = [c, si, -si, c, 0, 0];
				if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
				break;
			}
			case 'skewX':
				n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
				break;
			case 'skewY':
				n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
				break;
		}
		m = mul(m, n);
	}
	return m;
}

function parseAttrs(s: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	let r: RegExpExecArray | null;
	while ((r = re.exec(s))) out[r[1].toLowerCase() === 'viewbox' ? 'viewBox' : r[1]] = r[2] ?? r[3] ?? '';
	// style="fill:…; stroke:…" tem prioridade sobre atributos
	if (out.style) {
		for (const decl of out.style.split(';')) {
			const [k, v] = decl.split(':').map((x) => x?.trim());
			if (k && v) out[k] = v;
		}
	}
	return out;
}

const NAMED: Record<string, string> = {
	black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
	gray: '#808080', grey: '#808080', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb'
};
function normColor(c: string | undefined): string | undefined {
	if (c == null) return undefined;
	const v = c.trim();
	if (!v || v === 'inherit') return undefined;
	if (v === 'none' || v === 'transparent') return 'none';
	if (/^currentcolor$/i.test(v)) return 'currentColor';
	if (/^#[0-9a-f]{3,8}$/i.test(v)) {
		const [r, g, b] = hexToRgb(v);
		return rgbToHex(r, g, b);
	}
	const rgb = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
	if (rgb) return rgbToHex(+rgb[1], +rgb[2], +rgb[3]);
	if (v.startsWith('url(')) return undefined; // gradiente: deixa o padrão
	return NAMED[v.toLowerCase()];
}

/** Subcaminho em coordenadas absolutas: ponto inicial + segmentos cúbicos. */
type Sub = { start: Vec2; segs: { c1: Vec2; c2: Vec2; p: Vec2 }[]; closed: boolean };

function tokenizePath(d: string): (string | number)[] {
	const out: (string | number)[] = [];
	const re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
	let r: RegExpExecArray | null;
	while ((r = re.exec(d))) out.push(r[1] ? r[1] : Number(r[2]));
	return out;
}

/** Converte o atributo `d` em subcaminhos cúbicos absolutos (arcos → cúbicas). */
export function parsePathData(d: string): Sub[] {
	const toks = tokenizePath(fixArcFlags(d)); // flags de arco coladas ("a1 1 0 00 1 1") separadas antes
	const subs: Sub[] = [];
	let cur: Sub | null = null;
	let x = 0, y = 0, sx = 0, sy = 0;
	let lastC2: Vec2 | null = null; // p/ S
	let lastQ: Vec2 | null = null; // p/ T
	let cmd = '';
	let i = 0;
	const num = (): number => {
		const v = toks[i];
		if (typeof v !== 'number') throw new Error('número esperado');
		i++;
		return v;
	};
	const flag = (): number => (num() ? 1 : 0);
	const ensure = () => {
		if (!cur) {
			cur = { start: [x, y], segs: [], closed: false };
			subs.push(cur);
		}
		return cur;
	};
	const line = (nx: number, ny: number) => {
		const s = ensure();
		s.segs.push({ c1: [x, y], c2: [nx, ny], p: [nx, ny] });
		x = nx;
		y = ny;
	};
	const cubic = (c1: Vec2, c2: Vec2, p: Vec2) => {
		ensure().segs.push({ c1, c2, p });
		x = p[0];
		y = p[1];
	};
	while (i < toks.length) {
		const t = toks[i];
		if (typeof t === 'string') {
			cmd = t;
			i++;
			if (cmd === 'Z' || cmd === 'z') {
				if (cur) {
					(cur as Sub).closed = true;
					x = sx;
					y = sy;
				}
				cur = null;
				lastC2 = lastQ = null;
				continue;
			}
		} else if (!cmd) {
			throw new Error('caminho sem comando');
		}
		if (i >= toks.length || typeof toks[i] !== 'number') continue;
		const rel = cmd === cmd.toLowerCase();
		const ox = rel ? x : 0, oy = rel ? y : 0;
		let nextC2: Vec2 | null = null, nextQ: Vec2 | null = null;
		switch (cmd.toUpperCase()) {
			case 'M': {
				const nx = num() + ox, ny = num() + oy;
				cur = { start: [nx, ny], segs: [], closed: false };
				subs.push(cur);
				x = sx = nx;
				y = sy = ny;
				cmd = rel ? 'l' : 'L'; // pares seguintes são linhas
				break;
			}
			case 'L':
				line(num() + ox, num() + oy);
				break;
			case 'H':
				line(num() + ox, y);
				break;
			case 'V':
				line(x, num() + oy);
				break;
			case 'C': {
				const c1: Vec2 = [num() + ox, num() + oy];
				const c2: Vec2 = [num() + ox, num() + oy];
				const p: Vec2 = [num() + ox, num() + oy];
				cubic(c1, c2, p);
				nextC2 = c2;
				break;
			}
			case 'S': {
				const c1: Vec2 = lastC2 ? [2 * x - lastC2[0], 2 * y - lastC2[1]] : [x, y];
				const c2: Vec2 = [num() + ox, num() + oy];
				const p: Vec2 = [num() + ox, num() + oy];
				cubic(c1, c2, p);
				nextC2 = c2;
				break;
			}
			case 'Q': {
				const q: Vec2 = [num() + ox, num() + oy];
				const p: Vec2 = [num() + ox, num() + oy];
				cubic(...quadToCubic([x, y], q, p));
				nextQ = q;
				break;
			}
			case 'T': {
				const q: Vec2 = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
				const p: Vec2 = [num() + ox, num() + oy];
				cubic(...quadToCubic([x, y], q, p));
				nextQ = q;
				break;
			}
			case 'A': {
				const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag();
				const p: Vec2 = [num() + ox, num() + oy];
				for (const seg of arcToCubics([x, y], rx, ry, rot, large, sweep, p)) cubic(seg[0], seg[1], seg[2]);
				if (x !== p[0] || y !== p[1]) {
					x = p[0];
					y = p[1];
				}
				break;
			}
			default:
				i++;
		}
		lastC2 = nextC2;
		lastQ = nextQ;
	}
	return subs;
}

/** Separa flags de arco coladas ("a2 2 0 012 2" → "a2 2 0 0 1 2 2"): flags são 4º e 5º de cada grupo de 7. */
function fixArcFlags(d: string): string {
	if (!/[aA]/.test(d)) return d;
	const numRe = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y;
	return d.replace(/([aA])([^MmLlHhVvCcSsQqTtAaZz]*)/g, (_m, c: string, body: string) => {
		const res: string[] = [];
		let pos = 0, idx = 0;
		while (pos < body.length) {
			const ch = body[pos];
			if (/[\s,]/.test(ch)) {
				pos++;
				continue;
			}
			const slot = idx % 7;
			if ((slot === 3 || slot === 4) && (ch === '0' || ch === '1')) {
				res.push(ch);
				pos++;
				idx++;
				continue;
			}
			numRe.lastIndex = pos;
			const m = numRe.exec(body);
			if (!m) {
				pos++;
				continue;
			}
			res.push(m[0]);
			pos += m[0].length;
			idx++;
		}
		return `${c}${res.join(' ')} `;
	});
}

function quadToCubic(p0: Vec2, q: Vec2, p: Vec2): [Vec2, Vec2, Vec2] {
	return [
		[p0[0] + (2 / 3) * (q[0] - p0[0]), p0[1] + (2 / 3) * (q[1] - p0[1])],
		[p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])],
		p
	];
}

/** Arco elíptico SVG (endpoint) → cúbicas de até 90° cada. */
function arcToCubics(p0: Vec2, rx: number, ry: number, rotDeg: number, large: number, sweep: number, p1: Vec2): [Vec2, Vec2, Vec2][] {
	if ((p0[0] === p1[0] && p0[1] === p1[1])) return [];
	rx = Math.abs(rx);
	ry = Math.abs(ry);
	if (!rx || !ry) return [[[p0[0], p0[1]], [p1[0], p1[1]], p1]];
	const phi = (rotDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
	const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
	const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
	const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
	if (lam > 1) {
		rx *= Math.sqrt(lam);
		ry *= Math.sqrt(lam);
	}
	const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
	const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
	let co = Math.sqrt(Math.max(0, num / den));
	if (large === sweep) co = -co;
	const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
	const cx = cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2;
	const cy = sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2;
	const ang = (ux: number, uy: number, vx: number, vy: number) => {
		const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
		return a;
	};
	const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
	let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
	if (!sweep && dt > 0) dt -= 2 * Math.PI;
	else if (sweep && dt < 0) dt += 2 * Math.PI;
	const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
	const step = dt / n;
	const k = (4 / 3) * Math.tan(step / 4);
	const pt = (t: number): Vec2 => {
		const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
		return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
	};
	const der = (t: number): Vec2 => {
		const ex = -rx * Math.sin(t), ey = ry * Math.cos(t);
		return [cos * ex - sin * ey, sin * ex + cos * ey];
	};
	const out: [Vec2, Vec2, Vec2][] = [];
	let a = t1;
	for (let s = 0; s < n; s++) {
		const b = a + step;
		const P0 = pt(a), P3 = s === n - 1 ? ([p1[0], p1[1]] as Vec2) : pt(b);
		const d0 = der(a), d1 = der(b);
		out.push([[P0[0] + k * d0[0], P0[1] + k * d0[1]], [P3[0] - k * d1[0], P3[1] - k * d1[1]], P3]);
		a = b;
	}
	return out;
}

const KAPPA = 0.5522847498;

function ellipseSub(cx: number, cy: number, rx: number, ry: number): Sub {
	const kx = rx * KAPPA, ky = ry * KAPPA;
	return {
		start: [cx, cy - ry],
		closed: true,
		segs: [
			{ c1: [cx + kx, cy - ry], c2: [cx + rx, cy - ky], p: [cx + rx, cy] },
			{ c1: [cx + rx, cy + ky], c2: [cx + kx, cy + ry], p: [cx, cy + ry] },
			{ c1: [cx - kx, cy + ry], c2: [cx - rx, cy + ky], p: [cx - rx, cy] },
			{ c1: [cx - rx, cy - ky], c2: [cx - kx, cy - ry], p: [cx, cy - ry] }
		]
	};
}

function rectSub(x: number, y: number, w: number, h: number, rx: number, ry: number): Sub {
	rx = Math.min(rx, w / 2);
	ry = Math.min(ry, h / 2);
	const L = (p: Vec2) => ({ c1: p, c2: p, p }); // linha (controles ajustados em toBezier)
	if (rx <= 0 || ry <= 0) {
		return { start: [x, y], closed: true, segs: [L([x + w, y]), L([x + w, y + h]), L([x, y + h])] };
	}
	const kx = rx * KAPPA, ky = ry * KAPPA;
	return {
		start: [x + rx, y],
		closed: true,
		segs: [
			L([x + w - rx, y]),
			{ c1: [x + w - rx + kx, y], c2: [x + w, y + ry - ky], p: [x + w, y + ry] },
			L([x + w, y + h - ry]),
			{ c1: [x + w, y + h - ry + ky], c2: [x + w - rx + kx, y + h], p: [x + w - rx, y + h] },
			L([x + rx, y + h]),
			{ c1: [x + rx - kx, y + h], c2: [x, y + h - ry + ky], p: [x, y + h - ry] },
			L([x, y + ry]),
			{ c1: [x, y + ry - ky], c2: [x + rx - kx, y], p: [x + rx, y] }
		]
	};
}

function pointsSub(pts: string, closed: boolean): Sub | null {
	const n = (pts.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
	if (n.length < 4) return null;
	const sub: Sub = { start: [n[0], n[1]], segs: [], closed };
	for (let k = 2; k + 1 < n.length; k += 2) {
		const p: Vec2 = [n[k], n[k + 1]];
		sub.segs.push({ c1: p, c2: p, p });
	}
	return sub;
}

/**
 * Converte subcaminho absoluto (já transformado) em BezierPath do Lottie (tangentes relativas).
 * Segmentos de linha (c1 == p) viram tangentes zero. Fechado: o vértice final duplicado é removido.
 */
function toBezier(sub: Sub): BezierPath | null {
	const eps = 1e-6;
	const v: Vec2[] = [sub.start];
	const o: Vec2[] = [];
	const i: Vec2[] = [[0, 0]];
	let prev = sub.start;
	for (const s of sub.segs) {
		const isLine = (near(s.c1, s.p) && near(s.c2, s.p)) || (near(s.c1, prev) && near(s.c2, s.p));
		o.push(isLine ? [0, 0] : [s.c1[0] - prev[0], s.c1[1] - prev[1]]);
		v.push(s.p);
		i.push(isLine ? [0, 0] : [s.c2[0] - s.p[0], s.c2[1] - s.p[1]]);
		prev = s.p;
	}
	o.push([0, 0]);
	if (sub.closed && v.length > 1 && near(v[v.length - 1], v[0], eps * 100)) {
		// fecha em cima do 1º vértice: a tangente de entrada vai pro vértice 0
		i[0] = i[i.length - 1];
		v.pop();
		i.pop();
		o.splice(o.length - 1, 1);
	}
	if (v.length < 2 && !sub.closed) return null;
	if (v.length < 1) return null;
	return { v, i, o, c: sub.closed };
}
const near = (a: Vec2, b: Vec2, eps = 1e-6) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;

const SKIP_TAGS = new Set(['defs', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'symbol', 'marker', 'filter', 'style', 'title', 'desc', 'metadata']);

/**
 * Importa um SVG (texto) como caminhos bezier centrados em (0,0), no tamanho do viewBox.
 * Suporta path/rect/circle/ellipse/line/polyline/polygon, <g> com transform (afim completo).
 * `opts.size`: escala para que o maior lado tenha esse tamanho (traço escala junto).
 */
export function svgToPaths(svgText: string, opts: { size?: number } = {}): SvgImport {
	const src = String(svgText ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
	const tagRe = /<(\/?)([a-zA-Z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
	const stack: { m: M; attrs: Record<string, string>; skip: boolean; tag: string }[] = [];
	const paths: BezierPath[] = [];
	let root: Record<string, string> | null = null;
	let fill: string | undefined, stroke: string | undefined, strokeWidth: number | undefined;
	const inherited = (name: string, own: Record<string, string>): string | undefined => {
		if (own[name] != null) return own[name];
		for (let k = stack.length - 1; k >= 0; k--) if (stack[k].attrs[name] != null) return stack[k].attrs[name];
		return undefined;
	};
	let r: RegExpExecArray | null;
	while ((r = tagRe.exec(src))) {
		const closing = r[1] === '/';
		const tag = r[2].toLowerCase().replace(/^svg:/, '');
		const selfClose = r[4] === '/';
		if (closing) {
			// desempilha até a tag correspondente
			for (let k = stack.length - 1; k >= 0; k--) {
				if (stack[k].tag === tag) {
					stack.length = k;
					break;
				}
			}
			continue;
		}
		const attrs = parseAttrs(r[3]);
		const parent = stack[stack.length - 1];
		const skip = (parent?.skip ?? false) || SKIP_TAGS.has(tag);
		const m = mul(parent?.m ?? IDENT, tag === 'svg' ? IDENT : parseTransform(attrs.transform));
		if (tag === 'svg' && !root) root = attrs;
		if (!selfClose && (tag === 'svg' || tag === 'g' || SKIP_TAGS.has(tag) || tag === 'a')) {
			stack.push({ m, attrs, skip, tag });
			continue;
		}
		if (skip) continue;
		const n = (k: string, d = 0) => {
			const v = parseFloat(attrs[k] ?? '');
			return Number.isFinite(v) ? v : d;
		};
		let subs: Sub[] = [];
		try {
			switch (tag) {
				case 'path':
					subs = parsePathData(attrs.d ?? '');
					break;
				case 'rect': {
					const w = n('width'), h = n('height');
					if (w > 0 && h > 0) {
						let rx = attrs.rx != null ? n('rx') : n('ry');
						let ry = attrs.ry != null ? n('ry') : rx;
						rx = Math.max(0, rx);
						ry = Math.max(0, ry);
						subs = [rectSub(n('x'), n('y'), w, h, rx, ry)];
					}
					break;
				}
				case 'circle':
					if (n('r') > 0) subs = [ellipseSub(n('cx'), n('cy'), n('r'), n('r'))];
					break;
				case 'ellipse':
					if (n('rx') > 0 && n('ry') > 0) subs = [ellipseSub(n('cx'), n('cy'), n('rx'), n('ry'))];
					break;
				case 'line': {
					const a: Vec2 = [n('x1'), n('y1')], b: Vec2 = [n('x2'), n('y2')];
					subs = [{ start: a, segs: [{ c1: a, c2: b, p: b }], closed: false }];
					break;
				}
				case 'polyline':
				case 'polygon': {
					const s = pointsSub(attrs.points ?? '', tag === 'polygon');
					if (s) subs = [s];
					break;
				}
				default:
					continue;
			}
		} catch {
			subs = [];
		}
		if (!subs.length) continue;
		// estilo: o 1º elemento desenhável define fill/stroke do import (herdando dos <g>/<svg>)
		if (!paths.length) {
			fill = normColor(inherited('fill', attrs));
			stroke = normColor(inherited('stroke', attrs));
			const sw = parseFloat(inherited('stroke-width', attrs) ?? '');
			strokeWidth = Number.isFinite(sw) ? sw * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) : undefined;
		}
		for (const s of subs) {
			const t: Sub = {
				start: apply(m, ...s.start),
				closed: s.closed,
				segs: s.segs.map((g) => ({ c1: apply(m, ...g.c1), c2: apply(m, ...g.c2), p: apply(m, ...g.p) }))
			};
			const bp = toBezier(t);
			if (bp && bp.v.length >= 2) paths.push(bp);
		}
	}

	// referência: viewBox > width/height > bbox
	const rootAttrs: Record<string, string> = root ?? {};
	const vb = (rootAttrs.viewBox ?? '').split(/[\s,]+/).map(Number).filter(Number.isFinite);
	let ox: number, oy: number, w: number, h: number;
	if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) [ox, oy, w, h] = vb;
	else {
		const bw = parseFloat(rootAttrs.width ?? ''), bh = parseFloat(rootAttrs.height ?? '');
		if (bw > 0 && bh > 0) [ox, oy, w, h] = [0, 0, bw, bh];
		else {
			const b = pathsBBox(paths) ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 };
			[ox, oy, w, h] = [b.minX, b.minY, Math.max(1e-6, b.maxX - b.minX), Math.max(1e-6, b.maxY - b.minY)];
		}
	}
	const k = opts.size && opts.size > 0 ? opts.size / Math.max(w, h) : 1;
	const cx = ox + w / 2, cy = oy + h / 2;
	const round = (x: number) => Math.round(x * 1000) / 1000;
	const out = paths.map((p) => ({
		c: p.c,
		v: p.v.map(([x, y]) => [round((x - cx) * k), round((y - cy) * k)] as Vec2),
		i: p.i.map(([x, y]) => [round(x * k), round(y * k)] as Vec2),
		o: p.o.map(([x, y]) => [round(x * k), round(y * k)] as Vec2)
	}));
	return {
		paths: out,
		width: w * k,
		height: h * k,
		fill,
		stroke,
		strokeWidth: strokeWidth != null ? strokeWidth * k : stroke && stroke !== 'none' ? k : undefined
	};
}
