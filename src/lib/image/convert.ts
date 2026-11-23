// Conversor de imagens em lote (modo fácil): API da thread principal.
// Fila + pool pequeno de workers (um arquivo por worker por vez): a memória fica limitada mesmo com centenas de arquivos.
// Os File são enviados direto ao worker (clone estruturado, sem ler os bytes aqui).
// Exceções decodificadas aqui: SVG (worker não tem <img>) e HEIC (heic-to, LGPL, em chunk próprio e sob demanda).
// Seguro para SSR: nada acessa window/document no topo do módulo.
import { svgLength, svgRasterSize } from './io.ts';
import {
	buildPdfParts,
	crc32,
	dedupeName,
	outInfo,
	outName,
	resolveFormat,
	sniffBytes,
	targetSize,
	zipLayout,
	type ConvertOptions,
	type InKind,
	type PdfPage,
	type WorkerReq,
	type WorkerRes,
	type ZipEntryMeta
} from './convert-pure.ts';

export {
	CONVERT_ACCEPT,
	IN_KINDS,
	OUT_FORMATS,
	defaultConvertOptions,
	formatBytes,
	outName,
	resolveFormat,
	sniffBytes,
	targetSize,
	type ConvertOptions,
	type InKind,
	type OutFormat,
	type PdfPage,
	type Resize
} from './convert-pure.ts';

export type ConvertResult = {
	blob: Blob;
	name: string;
	width: number;
	height: number;
	srcWidth: number;
	srcHeight: number;
	srcKind: InKind;
	ms: number;
	/** Só para PDF: a página em JPEG, para juntar tudo num PDF único com `buildPdf`. */
	pdfPage?: PdfPage;
};

export type QueueCallbacks = {
	onStart?(id: string): void;
	onProgress?(id: string, v: number): void;
	onDone?(id: string, r: ConvertResult): void;
	onError?(id: string, message: string): void;
};

// =====================================================================
// Detecção
// =====================================================================

/** Tipo pelos bytes mágicos (lê só os primeiros 4 KB); cai para a extensão. */
export async function sniffKind(file: Blob, name?: string): Promise<InKind> {
	const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
	return sniffBytes(head, name ?? (file as File).name);
}

let nativeCache: Promise<{ webp: boolean; avif: boolean }> | null = null;

/** O navegador codifica WebP/AVIF nativamente? (senão o worker usa o codificador WASM do jSquash). */
export function nativeEncodeSupport(): Promise<{ webp: boolean; avif: boolean }> {
	nativeCache ??= (async () => {
		const test = async (type: string) => {
			try {
				let b: Blob | null;
				if (typeof OffscreenCanvas !== 'undefined') {
					const c = new OffscreenCanvas(2, 2);
					c.getContext('2d')!.fillRect(0, 0, 1, 1);
					b = await c.convertToBlob({ type, quality: 0.8 });
				} else {
					const c = document.createElement('canvas');
					c.width = c.height = 2;
					b = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.8));
				}
				return !!b && b.type === type;
			} catch {
				return false;
			}
		};
		const [webp, avif] = await Promise.all([test('image/webp'), test('image/avif')]);
		return { webp, avif };
	})();
	return nativeCache;
}

// =====================================================================
// PDF e ZIP
// =====================================================================

/** PDF 1.4 com uma página por imagem (JPEG embutido sem recodificar). */
export function buildPdf(pages: PdfPage[], pageSize: 'image' | 'a4' | 'letter'): Blob {
	return new Blob(buildPdfParts(pages, pageSize) as BlobPart[], { type: 'application/pdf' });
}

/** CRC32 lendo o Blob em fatias (stream), sem carregar o arquivo inteiro de uma vez. */
async function blobCrc(blob: Blob): Promise<number> {
	let crc = 0;
	if (typeof blob.stream === 'function') {
		const reader = blob.stream().getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			crc = crc32(value, crc);
		}
		return crc;
	}
	return crc32(new Uint8Array(await blob.arrayBuffer()));
}

/**
 * ZIP sem compressão (STORE: imagens já são comprimidas), nomes UTF-8, sem duplicar nomes.
 * Os dados entram como partes do Blob final (sem cópia); só o CRC exige ler cada arquivo uma vez.
 */
export async function zipFiles(files: { name: string; blob: Blob }[], onProgress?: (v: number) => void): Promise<Blob> {
	const taken = new Set<string>();
	const meta: ZipEntryMeta[] = [];
	const total = files.reduce((s, f) => s + f.blob.size, 0) || 1;
	let done = 0;
	for (const f of files) {
		const name = dedupeName(f.name.replace(/^[\\/]+/, '').replace(/\\/g, '/') || 'arquivo', taken);
		meta.push({ name, crc: await blobCrc(f.blob), size: f.blob.size });
		done += f.blob.size;
		onProgress?.(done / total);
	}
	const parts = zipLayout(meta, (i) => files[i].blob);
	onProgress?.(1);
	return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

// =====================================================================
// Decodificação na thread principal (SVG, HEIC, fallback via <img>)
// =====================================================================

function loadImg(blob: Blob): Promise<HTMLImageElement> {
	const url = URL.createObjectURL(blob);
	return new Promise<HTMLImageElement>((res, rej) => {
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => res(img);
		img.onerror = () => rej(new Error('Formato não suportado por este navegador.'));
		img.src = url;
	}).finally(() => URL.revokeObjectURL(url));
}

/** Desenha num canvas do tamanho pedido e devolve um ImageBitmap transferível. */
async function drawToBitmap(src: CanvasImageSource, w: number, h: number): Promise<ImageBitmap> {
	if (typeof OffscreenCanvas !== 'undefined') {
		const c = new OffscreenCanvas(w, h);
		const x = c.getContext('2d');
		if (!x) throw new Error('Canvas 2D indisponível.');
		x.imageSmoothingQuality = 'high';
		x.drawImage(src, 0, 0, w, h);
		return c.transferToImageBitmap();
	}
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const x = c.getContext('2d');
	if (!x) throw new Error('Canvas 2D indisponível.');
	x.imageSmoothingQuality = 'high';
	x.drawImage(src, 0, 0, w, h);
	const b = await createImageBitmap(c);
	c.width = c.height = 0;
	return b;
}

type SvgPrep = { svg: Blob; width: number; height: number; srcWidth: number; srcHeight: number };

/** Lê o SVG, calcula o tamanho intrínseco (ícones pequenos sobem para 1024; teto 8192) e fixa width/height no alvo. */
async function prepareSvg(file: Blob, opts: ConvertOptions): Promise<SvgPrep> {
	const xml = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
	const root = xml.documentElement;
	if (!root || root.nodeName.toLowerCase() !== 'svg' || xml.getElementsByTagName('parsererror').length) throw new Error('SVG inválido.');
	const vb = root.getAttribute('viewBox');
	const src = svgRasterSize(root.getAttribute('width'), root.getAttribute('height'), vb);
	const t = targetSize(src.w, src.h, opts.resize);
	// Sem viewBox, preserva o sistema de coordenadas original e escala pelo tamanho declarado.
	if (!vb) {
		const ow = svgLength(root.getAttribute('width')), oh = svgLength(root.getAttribute('height'));
		if (ow && oh) root.setAttribute('viewBox', `0 0 ${ow} ${oh}`);
	}
	root.setAttribute('width', String(t.width));
	root.setAttribute('height', String(t.height));
	const svg = new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' });
	return { svg, width: t.width, height: t.height, srcWidth: src.w, srcHeight: src.h };
}

type HeicTo = typeof import('heic-to').heicTo;
let heicMod: Promise<HeicTo> | null = null;

async function decodeHeic(file: Blob): Promise<ImageBitmap> {
	// heic-to (LGPL) fica num chunk próprio e só carrega quando aparece um HEIC; ele decodifica no worker dele.
	heicMod ??= import('heic-to').then((m) => m.heicTo);
	const heicTo = await heicMod.catch((e) => {
		heicMod = null;
		throw e;
	});
	try {
		return await heicTo({ blob: file, type: 'bitmap', options: { imageOrientation: 'from-image', premultiplyAlpha: 'none' } });
	} catch (e) {
		throw new Error(`HEIC: ${e instanceof Error ? e.message : String(e) || 'falha ao decodificar'}`);
	}
}

async function decodeViaImg(file: Blob): Promise<ImageBitmap> {
	const img = await loadImg(file);
	const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
	if (!w || !h) throw new Error('Imagem sem dimensões.');
	return drawToBitmap(img, w, h);
}

// =====================================================================
// Fila + pool de workers
// =====================================================================

type Pending = { resolve: (r: WorkerRes & { type: 'done' }) => void; reject: (e: Error) => void; onProgress: (v: number) => void; retry?: boolean };

class Aborted extends Error {
	constructor() {
		super('aborted');
	}
}

class RetryMain extends Error {}

/** Um worker com no máximo um trabalho por vez. */
class Slot {
	worker: Worker | null = null;
	pending: Pending | null = null;

	private ensure(): Worker {
		if (this.worker) return this.worker;
		const w = new Worker(new URL('./workers/convert.worker.ts', import.meta.url), { type: 'module' });
		w.onmessage = (e: MessageEvent<WorkerRes>) => {
			const p = this.pending;
			if (!p) return;
			const m = e.data;
			if (m.type === 'progress') p.onProgress(m.value);
			else if (m.type === 'done') {
				this.pending = null;
				p.resolve(m);
			} else {
				this.pending = null;
				p.reject(m.retryMain ? new RetryMain(m.message) : new Error(m.message));
			}
		};
		// Erro fatal (ex.: falta de memória ao carregar um WASM): descarta o worker; o próximo arquivo cria outro.
		w.onerror = (e) => {
			e.preventDefault?.();
			const p = this.pending;
			this.kill();
			p?.reject(new Error(e.message || 'O worker de conversão falhou (memória insuficiente?).'));
		};
		this.worker = w;
		return w;
	}

	exec(req: WorkerReq, onProgress: (v: number) => void): Promise<WorkerRes & { type: 'done' }> {
		const w = this.ensure();
		return new Promise((resolve, reject) => {
			this.pending = { resolve, reject, onProgress };
			const transfer: Transferable[] = req.bitmap ? [req.bitmap] : [];
			try {
				w.postMessage(req, transfer);
			} catch (e) {
				this.pending = null;
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		});
	}

	kill() {
		this.worker?.terminate();
		this.worker = null;
		const p = this.pending;
		this.pending = null;
		p?.reject(new Aborted());
	}
}

function defaultConcurrency(): number {
	if (typeof navigator === 'undefined') return 2;
	const hc = navigator.hardwareConcurrency || 4;
	let n = Math.max(1, Math.min(4, hc - 1));
	const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
	const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
	if (mobile || (mem !== undefined && mem <= 4)) n = Math.min(n, 2);
	return n;
}

export class ConvertQueue {
	readonly concurrency: number;
	#slots: Slot[] = [];
	#running = false;
	#stopped = false;
	#abortWaiters: (() => void)[] = [];

	constructor(opts?: { concurrency?: number }) {
		const c = opts?.concurrency;
		this.concurrency = c && c > 0 ? Math.floor(c) : defaultConcurrency();
	}

	get running(): boolean {
		return this.#running;
	}

	/** Converte todos; resolve quando cada item terminou, falhou ou foi abortado. */
	async run(items: { id: string; file: File }[], opts: ConvertOptions, cb: QueueCallbacks): Promise<void> {
		if (this.#running) throw new Error('A fila já está rodando.');
		this.#running = true;
		this.#stopped = false;
		const queue = items.slice();
		const taken = new Set<string>();
		const options: ConvertOptions = JSON.parse(JSON.stringify(opts)); // snapshot (sem proxies do Svelte)
		const n = Math.max(1, Math.min(this.concurrency, queue.length));
		while (this.#slots.length < n) this.#slots.push(new Slot());
		const lane = async (slot: Slot) => {
			for (let item = queue.shift(); item; item = queue.shift()) {
				if (this.#stopped) {
					cb.onError?.(item.id, 'aborted');
					continue;
				}
				await this.#one(slot, item, options, taken, cb);
			}
		};
		try {
			await Promise.all(this.#slots.slice(0, n).map(lane));
		} finally {
			this.#running = false;
		}
	}

	/** Interrompe tudo na hora: encerra os workers; o que estava pendente recebe onError(id, 'aborted'). */
	stop(): void {
		if (!this.#running) return;
		this.#stopped = true;
		for (const s of this.#slots) s.kill();
		for (const w of this.#abortWaiters.splice(0)) w();
	}

	/** Promessa que rejeita com Aborted quando `stop()` é chamado (para etapas na thread principal). */
	#guard<T>(p: Promise<T>): Promise<T> {
		if (this.#stopped) return Promise.reject(new Aborted());
		return new Promise<T>((resolve, reject) => {
			const abort = () => reject(new Aborted());
			this.#abortWaiters.push(abort);
			p.then(resolve, reject).finally(() => {
				const i = this.#abortWaiters.indexOf(abort);
				if (i >= 0) this.#abortWaiters.splice(i, 1);
			});
		});
	}

	async #one(slot: Slot, item: { id: string; file: File }, opts: ConvertOptions, taken: Set<string>, cb: QueueCallbacks) {
		const { id, file } = item;
		const t0 = performance.now();
		let bitmap: ImageBitmap | undefined;
		try {
			cb.onStart?.(id);
			cb.onProgress?.(id, 0);
			const kind = await this.#guard(sniffKind(file, file.name));
			const fmt = resolveFormat(opts.format, kind);
			const req: WorkerReq = { id, name: file.name, kind, opts };
			const name = () => outName(file.name, opts.format, kind, taken);

			if (kind === 'svg') {
				const prep = await this.#guard(prepareSvg(file, opts));
				if (fmt === 'svg') {
					// SVG → SVG: só ajusta width/height (continua vetorial, sem rasterizar).
					cb.onProgress?.(id, 1);
					cb.onDone?.(id, {
						blob: prep.svg, name: name(), width: prep.width, height: prep.height,
						srcWidth: prep.srcWidth, srcHeight: prep.srcHeight, srcKind: kind, ms: performance.now() - t0
					});
					return;
				}
				// rasteriza direto no tamanho final (nitidez máxima)
				const img = await this.#guard(loadImg(prep.svg));
				bitmap = await this.#guard(drawToBitmap(img, prep.width, prep.height));
				Object.assign(req, { bitmap, presized: true, srcWidth: prep.srcWidth, srcHeight: prep.srcHeight });
			} else if (kind === 'heic') {
				bitmap = await this.#guard(decodeHeic(file));
				Object.assign(req, { bitmap });
			} else {
				req.file = file;
			}
			cb.onProgress?.(id, bitmap ? 0.15 : 0.05);

			let res: WorkerRes & { type: 'done' };
			try {
				res = await slot.exec(req, (v) => cb.onProgress?.(id, v));
			} catch (e) {
				if (!(e instanceof RetryMain)) throw e;
				// O worker não decodificou (ex.: ICO/BMP no Safari): tenta via <img> aqui e reenvia o bitmap.
				bitmap = await this.#guard(decodeViaImg(file));
				res = await slot.exec({ id, name: file.name, kind, opts, bitmap }, (v) => cb.onProgress?.(id, v));
			}
			bitmap = undefined; // transferido para o worker

			let blob: Blob;
			let pdfPage: PdfPage | undefined;
			if (res.pdf) {
				pdfPage = { jpeg: new Uint8Array(res.buffer), width: res.width, height: res.height };
				blob = buildPdf([pdfPage], opts.pdfPage);
			} else blob = new Blob([res.buffer], { type: res.mime || outInfo(fmt).mime });
			cb.onProgress?.(id, 1);
			cb.onDone?.(id, {
				blob, name: name(), width: res.width, height: res.height,
				srcWidth: res.srcWidth, srcHeight: res.srcHeight, srcKind: kind, ms: performance.now() - t0, pdfPage
			});
		} catch (e) {
			bitmap?.close();
			const msg = e instanceof Aborted ? 'aborted' : e instanceof Error ? e.message : String(e);
			cb.onError?.(id, msg || 'Falha na conversão.');
		}
	}
}
