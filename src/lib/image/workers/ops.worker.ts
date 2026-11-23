// Worker de operações de pixel: filtros e varinha mágica. Criado pela thread principal com
// `new Worker(new URL('./workers/ops.worker.ts', import.meta.url), { type: 'module' })`.
import { applyFilter } from '../filters-impl.ts';
import { wandSelect } from '../wand-impl.ts';
import type { Req, Res } from './ops-protocol.ts';

// Tipagem mínima do escopo do worker (o tsconfig do projeto usa a lib DOM).
const ctx = self as unknown as {
	postMessage(msg: Res, transfer?: Transferable[]): void;
	onmessage: ((e: MessageEvent<Req>) => void) | null;
};

const PROGRESS_MS = 50;

/** Progresso limitado a ~1 mensagem a cada 50 ms. */
function progressFor(id: number) {
	let last = 0;
	return (value: number) => {
		const now = performance.now();
		if (now - last < PROGRESS_MS) return;
		last = now;
		ctx.postMessage({ id, type: 'progress', value });
	};
}

function run(req: Req) {
	const onProgress = progressFor(req.id);
	const { width, height, data } = req.image;
	if (req.op === 'wand') {
		const mask = wandSelect({ data, width, height }, req.x, req.y, req.opts, onProgress);
		ctx.postMessage({ id: req.id, type: 'done', result: mask }, [mask.buffer]);
		return;
	}
	const out = applyFilter(req.filter, { data, width, height }, req.params, { scale: req.scale ?? 1, onProgress });
	const o = out.data;
	const m = req.mask;
	if (m && m.length === width * height) {
		// saída = original + (filtrado - original) * máscara/255, por canal (inclui alfa)
		for (let i = 0, p = 0; i < m.length; i++, p += 4) {
			const a = m[i];
			if (a === 255) continue;
			if (a === 0) {
				o[p] = data[p]; o[p + 1] = data[p + 1]; o[p + 2] = data[p + 2]; o[p + 3] = data[p + 3];
				continue;
			}
			const k = a / 255;
			o[p] = data[p] + (o[p] - data[p]) * k;
			o[p + 1] = data[p + 1] + (o[p + 1] - data[p + 1]) * k;
			o[p + 2] = data[p + 2] + (o[p + 2] - data[p + 2]) * k;
			o[p + 3] = data[p + 3] + (o[p + 3] - data[p + 3]) * k;
		}
	}
	const result = new ImageData(o as Uint8ClampedArray<ArrayBuffer>, width, height);
	ctx.postMessage({ id: req.id, type: 'done', result }, [o.buffer as ArrayBuffer]);
}

ctx.onmessage = (e) => {
	const req = e.data;
	try {
		run(req);
	} catch (err) {
		ctx.postMessage({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) });
	}
};
