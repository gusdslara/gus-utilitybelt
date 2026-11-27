// Worker do scanner/PDF: decodifica, detecta o documento, recorta em perspectiva, aplica filtros e
// codifica as páginas do PDF. Tudo local. Criado com `new Worker(new URL('./scan.worker.ts', import.meta.url), { type: 'module' })`.
import { zlibSync } from 'fflate';
import { detectQuad } from './detect.ts';
import { enhance, packBits } from './enhance.ts';
import { isFullQuad, outputSize, scaleQuad, dist, type Quad } from './geometry.ts';
import { rotateRgba, warpPerspective, type Rgba } from './warp.ts';
import { layoutPage, targetPixels, QUALITY } from '../pdf/layout.ts';
import { jpegInfo, type PdfImage } from '../pdf/writer.ts';
import type { PageParams, Req, Res } from './protocol.ts';

const ctx = self as unknown as {
	postMessage(msg: Res, transfer?: Transferable[]): void;
	onmessage: ((e: MessageEvent<Req>) => void) | null;
};

// Cache das últimas origens decodificadas (trocar filtro/recorte não decodifica de novo).
const cache = new Map<string, Promise<ImageBitmap>>();
function source(key: string, src: Blob): Promise<ImageBitmap> {
	let p = cache.get(key);
	if (p) {
		cache.delete(key);
		cache.set(key, p);
		return p;
	}
	p = createImageBitmap(src, { imageOrientation: 'from-image' });
	p.catch(() => cache.delete(key));
	cache.set(key, p);
	while (cache.size > 3) {
		const [k, v] = cache.entries().next().value!;
		cache.delete(k);
		v.then((b) => b.close()).catch(() => {});
	}
	return p;
}

function canvas(w: number, h: number) {
	const c = new OffscreenCanvas(w, h);
	const g = c.getContext('2d', { willReadFrequently: true })!;
	return { c, g };
}

/** Desenha (reduzindo com qualidade) sobre fundo branco e lê os pixels. */
function readPixels(src: ImageBitmap | OffscreenCanvas, w: number, h: number): Rgba {
	const { g } = canvas(w, h);
	g.fillStyle = '#fff';
	g.fillRect(0, 0, w, h);
	g.imageSmoothingEnabled = true;
	g.imageSmoothingQuality = 'high';
	g.drawImage(src, 0, 0, w, h);
	const d = g.getImageData(0, 0, w, h);
	return { data: d.data, width: w, height: h };
}

function toCanvas(img: Rgba) {
	const { c, g } = canvas(img.width, img.height);
	g.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
	return c;
}

/** Tamanho final (antes do giro) que a página teria sem limite. */
function naturalSize(bmp: ImageBitmap, p: PageParams) {
	if (p.quad && !isFullQuad(p.quad)) return outputSize(scaleQuad(p.quad, bmp.width, bmp.height), bmp.width, bmp.height);
	return { w: bmp.width, h: bmp.height };
}

/** Recorte + filtro + giro, com o lado maior limitado a `maxSide` (`upscale` > 1 permite ampliar). */
function process(bmp: ImageBitmap, p: PageParams, maxSide: number, upscale = 1): Rgba {
	const W = bmp.width, H = bmp.height;
	let img: Rgba;
	if (p.quad && !isFullQuad(p.quad)) {
		const qpx = scaleQuad(p.quad, W, H);
		const out = outputSize(qpx, W, H, maxSide, true, upscale);
		const longest = Math.max(dist(qpx[0], qpx[1]), dist(qpx[3], qpx[2]), dist(qpx[0], qpx[3]), dist(qpx[1], qpx[2]));
		// Reduz a origem antes do warp quando a saída é bem menor (evita serrilhado do bilinear).
		const s = Math.min(1, (1.3 * Math.max(out.w, out.h)) / longest);
		// (com upscale, s fica em 1: a ampliação acontece no próprio warp bilinear)
		const sw = Math.max(1, Math.round(W * s)), sh = Math.max(1, Math.round(H * s));
		const src = readPixels(bmp, sw, sh);
		img = warpPerspective(src, scaleQuad(qpx, sw / W, sh / H) as Quad, out.w, out.h);
	} else {
		const k = Math.min(upscale, maxSide / Math.max(W, H));
		img = readPixels(bmp, Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k)));
	}
	enhance(img, p.filter, { threshold: p.threshold });
	return rotateRgba(img, p.rotation);
}

const identity = (p: PageParams) => isFullQuad(p.quad) && p.rotation === 0 && p.filter === 'original';

async function detectOn(bmp: ImageBitmap | OffscreenCanvas, size: number) {
	const k = Math.min(1, size / Math.max(bmp.width, bmp.height));
	const img = readPixels(bmp, Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)));
	return detectQuad(img);
}

async function run(req: Req): Promise<{ result: unknown; transfer?: Transferable[] }> {
	switch (req.op) {
		case 'detect-frame': {
			const d = await detectOn(req.bitmap, 320);
			req.bitmap.close();
			return { result: { quad: d?.quad ?? null, score: d?.score ?? 0 } };
		}
		case 'probe': {
			const bmp = await source(req.key, req.src);
			const head = new Uint8Array(await req.src.slice(0, 4).arrayBuffer());
			let quad = null, score = 0;
			if (req.detect) {
				const d = await detectOn(bmp, 640);
				if (d) ({ quad, score } = d);
			}
			return { result: { width: bmp.width, height: bmp.height, quad, score, jpeg: head[0] === 0xff && head[1] === 0xd8 } };
		}
		case 'render': {
			const bmp = await source(req.key, req.src);
			const img = process(bmp, req.params, req.maxSide);
			const blob = await toCanvas(img).convertToBlob({ type: 'image/jpeg', quality: req.quality });
			return { result: { blob, width: img.width, height: img.height } };
		}
		case 'image': {
			const bmp = await source(req.key, req.src);
			const img = process(bmp, req.params, Infinity);
			const blob = await toCanvas(img).convertToBlob({ type: req.type, quality: req.quality });
			return { result: { blob, width: img.width, height: img.height } };
		}
		case 'pdf-page': {
			const bmp = await source(req.key, req.src);
			const q = QUALITY[req.settings.quality];
			const p = req.params;
			// Original sem edição e JPEG "reto": embute os bytes como estão (zero perda).
			if (q.passthrough && identity(p)) {
				const bytes = new Uint8Array(await req.src.arrayBuffer());
				const info = jpegInfo(bytes);
				if (info && (info.components === 3 || info.components === 1) && info.orientation <= 1) {
					const l = layoutPage(info.width, info.height, req.settings);
					const image: PdfImage = { kind: 'jpeg', bytes, width: info.width, height: info.height, gray: info.components === 1 };
					return { result: { spec: { width: l.width, height: l.height, rect: l.rect, clip: l.clip, image }, passthrough: true }, transfer: [bytes.buffer] };
				}
			}
			// Estima o tamanho final para não processar pixels que serão descartados.
			const nat = naturalSize(bmp, p);
			const [nw, nh] = p.rotation % 180 ? [nat.h, nat.w] : [nat.w, nat.h];
			const est = layoutPage(nw, nh, req.settings);
			const bw = p.filter === 'bw';
			const dpi = bw ? Math.max(300, isFinite(q.dpi) ? q.dpi : 300) : q.dpi;
			const tgt = targetPixels(nw, nh, est.rect, dpi);
			// P&B: amplia até 2× antes de binarizar (bordas do texto lisas; em 1 bit quase não pesa).
			const dpiLong = Math.max(est.rect.w, est.rect.h) / 72 * dpi;
			const img = bw ? process(bmp, p, Math.min(dpiLong, 2 * Math.max(nw, nh)), 2) : process(bmp, p, Math.max(tgt.w, tgt.h));
			const l = layoutPage(img.width, img.height, req.settings);
			let image: PdfImage;
			if (bw) {
				image = { kind: 'flate', bytes: zlibSync(packBits(img), { level: 9 }), width: img.width, height: img.height, bpc: 1, colors: 1 };
			} else if (q.passthrough && !(await isJpeg(req.src))) {
				// "Original" de PNG/WebP/etc.: sem perdas (Flate), em cinza se a imagem não tiver cor.
				image = flate(img);
			} else {
				const jpeg = new Uint8Array(await (await toCanvas(img).convertToBlob({ type: 'image/jpeg', quality: q.jpeg })).arrayBuffer());
				image = { kind: 'jpeg', bytes: jpeg, width: img.width, height: img.height };
			}
			return { result: { spec: { width: l.width, height: l.height, rect: l.rect, clip: l.clip, image }, passthrough: false }, transfer: [image.bytes.buffer as ArrayBuffer] };
		}
		case 'forget': {
			const p = cache.get(req.key);
			cache.delete(req.key);
			p?.then((b) => b.close()).catch(() => {});
			return { result: true };
		}
	}
}

async function isJpeg(b: Blob) {
	const h = new Uint8Array(await b.slice(0, 2).arrayBuffer());
	return h[0] === 0xff && h[1] === 0xd8;
}

function flate(img: Rgba): PdfImage {
	const { data, width: w, height: h } = img;
	let gray = true;
	for (let i = 0; i < data.length && gray; i += 4) if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) gray = false;
	const raw = new Uint8Array(w * h * (gray ? 1 : 3));
	for (let i = 0, j = 0; i < data.length; i += 4) {
		raw[j++] = data[i];
		if (!gray) { raw[j++] = data[i + 1]; raw[j++] = data[i + 2]; }
	}
	return { kind: 'flate', bytes: zlibSync(raw, { level: 6 }), width: w, height: h, bpc: 8, colors: gray ? 1 : 3 };
}

ctx.onmessage = async (e) => {
	const req = e.data;
	try {
		const { result, transfer } = await run(req);
		ctx.postMessage({ id: req.id, ok: true, result }, transfer);
	} catch (err) {
		ctx.postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
	}
};
