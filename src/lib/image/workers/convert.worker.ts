// Worker do conversor em lote: um arquivo por mensagem (decodifica → redimensiona → codifica).
// Criado pela thread principal (convert.ts) com
// `new Worker(new URL('./workers/convert.worker.ts', import.meta.url), { type: 'module' })`.
// SVG e HEIC chegam já decodificados como ImageBitmap (o worker não tem <img>; o heic-to roda no próprio worker dele).
// Codificadores pesados (utif2, ag-psd, gifenc, imagetracerjs, jsquash) são importados sob demanda.
import { encodeBmp, encodeIco, hasAlpha } from '../io.ts';
import {
	MAXKB_MAX_ENCODES,
	MAXKB_MIN_Q,
	icoSizesFor,
	outInfo,
	resolveFormat,
	targetSize,
	type ConvertOptions,
	type InKind,
	type OutId,
	type WorkerReq,
	type WorkerRes
} from '../convert-pure.ts';

const ctx = self as unknown as {
	postMessage(msg: WorkerRes, transfer?: Transferable[]): void;
	onmessage: ((e: MessageEvent<WorkerReq>) => void) | null;
};

type Canvas = OffscreenCanvas;
type Ctx = OffscreenCanvasRenderingContext2D;
type Drawable = ImageBitmap | OffscreenCanvas;

const SVG_TRACE_MAX = 1500;

class DecodeError extends Error {}

function makeCanvas(w: number, h: number): Canvas {
	if (typeof OffscreenCanvas === 'undefined') throw new Error('Este navegador não tem OffscreenCanvas em workers.');
	return new OffscreenCanvas(w, h);
}

function ctx2d(c: Canvas, willRead = false): Ctx {
	const x = c.getContext('2d', { willReadFrequently: willRead }) as Ctx | null;
	if (!x) throw new Error('Canvas 2D indisponível (memória insuficiente?).');
	return x;
}

/** Libera a memória do canvas na hora (sem esperar o GC). */
function dispose(c: Drawable | null | undefined) {
	if (!c) return;
	if ('close' in c) c.close();
	else {
		c.width = 0;
		c.height = 0;
	}
}

// =====================================================================
// Suporte nativo de codificação (detectado uma vez por worker)
// =====================================================================

let nativeCache: Promise<{ webp: boolean; avif: boolean }> | null = null;

function nativeSupport() {
	nativeCache ??= (async () => {
		const test = async (type: string) => {
			try {
				const c = makeCanvas(2, 2);
				ctx2d(c).fillRect(0, 0, 1, 1);
				const b = await c.convertToBlob({ type, quality: 0.8 });
				return b.type === type;
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
// Decodificação
// =====================================================================

function canvasFromRgba(data: Uint8Array | Uint8ClampedArray, w: number, h: number): Canvas {
	const c = makeCanvas(w, h);
	const img = new ImageData(w, h);
	img.data.set(data.subarray(0, w * h * 4));
	ctx2d(c).putImageData(img, 0, 0);
	return c;
}

async function decodeTiff(file: Blob): Promise<Canvas> {
	const mod = await import('utif2');
	const UTIF = (mod as unknown as { default?: typeof mod }).default ?? mod;
	const buf = await file.arrayBuffer();
	const ifds = UTIF.decode(buf);
	// primeira página com imagem (algumas TIFF começam com IFD de miniatura/EXIF sem pixels)
	const ifd = ifds.find((d) => (d as unknown as { t256?: number[] }).t256) ?? ifds[0];
	if (!ifd) throw new DecodeError('TIFF sem imagens.');
	UTIF.decodeImage(buf, ifd);
	const w = ifd.width as number, h = ifd.height as number;
	if (!w || !h) throw new DecodeError('TIFF inválido ou compressão não suportada.');
	return canvasFromRgba(UTIF.toRGBA8(ifd), w, h);
}

let psdInit = false;

async function agPsd() {
	const psd = await import('ag-psd');
	if (!psdInit) {
		// Sem DOM no worker: o ag-psd usa OffscreenCanvas/ImageData.
		psd.initializeCanvas(
			(w, h) => makeCanvas(w, h) as unknown as HTMLCanvasElement,
			(w, h) => new ImageData(w, h)
		);
		psdInit = true;
	}
	return psd;
}

/** PSD de 16/32 bits → 8 bits por canal. */
function to8(d: Uint8Array | Uint8ClampedArray | Uint16Array | Float32Array): Uint8ClampedArray {
	if (d instanceof Uint8ClampedArray) return d;
	if (d instanceof Uint8Array) return new Uint8ClampedArray(d.buffer, d.byteOffset, d.length);
	const out = new Uint8ClampedArray(d.length);
	if (d instanceof Uint16Array) for (let i = 0; i < d.length; i++) out[i] = d[i] >> 8;
	else for (let i = 0; i < d.length; i++) out[i] = Math.round(d[i] * 255);
	return out;
}

async function decodePsd(file: Blob): Promise<Canvas> {
	const { readPsd } = await agPsd();
	const buf = await file.arrayBuffer();
	const psd = readPsd(buf, { useImageData: true, skipThumbnail: true });
	const comp = psd.imageData;
	// A imagem composta do PSD costuma vir sem alfa (fundo opaco mesmo com camadas transparentes).
	// Se ela tem transparência, ou não há camadas, vale ela; senão compõe as camadas visíveis
	// (mesclagem normal + opacidade) e usa esse resultado quando ele tiver transparência.
	if (comp && (hasAlpha({ data: to8(comp.data), width: comp.width, height: comp.height }) || !psd.children?.length)) return canvasFromRgba(to8(comp.data), psd.width, psd.height);
	const out = makeCanvas(psd.width, psd.height);
	const o = ctx2d(out, true);
	const walk = (layers: typeof psd.children, alpha: number) => {
		for (const l of layers ?? []) {
			if (l.hidden) continue;
			const a = alpha * (l.opacity ?? 1);
			if (l.children) {
				walk(l.children, a);
				continue;
			}
			if (!l.imageData || !l.imageData.width || !l.imageData.height) continue;
			const c = canvasFromRgba(to8(l.imageData.data), l.imageData.width, l.imageData.height);
			o.globalAlpha = a;
			o.drawImage(c, l.left ?? 0, l.top ?? 0);
			dispose(c);
		}
	};
	walk(psd.children, 1);
	o.globalAlpha = 1;
	if (!comp) return out;
	const layered = o.getImageData(0, 0, out.width, out.height);
	if (hasAlpha(layered)) return out;
	dispose(out);
	return canvasFromRgba(to8(comp.data), psd.width, psd.height);
}

async function decode(req: WorkerReq): Promise<Drawable> {
	if (req.bitmap) return req.bitmap;
	const file = req.file;
	if (!file) throw new Error('Nada para converter.');
	if (req.kind === 'tiff') return decodeTiff(file);
	if (req.kind === 'psd') return decodePsd(file);
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none', colorSpaceConversion: 'default' });
	} catch {
		throw new DecodeError('O worker não conseguiu decodificar esta imagem.');
	}
}

// =====================================================================
// Redimensionamento (reduções grandes em etapas de 1/2, suavização alta)
// =====================================================================

function resample(src: Drawable, w: number, h: number): Canvas {
	if (src instanceof OffscreenCanvas && src.width === w && src.height === h) return src;
	let cur: Drawable = src;
	let owned = false;
	while (cur.width / 2 >= w && cur.height / 2 >= h && cur.width > 2 && cur.height > 2) {
		const half = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2));
		const c = ctx2d(half);
		c.imageSmoothingEnabled = true;
		c.imageSmoothingQuality = 'high';
		c.drawImage(cur, 0, 0, half.width, half.height);
		if (owned) dispose(cur);
		cur = half;
		owned = true;
	}
	if (owned && cur.width === w && cur.height === h) return cur as Canvas;
	const out = makeCanvas(w, h);
	const c = ctx2d(out);
	c.imageSmoothingEnabled = true;
	c.imageSmoothingQuality = 'high';
	c.drawImage(cur, 0, 0, w, h);
	if (owned) dispose(cur);
	return out;
}

/** Pinta o fundo por baixo do conteúdo (no próprio canvas, sem cópia). */
function flatten(c: Canvas, bg: string) {
	const x = ctx2d(c);
	x.save();
	x.globalCompositeOperation = 'destination-over';
	x.fillStyle = /^#[0-9a-f]{3,8}$/i.test(bg) ? bg : '#ffffff';
	x.fillRect(0, 0, c.width, c.height);
	x.restore();
}

const pixels = (c: Canvas) => ctx2d(c, true).getImageData(0, 0, c.width, c.height);

// =====================================================================
// Codificação
// =====================================================================

type Encoded = { buffer: ArrayBuffer; mime: string; pdf?: boolean };

async function nativeBlob(c: Canvas, mime: string, q?: number): Promise<Blob> {
	const b = await c.convertToBlob(q === undefined ? { type: mime } : { type: mime, quality: q });
	// Navegadores caem para PNG em silêncio quando não sabem o formato.
	if (b.type !== mime) throw new Error(`Este navegador não codifica ${mime}.`);
	return b;
}

/** Codificador com perda reutilizável na busca por tamanho (guarda os pixels para o WASM). */
async function lossyEncoder(c: Canvas, fmt: 'jpeg' | 'webp' | 'avif'): Promise<(q: number) => Promise<ArrayBuffer>> {
	const mime = outInfo(fmt).mime;
	const native = fmt === 'jpeg' || (await nativeSupport())[fmt];
	if (native) return async (q) => (await nativeBlob(c, mime, q)).arrayBuffer();
	const img = pixels(c);
	if (fmt === 'webp') {
		const { default: encode } = await import('@jsquash/webp/encode');
		return (q) => encode(img, { quality: Math.round(q * 100) });
	}
	const { default: encode } = await import('@jsquash/avif/encode');
	// speed 7: bom equilíbrio para lotes (o WASM sem threads é lento em fotos grandes)
	return (q) => encode(img, { quality: Math.round(q * 100), speed: 7 });
}

/** Qualidade fixa ou busca binária até caber em `maxKB` (≤ 7 codificações; maior qualidade que cabe). */
async function encodeLossy(c: Canvas, fmt: 'jpeg' | 'webp' | 'avif', opts: ConvertOptions): Promise<ArrayBuffer> {
	const enc = await lossyEncoder(c, fmt);
	const qMax = clamp(opts.quality, MAXKB_MIN_Q, 1);
	const limit = opts.maxKB && opts.maxKB > 0 ? opts.maxKB * 1024 : 0;
	const first = await enc(qMax);
	if (!limit || first.byteLength <= limit) return first;
	let lo = MAXKB_MIN_Q, hi = qMax;
	const min = await enc(lo);
	if (min.byteLength > limit) return min; // nem a mínima cabe: devolve a menor e a interface avisa
	let best = min;
	for (let i = 2; i < MAXKB_MAX_ENCODES && hi - lo > 0.01; i++) {
		const mid = (lo + hi) / 2;
		const b = await enc(mid);
		if (b.byteLength <= limit) {
			best = b;
			lo = mid;
		} else hi = mid;
	}
	return best;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : b));

async function encodeGif(c: Canvas): Promise<ArrayBuffer> {
	// @ts-ignore gifenc não publica tipos
	const { GIFEncoder, quantize, applyPalette } = (await import('gifenc')) as GifEnc;
	const { data, width, height } = pixels(c);
	const alpha = hasAlpha({ data, width, height });
	const format = alpha ? 'rgba4444' : 'rgb565';
	const palette = quantize(data, 256, alpha ? { format, oneBitAlpha: true } : { format });
	const index = applyPalette(data, palette, format);
	const ti = alpha ? palette.findIndex((p) => p[3] === 0) : -1;
	const gif = GIFEncoder();
	gif.writeFrame(index, width, height, { palette, transparent: ti >= 0, transparentIndex: Math.max(0, ti), repeat: -1 });
	gif.finish();
	return gif.bytes().buffer as ArrayBuffer;
}

type GifEnc = {
	GIFEncoder: () => {
		writeFrame(index: Uint8Array, w: number, h: number, o: { palette: number[][]; transparent?: boolean; transparentIndex?: number; repeat?: number }): void;
		finish(): void;
		bytes(): Uint8Array;
	};
	quantize(data: Uint8ClampedArray, max: number, o?: { format?: string; oneBitAlpha?: boolean }): number[][];
	applyPalette(data: Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
};

async function encodeIcoFrom(c: Canvas, sizes: number[]): Promise<ArrayBuffer> {
	const entries: { width: number; height: number; png: Uint8Array }[] = [];
	for (const s of icoSizesFor(sizes, c.width, c.height)) {
		// "contain": encaixa no quadrado com fundo transparente
		const k = s / Math.max(c.width, c.height);
		const iw = Math.max(1, Math.round(c.width * k)), ih = Math.max(1, Math.round(c.height * k));
		const scaled = resample(c, iw, ih);
		const sq = makeCanvas(s, s);
		ctx2d(sq).drawImage(scaled, Math.floor((s - iw) / 2), Math.floor((s - ih) / 2));
		if (scaled !== c) dispose(scaled);
		entries.push({ width: s, height: s, png: new Uint8Array(await (await nativeBlob(sq, 'image/png')).arrayBuffer()) });
		dispose(sq);
	}
	return encodeIco(entries).buffer as ArrayBuffer;
}

async function encodeTiff(c: Canvas): Promise<ArrayBuffer> {
	const mod = await import('utif2');
	const UTIF = (mod as unknown as { default?: typeof mod }).default ?? mod;
	const { data } = pixels(c);
	return UTIF.encodeImage(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), c.width, c.height);
}

async function encodePsd(c: Canvas, name: string): Promise<ArrayBuffer> {
	const { writePsd } = await agPsd();
	const imageData = pixels(c);
	const w = c.width, h = c.height;
	const layer = (name.replace(/\.[^.]+$/, '') || 'Camada 1').slice(0, 250);
	return writePsd(
		{
			width: w,
			height: h,
			imageData,
			children: [{ name: layer, top: 0, left: 0, right: w, bottom: h, imageData }]
		},
		{ noBackground: true }
	);
}

type Tracer = { imagedataToSVG(img: { width: number; height: number; data: Uint8ClampedArray }, opts: Record<string, unknown>): string };

async function encodeSvg(c: Canvas, colors: number): Promise<ArrayBuffer> {
	// @ts-ignore imagetracerjs não publica tipos (módulo CommonJS)
	const mod = await import('imagetracerjs');
	const tracer = ((mod as { default?: Tracer }).default ?? mod) as Tracer;
	const W = c.width, H = c.height;
	const k = Math.min(1, SVG_TRACE_MAX / Math.max(W, H));
	const tw = Math.max(1, Math.round(W * k)), th = Math.max(1, Math.round(H * k));
	const small = k < 1 ? resample(c, tw, th) : c;
	const img = pixels(small);
	if (small !== c) dispose(small);
	const svg = tracer.imagedataToSVG(img, {
		numberofcolors: Math.round(clamp(colors, 2, 64)),
		colorsampling: 2, // determinístico
		colorquantcycles: 3,
		ltres: 1,
		qtres: 1,
		pathomit: 8,
		rightangleenhance: true,
		linefilter: false,
		blurradius: 0,
		strokewidth: 1, // contorno da mesma cor fecha as frestas entre camadas
		roundcoords: 1,
		viewbox: true,
		desc: false,
		scale: 1
	});
	// Remove camadas totalmente transparentes e fixa o tamanho final (viewBox no tamanho rastreado).
	const out = svg
		.replace(/<path [^>]*opacity="0" [^>]*\/>/g, '')
		.replace(/^<svg viewBox="[^"]*" [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${W}" height="${H}" viewBox="0 0 ${tw} ${th}">`);
	return new TextEncoder().encode(out).buffer as ArrayBuffer;
}

async function encode(c: Canvas, fmt: OutId, req: WorkerReq): Promise<Encoded> {
	const opts = req.opts;
	const mime = outInfo(fmt).mime;
	switch (fmt) {
		case 'png':
			return { buffer: await (await nativeBlob(c, mime)).arrayBuffer(), mime };
		case 'jpeg':
		case 'webp':
		case 'avif':
			if (fmt === 'jpeg') flatten(c, opts.background);
			return { buffer: await encodeLossy(c, fmt, opts), mime };
		case 'pdf':
			flatten(c, opts.background);
			return { buffer: await encodeLossy(c, 'jpeg', opts), mime, pdf: true };
		case 'bmp': {
			const img = pixels(c);
			const alpha = hasAlpha(img);
			return { buffer: encodeBmp(img, alpha).buffer as ArrayBuffer, mime };
		}
		case 'gif':
			return { buffer: await encodeGif(c), mime };
		case 'ico':
			return { buffer: await encodeIcoFrom(c, opts.icoSizes), mime };
		case 'tiff':
			return { buffer: await encodeTiff(c), mime };
		case 'psd':
			return { buffer: await encodePsd(c, req.name), mime };
		case 'svg':
			return { buffer: await encodeSvg(c, opts.svgColors), mime };
	}
}

// =====================================================================
// Pipeline
// =====================================================================

async function run(req: WorkerReq) {
	const { id } = req;
	const progress = (value: number) => ctx.postMessage({ id, type: 'progress', value });
	const fmt = resolveFormat(req.opts.format, req.kind as InKind);
	let src: Drawable | null = null;
	let canvas: Canvas | null = null;
	try {
		src = await decode(req);
		const srcWidth = req.srcWidth ?? src.width, srcHeight = req.srcHeight ?? src.height;
		progress(0.2);
		const t = req.presized ? { width: src.width, height: src.height } : targetSize(src.width, src.height, req.opts.resize);
		canvas = resample(src, t.width, t.height);
		if ((canvas as Drawable) !== src) dispose(src);
		src = null;
		progress(0.4);
		const out = await encode(canvas, fmt, req);
		progress(0.9);
		ctx.postMessage(
			{ id, type: 'done', buffer: out.buffer, mime: out.mime, pdf: out.pdf, width: t.width, height: t.height, srcWidth, srcHeight },
			[out.buffer]
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		ctx.postMessage({ id, type: 'error', message, retryMain: e instanceof DecodeError && !req.bitmap && req.kind !== 'tiff' && req.kind !== 'psd' });
	} finally {
		dispose(src);
		dispose(canvas);
	}
}

ctx.onmessage = (e) => {
	void run(e.data);
};
