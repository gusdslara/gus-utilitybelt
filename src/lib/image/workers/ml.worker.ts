// Worker de IA local (100% no dispositivo): SAM por pontos (SlimSAM) e recorte de sujeito (MODNet / RMBG-1.4).
// A thread principal cria com `new Worker(new URL('./workers/ml.worker.ts', import.meta.url), { type: 'module' })`
// e pode encerrar a qualquer momento com `worker.terminate()` (libera CPU/GPU/RAM na hora).
//
// Arquivos do ONNX Runtime (.wasm/.mjs): ficam no padrão do transformers.js, servidos pelo jsDelivr
// (`cdn.jsdelivr.net/npm/onnxruntime-web@<versão>/dist/`) e guardados no Cache Storage ('transformers-cache')
// pelo próprio transformers (`env.useWasmCache`). Assim o build estático não carrega ~25 MB de wasm e não
// precisa de configuração especial no Vite. Os modelos vêm do Hugging Face Hub e também ficam no mesmo cache.
//
// GitHub Pages não manda COOP/COEP → sem `crossOriginIsolated` → sem SharedArrayBuffer: o wasm roda em 1 thread.

import type { MlDevice, MlPoint, MlReq, MlRes, MlRunDevice } from './ml-protocol.ts';

type TF = typeof import('@huggingface/transformers');
type Tensor = import('@huggingface/transformers').Tensor;
type RawImage = import('@huggingface/transformers').RawImage;
type ProgressInfo = import('@huggingface/transformers').ProgressInfo;
type Stage = 'download' | 'load' | 'run';

const HF = { sam: 'Xenova/slimsam-77-uniform', modnet: 'Xenova/modnet', rmbg: 'briaai/RMBG-1.4' } as const;
type ModelId = keyof typeof HF;

const post = (msg: MlRes, transfer: Transferable[] = []) => postMessage(msg, { transfer });

// ---------- transformers (import preguiçoso) ----------

let tfPromise: Promise<TF> | null = null;
function tf(): Promise<TF> {
	return (tfPromise ??= import('@huggingface/transformers').then((m) => {
		const { env } = m;
		env.logLevel = m.LogLevel.ERROR; // RMBG ('custom') gera avisos inofensivos de "model class" desconhecida
		env.allowLocalModels = false; // nada de /models/ no próprio site
		env.allowRemoteModels = true;
		env.useBrowserCache = true; // Cache Storage 'transformers-cache'
		const wasm = env.backends.onnx.wasm;
		if (wasm) {
			// Sem isolamento de origem não há threads; com isolamento, limita para não travar a máquina.
			wasm.numThreads = globalThis.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
			wasm.proxy = false; // já estamos num worker
		}
		return m;
	}));
}

// ---------- WebGPU ----------

type Gpu = { ok: boolean; f16: boolean };
let gpuInfo: Promise<Gpu> | null = null;
let webgpuBroken = false; // falhou uma vez → não tenta de novo nesta sessão do worker

function gpu(): Promise<Gpu> {
	return (gpuInfo ??= (async () => {
		try {
			const g = (navigator as unknown as { gpu?: { requestAdapter(o?: object): Promise<{ features: Set<string> } | null> } }).gpu;
			if (!g) return { ok: false, f16: false };
			const adapter = await g.requestAdapter({ powerPreference: 'high-performance' });
			if (!adapter) return { ok: false, f16: false };
			return { ok: true, f16: adapter.features.has('shader-f16') };
		} catch {
			return { ok: false, f16: false };
		}
	})());
}

async function pickDevice(want: MlDevice): Promise<MlRunDevice> {
	if (want === 'wasm' || webgpuBroken) return 'wasm';
	return (await gpu()).ok ? 'webgpu' : 'wasm';
}

/** dtype por modelo/dispositivo: equilíbrio entre download, memória e qualidade. */
async function dtypeFor(model: ModelId, device: MlRunDevice) {
	const f16 = device === 'webgpu' && (await gpu()).f16;
	switch (model) {
		case 'sam':
			// WebGPU: fp16 (~21 MB) ou fp32; wasm: quantizado q8 (~14 MB).
			return device === 'webgpu' ? (f16 ? 'fp16' : 'fp32') : 'q8';
		case 'modnet':
			// O quantizado perde muito detalhe no cabelo; fp32 tem só ~26 MB.
			return f16 ? 'fp16' : 'fp32';
		case 'rmbg':
			// WebGPU: fp16 (~88 MB) ou fp32 (~176 MB); wasm: q8 (~44 MB).
			return device === 'webgpu' ? (f16 ? 'fp16' : 'fp32') : 'q8';
	}
}

// ---------- progresso de download (soma de todos os arquivos) ----------

function progressTracker(id: number) {
	const files = new Map<string, { loaded: number; total: number }>();
	let last = 0;
	let loadingSent = false;
	return (p: ProgressInfo) => {
		const s = p.status;
		if (s === 'initiate' || s === 'download') {
			const key = `${p.name}/${p.file}`;
			if (!files.has(key)) files.set(key, { loaded: 0, total: 0 });
		} else if (s === 'progress') {
			files.set(`${p.name}/${p.file}`, { loaded: p.loaded, total: p.total });
		} else if (s === 'done') {
			const f = files.get(`${p.name}/${p.file}`);
			if (f && f.total) f.loaded = f.total;
		} else if (s === 'ready') {
			post({ id, type: 'progress', stage: 'load', value: 1 });
			return;
		} else return; // progress_total: agregamos por conta própria (SAM carrega modelo + processor separados)
		let loaded = 0;
		let total = 0;
		for (const f of files.values()) {
			loaded += f.loaded;
			total += f.total;
		}
		// Limita a frequência das mensagens (~1 a cada 0,5% ou quando um arquivo muda de estado).
		const value = total ? loaded / total : 0;
		if (s === 'progress' && Math.abs(value - last) < 0.005 && value < 1) return;
		last = value;
		post({ id, type: 'progress', stage: 'download', value, loaded, total, file: 'file' in p ? p.file : undefined });
		// Tudo baixado (ou lido do cache): agora vem a criação das sessões ONNX, que pode levar alguns segundos.
		if (s === 'done' && total && loaded >= total && !loadingSent) {
			loadingSent = true;
			post({ id, type: 'progress', stage: 'load', value: 0 });
		}
	};
}

// ---------- carga de modelos (um por modelo+dispositivo, compartilhado entre pedidos) ----------

type SamBundle = { model: any; processor: any };
type MatteBundle = { model: any; processor: any };
const loaded = new Map<string, Promise<SamBundle | MatteBundle>>();

async function load(model: ModelId, device: MlRunDevice, id: number): Promise<SamBundle | MatteBundle> {
	const key = `${model}:${device}`;
	let p = loaded.get(key);
	if (!p) {
		p = (async () => {
			const m = await tf();
			const dtype = await dtypeFor(model, device);
			const progress_callback = progressTracker(id);
			const opts = { device, dtype, progress_callback } as const;
			if (model === 'sam') {
				const [mdl, processor] = await Promise.all([
					m.SamModel.from_pretrained(HF.sam, opts),
					m.AutoProcessor.from_pretrained(HF.sam, { progress_callback })
				]);
				return { model: mdl, processor };
			}
			// RMBG-1.4 tem config.json com model_type desconhecido ("SegformerForSemanticSegmentation", código
			// remoto em Python): passamos um config 'custom' para o transformers.js montar a sessão ONNX genérica.
			const config = model === 'rmbg' ? ({ model_type: 'custom' } as never) : undefined;
			const [mdl, processor] = await Promise.all([
				m.AutoModel.from_pretrained(HF[model], { ...opts, ...(config ? { config } : {}) }),
				m.AutoProcessor.from_pretrained(HF[model], { progress_callback })
			]);
			return { model: mdl, processor };
		})();
		loaded.set(key, p);
		p.catch(() => loaded.delete(key));
	}
	return p;
}

async function unload(model: ModelId, device: MlRunDevice) {
	const key = `${model}:${device}`;
	const p = loaded.get(key);
	loaded.delete(key);
	if (model === 'sam') for (const k of [...embeds.keys()]) if (k.endsWith(`:${device}`)) embeds.delete(k);
	try {
		await (await p)?.model?.dispose?.();
	} catch {
		/* ignora */
	}
}

/** Executa `fn` no dispositivo pedido; se o WebGPU falhar (carga ou inferência), cai para wasm automaticamente. */
async function withFallback<T>(model: ModelId, want: MlDevice, id: number, fn: (b: any, device: MlRunDevice) => Promise<T>) {
	const device = await pickDevice(want);
	try {
		return { out: await fn(await load(model, device, id), device), device };
	} catch (e) {
		if (device !== 'webgpu') throw e;
		console.warn('[ml] WebGPU falhou, usando wasm:', e);
		webgpuBroken = true;
		await unload(model, 'webgpu');
		return { out: await fn(await load(model, 'wasm', id), 'wasm' as MlRunDevice), device: 'wasm' as MlRunDevice };
	}
}

// ---------- utilidades de imagem ----------

async function toRaw(img: ImageData): Promise<RawImage> {
	const { RawImage } = await tf();
	return new RawImage(img.data, img.width, img.height, 4).rgb();
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// ---------- SAM ----------

type Embed = { emb: Record<string, Tensor>; original: [number, number]; reshaped: [number, number] };
const embeds = new Map<string, Promise<Embed>>();
const MAX_EMBEDS = 2; // embeddings ocupam ~4 MB cada; guarda só as últimas imagens

async function sam(req: Extract<MlReq, { op: 'sam' }>) {
	const { Tensor } = await tf();
	return withFallback('sam', req.device, req.id, async (b: SamBundle, device) => {
		const key = `${req.imageKey}:${req.image.width}x${req.image.height}:${device}`;
		let ep = embeds.get(key);
		if (!ep) {
			ep = (async () => {
				post({ id: req.id, type: 'progress', stage: 'run', value: 0 });
				const inputs = await b.processor(await toRaw(req.image));
				const emb = await b.model.get_image_embeddings(inputs);
				return { emb, original: inputs.original_sizes[0], reshaped: inputs.reshaped_input_sizes[0] };
			})();
			embeds.set(key, ep);
			ep.catch(() => embeds.delete(key));
			while (embeds.size > MAX_EMBEDS) embeds.delete(embeds.keys().next().value!);
		}
		const e = await ep;
		post({ id: req.id, type: 'progress', stage: 'run', value: 0.6 });

		const pts = req.points.length ? req.points : [{ x: req.image.width / 2, y: req.image.height / 2, label: 1 as const }];
		const [oh, ow] = e.original;
		const [rh, rw] = e.reshaped;
		// Coordenadas em pixels da imagem → espaço do modelo (lado maior = 1024, antes do padding).
		const flat = pts.flatMap((p: MlPoint) => [(p.x / ow) * rw, (p.y / oh) * rh]);
		const input_points = new Tensor('float32', Float32Array.from(flat), [1, 1, pts.length, 2]);
		const input_labels = new Tensor('int64', BigInt64Array.from(pts.map((p) => BigInt(p.label))), [1, 1, pts.length]);
		const out = await b.model({ ...e.emb, input_points, input_labels });

		// Máscaras em logits (sem binarizar), já no tamanho original → alfa suave com sigmoide.
		const masks: Tensor[] = await b.processor.post_process_masks(out.pred_masks, [e.original], [e.reshaped], { binarize: false });
		const mask = masks[0]; // [1, 3, H, W]
		const scores = out.iou_scores.data as Float32Array;
		let best = 0;
		for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
		const n = oh * ow;
		const data = mask.data as Float32Array;
		const alpha = new Uint8ClampedArray(n);
		for (let i = 0, o = best * n; i < n; i++) alpha[i] = Math.round(sigmoid(data[o + i]) * 255);
		return alpha;
	});
}

// ---------- recorte (MODNet / RMBG) ----------

async function matte(req: Extract<MlReq, { op: 'matte' }>) {
	const { RawImage } = await tf();
	return withFallback(req.model, req.device, req.id, async (b: MatteBundle) => {
		post({ id: req.id, type: 'progress', stage: 'run', value: 0 });
		const { pixel_values } = await b.processor(await toRaw(req.image));
		const sess = b.model.sessions?.model;
		const inName: string = sess?.inputNames?.[0] ?? 'input';
		const out = await b.model({ [inName]: pixel_values });
		const outName: string = sess?.outputNames?.[0] ?? Object.keys(out)[0];
		const t: Tensor = (out[outName] ?? Object.values(out)[0])[0]; // [1, h, w]
		post({ id: req.id, type: 'progress', stage: 'run', value: 0.8 });
		const d = t.data as Float32Array;
		// Alguns exports devolvem logits: aplica sigmoide se sair de [0, 1] (igual ao pipeline do transformers).
		let logits = false;
		for (let i = 0; i < d.length; i++) if (d[i] < -1e-5 || d[i] > 1 + 1e-5) { logits = true; break; }
		const [, mh, mw] = t.dims;
		const u8 = new Uint8ClampedArray(mh * mw);
		for (let i = 0; i < u8.length; i++) u8[i] = Math.round((logits ? sigmoid(d[i]) : d[i]) * 255);
		const small = new RawImage(u8, mw, mh, 1);
		const full = await small.resize(req.image.width, req.image.height); // bilinear
		return new Uint8ClampedArray(full.data.buffer, full.data.byteOffset, full.data.length);
	});
}

// ---------- despacho ----------

async function handle(req: MlReq) {
	const t0 = performance.now();
	if (req.op === 'warmup') {
		const { device } = await withFallback(req.model, req.device, req.id, async () => null);
		return { result: new Uint8ClampedArray(0), device, ms: performance.now() - t0 };
	}
	const { out, device } = req.op === 'sam' ? await sam(req) : await matte(req);
	return { result: out, device, ms: performance.now() - t0 };
}

self.onmessage = async (ev: MessageEvent<MlReq>) => {
	const req = ev.data;
	try {
		const { result, device, ms } = await handle(req);
		post({ id: req.id, type: 'done', result, device, ms: Math.round(ms) }, [result.buffer as ArrayBuffer]);
	} catch (e) {
		post({ id: req.id, type: 'error', message: e instanceof Error ? e.message : String(e) });
	}
};
