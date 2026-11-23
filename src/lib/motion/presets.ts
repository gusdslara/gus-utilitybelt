// Presets de animação (entrada, ênfase, saída, loop) e cenas modelo do app Motion.
// Os presets gravam keyframes relativos ao valor atual da camada, sem apagar keys de outras props
// nem de fora do intervalo do preset.
import { evalProp, layerBounds, layerProps, newLayer, newScene, setKey, svgToPaths, textMetrics } from './scene.ts';
import type { Easing, MotionLayer, PresetGroup, PresetId, Prop, Scene, ShapeLayer, TextLayer, Vec2 } from './types.ts';

type Kind = MotionLayer['kind'];
export type PresetDef = { id: PresetId; group: PresetGroup; layerKinds: Kind[]; defaultDuration: number; label: string };

const ALL: Kind[] = ['shape', 'text', 'image'];

/** Catálogo. `defaultDuration` em frames a 30fps (use `presetDuration` para outro fps). */
export const PRESETS: PresetDef[] = [
	{ id: 'fadeIn', group: 'entrance', layerKinds: ALL, defaultDuration: 15, label: 'Surgir' },
	{ id: 'slideInLeft', group: 'entrance', layerKinds: ALL, defaultDuration: 18, label: 'Entrar pela esquerda' },
	{ id: 'slideInRight', group: 'entrance', layerKinds: ALL, defaultDuration: 18, label: 'Entrar pela direita' },
	{ id: 'slideInUp', group: 'entrance', layerKinds: ALL, defaultDuration: 18, label: 'Subir' },
	{ id: 'slideInDown', group: 'entrance', layerKinds: ALL, defaultDuration: 18, label: 'Descer' },
	{ id: 'popIn', group: 'entrance', layerKinds: ALL, defaultDuration: 15, label: 'Pop' },
	{ id: 'zoomIn', group: 'entrance', layerKinds: ALL, defaultDuration: 18, label: 'Zoom' },
	{ id: 'spinIn', group: 'entrance', layerKinds: ALL, defaultDuration: 20, label: 'Girar' },
	{ id: 'dropBounce', group: 'entrance', layerKinds: ALL, defaultDuration: 24, label: 'Cair quicando' },
	{ id: 'drawStroke', group: 'entrance', layerKinds: ['shape'], defaultDuration: 30, label: 'Desenhar traço' },
	{ id: 'typewriter', group: 'entrance', layerKinds: ['text'], defaultDuration: 36, label: 'Máquina de escrever' },
	{ id: 'blurReveal', group: 'entrance', layerKinds: ALL, defaultDuration: 20, label: 'Revelar' },
	{ id: 'pulse', group: 'emphasis', layerKinds: ALL, defaultDuration: 15, label: 'Pulsar' },
	{ id: 'shake', group: 'emphasis', layerKinds: ALL, defaultDuration: 18, label: 'Tremer' },
	{ id: 'wiggle', group: 'emphasis', layerKinds: ALL, defaultDuration: 20, label: 'Balançar' },
	{ id: 'bounce', group: 'emphasis', layerKinds: ALL, defaultDuration: 24, label: 'Quicar' },
	{ id: 'heartbeat', group: 'emphasis', layerKinds: ALL, defaultDuration: 30, label: 'Batimento' },
	{ id: 'spin', group: 'emphasis', layerKinds: ALL, defaultDuration: 24, label: 'Volta' },
	{ id: 'flash', group: 'emphasis', layerKinds: ALL, defaultDuration: 20, label: 'Piscar' },
	{ id: 'tada', group: 'emphasis', layerKinds: ALL, defaultDuration: 30, label: 'Tadá' },
	{ id: 'fadeOut', group: 'exit', layerKinds: ALL, defaultDuration: 15, label: 'Sumir' },
	{ id: 'slideOutLeft', group: 'exit', layerKinds: ALL, defaultDuration: 18, label: 'Sair pela esquerda' },
	{ id: 'slideOutRight', group: 'exit', layerKinds: ALL, defaultDuration: 18, label: 'Sair pela direita' },
	{ id: 'slideOutUp', group: 'exit', layerKinds: ALL, defaultDuration: 18, label: 'Sair por cima' },
	{ id: 'slideOutDown', group: 'exit', layerKinds: ALL, defaultDuration: 18, label: 'Sair por baixo' },
	{ id: 'popOut', group: 'exit', layerKinds: ALL, defaultDuration: 15, label: 'Pop (saída)' },
	{ id: 'zoomOut', group: 'exit', layerKinds: ALL, defaultDuration: 18, label: 'Zoom (saída)' },
	{ id: 'rotateLoop', group: 'loop', layerKinds: ALL, defaultDuration: 60, label: 'Girar sem parar' },
	{ id: 'floatLoop', group: 'loop', layerKinds: ALL, defaultDuration: 60, label: 'Flutuar' },
	{ id: 'pulseLoop', group: 'loop', layerKinds: ALL, defaultDuration: 30, label: 'Pulsar sem parar' },
	{ id: 'swingLoop', group: 'loop', layerKinds: ALL, defaultDuration: 48, label: 'Pêndulo' }
];

export const PRESET_GROUP_LABELS: Record<PresetGroup, string> = { entrance: 'Entrada', emphasis: 'Ênfase', exit: 'Saída', loop: 'Loop' };

export const presetDef = (id: PresetId): PresetDef | undefined => PRESETS.find((p) => p.id === id);
/** Duração padrão do preset no fps da cena. */
export const presetDuration = (id: PresetId, fps: number): number => Math.max(2, Math.round(((presetDef(id)?.defaultDuration ?? 18) * fps) / 30));

// ─────────────────────────── helpers ───────────────────────────

type Step<T> = [frame: number, value: T, ease?: Easing];

/** Grava keys numa prop: remove só as keys estritamente dentro do intervalo coberto e insere as novas. */
function writeKeys<T>(p: Prop<T>, steps: Step<T>[]): void {
	if (!steps.length) return;
	const a = Math.min(...steps.map((s) => s[0])), b = Math.max(...steps.map((s) => s[0]));
	p.keys = p.keys.filter((k) => k.t <= a || k.t >= b);
	for (const [t, v, e] of steps) setKey(p, round(t), v, e ?? 'easeInOut');
}
const round = (t: number) => Math.round(t * 100) / 100;

const mulVec = (v: Vec2, f: number): Vec2 => [v[0] * f, v[1] * f];
const addVec = (v: Vec2, dx: number, dy: number): Vec2 => [v[0] + dx, v[1] + dy];

/** Distância de deslize: proporcional à composição e ao tamanho da camada. */
function slideDist(layer: MotionLayer, scene: Scene, frame: number, axis: 'x' | 'y'): number {
	const b = layerBounds(layer, frame);
	const sceneSide = axis === 'x' ? scene.width : scene.height;
	const own = axis === 'x' ? b.w : b.h;
	return Math.round(Math.min(sceneSide * 0.35, Math.max(sceneSide * 0.12, own * 0.8)));
}

/** Ênfase multiplicativa na escala: lista de [fração do tempo, fator]. */
function scaleWave(layer: MotionLayer, at: number, dur: number, wave: [number, number][], e: Easing = 'easeInOut') {
	const rest = evalProp(layer.transform.scale, at);
	writeKeys(layer.transform.scale, wave.map(([f, k]) => [at + f * dur, mulVec(rest, k), e] as Step<Vec2>));
}
function rotWave(layer: MotionLayer, at: number, dur: number, wave: [number, number][], e: Easing = 'easeInOut') {
	const rest = evalProp(layer.transform.rotation, at);
	writeKeys(layer.transform.rotation, wave.map(([f, d]) => [at + f * dur, rest + d, e] as Step<number>));
}
function posWave(layer: MotionLayer, at: number, dur: number, wave: [number, number, number][], e: Easing = 'easeInOut') {
	const rest = evalProp(layer.transform.position, at);
	writeKeys(layer.transform.position, wave.map(([f, dx, dy]) => [at + f * dur, addVec(rest, dx, dy), e] as Step<Vec2>));
}
function opacityWave(layer: MotionLayer, at: number, dur: number, wave: [number, number][], e: Easing = 'easeInOut') {
	const rest = evalProp(layer.transform.opacity, at);
	writeKeys(layer.transform.opacity, wave.map(([f, k]) => [at + f * dur, rest * k, e] as Step<number>));
}

/** Entrada: prop vai de `from(rest)` até o valor de repouso (o valor em at+dur). */
function enter<T>(p: Prop<T>, at: number, dur: number, from: (rest: T) => T, e: Easing, startFrac = 0, endFrac = 1) {
	const rest = evalProp(p, at + dur);
	writeKeys(p, [[at + startFrac * dur, from(rest), e], [at + endFrac * dur, rest, e]]);
}
/** Saída: prop sai do valor em `at` até `to(rest)`. */
function exit<T>(p: Prop<T>, at: number, dur: number, to: (rest: T) => T, e: Easing, startFrac = 0, endFrac = 1) {
	const rest = evalProp(p, at);
	writeKeys(p, [[at + startFrac * dur, rest, e], [at + endFrac * dur, to(rest), e]]);
}

// ─────────────────────────── aplicar ───────────────────────────

/**
 * Aplica o preset na camada a partir do frame `at`, durando `duration` frames.
 * Entradas terminam no valor de repouso; saídas começam dele; loops repetem ciclos de `duration` até `layer.end`.
 */
export function applyPreset(layer: MotionLayer, id: PresetId, at: number, duration: number, scene: Scene): void {
	const def = presetDef(id);
	if (!def) throw new Error(`Preset desconhecido: ${id}`);
	if (!def.layerKinds.includes(layer.kind)) throw new Error(`O preset ${id} não se aplica a camadas do tipo ${layer.kind}.`);
	const d = Math.max(1, duration);
	const t = layer.transform;
	const zero = () => 0;
	switch (id) {
		// ── entrada
		case 'fadeIn':
			enter(t.opacity, at, d, zero, 'easeOut');
			break;
		case 'slideInLeft':
		case 'slideInRight':
		case 'slideInUp':
		case 'slideInDown': {
			const horiz = id === 'slideInLeft' || id === 'slideInRight';
			const dist = slideDist(layer, scene, at + d, horiz ? 'x' : 'y');
			const sign = id === 'slideInLeft' || id === 'slideInDown' ? -1 : 1; // Down = vem de cima
			enter(t.position, at, d, (v) => (horiz ? addVec(v, sign * dist, 0) : addVec(v, 0, sign * dist)), 'easeOut');
			enter(t.opacity, at, d, zero, 'easeOut', 0, 0.6);
			break;
		}
		case 'popIn':
			enter(t.scale, at, d, (v) => mulVec(v, 0), 'backOut');
			enter(t.opacity, at, d, zero, 'easeOut', 0, 0.35);
			break;
		case 'zoomIn':
			enter(t.scale, at, d, (v) => mulVec(v, 0.3), 'easeOut');
			enter(t.opacity, at, d, zero, 'easeOut', 0, 0.6);
			break;
		case 'spinIn':
			enter(t.rotation, at, d, (v) => v - 180, 'easeOut');
			enter(t.scale, at, d, (v) => mulVec(v, 0), 'backOut');
			enter(t.opacity, at, d, zero, 'easeOut', 0, 0.4);
			break;
		case 'dropBounce': {
			const dist = Math.round(Math.max(scene.height * 0.3, layerBounds(layer, at + d).h));
			enter(t.position, at, d, (v) => addVec(v, 0, -dist), 'bounce');
			enter(t.opacity, at, d, zero, 'easeOut', 0, 0.2);
			break;
		}
		case 'drawStroke': {
			const l = layer as ShapeLayer;
			if (!l.stroke.on) {
				l.stroke.on = true;
				const fill = evalProp(l.fill.color, at + d);
				if (l.stroke.color.keys.length === 0) l.stroke.color.value = fill;
				const [w, h] = l.shape === 'path' ? [layerBounds(l, at).w, layerBounds(l, at).h] : evalProp(l.size, at + d);
				if (l.stroke.width.keys.length === 0) l.stroke.width.value = Math.max(3, Math.round(Math.min(Math.abs(w), Math.abs(h)) / 30));
			}
			l.trim.on = true;
			if (l.trim.start.keys.length === 0) l.trim.start.value = 0;
			writeKeys(l.trim.end, [[at, 0, 'easeInOut'], [at + d, 100, 'easeInOut']]);
			if (l.fill.on) {
				const rest = evalProp(l.fill.opacity, at + d);
				writeKeys(l.fill.opacity, [[at, 0, 'linear'], [at + 0.65 * d, 0, 'easeOut'], [at + d, rest, 'easeOut']]);
			}
			break;
		}
		case 'typewriter': {
			const l = layer as TextLayer;
			l.animator = 'typewriter';
			l.animStart = round(at);
			l.animEnd = round(at + d);
			break;
		}
		case 'blurReveal':
			if (layer.kind === 'text') {
				layer.animator = 'fadeChars';
				layer.animStart = round(at);
				layer.animEnd = round(at + d);
				enter(t.scale, at, d, (v) => mulVec(v, 1.08), 'easeOut');
			} else {
				enter(t.scale, at, d, (v) => mulVec(v, 1.25), 'easeOut');
				enter(t.opacity, at, d, zero, 'easeOut', 0, 0.8);
			}
			break;

		// ── ênfase (começa e termina no valor de repouso)
		case 'pulse':
			scaleWave(layer, at, d, [[0, 1], [0.5, 1.12], [1, 1]]);
			break;
		case 'shake': {
			const a = Math.max(6, Math.round(layerBounds(layer, at).w * 0.05));
			posWave(layer, at, d, [[0, 0, 0], [0.125, -a, 0], [0.25, a, 0], [0.375, -a * 0.8, 0], [0.5, a * 0.8, 0], [0.625, -a * 0.5, 0], [0.75, a * 0.5, 0], [0.875, -a * 0.2, 0], [1, 0, 0]]);
			break;
		}
		case 'wiggle':
			rotWave(layer, at, d, [[0, 0], [0.15, -10], [0.3, 9], [0.45, -7], [0.6, 5], [0.75, -3], [0.9, 1], [1, 0]]);
			break;
		case 'bounce': {
			const h = Math.round(Math.max(20, Math.min(160, layerBounds(layer, at).h * 0.35)));
			const rest = evalProp(t.position, at);
			writeKeys(t.position, [
				[at, rest, 'easeOut'],
				[at + 0.3 * d, addVec(rest, 0, -h), 'easeIn'],
				[at + 0.55 * d, rest, 'easeOut'],
				[at + 0.75 * d, addVec(rest, 0, -h * 0.35), 'easeIn'],
				[at + d, rest, 'easeInOut']
			]);
			const s = evalProp(t.scale, at);
			writeKeys(t.scale, [
				[at, s, 'easeOut'],
				[at + 0.12 * d, [s[0] * 1.08, s[1] * 0.92], 'easeOut'],
				[at + 0.3 * d, [s[0] * 0.96, s[1] * 1.06], 'easeIn'],
				[at + 0.55 * d, [s[0] * 1.06, s[1] * 0.94], 'easeOut'],
				[at + 0.75 * d, s, 'easeInOut'],
				[at + d, s, 'easeInOut']
			]);
			break;
		}
		case 'heartbeat':
			scaleWave(layer, at, d, [[0, 1], [0.14, 1.18], [0.28, 1], [0.42, 1.18], [0.7, 1], [1, 1]]);
			break;
		case 'spin':
			rotWave(layer, at, d, [[0, 0], [1, 360]]);
			break;
		case 'flash':
			opacityWave(layer, at, d, [[0, 1], [0.25, 0], [0.5, 1], [0.75, 0], [1, 1]]);
			break;
		case 'tada':
			scaleWave(layer, at, d, [[0, 1], [0.1, 0.9], [0.2, 0.9], [0.3, 1.1], [0.9, 1.1], [1, 1]]);
			rotWave(layer, at, d, [[0, 0], [0.1, -3], [0.2, -3], [0.3, 3], [0.4, -3], [0.5, 3], [0.6, -3], [0.7, 3], [0.8, -3], [0.9, 3], [1, 0]]);
			break;

		// ── saída (começa no valor em `at`)
		case 'fadeOut':
			exit(t.opacity, at, d, zero, 'easeIn');
			break;
		case 'slideOutLeft':
		case 'slideOutRight':
		case 'slideOutUp':
		case 'slideOutDown': {
			const horiz = id === 'slideOutLeft' || id === 'slideOutRight';
			const dist = slideDist(layer, scene, at, horiz ? 'x' : 'y');
			const sign = id === 'slideOutLeft' || id === 'slideOutUp' ? -1 : 1;
			exit(t.position, at, d, (v) => (horiz ? addVec(v, sign * dist, 0) : addVec(v, 0, sign * dist)), 'easeIn');
			exit(t.opacity, at, d, zero, 'easeIn', 0.4, 1);
			break;
		}
		case 'popOut':
			exit(t.scale, at, d, (v) => mulVec(v, 0), 'backIn');
			exit(t.opacity, at, d, zero, 'easeIn', 0.65, 1);
			break;
		case 'zoomOut':
			exit(t.scale, at, d, (v) => mulVec(v, 0.3), 'easeIn');
			exit(t.opacity, at, d, zero, 'easeIn', 0.4, 1);
			break;

		// ── loops (ciclos de `d` frames até o fim da camada)
		case 'rotateLoop':
		case 'floatLoop':
		case 'pulseLoop':
		case 'swingLoop': {
			const n = Math.max(1, Math.floor((layer.end - at) / d + 1e-9));
			if (id === 'rotateLoop') {
				const r0 = evalProp(t.rotation, at);
				writeKeys(t.rotation, Array.from({ length: n + 1 }, (_, k) => [at + k * d, r0 + 360 * k, 'linear'] as Step<number>));
			} else if (id === 'floatLoop') {
				const p0 = evalProp(t.position, at);
				const amp = Math.round(Math.max(8, Math.min(40, layerBounds(layer, at).h * 0.08)));
				const steps: Step<Vec2>[] = [];
				for (let k = 0; k < n; k++) steps.push([at + k * d, p0, 'easeInOut'], [at + (k + 0.5) * d, addVec(p0, 0, -amp), 'easeInOut']);
				steps.push([at + n * d, p0, 'easeInOut']);
				writeKeys(t.position, steps);
			} else if (id === 'pulseLoop') {
				const s0 = evalProp(t.scale, at);
				const steps: Step<Vec2>[] = [];
				for (let k = 0; k < n; k++) steps.push([at + k * d, s0, 'easeInOut'], [at + (k + 0.5) * d, mulVec(s0, 1.08), 'easeInOut']);
				steps.push([at + n * d, s0, 'easeInOut']);
				writeKeys(t.scale, steps);
			} else {
				const r0 = evalProp(t.rotation, at);
				const steps: Step<number>[] = [];
				for (let k = 0; k < n; k++)
					steps.push([at + k * d, r0, 'easeInOut'], [at + (k + 0.25) * d, r0 + 12, 'easeInOut'], [at + (k + 0.5) * d, r0, 'easeInOut'], [at + (k + 0.75) * d, r0 - 12, 'easeInOut']);
				steps.push([at + n * d, r0, 'easeInOut']);
				writeKeys(t.rotation, steps);
			}
			break;
		}
	}
}

/** Remove toda a animação da camada; cada prop fica com o valor de repouso (último key). */
export function clearAnimation(layer: MotionLayer): void {
	for (const { prop } of layerProps(layer)) {
		if (prop.keys.length) {
			prop.value = prop.keys[prop.keys.length - 1].v;
			prop.keys = [];
		}
	}
	if (layer.kind === 'text') layer.animator = 'none';
}

// ─────────────────────────── modelos ───────────────────────────

const C = { accent: '#dd206b', violet: '#7c5cff', green: '#3ddc97', dark: '#12141b', ink: '#ffffff', muted: '#9aa0b4', panel: '#1e2130' };
const FONT = 'Inter, system-ui, sans-serif';

const HEART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
const BELL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>';

/** Atalho para shape com opções comuns. */
function shape(scene: Scene, kind: ShapeLayer['shape'], o: { name: string; at: Vec2; size?: Vec2; color?: string | null; radius?: number }): ShapeLayer {
	const l = newLayer('shape', scene, { shapeKind: kind, name: o.name, at: o.at });
	if (o.size) l.size.value = o.size;
	if (o.radius != null) l.radius.value = o.radius;
	if (o.color === null) l.fill.on = false;
	else if (o.color) l.fill.color.value = o.color;
	return l;
}
function text(scene: Scene, o: Partial<TextLayer> & { at: Vec2; text: string }): TextLayer {
	const { at, ...rest } = o;
	const size = rest.size ?? 96;
	return newLayer('text', scene, { font: FONT, lineHeight: Math.round(size * 1.2), ...rest, size, at, name: rest.name ?? rest.text.slice(0, 24) });
}
const ring = (l: ShapeLayer, color: string, width: number) => {
	l.fill.on = false;
	l.stroke.on = true;
	l.stroke.color.value = color;
	l.stroke.width.value = width;
	l.stroke.cap = 'round';
	return l;
};

function logoReveal(): Scene {
	const s = newScene({ name: 'Revelação de logo', width: 1080, height: 1080, frames: 90, background: C.dark });
	const halo = ring(shape(s, 'ellipse', { name: 'Anel', at: [540, 430], size: [360, 360] }), C.violet, 10);
	applyPreset(halo, 'drawStroke', 6, 26, s);
	halo.trim.offset.value = 25;
	const disc = shape(s, 'ellipse', { name: 'Disco', at: [540, 430], size: [280, 280], color: C.accent });
	applyPreset(disc, 'popIn', 0, 18, s);
	const star = shape(s, 'star', { name: 'Estrela', at: [540, 430], size: [170, 170], color: C.ink });
	star.innerRatio = 0.48;
	applyPreset(star, 'spinIn', 10, 22, s);
	applyPreset(star, 'pulse', 60, 16, s);
	const title = text(s, { text: 'Sua Marca', at: [540, 720], size: 104, color: C.ink, weight: 800, tracking: -10 });
	applyPreset(title, 'slideInUp', 22, 20, s);
	const tag = text(s, { text: 'animações leves em Lottie', at: [540, 808], size: 40, color: C.muted, weight: 500 });
	applyPreset(tag, 'fadeIn', 34, 18, s);
	s.layers = [title, tag, star, disc, halo];
	return s;
}

function lowerThird(): Scene {
	const s = newScene({ name: 'Lower third', width: 1920, height: 1080, frames: 150, background: C.dark });
	const left = 140;
	const panel = shape(s, 'rect', { name: 'Faixa', at: [left + 380, 880], size: [760, 170], color: C.panel, radius: 18 });
	applyPreset(panel, 'slideInLeft', 0, 18, s);
	applyPreset(panel, 'slideOutLeft', 124, 18, s);
	const bar = shape(s, 'rect', { name: 'Barra', at: [left + 9, 880], size: [18, 170], color: C.accent, radius: 9 });
	applyPreset(bar, 'zoomIn', 6, 14, s);
	applyPreset(bar, 'fadeOut', 126, 12, s);
	const name = text(s, { text: 'Ana Souza', align: 'left', size: 68, weight: 800, color: C.ink, at: [0, 0] });
	name.transform.position.value = [left + 56 + textMetrics(name).w / 2, 848];
	applyPreset(name, 'slideInLeft', 10, 18, s);
	applyPreset(name, 'fadeOut', 118, 12, s);
	const role = text(s, { text: 'Diretora de Criação', align: 'left', size: 38, weight: 500, color: '#c3c8d8', at: [0, 0] });
	role.transform.position.value = [left + 56 + textMetrics(role).w / 2, 922];
	applyPreset(role, 'slideInLeft', 16, 18, s);
	applyPreset(role, 'fadeOut', 116, 12, s);
	const dot = shape(s, 'ellipse', { name: 'Ao vivo', at: [left + 700, 848], size: [22, 22], color: C.green });
	applyPreset(dot, 'popIn', 24, 12, s);
	applyPreset(dot, 'pulseLoop', 40, 30, s);
	dot.end = 130;
	s.layers = [name, role, dot, bar, panel];
	return s;
}

function loadingSpinner(): Scene {
	const s = newScene({ name: 'Carregando', width: 512, height: 512, frames: 60, background: C.dark });
	const outer = ring(shape(s, 'ellipse', { name: 'Arco externo', at: [256, 256], size: [300, 300] }), C.accent, 22);
	outer.trim.on = true;
	setKey(outer.trim.end, 0, 12, 'easeInOut');
	setKey(outer.trim.end, 30, 70, 'easeInOut');
	setKey(outer.trim.end, 60, 12, 'easeInOut');
	applyPreset(outer, 'rotateLoop', 0, 60, s);
	const inner = ring(shape(s, 'ellipse', { name: 'Arco interno', at: [256, 256], size: [190, 190] }), C.violet, 18);
	inner.trim.on = true;
	inner.trim.end.value = 35;
	setKey(inner.transform.rotation, 0, 0, 'linear');
	setKey(inner.transform.rotation, 60, -720, 'linear');
	const core = shape(s, 'ellipse', { name: 'Centro', at: [256, 256], size: [48, 48], color: C.green });
	applyPreset(core, 'pulseLoop', 0, 30, s);
	s.layers = [core, inner, outer];
	return s;
}

function likeHeart(): Scene {
	const s = newScene({ name: 'Curtir', width: 1080, height: 1080, frames: 60, background: C.dark });
	const c: Vec2 = [540, 540];
	const svg = svgToPaths(HEART, { size: 380 });
	const heart = shape(s, 'path', { name: 'Coração', at: [c[0], c[1] + 10], color: C.accent });
	heart.paths = svg.paths;
	setKey(heart.transform.scale, 0, [0, 0], 'backOut');
	setKey(heart.transform.scale, 16, [115, 115], 'easeInOut');
	setKey(heart.transform.scale, 24, [100, 100], 'easeInOut');
	applyPreset(heart, 'heartbeat', 30, 26, s);
	const wave = ring(shape(s, 'ellipse', { name: 'Onda', at: c, size: [200, 200] }), C.violet, 26);
	setKey(wave.size, 2, [200, 200], 'easeOut');
	setKey(wave.size, 24, [640, 640], 'easeOut');
	setKey(wave.stroke.width, 2, 26, 'easeOut');
	setKey(wave.stroke.width, 24, 0, 'easeOut');
	setKey(wave.transform.opacity, 0, 0, 'hold');
	setKey(wave.transform.opacity, 2, 100, 'linear');
	setKey(wave.transform.opacity, 24, 0, 'linear');
	const dots: ShapeLayer[] = [];
	const colors = [C.green, C.violet, C.accent, '#ffb547'];
	for (let k = 0; k < 8; k++) {
		const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
		const d = shape(s, 'ellipse', { name: `Faísca ${k + 1}`, at: c, size: [34, 34], color: colors[k % colors.length] });
		const far: Vec2 = [c[0] + Math.cos(a) * 330, c[1] + Math.sin(a) * 330];
		const near: Vec2 = [c[0] + Math.cos(a) * 170, c[1] + Math.sin(a) * 170];
		setKey(d.transform.position, 6, near, 'easeOut');
		setKey(d.transform.position, 28, far, 'easeOut');
		setKey(d.transform.scale, 6, [0, 0], 'easeOut');
		setKey(d.transform.scale, 12, [120, 120], 'easeIn');
		setKey(d.transform.scale, 30, [0, 0], 'easeIn');
		dots.push(d);
	}
	s.layers = [heart, ...dots, wave];
	return s;
}

function notificationBadge(): Scene {
	const s = newScene({ name: 'Notificação', width: 1080, height: 1080, frames: 75, background: C.dark });
	const app = shape(s, 'rect', { name: 'Ícone do app', at: [540, 540], size: [380, 380], color: C.violet, radius: 96 });
	applyPreset(app, 'popIn', 0, 16, s);
	applyPreset(app, 'wiggle', 34, 20, s);
	const icon = svgToPaths(BELL, { size: 220 });
	const bell = shape(s, 'path', { name: 'Sino', at: [540, 540], color: null });
	bell.paths = icon.paths;
	ring(bell, C.ink, icon.strokeWidth ?? 18);
	bell.stroke.join = 'round';
	applyPreset(bell, 'drawStroke', 8, 18, s);
	applyPreset(bell, 'wiggle', 34, 20, s);
	const bc: Vec2 = [540 + 170, 540 - 170];
	const badge = shape(s, 'ellipse', { name: 'Selo', at: bc, size: [150, 150], color: C.accent });
	badge.stroke.on = true;
	badge.stroke.color.value = C.dark;
	badge.stroke.width.value = 12;
	applyPreset(badge, 'popIn', 18, 14, s);
	applyPreset(badge, 'pulse', 52, 14, s);
	const count = text(s, { text: '3', at: bc, size: 84, weight: 800, color: C.ink });
	applyPreset(count, 'popIn', 22, 14, s);
	applyPreset(count, 'pulse', 52, 14, s);
	s.layers = [count, badge, bell, app];
	return s;
}

function textTypewriter(): Scene {
	const s = newScene({ name: 'Máquina de escrever', width: 1920, height: 1080, frames: 120, background: C.dark });
	const msg = 'Olá, mundo.';
	const size = 120;
	const head = text(s, { text: msg, at: [960, 500], size, weight: 700, color: C.ink, font: 'ui-monospace, Menlo, Consolas, monospace' });
	applyPreset(head, 'typewriter', 6, 54, s);
	// cursor acompanha a escrita (fonte mono ≈ 0,6em por caractere)
	const w = msg.length * size * 0.6;
	const caret = shape(s, 'rect', { name: 'Cursor', at: [960 - w / 2, 500], size: [10, 128], color: C.accent, radius: 3 });
	setKey(caret.transform.position, 6, [960 - w / 2 - 14, 500], 'linear');
	setKey(caret.transform.position, 60, [960 + w / 2 + 14, 500], 'linear');
	for (let f = 64, on = false; f <= 116; f += 8, on = !on) setKey(caret.transform.opacity, f, on ? 100 : 0, 'hold');
	setKey(caret.transform.opacity, 0, 100, 'hold');
	const sub = text(s, { text: 'Crie animações Lottie direto no navegador', at: [960, 640], size: 44, weight: 500, color: C.muted });
	applyPreset(sub, 'slideInUp', 64, 20, s);
	s.layers = [caret, head, sub];
	return s;
}

export const TEMPLATES: { id: string; name: string; make: () => Scene }[] = [
	{ id: 'logo-reveal', name: 'Revelação de logo', make: logoReveal },
	{ id: 'lower-third', name: 'Lower third', make: lowerThird },
	{ id: 'loading-spinner', name: 'Carregando', make: loadingSpinner },
	{ id: 'like-heart', name: 'Curtir', make: likeHeart },
	{ id: 'notification-badge', name: 'Notificação', make: notificationBadge },
	{ id: 'text-typewriter', name: 'Máquina de escrever', make: textTypewriter }
];
