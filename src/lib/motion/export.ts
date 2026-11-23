// Exportação de animações Lottie: JSON, .lottie, GIF, MP4, WebM, PNG (quadro ou sequência) e SVG (quadro).
// Só navegador (canvas, WebCodecs, lottie-web), mas seguro para SSR: nada toca window/document no topo do módulo
// e as libs pesadas (lottie-web, gifenc, mp4-muxer) são importadas sob demanda.
import { zipSync, type Zippable } from 'fflate';
import { writeDotLottie } from './lottie-tools.ts';
import type { LottieJSON } from './types.ts';
import type { AnimationItem, LottiePlayer } from 'lottie-web';

export type ExportFormat = 'json' | 'lottie' | 'gif' | 'mp4' | 'webm' | 'png-sequence' | 'png' | 'svg';

export type ExportOptions = {
	/** Multiplicador do tamanho da composição (1 = w×h originais). */
	scale: number;
	/** FPS de saída (GIF/vídeo/sequência). Padrão: o da animação (GIF limitado a 50). */
	fps?: number;
	/** Cor CSS de fundo; null = transparente (MP4 não tem alfa: vira branco). */
	background: string | null;
	/** 0..1: cores do GIF / bitrate do vídeo. Padrão 0.8. */
	quality?: number;
	/** Bitrate explícito (bits/s) para MP4/WebM; tem prioridade sobre `quality`. */
	bitrate?: number;
	/** Quadro (relativo a `ip`) para PNG/SVG. */
	frame?: number;
	/** GIF: repetir para sempre (padrão true). */
	loop?: boolean;
	/** Nome usado no id do .lottie. */
	name?: string;
};

export type FrameRenderer = {
	width: number;
	height: number;
	/** Quadros da animação (op - ip). */
	frames: number;
	fps: number;
	/** Renderiza o quadro (relativo a `ip`, aceita fração). Devolve SEMPRE o mesmo canvas: consuma antes do próximo render. */
	render(frame: number): Promise<HTMLCanvasElement>;
	destroy(): void;
};

export type ExportSupport = Record<ExportFormat, boolean> & {
	/** WebM com transparência (VP9/VP8 + alpha via WebCodecs). */
	webmAlpha: boolean;
	/** WebM só via MediaRecorder (tempo real, sem WebCodecs). */
	webmRealtime: boolean;
};

type Progress = ((v: number) => void) | undefined;

// =====================================================================
// Utilidades
// =====================================================================

let lottiePromise: Promise<LottiePlayer> | null = null;
function loadLottie(): Promise<LottiePlayer> {
	lottiePromise ??= import('lottie-web').then((m) => ((m as { default?: unknown }).default ?? m) as LottiePlayer);
	return lottiePromise;
}

function abortError() {
	return new DOMException('Exportação cancelada.', 'AbortError');
}

function check(signal?: AbortSignal) {
	if (signal?.aborted) throw abortError();
}

/** Devolve o controle à UI (barra de progresso) sem o atraso de setTimeout em abas de fundo. */
function yieldUI(): Promise<void> {
	const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
	if (s?.yield) return s.yield();
	return new Promise((r) => {
		const ch = new MessageChannel();
		ch.port1.onmessage = () => r();
		ch.port2.postMessage(0);
	});
}

function outSize(json: LottieJSON, opts: { width?: number; height?: number; scale?: number }) {
	const s = opts.scale && opts.scale > 0 ? opts.scale : 1;
	return {
		width: Math.max(1, Math.round(opts.width ?? json.w * s)),
		height: Math.max(1, Math.round(opts.height ?? json.h * s))
	};
}

/** Quadros-fonte para um FPS de saída (mantém a duração). */
function frameTimes(frames: number, srcFps: number, outFps: number): number[] {
	const dur = frames / srcFps;
	const n = Math.max(1, Math.round(dur * outFps));
	const step = srcFps / outFps;
	return Array.from({ length: n }, (_, i) => Math.min(frames - 0.001, i * step));
}

function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', q?: number): Promise<Blob> {
	return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem.'))), type, q));
}

function waitLoaded(anim: AnimationItem, ms = 20000): Promise<void> {
	return new Promise((res, rej) => {
		if ((anim as unknown as { isLoaded: boolean }).isLoaded) return setTimeout(res, 0);
		const t = setTimeout(() => rej(new Error('Tempo esgotado carregando a animação (fontes ou imagens).')), ms);
		const ok = () => (clearTimeout(t), res());
		const fail = (e?: unknown) => {
			clearTimeout(t);
			const native = (e as { nativeError?: unknown } | undefined)?.nativeError;
			const why = native instanceof Error ? native.message : native ? String(native) : '';
			rej(new Error('A animação não pôde ser carregada' + (why ? `: ${why}` : '.')));
		};
		anim.addEventListener('DOMLoaded', ok);
		anim.addEventListener('data_failed', fail);
		anim.addEventListener('error', fail);
	});
}

// =====================================================================
// Renderizador de quadros (lottie-web, renderer canvas, fora da tela)
// =====================================================================

/**
 * O renderer canvas do lottie-web só desenha texto com glifos embutidos (`chars`): sem eles, quebra
 * (getCharData em `chars` null). Nesses casos usamos o renderer SVG rasterizado quadro a quadro.
 */
export function needsSvgRaster(json: LottieJSON): boolean {
	if (Array.isArray(json.chars) && json.chars.length) return false;
	const lists = [json.layers, ...(json.assets ?? []).map((a) => a?.layers).filter(Array.isArray)];
	return lists.some((ls) => ls.some((l: { ty?: number } | null) => l?.ty === 5));
}

function offscreenBox(width: number, height: number) {
	// Precisa estar no DOM (o SVG mede textos), mas fora da área visível.
	const box = document.createElement('div');
	box.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;overflow:hidden;pointer-events:none;contain:strict;`;
	box.setAttribute('aria-hidden', 'true');
	document.body.appendChild(box);
	return box;
}

export async function createFrameRenderer(
	json: LottieJSON,
	opts: {
		width?: number;
		height?: number;
		scale?: number;
		background?: string | null;
		/** Canvas otimizado para getImageData (GIF). */
		readback?: boolean;
		/** 'auto' (padrão) = canvas, ou SVG rasterizado se houver texto sem glifos. */
		renderer?: 'auto' | 'canvas' | 'svg';
	} = {}
): Promise<FrameRenderer> {
	const lottie = await loadLottie();
	const { width, height } = outSize(json, opts);
	const useSvg = opts.renderer === 'svg' || (opts.renderer !== 'canvas' && needsSvgRaster(json));
	const out = document.createElement('canvas');
	out.width = width;
	out.height = height;
	const ctx = out.getContext('2d', { willReadFrequently: !!opts.readback })!;
	const frames = Math.max(1, json.op - json.ip);
	const bg = opts.background ?? null;
	let dead = false;

	let anim: AnimationItem;
	let draw: () => Promise<void>;
	let cleanup: () => void;
	if (useSvg) {
		const box = offscreenBox(width, height);
		anim = lottie.loadAnimation({
			container: box,
			renderer: 'svg',
			loop: false,
			autoplay: false,
			animationData: structuredClone(json),
			rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
		});
		cleanup = () => box.remove();
		const ser = new XMLSerializer();
		draw = async () => {
			const svg = box.querySelector('svg');
			if (!svg) return;
			svg.setAttribute('width', String(width));
			svg.setAttribute('height', String(height));
			const url = URL.createObjectURL(new Blob([ser.serializeToString(svg)], { type: 'image/svg+xml' }));
			try {
				const img = new Image();
				img.src = url;
				await img.decode();
				ctx.drawImage(img, 0, 0, width, height);
			} finally {
				URL.revokeObjectURL(url);
			}
		};
	} else {
		// O lottie desenha num canvas destacado do DOM (contexto próprio, dpr 1); copiamos para o canvas de saída com fundo.
		const src = document.createElement('canvas');
		src.width = width;
		src.height = height;
		anim = lottie.loadAnimation({
			renderer: 'canvas',
			loop: false,
			autoplay: false,
			animationData: structuredClone(json),
			rendererSettings: { context: src.getContext('2d')!, clearCanvas: true, preserveAspectRatio: 'xMidYMid meet', dpr: 1 }
		} as unknown as Parameters<LottiePlayer['loadAnimation']>[0]);
		cleanup = () => (src.width = src.height = 0);
		draw = async () => ctx.drawImage(src, 0, 0);
	}
	try {
		await waitLoaded(anim);
	} catch (e) {
		anim.destroy();
		cleanup();
		throw e;
	}
	if (!useSvg) anim.resize(width, height);
	return {
		width,
		height,
		frames,
		fps: json.fr,
		async render(frame: number) {
			if (dead) throw new Error('Renderizador já destruído.');
			anim.goToAndStop(Math.max(0, Math.min(frame, frames - 0.001)), true);
			ctx.clearRect(0, 0, width, height);
			if (bg) {
				ctx.fillStyle = bg;
				ctx.fillRect(0, 0, width, height);
			}
			await draw();
			return out;
		},
		destroy() {
			if (dead) return;
			dead = true;
			anim.destroy();
			cleanup();
			out.width = out.height = 0; // libera memória do canvas
		}
	};
}

// =====================================================================
// SVG (quadro único, renderer svg do lottie)
// =====================================================================

async function exportSvg(json: LottieJSON, opts: ExportOptions): Promise<Blob> {
	const lottie = await loadLottie();
	const { width, height } = outSize(json, opts);
	const box = offscreenBox(width, height);
	const anim = lottie.loadAnimation({
		container: box,
		renderer: 'svg',
		loop: false,
		autoplay: false,
		animationData: structuredClone(json),
		rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
	});
	try {
		await waitLoaded(anim);
		const frames = Math.max(1, json.op - json.ip);
		anim.goToAndStop(Math.max(0, Math.min(opts.frame ?? 0, frames - 0.001)), true);
		const svg = box.querySelector('svg');
		if (!svg) throw new Error('O lottie não gerou SVG.');
		const el = svg.cloneNode(true) as SVGSVGElement;
		el.removeAttribute('style');
		el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		el.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		el.setAttribute('width', String(width));
		el.setAttribute('height', String(height));
		if (!el.getAttribute('viewBox')) el.setAttribute('viewBox', `0 0 ${json.w} ${json.h}`);
		if (opts.background) {
			const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			r.setAttribute('x', '0');
			r.setAttribute('y', '0');
			r.setAttribute('width', String(json.w));
			r.setAttribute('height', String(json.h));
			r.setAttribute('fill', opts.background);
			el.insertBefore(r, el.querySelector(':scope > g'));
		}
		const text = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(el);
		return new Blob([text], { type: 'image/svg+xml' });
	} finally {
		anim.destroy();
		box.remove();
	}
}

// =====================================================================
// GIF (gifenc)
// =====================================================================

type GifEnc = {
	GIFEncoder(): {
		writeFrame(index: Uint8Array, w: number, h: number, o?: Record<string, unknown>): void;
		finish(): void;
		bytes(): Uint8Array;
	};
	quantize(rgba: Uint8Array | Uint8ClampedArray, max: number, o?: Record<string, unknown>): number[][];
	applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
};

async function exportGif(json: LottieJSON, opts: ExportOptions, onProgress: Progress, signal?: AbortSignal): Promise<Blob> {
	// @ts-ignore gifenc não publica tipos
	const { GIFEncoder, quantize, applyPalette } = (await import('gifenc')) as GifEnc;
	const r = await createFrameRenderer(json, { scale: opts.scale, background: opts.background, readback: true });
	try {
		const transparent = !opts.background;
		// GIF guarda atraso em centésimos: acima de 50 fps os navegadores tratam como lento.
		const fps = Math.min(50, opts.fps ?? r.fps, r.fps);
		const times = frameTimes(r.frames, r.fps, fps);
		const { width: w, height: h } = r;
		const ctx = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;
		const q = Math.max(0, Math.min(1, opts.quality ?? 0.8));
		const maxColors = Math.max(8, Math.round(32 + q * 224)) - (transparent ? 1 : 0);

		// Paleta global de alguns quadros amostrados (estável entre quadros: sem "cintilar").
		const samples = Math.min(times.length, 8);
		const budget = 600_000; // pixels para o quantizador
		const per = Math.max(1, Math.ceil((w * h * samples) / budget));
		const pool: number[] = [];
		for (let s = 0; s < samples; s++) {
			check(signal);
			const t = times[Math.floor((s * times.length) / samples)];
			const d = ctx(await r.render(t)).getImageData(0, 0, w, h).data;
			for (let p = 0; p < d.length; p += 4 * per) {
				if (transparent && d[p + 3] < 128) continue;
				pool.push(d[p], d[p + 1], d[p + 2], 255);
			}
			onProgress?.(0.1 * ((s + 1) / samples));
		}
		if (!pool.length) pool.push(0, 0, 0, 255);
		let palette = quantize(new Uint8Array(pool), maxColors, { format: 'rgb565' });
		if (transparent) palette = [[0, 0, 0], ...palette]; // índice 0 = transparente

		const gif = GIFEncoder();
		for (let i = 0; i < times.length; i++) {
			check(signal);
			const d = ctx(await r.render(times[i])).getImageData(0, 0, w, h).data;
			let index: Uint8Array;
			if (transparent) {
				index = applyPalette(d, palette.slice(1), 'rgb565');
				for (let p = 0, n = 0; n < index.length; p += 4, n++) index[n] = d[p + 3] < 128 ? 0 : index[n] + 1;
			} else index = applyPalette(d, palette, 'rgb565');
			gif.writeFrame(index, w, h, {
				palette: i === 0 ? palette : undefined,
				// GIF guarda centésimos: distribui o arredondamento para a duração total bater (ex.: 30 fps = 30/40/30 ms).
				delay: (Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps)) * 10,
				repeat: opts.loop === false ? -1 : 0,
				transparent,
				transparentIndex: 0
			});
			onProgress?.(0.1 + 0.9 * ((i + 1) / times.length));
			if (i % 4 === 3) await yieldUI();
		}
		gif.finish();
		return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
	} finally {
		r.destroy();
	}
}

// =====================================================================
// Vídeo (WebCodecs)
// =====================================================================

const even = (v: number) => Math.max(2, v - (v % 2));

function defaultBitrate(w: number, h: number, fps: number, q = 0.8) {
	const bpp = 0.05 + 0.2 * Math.max(0, Math.min(1, q)); // bits por pixel por quadro
	return Math.round(Math.min(50e6, Math.max(250e3, w * h * fps * bpp)));
}

/** Codecs H.264 do mais compatível (baseline) ao mais capaz, com nível suficiente para a resolução. */
function avcCandidates(w: number, h: number): string[] {
	const mbs = Math.ceil(w / 16) * Math.ceil(h / 16);
	const levels: [string, number][] = [
		['1F', 3600],
		['28', 8192],
		['32', 22080],
		['33', 36864],
		['34', 36864]
	];
	const ok = levels.filter(([, max]) => max >= mbs).map(([l]) => l);
	const list: string[] = [];
	for (const l of ok.length ? ok : ['34']) for (const p of ['42E0', '4D40', '6400']) list.push(`avc1.${p}${l}`);
	return list;
}

const VP_CANDIDATES = ['vp09.00.10.08', 'vp09.00.31.08', 'vp09.00.41.08', 'vp09.00.51.08', 'vp8'];

async function pickConfig(codecs: string[], base: Omit<VideoEncoderConfig, 'codec'>): Promise<VideoEncoderConfig | null> {
	if (typeof VideoEncoder === 'undefined') return null;
	for (const codec of codecs) {
		try {
			const cfg = { ...base, codec } as VideoEncoderConfig;
			const s = await VideoEncoder.isConfigSupported(cfg);
			if (s.supported) return { ...cfg, ...(s.config ?? {}) } as VideoEncoderConfig;
		} catch {
			/* codec desconhecido: tenta o próximo */
		}
	}
	return null;
}

type EncodedOut = { data: Uint8Array; alpha?: Uint8Array; key: boolean; ts: number; dur: number };

/** Laço comum: renderiza, codifica com controle de fila e cancela rápido. */
async function encodeFrames(
	r: FrameRenderer,
	cfg: VideoEncoderConfig,
	fps: number,
	onChunk: (c: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) => void,
	onProgress: Progress,
	signal?: AbortSignal
) {
	let failure: Error | null = null;
	const enc = new VideoEncoder({
		output: (c, m) => {
			try {
				onChunk(c, m);
			} catch (e) {
				failure = e as Error;
			}
		},
		error: (e) => (failure = e as Error)
	});
	const onAbort = () => {
		try {
			if (enc.state !== 'closed') enc.close();
		} catch {
			/* já fechado */
		}
	};
	signal?.addEventListener('abort', onAbort, { once: true });
	try {
		enc.configure(cfg);
		const times = frameTimes(r.frames, r.fps, fps);
		const gop = Math.max(1, Math.round(fps * 2)); // keyframe a cada ~2 s
		const usDur = 1e6 / fps;
		for (let i = 0; i < times.length; i++) {
			check(signal);
			if (failure) throw failure;
			while (enc.encodeQueueSize > 4) {
				await new Promise<void>((res) => {
					const t = setTimeout(res, 20);
					enc.addEventListener('dequeue', () => (clearTimeout(t), res()), { once: true });
				});
				check(signal);
			}
			const canvas = await r.render(times[i]);
			const frame = new VideoFrame(canvas, { timestamp: Math.round(i * usDur), duration: Math.round(usDur) });
			try {
				enc.encode(frame, { keyFrame: i % gop === 0 });
			} finally {
				frame.close();
			}
			onProgress?.(0.95 * ((i + 1) / times.length));
			if (i % 2 === 1) await yieldUI();
		}
		await enc.flush();
		if (failure) throw failure;
	} catch (e) {
		if (signal?.aborted) throw abortError();
		throw e;
	} finally {
		signal?.removeEventListener('abort', onAbort);
		onAbort();
	}
}

async function exportMp4(json: LottieJSON, opts: ExportOptions, onProgress: Progress, signal?: AbortSignal): Promise<Blob> {
	if (typeof VideoEncoder === 'undefined') throw new Error('Este navegador não tem WebCodecs (VideoEncoder): exporte em GIF ou WebM.');
	const size = outSize(json, opts);
	const width = even(size.width);
	const height = even(size.height);
	const fps = Math.min(opts.fps ?? json.fr, 120);
	const cfg = await pickConfig(avcCandidates(width, height), {
		width,
		height,
		bitrate: opts.bitrate ?? defaultBitrate(width, height, fps, opts.quality),
		framerate: fps,
		latencyMode: 'quality',
		avc: { format: 'avc' }
	} as Omit<VideoEncoderConfig, 'codec'>);
	if (!cfg) throw new Error(`H.264 não suportado neste navegador para ${width}×${height}. Tente uma escala menor ou WebM.`);
	const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
	const target = new ArrayBufferTarget();
	const muxer = new Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
	// MP4 não tem alfa: fundo obrigatório.
	const r = await createFrameRenderer(json, { width, height, background: opts.background ?? '#ffffff' });
	try {
		await encodeFrames(r, cfg, fps, (c, m) => muxer.addVideoChunk(c, m), onProgress, signal);
		muxer.finalize();
		onProgress?.(1);
		return new Blob([target.buffer], { type: 'video/mp4' });
	} finally {
		r.destroy();
	}
}

async function exportWebm(json: LottieJSON, opts: ExportOptions, onProgress: Progress, signal?: AbortSignal): Promise<Blob> {
	const size = outSize(json, opts);
	const width = even(size.width);
	const height = even(size.height);
	const fps = Math.min(opts.fps ?? json.fr, 120);
	const bitrate = opts.bitrate ?? defaultBitrate(width, height, fps, opts.quality);
	const wantAlpha = !opts.background;
	const base = { width, height, bitrate, framerate: fps, latencyMode: 'quality' } as Omit<VideoEncoderConfig, 'codec'>;
	let cfg = wantAlpha ? await pickConfig(VP_CANDIDATES, { ...base, alpha: 'keep' } as Omit<VideoEncoderConfig, 'codec'>) : null;
	const alpha = !!cfg;
	cfg ??= await pickConfig(VP_CANDIDATES, base);
	if (!cfg) return recordWebm(json, { ...opts, fps }, width, height, bitrate, onProgress, signal);

	// Sem alfa disponível, um fundo transparente viraria preto: usa branco.
	const bg = alpha ? null : (opts.background ?? '#ffffff');
	const r = await createFrameRenderer(json, { width, height, background: bg });
	const chunks: EncodedOut[] = [];
	try {
		await encodeFrames(
			r,
			cfg,
			fps,
			(c, m) => {
				const data = new Uint8Array(c.byteLength);
				c.copyTo(data);
				const side = (m as { alphaSideData?: BufferSource } | undefined)?.alphaSideData;
				const a = side ? new Uint8Array(ArrayBuffer.isView(side) ? side.buffer.slice(side.byteOffset, side.byteOffset + side.byteLength) : side.slice(0)) : undefined;
				chunks.push({ data, alpha: a?.length ? a : undefined, key: c.type === 'key', ts: c.timestamp / 1000, dur: (c.duration ?? 1e6 / fps) / 1000 });
			},
			onProgress,
			signal
		);
		const codecId = cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9';
		const bytes = muxWebm(chunks, { width, height, codecId, alpha, durationMs: (chunks.length * 1000) / fps });
		onProgress?.(1);
		return new Blob([bytes as BlobPart], { type: 'video/webm' });
	} finally {
		r.destroy();
	}
}

/** Fallback sem WebCodecs: MediaRecorder num canvas, um quadro por vez em tempo real (demora a duração da animação). */
async function recordWebm(
	json: LottieJSON,
	opts: ExportOptions,
	width: number,
	height: number,
	bitrate: number,
	onProgress: Progress,
	signal?: AbortSignal
): Promise<Blob> {
	if (typeof MediaRecorder === 'undefined') throw new Error('Este navegador não consegue gerar WebM (sem WebCodecs nem MediaRecorder).');
	const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
	if (!mime) throw new Error('Este navegador não grava WebM.');
	const fps = opts.fps ?? json.fr;
	const r = await createFrameRenderer(json, { width, height, background: opts.background ?? '#ffffff' });
	try {
		const canvas = await r.render(0);
		const stream = canvas.captureStream(0);
		const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
		const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
		const parts: Blob[] = [];
		rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
		const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
		rec.start();
		const times = frameTimes(r.frames, r.fps, fps);
		const t0 = performance.now();
		try {
			for (let i = 0; i < times.length; i++) {
				check(signal);
				await r.render(times[i]);
				track.requestFrame?.();
				onProgress?.((i + 1) / times.length);
				const wait = t0 + ((i + 1) * 1000) / fps - performance.now();
				if (wait > 0) await new Promise((res) => setTimeout(res, wait));
			}
		} finally {
			rec.stop();
			await stopped;
			track.stop();
		}
		return new Blob(parts, { type: 'video/webm' });
	} finally {
		r.destroy();
	}
}

// =====================================================================
// Muxer WebM mínimo (EBML): SeekHead, Info, Tracks, Clusters (SimpleBlock/BlockGroup+alfa) e Cues
// =====================================================================

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
	let o = 0;
	for (const p of parts) (out.set(p, o), (o += p.length));
	return out;
}

function idBytes(id: number): Uint8Array {
	const b: number[] = [];
	for (let v = id; v > 0; v = Math.floor(v / 256)) b.unshift(v & 0xff);
	return new Uint8Array(b);
}

function vint(n: number): Uint8Array {
	for (let len = 1; len <= 8; len++) {
		if (n < 2 ** (7 * len) - 1) {
			const out = new Uint8Array(len);
			let v = n;
			for (let i = len - 1; i >= 0; i--) (out[i] = v % 256, (v = Math.floor(v / 256)));
			out[0] |= 1 << (8 - len);
			return out;
		}
	}
	throw new Error('Elemento EBML grande demais.');
}

const ebml = (id: number, ...children: Uint8Array[]) => {
	const body = concat(children);
	return concat([idBytes(id), vint(body.length), body]);
};

function uintBytes(v: number, fixed?: number): Uint8Array {
	const b: number[] = [];
	for (let x = v; x > 0; x = Math.floor(x / 256)) b.unshift(x % 256);
	while (b.length < (fixed ?? 1)) b.unshift(0);
	return new Uint8Array(b);
}

const eUint = (id: number, v: number, fixed?: number) => ebml(id, uintBytes(v, fixed));
const eStr = (id: number, s: string) => ebml(id, new TextEncoder().encode(s));
const eFloat = (id: number, v: number) => {
	const b = new Uint8Array(8);
	new DataView(b.buffer).setFloat64(0, v);
	return ebml(id, b);
};

/** Cabeçalho do bloco: trilha 1, tempo relativo ao cluster (int16), flags. */
function blockHeader(rel: number, flags: number) {
	const b = new Uint8Array(4);
	b[0] = 0x81;
	new DataView(b.buffer).setInt16(1, rel);
	b[3] = flags;
	return b;
}

export function muxWebm(
	chunks: EncodedOut[],
	o: { width: number; height: number; codecId: 'V_VP8' | 'V_VP9'; alpha: boolean; durationMs: number }
): Uint8Array {
	const header = ebml(
		0x1a45dfa3,
		eUint(0x4286, 1),
		eUint(0x42f7, 1),
		eUint(0x42f2, 4),
		eUint(0x42f3, 8),
		eStr(0x4282, 'webm'),
		eUint(0x4287, 4),
		eUint(0x4285, 2)
	);
	const info = ebml(0x1549a966, eUint(0x2ad7b1, 1_000_000), eStr(0x4d80, 'gus-utilitybelt'), eStr(0x5741, 'gus-utilitybelt'), eFloat(0x4489, o.durationMs));
	const video = ebml(0xe0, eUint(0xb0, o.width), eUint(0xba, o.height), ...(o.alpha ? [eUint(0x53c0, 1)] : []));
	const tracks = ebml(
		0x1654ae6b,
		ebml(
			0xae,
			eUint(0xd7, 1),
			eUint(0x73c5, 1),
			eUint(0x83, 1),
			eStr(0x86, o.codecId),
			eUint(0x9c, 0),
			...(o.alpha ? [eUint(0x55ee, 1)] : []),
			video
		)
	);

	// Clusters: novo a cada keyframe (ou se o tempo relativo estourar o int16).
	const clusters: { ts: number; bytes: Uint8Array }[] = [];
	let cur: { ts: number; blocks: Uint8Array[] } | null = null;
	let prevTs = 0;
	const flush = () => {
		if (cur) clusters.push({ ts: cur.ts, bytes: ebml(0x1f43b675, eUint(0xe7, cur.ts), ...cur.blocks) });
	};
	for (const c of chunks) {
		const ts = Math.round(c.ts);
		if (!cur || c.key || ts - cur.ts > 30000) {
			flush();
			cur = { ts, blocks: [] };
		}
		const rel = ts - cur.ts;
		if (c.alpha) {
			// BlockGroup: Block + BlockAdditions (alfa, BlockAddID 1) + ReferenceBlock em quadros delta.
			const parts = [
				ebml(0xa1, blockHeader(rel, 0), c.data),
				ebml(0x75a1, ebml(0xa6, eUint(0xee, 1), ebml(0xa5, c.alpha)))
			];
			if (!c.key) {
				const ref = new Uint8Array(2);
				new DataView(ref.buffer).setInt16(0, Math.max(-32768, prevTs - ts));
				parts.push(ebml(0xfb, ref));
			}
			cur.blocks.push(ebml(0xa0, ...parts));
		} else {
			cur.blocks.push(ebml(0xa3, blockHeader(rel, c.key ? 0x80 : 0), c.data));
		}
		prevTs = ts;
	}
	flush();

	// Posições relativas ao início dos dados do Segment. SeekHead tem tamanho fixo (posições em 8 bytes).
	const seekHead = (pInfo: number, pTracks: number, pCues: number) =>
		ebml(
			0x114d9b74,
			ebml(0x4dbb, ebml(0x53ab, idBytes(0x1549a966)), eUint(0x53ac, pInfo, 8)),
			ebml(0x4dbb, ebml(0x53ab, idBytes(0x1654ae6b)), eUint(0x53ac, pTracks, 8)),
			ebml(0x4dbb, ebml(0x53ab, idBytes(0x1c53bb6b)), eUint(0x53ac, pCues, 8))
		);
	const shLen = seekHead(0, 0, 0).length;
	const pInfo = shLen;
	const pTracks = pInfo + info.length;
	let pos = pTracks + tracks.length;
	const cuePoints: Uint8Array[] = [];
	for (const c of clusters) {
		cuePoints.push(ebml(0xbb, eUint(0xb3, c.ts), ebml(0xb7, eUint(0xf7, 1), eUint(0xf1, pos))));
		pos += c.bytes.length;
	}
	const cues = ebml(0x1c53bb6b, ...cuePoints);
	const segment = ebml(0x18538067, seekHead(pInfo, pTracks, pos), info, tracks, ...clusters.map((c) => c.bytes), cues);
	return concat([header, segment]);
}

// =====================================================================
// API principal
// =====================================================================

export async function exportAnimation(
	json: LottieJSON,
	format: ExportFormat,
	opts: ExportOptions,
	onProgress?: (v: number) => void,
	signal?: AbortSignal
): Promise<Blob> {
	check(signal);
	onProgress?.(0);
	let out: Blob;
	switch (format) {
		case 'json':
			out = new Blob([JSON.stringify(json)], { type: 'application/json' });
			break;
		case 'lottie':
			out = await writeDotLottie(json, opts.name ?? (typeof json.nm === 'string' && json.nm ? json.nm : 'animation'));
			break;
		case 'svg':
			out = await exportSvg(json, opts);
			break;
		case 'png': {
			const r = await createFrameRenderer(json, { scale: opts.scale, background: opts.background });
			try {
				out = await canvasToBlob(await r.render(opts.frame ?? 0));
			} finally {
				r.destroy();
			}
			break;
		}
		case 'png-sequence': {
			const r = await createFrameRenderer(json, { scale: opts.scale, background: opts.background });
			try {
				const times = frameTimes(r.frames, r.fps, opts.fps ?? r.fps);
				const pad = Math.max(4, String(times.length).length);
				const zip: Zippable = {};
				for (let i = 0; i < times.length; i++) {
					check(signal);
					const b = await canvasToBlob(await r.render(times[i]));
					zip[`frame_${String(i + 1).padStart(pad, '0')}.png`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
					onProgress?.(0.98 * ((i + 1) / times.length));
				}
				out = new Blob([zipSync(zip) as BlobPart], { type: 'application/zip' });
			} finally {
				r.destroy();
			}
			break;
		}
		case 'gif':
			out = await exportGif(json, opts, onProgress, signal);
			break;
		case 'mp4':
			out = await exportMp4(json, opts, onProgress, signal);
			break;
		case 'webm':
			out = await exportWebm(json, opts, onProgress, signal);
			break;
		default:
			throw new Error(`Formato desconhecido: ${format as string}`);
	}
	check(signal);
	onProgress?.(1);
	return out;
}

/** O que este navegador consegue exportar (checa WebCodecs com uma resolução típica, 1280×720 @30). */
export async function exportSupport(): Promise<ExportSupport> {
	const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
	const base = { width: 1280, height: 720, bitrate: 4e6, framerate: 30 } as Omit<VideoEncoderConfig, 'codec'>;
	const mp4 = browser && !!(await pickConfig(avcCandidates(1280, 720), { ...base, avc: { format: 'avc' } } as Omit<VideoEncoderConfig, 'codec'>));
	const vp = browser && !!(await pickConfig(VP_CANDIDATES, base));
	const webmAlpha = browser && !!(await pickConfig(VP_CANDIDATES, { ...base, alpha: 'keep' } as Omit<VideoEncoderConfig, 'codec'>));
	const webmRealtime =
		browser &&
		!vp &&
		typeof MediaRecorder !== 'undefined' &&
		typeof HTMLCanvasElement !== 'undefined' &&
		'captureStream' in HTMLCanvasElement.prototype &&
		['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].some((m) => MediaRecorder.isTypeSupported(m));
	return {
		json: true,
		lottie: true,
		svg: browser,
		png: browser,
		'png-sequence': browser,
		gif: browser,
		mp4,
		webm: vp || webmRealtime,
		webmAlpha,
		webmRealtime
	};
}
