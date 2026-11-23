// Cliente da IA local (thread principal). Toda a inferência roda no worker `workers/ml.worker.ts`,
// no próprio dispositivo: os modelos são baixados uma vez do Hugging Face Hub e ficam no Cache Storage.
// `mlStop()` encerra o worker na hora (libera CPU/GPU/RAM); a próxima chamada cria um worker novo.

import type { MlDevice, MlPoint, MlReq, MlRes } from './workers/ml-protocol.ts';

export type { MlDevice, MlPoint } from './workers/ml-protocol.ts';
export type MlModelId = 'sam' | 'modnet' | 'rmbg';
export type MlProgress = { stage: 'download' | 'load' | 'run'; value: number; loaded?: number; total?: number; file?: string };
export type MlResult = { alpha: Uint8ClampedArray; device: string; ms: number };

/**
 * Metadados dos modelos. `approxMB` = download típico no wasm (CPU); `approxMBWebgpu` = no WebGPU com fp16
 * (sem fp16 no adaptador, o fp32 é ~2x maior).
 */
export const ML_MODELS: Record<
	MlModelId,
	{ hf: string; approxMB: number; approxMBWebgpu: number; license: string; commercial: boolean; kind: 'point' | 'matte' }
> = {
	sam: { hf: 'Xenova/slimsam-77-uniform', approxMB: 14, approxMBWebgpu: 21, license: 'Apache-2.0', commercial: true, kind: 'point' },
	modnet: { hf: 'Xenova/modnet', approxMB: 26, approxMBWebgpu: 13, license: 'Apache-2.0', commercial: true, kind: 'matte' },
	rmbg: { hf: 'briaai/RMBG-1.4', approxMB: 44, approxMBWebgpu: 88, license: 'bria-rmbg-1.4 (não comercial)', commercial: false, kind: 'matte' }
};

const CACHE_NAME = 'transformers-cache';
/** Imagens maiores que isso são reduzidas antes de ir ao worker (os modelos trabalham em ≤1024 px). */
export const ML_MAX_SIDE = 2048;

// ---------- ambiente ----------

type Nav = Navigator & {
	deviceMemory?: number;
	userAgentData?: { mobile?: boolean };
	gpu?: { requestAdapter(): Promise<unknown | null> };
};

export async function mlEnvironment(): Promise<{ webgpu: boolean; cores: number; memoryGB?: number; mobile: boolean; lowEnd: boolean }> {
	const nav = (typeof navigator !== 'undefined' ? navigator : {}) as Nav;
	let webgpu = false;
	try {
		webgpu = !!(nav.gpu && (await nav.gpu.requestAdapter()));
	} catch {
		webgpu = false;
	}
	const cores = nav.hardwareConcurrency || 2;
	const memoryGB = nav.deviceMemory;
	const mobile =
		nav.userAgentData?.mobile ??
		(/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent ?? '') ||
			(typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && (nav.maxTouchPoints ?? 0) > 1));
	const lowEnd = (memoryGB !== undefined && memoryGB <= 4) || cores <= 4 || mobile;
	return { webgpu, cores, memoryGB, mobile, lowEnd };
}

// ---------- cache ----------

/** Há algum arquivo .onnx do modelo no Cache Storage do transformers.js? */
export async function mlCached(model: MlModelId): Promise<boolean> {
	if (typeof caches === 'undefined') return false;
	try {
		if (!(await caches.has(CACHE_NAME))) return false;
		const cache = await caches.open(CACHE_NAME);
		const prefix = `/${ML_MODELS[model].hf}/resolve/`;
		return (await cache.keys()).some((r) => r.url.includes(prefix) && r.url.endsWith('.onnx'));
	} catch {
		return false;
	}
}

/** Apaga todos os modelos baixados (e os binários do ONNX Runtime, rebaixados quando preciso). */
export async function mlClearCache(): Promise<void> {
	mlStop();
	if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
}

// ---------- worker ----------

type Pending = { resolve: (r: MlResult) => void; reject: (e: Error) => void; onProgress?: (p: MlProgress) => void; post?: (a: Uint8ClampedArray) => Uint8ClampedArray };
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
	if (worker) return worker;
	const w = new Worker(new URL('./workers/ml.worker.ts', import.meta.url), { type: 'module' });
	w.onmessage = (ev: MessageEvent<MlRes>) => {
		const msg = ev.data;
		const p = pending.get(msg.id);
		if (!p) return;
		if (msg.type === 'progress') {
			p.onProgress?.({ stage: msg.stage, value: msg.value, loaded: msg.loaded, total: msg.total, file: msg.file });
		} else if (msg.type === 'done') {
			pending.delete(msg.id);
			p.resolve({ alpha: p.post ? p.post(msg.result) : msg.result, device: msg.device, ms: msg.ms });
		} else {
			pending.delete(msg.id);
			p.reject(new Error(msg.message));
		}
	};
	w.onerror = (ev) => {
		ev.preventDefault?.();
		const err = new Error(ev.message || 'Falha no worker de IA');
		for (const p of pending.values()) p.reject(err);
		pending.clear();
		w.terminate();
		if (worker === w) worker = null;
	};
	return (worker = w);
}

type ReqBody = MlReq extends infer R ? (R extends MlReq ? Omit<R, 'id'> : never) : never;

function call(req: ReqBody, p: Omit<Pending, 'resolve' | 'reject'>, transfer: Transferable[] = []): Promise<MlResult> {
	return new Promise((resolve, reject) => {
		const id = ++seq;
		pending.set(id, { ...p, resolve, reject });
		getWorker().postMessage({ ...req, id } as MlReq, transfer);
	});
}

/** Encerra o worker na hora; promessas pendentes são rejeitadas com `AbortError`. */
export function mlStop(): void {
	if (worker) {
		worker.terminate();
		worker = null;
	}
	if (pending.size) {
		const err = new Error('Processamento interrompido');
		err.name = 'AbortError';
		for (const p of pending.values()) p.reject(err);
		pending.clear();
	}
}

export const mlBusy = (): boolean => pending.size > 0;

/** Pré-carrega (baixa e compila) um modelo sem rodar inferência. */
export function mlWarmup(model: MlModelId, opts: { device?: MlDevice; onProgress?: (p: MlProgress) => void } = {}): Promise<MlResult> {
	return call({ op: 'warmup', model, device: opts.device ?? 'auto' }, { onProgress: opts.onProgress });
}

// ---------- API ----------

/** Segmentação por pontos (SAM). `points` em pixels da imagem original; label 1 = incluir, 0 = excluir. */
export function segmentPoints(
	image: ImageData,
	points: MlPoint[],
	opts: { imageKey: string; device?: MlDevice; onProgress?: (p: MlProgress) => void }
): Promise<MlResult> {
	const { scaled, scale } = fitImage(image, ML_MAX_SIDE);
	const pts = scale === 1 ? points : points.map((p) => scalePoint(p, scaled.width / image.width, scaled.height / image.height));
	return call(
		{ op: 'sam', image: scaled, imageKey: opts.imageKey, points: pts, device: opts.device ?? 'auto' },
		{ onProgress: opts.onProgress, post: scale === 1 ? undefined : (a) => resizeAlpha(a, scaled.width, scaled.height, image.width, image.height) },
		scale === 1 ? [] : [scaled.data.buffer]
	);
}

/** Recorte do sujeito (remoção de fundo): devolve o alfa (w*h, 0..255) no tamanho da imagem. */
export function matteSubject(image: ImageData, model: 'modnet' | 'rmbg', opts: { device?: MlDevice; onProgress?: (p: MlProgress) => void } = {}): Promise<MlResult> {
	const { scaled, scale } = fitImage(image, ML_MAX_SIDE);
	return call(
		{ op: 'matte', model, image: scaled, device: opts.device ?? 'auto' },
		{ onProgress: opts.onProgress, post: scale === 1 ? undefined : (a) => resizeAlpha(a, scaled.width, scaled.height, image.width, image.height) },
		scale === 1 ? [] : [scaled.data.buffer]
	);
}

// ---------- utilitários puros (testados em ml.test.ts) ----------

/** Escala (≤1) para que o lado maior caiba em `max`, e o tamanho resultante (arredondado, mínimo 1). */
export function fitSize(w: number, h: number, max: number): { w: number; h: number; scale: number } {
	const s = Math.min(1, max / Math.max(w, h));
	return s === 1 ? { w, h, scale: 1 } : { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scale: s };
}

/** Converte um ponto do espaço original para o espaço reduzido (escala por eixo). */
export const scalePoint = (p: MlPoint, sx: number, sy: number): MlPoint => ({ x: p.x * sx, y: p.y * sy, label: p.label });

/** Redimensiona um alfa de 1 canal com interpolação bilinear (alinhamento por centro de pixel). */
export function resizeAlpha(src: Uint8ClampedArray, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
	if (sw === dw && sh === dh) return src;
	const out = new Uint8ClampedArray(dw * dh);
	const fx = sw / dw;
	const fy = sh / dh;
	for (let y = 0; y < dh; y++) {
		const sy = Math.min(sh - 1, Math.max(0, (y + 0.5) * fy - 0.5));
		const y0 = Math.floor(sy);
		const y1 = Math.min(sh - 1, y0 + 1);
		const ty = sy - y0;
		const r0 = y0 * sw;
		const r1 = y1 * sw;
		for (let x = 0; x < dw; x++) {
			const sx = Math.min(sw - 1, Math.max(0, (x + 0.5) * fx - 0.5));
			const x0 = Math.floor(sx);
			const x1 = Math.min(sw - 1, x0 + 1);
			const tx = sx - x0;
			const top = src[r0 + x0] + (src[r0 + x1] - src[r0 + x0]) * tx;
			const bot = src[r1 + x0] + (src[r1 + x1] - src[r1 + x0]) * tx;
			out[y * dw + x] = top + (bot - top) * ty;
		}
	}
	return out;
}

/** Reduz a ImageData (canvas, suavização alta) se passar de `max`; senão devolve a própria. */
function fitImage(image: ImageData, max: number): { scaled: ImageData; scale: number } {
	const { w, h, scale } = fitSize(image.width, image.height, max);
	if (scale === 1) return { scaled: image, scale: 1 };
	const mk = (cw: number, ch: number) => {
		if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(cw, ch);
		const c = document.createElement('canvas');
		c.width = cw;
		c.height = ch;
		return c;
	};
	const src = mk(image.width, image.height);
	(src.getContext('2d') as CanvasRenderingContext2D).putImageData(image, 0, 0);
	const dst = mk(w, h);
	const ctx = dst.getContext('2d') as CanvasRenderingContext2D;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
	return { scaled: ctx.getImageData(0, 0, w, h), scale };
}
