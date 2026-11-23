// Execução de trabalhos pesados fora do thread principal, com progresso e botão "Parar agora".
// Parar = worker.terminate(): libera CPU/memória na hora, mesmo no meio de um loop. O próximo pedido cria outro worker.
import type { WandOptions } from './types.ts';

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; onProgress?: (v: number) => void };

export class AbortedError extends Error {
	name = 'AbortError';
	constructor() {
		super('aborted');
	}
}

export const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

/** Estado do overlay de trabalho (lido pela UI). */
class JobState {
	/** Trabalho visível: aparece após um pequeno atraso para não piscar em operações rápidas. */
	visible = $state(false);
	label = $state('');
	detail = $state('');
	progress = $state<number | null>(null);
	startedAt = $state(0);
	stopper: (() => void) | null = null;
	private timer: ReturnType<typeof setTimeout> | undefined;

	start(label: string, stop: () => void, delay = 250) {
		this.label = label;
		this.detail = '';
		this.progress = null;
		this.startedAt = performance.now();
		this.stopper = stop;
		clearTimeout(this.timer);
		this.timer = setTimeout(() => (this.visible = true), delay);
	}

	finish() {
		clearTimeout(this.timer);
		this.visible = false;
		this.stopper = null;
		this.progress = null;
		this.detail = '';
	}

	stop() {
		this.stopper?.();
		this.finish();
	}
}

export const job = new JobState();

// ---------- Worker de operações (filtros, varinha) ----------

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
	if (worker) return worker;
	worker = new Worker(new URL('./workers/ops.worker.ts', import.meta.url), { type: 'module' });
	worker.onmessage = (e: MessageEvent) => {
		const m = e.data as { id: number; type: 'progress' | 'done' | 'error'; value?: number; result?: unknown; message?: string };
		const p = pending.get(m.id);
		if (!p) return;
		if (m.type === 'progress') p.onProgress?.(m.value ?? 0);
		else {
			pending.delete(m.id);
			if (m.type === 'done') p.resolve(m.result);
			else p.reject(new Error(m.message ?? 'worker error'));
		}
	};
	worker.onerror = (e) => {
		const err = new Error(e.message || 'worker crashed');
		for (const p of pending.values()) p.reject(err);
		pending.clear();
		worker?.terminate();
		worker = null;
	};
	return worker;
}

/** Mata o worker: tudo que estava rodando é descartado. */
export function stopOps() {
	worker?.terminate();
	worker = null;
	for (const p of pending.values()) p.reject(new AbortedError());
	pending.clear();
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[], onProgress?: (v: number) => void): Promise<T> {
	const id = ++seq;
	return new Promise<T>((resolve, reject) => {
		pending.set(id, { resolve, reject, onProgress });
		getWorker().postMessage({ id, ...msg }, transfer);
	});
}

/** Filtro: devolve ImageData do mesmo tamanho (já misturado pela máscara, se houver). */
export function runFilter(filter: string, params: Record<string, number | string | boolean>, image: ImageData, mask: Uint8ClampedArray | null, opts: { scale?: number; onProgress?: (v: number) => void } = {}): Promise<ImageData> {
	const transfer: Transferable[] = [image.data.buffer];
	if (mask) transfer.push(mask.buffer);
	return call<ImageData>({ op: 'filter', filter, params, image, mask, scale: opts.scale ?? 1 }, transfer, opts.onProgress);
}

/** Varinha mágica: devolve alfa (1 byte por pixel). */
export function runWand(image: ImageData, x: number, y: number, opts: WandOptions, onProgress?: (v: number) => void): Promise<Uint8ClampedArray> {
	return call<Uint8ClampedArray>({ op: 'wand', image, x, y, opts }, [image.data.buffer], onProgress);
}

/**
 * Roda uma tarefa com overlay de progresso e "Parar agora".
 * `stop` padrão encerra o worker de operações; tarefas de IA passam o próprio stop.
 */
export async function withJob<T>(label: string, task: (progress: (v: number | null, detail?: string) => void) => Promise<T>, stop: () => void = stopOps, delay = 250): Promise<T> {
	job.start(label, stop, delay);
	try {
		return await task((v, detail) => {
			job.progress = v;
			if (detail !== undefined) job.detail = detail;
		});
	} finally {
		job.finish();
	}
}
