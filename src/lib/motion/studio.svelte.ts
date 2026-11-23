// Estado do app Motion (modo Criar): cena, seleção, playhead, reprodução, histórico e salvamento automático.
import type { MotionLayer, Prop, Scene, Easing, PresetId } from './types.ts';
import { newScene, newLayer, setKey, removeKey, moveKey, hasKey, serializeScene, parseScene, cloneScene } from './scene.ts';
import { applyPreset, clearAnimation } from './presets.ts';

const LS_KEY = 'ub_motion_scene';
const MAX_HISTORY = 80;

export type KeyRef = { layerId: string; path: string; t: number };

/** Lê/escreve uma propriedade aninhada pelo caminho ('transform.position', 'fill.color'…). */
export function getAt(obj: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}

class Studio {
	scene = $state<Scene>(newScene());
	selectedId = $state<string | null>(null);
	selectedKey = $state<KeyRef | null>(null);
	frame = $state(0);
	playing = $state(false);
	loop = $state(true);
	speed = $state(1);
	/** Auto-key: editar uma propriedade já animada grava keyframe no playhead. */
	autoKey = $state(true);
	/** Mostra o modelo inicial (galeria) até o usuário escolher algo. */
	started = $state(false);
	canUndo = $state(false);
	canRedo = $state(false);
	/** Muda a cada alteração da cena (o player recompila o Lottie). */
	rev = $state(0);

	private undoStack: string[] = [];
	private redoStack: string[] = [];
	private lastPush = 0;
	private lastLabel = '';
	private saveTimer: ReturnType<typeof setTimeout> | undefined;
	private raf = 0;
	private playStart = 0;
	private playFrom = 0;

	get selected(): MotionLayer | undefined {
		return this.scene.layers.find((l) => l.id === this.selectedId);
	}

	get duration() {
		return this.scene.frames / this.scene.fps;
	}

	// ----- Persistência -----

	load() {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw) {
				this.scene = parseScene(raw);
				this.started = true;
				this.selectedId = this.scene.layers[0]?.id ?? null;
			}
		} catch {
			/* cena inválida ou sem storage: começa do zero */
		}
	}

	private scheduleSave() {
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(LS_KEY, serializeScene($state.snapshot(this.scene) as Scene));
			} catch {
				/* cheio ou bloqueado (imagens grandes) */
			}
		}, 400);
	}

	setScene(s: Scene, keepHistory = false) {
		if (keepHistory) this.commit('scene');
		else {
			this.undoStack = [];
			this.redoStack = [];
			this.syncHistory();
		}
		this.scene = s;
		this.started = true;
		this.frame = 0;
		this.selectedId = s.layers[0]?.id ?? null;
		this.selectedKey = null;
		this.changed();
	}

	// ----- Histórico -----

	/** Guarda o estado antes de mudar. Mudanças contínuas com o mesmo rótulo em < 700 ms viram um passo só. */
	commit(label = '') {
		const now = performance.now();
		if (label && label === this.lastLabel && now - this.lastPush < 700) {
			this.lastPush = now;
			return;
		}
		this.undoStack.push(serializeScene($state.snapshot(this.scene) as Scene));
		if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
		this.redoStack = [];
		this.lastPush = now;
		this.lastLabel = label;
		this.syncHistory();
	}

	private syncHistory() {
		this.canUndo = this.undoStack.length > 0;
		this.canRedo = this.redoStack.length > 0;
	}

	undo() {
		const prev = this.undoStack.pop();
		if (!prev) return;
		this.redoStack.push(serializeScene($state.snapshot(this.scene) as Scene));
		this.restore(prev);
	}

	redo() {
		const next = this.redoStack.pop();
		if (!next) return;
		this.undoStack.push(serializeScene($state.snapshot(this.scene) as Scene));
		this.restore(next);
	}

	private restore(raw: string) {
		this.scene = parseScene(raw);
		if (!this.selected) this.selectedId = this.scene.layers[0]?.id ?? null;
		this.selectedKey = null;
		this.lastLabel = '';
		this.syncHistory();
		this.changed();
	}

	changed() {
		this.rev++;
		this.scheduleSave();
	}

	// ----- Camadas -----

	addLayer(kind: MotionLayer['kind'], opts: Record<string, unknown> = {}) {
		this.commit();
		const l = newLayer(kind, $state.snapshot(this.scene) as Scene, opts);
		this.scene.layers.unshift(l);
		this.selectedId = l.id;
		this.started = true;
		this.changed();
		return l;
	}

	removeLayer(id = this.selectedId) {
		if (!id) return;
		this.commit();
		const i = this.scene.layers.findIndex((l) => l.id === id);
		this.scene.layers = this.scene.layers.filter((l) => l.id !== id);
		this.selectedId = this.scene.layers[Math.max(0, i - 1)]?.id ?? null;
		this.selectedKey = null;
		this.changed();
	}

	duplicateLayer(id = this.selectedId) {
		const l = this.scene.layers.find((x) => x.id === id);
		if (!l) return;
		this.commit();
		const copy = structuredClone($state.snapshot(l)) as MotionLayer;
		copy.id = `${l.id}-c${Math.random().toString(36).slice(2, 6)}`;
		copy.name = `${l.name} 2`;
		const i = this.scene.layers.indexOf(l);
		this.scene.layers.splice(i, 0, copy);
		this.selectedId = copy.id;
		this.changed();
	}

	moveLayer(id: string, dir: -1 | 1) {
		const i = this.scene.layers.findIndex((l) => l.id === id);
		const j = i + dir;
		if (i < 0 || j < 0 || j >= this.scene.layers.length) return;
		this.commit();
		const arr = [...this.scene.layers];
		[arr[i], arr[j]] = [arr[j], arr[i]];
		this.scene.layers = arr;
		this.changed();
	}

	/** Edita a camada (com histórico agrupado pelo rótulo). */
	edit(label: string, fn: (l: MotionLayer) => void, id = this.selectedId) {
		const l = this.scene.layers.find((x) => x.id === id);
		if (!l) return;
		this.commit(`${label}:${id}`);
		fn(l);
		this.changed();
	}

	/** Define um valor animável: com keys (ou auto-key ligado e já animado) grava keyframe no playhead. */
	setProp<T>(label: string, p: Prop<T>, value: T, id = this.selectedId) {
		this.edit(label, () => {
			if (p.keys.length) setKey(p, Math.round(this.frame), value);
			else p.value = value;
		}, id);
	}

	toggleKey<T>(label: string, p: Prop<T>, current: T, id = this.selectedId) {
		this.edit(label, () => {
			const f = Math.round(this.frame);
			if (hasKey(p, f)) removeKey(p, f);
			else {
				if (!p.keys.length) p.value = current;
				setKey(p, f, current);
			}
		}, id);
	}

	moveKey(ref: KeyRef, to: number) {
		const l = this.scene.layers.find((x) => x.id === ref.layerId);
		const p = l && (getAt(l, ref.path) as Prop<unknown> | undefined);
		if (!p || ref.t === to) return;
		this.commit(`movekey:${ref.layerId}:${ref.path}`);
		moveKey(p, ref.t, to);
		this.selectedKey = { ...ref, t: to };
		this.changed();
	}

	deleteKey(ref = this.selectedKey) {
		if (!ref) return;
		const l = this.scene.layers.find((x) => x.id === ref.layerId);
		const p = l && (getAt(l, ref.path) as Prop<unknown> | undefined);
		if (!p) return;
		this.commit();
		removeKey(p, ref.t);
		this.selectedKey = null;
		this.changed();
	}

	setEase(ref: KeyRef, ease: Easing) {
		const l = this.scene.layers.find((x) => x.id === ref.layerId);
		const p = l && (getAt(l, ref.path) as Prop<unknown> | undefined);
		const k = p?.keys.find((x) => x.t === ref.t);
		if (!k) return;
		this.commit();
		k.ease = ease;
		this.changed();
	}

	preset(id: PresetId, at: number, duration: number) {
		const l = this.selected;
		if (!l) return;
		this.commit();
		applyPreset(l, id, Math.round(at), Math.max(1, Math.round(duration)), this.scene);
		this.changed();
	}

	clearAnimation() {
		const l = this.selected;
		if (!l) return;
		this.commit();
		clearAnimation(l);
		this.changed();
	}

	// ----- Reprodução -----

	seek(f: number) {
		this.frame = Math.max(0, Math.min(this.scene.frames - 1, f));
		if (this.playing) {
			this.playFrom = this.frame;
			this.playStart = performance.now();
		}
	}

	play() {
		if (this.playing) return;
		if (this.frame >= this.scene.frames - 1) this.frame = 0;
		this.playing = true;
		this.playFrom = this.frame;
		this.playStart = performance.now();
		const tick = (now: number) => {
			if (!this.playing) return;
			let f = this.playFrom + ((now - this.playStart) / 1000) * this.scene.fps * this.speed;
			if (f >= this.scene.frames) {
				if (this.loop) {
					f %= this.scene.frames;
					this.playFrom = f;
					this.playStart = now;
				} else {
					this.frame = this.scene.frames - 1;
					this.playing = false;
					return;
				}
			}
			this.frame = f;
			this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
	}

	pause() {
		this.playing = false;
		cancelAnimationFrame(this.raf);
		this.frame = Math.round(this.frame);
	}

	toggle() {
		if (this.playing) this.pause();
		else this.play();
	}

	snapshot(): Scene {
		return cloneScene($state.snapshot(this.scene) as Scene);
	}
}

export const studio = new Studio();
