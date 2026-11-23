// I/O do editor de imagens: abrir (raster, SVG, PSD) e exportar (PNG, JPEG, WebP, AVIF, BMP, ICO, SVG vetorial, PSD em camadas).
// As partes puras (BMP, ICO, caminhos SVG, escape XML, mapeamento de mesclagem) não tocam no DOM e são testadas com `bun test`.
// O ag-psd é carregado sob demanda (`await import`) para ficar num chunk separado.
import type { BlendMode, Effects, LayerInit, OpenedDoc, Paint, ShapeData, TextData, VectorData } from './types.ts';
import { hasEffects } from './types.ts';
import type { ImageDoc, Layer } from './doc.svelte.ts';
import { makeCanvas, ctx2d, contentBounds, canvasToBlob, cloneCanvas } from './render.ts';

// =====================================================================
// Formatos
// =====================================================================

export const OPEN_ACCEPT =
	'image/*,.png,.jpg,.jpeg,.jfif,.webp,.avif,.gif,.bmp,.ico,.svg,.psd,image/vnd.adobe.photoshop,image/svg+xml';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'ico' | 'svg' | 'psd';

export type ExportOptions = {
	/** 0..1 (formatos com perda). */
	quality: number;
	/** Cor hex de fundo para formatos sem alfa. */
	background: string;
	/** Tamanhos do ICO (px, até 256). */
	icoSizes: number[];
	/** SVG: incluir camadas raster como <image> PNG embutido. */
	svgEmbedRaster: boolean;
	/** 1 = 100%. */
	scale: number;
};

export const defaultExportOptions = (): ExportOptions => ({
	quality: 0.92,
	background: '#ffffff',
	icoSizes: [16, 32, 48, 64, 128, 256],
	svgEmbedRaster: true,
	scale: 1
});

export const EXPORT_FORMATS: { id: ExportFormat; ext: string; mime: string; alpha: boolean; lossy: boolean; layered: boolean; vector: boolean }[] = [
	{ id: 'png', ext: 'png', mime: 'image/png', alpha: true, lossy: false, layered: false, vector: false },
	{ id: 'jpeg', ext: 'jpg', mime: 'image/jpeg', alpha: false, lossy: true, layered: false, vector: false },
	{ id: 'webp', ext: 'webp', mime: 'image/webp', alpha: true, lossy: true, layered: false, vector: false },
	{ id: 'avif', ext: 'avif', mime: 'image/avif', alpha: true, lossy: true, layered: false, vector: false },
	// BMP mantém transparência (32 bits BGRA, cabeçalho V4); sem transparência sai em 24 bits.
	{ id: 'bmp', ext: 'bmp', mime: 'image/bmp', alpha: true, lossy: false, layered: false, vector: false },
	{ id: 'ico', ext: 'ico', mime: 'image/x-icon', alpha: true, lossy: false, layered: false, vector: false },
	{ id: 'svg', ext: 'svg', mime: 'image/svg+xml', alpha: true, lossy: false, layered: true, vector: true },
	{ id: 'psd', ext: 'psd', mime: 'image/vnd.adobe.photoshop', alpha: true, lossy: false, layered: true, vector: false }
];

const fmtInfo = (f: ExportFormat) => EXPORT_FORMATS.find((x) => x.id === f)!;

// =====================================================================
// Partes puras (sem DOM)
// =====================================================================

export type RawImage = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

/** true se algum pixel não é totalmente opaco. */
export function hasAlpha(img: RawImage): boolean {
	const d = img.data;
	for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return true;
	return false;
}

/**
 * Codifica BMP a partir de RGBA (não pré-multiplicado). Linhas de baixo para cima.
 * Com alfa: 32 bits BGRA, BI_BITFIELDS com máscaras e BITMAPV4HEADER (sRGB). Sem alfa: 24 bits, BITMAPINFOHEADER.
 */
export function encodeBmp(img: RawImage, alpha = hasAlpha(img)): Uint8Array {
	const { width: w, height: h, data } = img;
	const headerSize = alpha ? 108 : 40;
	const stride = alpha ? w * 4 : Math.ceil((w * 3) / 4) * 4;
	const imageSize = stride * h;
	const offset = 14 + headerSize;
	const out = new Uint8Array(offset + imageSize);
	const v = new DataView(out.buffer);
	// BITMAPFILEHEADER
	out[0] = 0x42; // B
	out[1] = 0x4d; // M
	v.setUint32(2, out.length, true);
	v.setUint32(10, offset, true);
	// BITMAPINFOHEADER / V4
	v.setUint32(14, headerSize, true);
	v.setInt32(18, w, true);
	v.setInt32(22, h, true); // positivo = de baixo para cima
	v.setUint16(26, 1, true);
	v.setUint16(28, alpha ? 32 : 24, true);
	v.setUint32(30, alpha ? 3 : 0, true); // BI_BITFIELDS : BI_RGB
	v.setUint32(34, imageSize, true);
	v.setInt32(38, 2835, true); // 72 dpi
	v.setInt32(42, 2835, true);
	if (alpha) {
		v.setUint32(54, 0x00ff0000, true); // R
		v.setUint32(58, 0x0000ff00, true); // G
		v.setUint32(62, 0x000000ff, true); // B
		v.setUint32(66, 0xff000000, true); // A
		v.setUint32(70, 0x73524742, true); // LCS_sRGB ('sRGB')
		// endpoints (36 bytes) e gama (12 bytes) ficam zerados.
	}
	for (let y = 0; y < h; y++) {
		const src = (h - 1 - y) * w * 4;
		let p = offset + y * stride;
		for (let x = 0; x < w; x++) {
			const i = src + x * 4;
			out[p++] = data[i + 2];
			out[p++] = data[i + 1];
			out[p++] = data[i];
			if (alpha) out[p++] = data[i + 3];
		}
	}
	return out;
}

/** Monta um ICO com entradas PNG (Vista+). `width`/`height` até 256. */
export function encodeIco(entries: { width: number; height: number; png: Uint8Array }[]): Uint8Array {
	const n = entries.length;
	const dirSize = 6 + n * 16;
	const total = dirSize + entries.reduce((s, e) => s + e.png.length, 0);
	const out = new Uint8Array(total);
	const v = new DataView(out.buffer);
	v.setUint16(0, 0, true);
	v.setUint16(2, 1, true); // 1 = ícone
	v.setUint16(4, n, true);
	let off = dirSize;
	entries.forEach((e, i) => {
		const b = 6 + i * 16;
		out[b] = e.width >= 256 ? 0 : e.width;
		out[b + 1] = e.height >= 256 ? 0 : e.height;
		out[b + 2] = 0; // paleta
		out[b + 3] = 0;
		v.setUint16(b + 4, 1, true); // planos
		v.setUint16(b + 6, 32, true); // bits por pixel
		v.setUint32(b + 8, e.png.length, true);
		v.setUint32(b + 12, off, true);
		out.set(e.png, off);
		off += e.png.length;
	});
	return out;
}

/** Escapa texto/atributo XML (inclui aspas e remove caracteres de controle inválidos). */
export function escapeXml(s: string): string {
	return s
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Número compacto para SVG (até 3 casas). */
export const num = (v: number) => {
	const r = Math.round(v * 1000) / 1000;
	return Object.is(r, -0) ? '0' : String(r);
};

/** Construtor de `d` com a mesma semântica de Path2D (inclui arcTo). */
class SvgPath {
	private d: string[] = [];
	private cx = 0;
	private cy = 0;
	private sx = 0;
	private sy = 0;
	moveTo(x: number, y: number) {
		this.d.push(`M${num(x)} ${num(y)}`);
		this.cx = this.sx = x;
		this.cy = this.sy = y;
	}
	lineTo(x: number, y: number) {
		this.d.push(`L${num(x)} ${num(y)}`);
		this.cx = x;
		this.cy = y;
	}
	bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) {
		this.d.push(`C${num(a)} ${num(b)} ${num(c)} ${num(d)} ${num(x)} ${num(y)}`);
		this.cx = x;
		this.cy = y;
	}
	arc(rx: number, ry: number, large: boolean, sweep: boolean, x: number, y: number) {
		this.d.push(`A${num(rx)} ${num(ry)} 0 ${large ? 1 : 0} ${sweep ? 1 : 0} ${num(x)} ${num(y)}`);
		this.cx = x;
		this.cy = y;
	}
	/** Equivalente a CanvasPath.arcTo: linha até a tangente e arco até a outra tangente. */
	arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
		const x0 = this.cx, y0 = this.cy;
		const ax = x0 - x1, ay = y0 - y1, bx = x2 - x1, by = y2 - y1;
		const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
		const cross = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
		if (r <= 0 || la === 0 || lb === 0 || Math.abs(cross) < 1e-9) {
			this.lineTo(x1, y1);
			return;
		}
		const cos = (ax * bx + ay * by) / (la * lb);
		const theta = Math.acos(Math.max(-1, Math.min(1, cos)));
		const d = r / Math.tan(theta / 2);
		const t1x = x1 + (ax / la) * d, t1y = y1 + (ay / la) * d;
		const t2x = x1 + (bx / lb) * d, t2y = y1 + (by / lb) * d;
		this.lineTo(t1x, t1y);
		this.arc(r, r, false, cross > 0, t2x, t2y);
	}
	closePath() {
		this.d.push('Z');
		this.cx = this.sx;
		this.cy = this.sy;
	}
	toString() {
		return this.d.join('');
	}
}

/** Caminho SVG da forma no espaço local (0,0)-(w,h). Mesma geometria de `shapePath` (render.ts). */
export function shapeToSvgPath(s: Pick<ShapeData, 'shape' | 'w' | 'h' | 'radius' | 'sides' | 'inner' | 'strokeWidth'>): string {
	const p = new SvgPath();
	const { w, h } = s;
	const cx = w / 2, cy = h / 2;
	switch (s.shape) {
		case 'rect':
			p.moveTo(0, 0);
			p.lineTo(w, 0);
			p.lineTo(w, h);
			p.lineTo(0, h);
			p.closePath();
			break;
		case 'roundrect': {
			const x0 = Math.min(0, w), y0 = Math.min(0, h), aw = Math.abs(w), ah = Math.abs(h);
			const r = Math.max(0, Math.min(s.radius, aw / 2, ah / 2));
			p.moveTo(x0 + r, y0);
			p.lineTo(x0 + aw - r, y0);
			if (r) p.arc(r, r, false, true, x0 + aw, y0 + r);
			p.lineTo(x0 + aw, y0 + ah - r);
			if (r) p.arc(r, r, false, true, x0 + aw - r, y0 + ah);
			p.lineTo(x0 + r, y0 + ah);
			if (r) p.arc(r, r, false, true, x0, y0 + ah - r);
			p.lineTo(x0, y0 + r);
			if (r) p.arc(r, r, false, true, x0 + r, y0);
			p.closePath();
			break;
		}
		case 'ellipse': {
			const rx = Math.abs(w / 2), ry = Math.abs(h / 2);
			p.moveTo(cx + rx, cy);
			p.arc(rx, ry, true, true, cx - rx, cy);
			p.arc(rx, ry, true, true, cx + rx, cy);
			p.closePath();
			break;
		}
		case 'line':
			p.moveTo(0, 0);
			p.lineTo(w, h);
			break;
		case 'arrow': {
			const len = Math.hypot(w, h) || 1;
			const head = Math.min(len * 0.35, Math.max(14, s.strokeWidth * 4));
			const a = Math.atan2(h, w);
			p.moveTo(0, 0);
			p.lineTo(w, h);
			p.moveTo(w - head * Math.cos(a - 0.45), h - head * Math.sin(a - 0.45));
			p.lineTo(w, h);
			p.lineTo(w - head * Math.cos(a + 0.45), h - head * Math.sin(a + 0.45));
			break;
		}
		case 'triangle':
			p.moveTo(cx, 0);
			p.lineTo(w, h);
			p.lineTo(0, h);
			p.closePath();
			break;
		case 'polygon':
		case 'star': {
			const n = Math.max(3, Math.round(s.sides));
			const pts = s.shape === 'star' ? n * 2 : n;
			for (let i = 0; i < pts; i++) {
				const r = s.shape === 'star' && i % 2 ? s.inner : 1;
				const a = -Math.PI / 2 + (i * Math.PI * 2) / pts;
				const x = cx + Math.cos(a) * (w / 2) * r, y = cy + Math.sin(a) * (h / 2) * r;
				if (i) p.lineTo(x, y);
				else p.moveTo(x, y);
			}
			p.closePath();
			break;
		}
		case 'heart':
			p.moveTo(cx, h * 0.3);
			p.bezierCurveTo(cx, h * 0.1, w * 0.05, 0, w * 0.05, h * 0.32);
			p.bezierCurveTo(w * 0.05, h * 0.6, cx, h * 0.78, cx, h);
			p.bezierCurveTo(cx, h * 0.78, w * 0.95, h * 0.6, w * 0.95, h * 0.32);
			p.bezierCurveTo(w * 0.95, 0, cx, h * 0.1, cx, h * 0.3);
			p.closePath();
			break;
		case 'speech': {
			const bh = h * 0.78;
			const r = Math.min(s.radius, w / 2, bh / 2);
			p.moveTo(r, 0);
			p.arcTo(w, 0, w, bh, r);
			p.arcTo(w, bh, 0, bh, r);
			p.lineTo(w * 0.42, bh);
			p.lineTo(w * 0.2, h);
			p.lineTo(w * 0.26, bh);
			p.arcTo(0, bh, 0, 0, r);
			p.arcTo(0, 0, w, 0, r);
			p.closePath();
			break;
		}
	}
	return p.toString();
}

/** Cor CSS → cor SVG 1.1 + opacidade separada (compatível com Inkscape/Illustrator). */
export function splitColor(c: string): { color: string; opacity: number } {
	const s = c.trim();
	let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
	if (m) {
		let hex = m[1];
		if (hex.length <= 4) hex = [...hex].map((ch) => ch + ch).join('');
		const a = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
		return { color: '#' + hex.slice(0, 6).toLowerCase(), opacity: Math.round(a * 1000) / 1000 };
	}
	m = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(s);
	if (m) {
		const ch = (v: string) => Math.round(Math.max(0, Math.min(255, v.endsWith('%') ? (parseFloat(v) * 255) / 100 : parseFloat(v))));
		const al = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
		const hex = '#' + [m[1], m[2], m[3]].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
		return { color: hex, opacity: Math.round(Math.max(0, Math.min(1, al)) * 1000) / 1000 };
	}
	if (s === 'transparent') return { color: '#000000', opacity: 0 };
	return { color: s, opacity: 1 };
}

/** Atributos `<prefix>="cor" <prefix>-opacity="a"` (ou `flood-color`/`stop-color`). */
function colorAttrs(c: string, attr: string, opAttr: string): string {
	const { color, opacity } = splitColor(c);
	return ` ${attr}="${escapeXml(color)}"${opacity < 1 ? ` ${opAttr}="${num(opacity)}"` : ''}`;
}

/** Mistura hex com outra cor (mesma regra de render.ts usada na extrusão). */
export function mixHex(hex: string, toward: string, t: number): string {
	const a = parseInt(hex.slice(1, 7), 16), b = parseInt(toward.slice(1, 7), 16);
	const ch = (v: number, s: number) => (v >> s) & 255;
	const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
	return '#' + [m(16), m(8), m(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ----- Mesclagem (canvas ↔ Photoshop) -----

/** Nomes de mesclagem do ag-psd. */
export type PsdBlend = string;

const TO_PSD: Record<BlendMode, PsdBlend> = {
	'source-over': 'normal',
	multiply: 'multiply',
	screen: 'screen',
	overlay: 'overlay',
	darken: 'darken',
	lighten: 'lighten',
	'color-dodge': 'color dodge',
	'color-burn': 'color burn',
	'hard-light': 'hard light',
	'soft-light': 'soft light',
	difference: 'difference',
	exclusion: 'exclusion',
	hue: 'hue',
	saturation: 'saturation',
	color: 'color',
	luminosity: 'luminosity'
};
const FROM_PSD: Record<string, BlendMode> = Object.fromEntries(Object.entries(TO_PSD).map(([k, v]) => [v, k as BlendMode]));

export const blendToPsd = (b: BlendMode): PsdBlend => TO_PSD[b] ?? 'normal';
/** Modos sem equivalente no canvas (linear burn, vivid light, dissolve…) caem em 'source-over'. */
export const blendFromPsd = (b: string | undefined): BlendMode => (b && FROM_PSD[b]) || 'source-over';

/** Valor CSS de mix-blend-mode (null = normal). */
export const blendToCss = (b: BlendMode): string | null => (b === 'source-over' ? null : b);

// ----- Nomes -----

export function suggestName(docName: string, format: ExportFormat): string {
	const base =
		(docName || '')
			.replace(/\.(png|jpe?g|jfif|webp|avif|gif|bmp|ico|svg|psd|tiff?)$/i, '')
			.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
			.trim() || 'imagem';
	return `${base}.${fmtInfo(format).ext}`;
}

// =====================================================================
// Abrir
// =====================================================================

const MAX_SVG_SIDE = 8192;
const SVG_DEFAULT_W = 1024;

function extOf(name: string) {
	const m = /\.([a-z0-9]+)$/i.exec(name);
	return m ? m[1].toLowerCase() : '';
}

async function sniff(file: Blob): Promise<'psd' | 'svg' | 'raster'> {
	const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
	if (head[0] === 0x38 && head[1] === 0x42 && head[2] === 0x50 && head[3] === 0x53) return 'psd'; // 8BPS
	if (file.type === 'image/svg+xml') return 'svg';
	const txt = new TextDecoder().decode(head).replace(/^﻿/, '').trimStart();
	if (txt.startsWith('<') && /<svg[\s>]/i.test(txt + new TextDecoder().decode(new Uint8Array(await file.slice(512, 4096).arrayBuffer())))) return 'svg';
	return 'raster';
}

export async function openImageFile(file: Blob, name?: string): Promise<OpenedDoc> {
	const fname = name ?? (file as File).name ?? 'imagem';
	const ext = extOf(fname);
	const kind = ext === 'psd' ? 'psd' : ext === 'svg' || ext === 'svgz' ? 'svg' : await sniff(file);
	const docName = fname.replace(/\.[a-z0-9]+$/i, '') || 'imagem';
	if (kind === 'psd') return openPsd(file, docName);
	if (kind === 'svg') return openSvg(file, docName);
	return openRaster(file, docName);
}

async function decodeToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
	if (typeof createImageBitmap === 'function') {
		try {
			const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'none' });
			const c = makeCanvas(bmp.width, bmp.height);
			ctx2d(c).drawImage(bmp, 0, 0);
			bmp.close();
			return c;
		} catch {
			// cai para <img> (ex.: Safari com alguns ICO/BMP)
		}
	}
	const img = await loadImg(blob);
	const c = makeCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
	ctx2d(c).drawImage(img, 0, 0, c.width, c.height);
	return c;
}

function loadImg(blob: Blob): Promise<HTMLImageElement> {
	const url = URL.createObjectURL(blob);
	return new Promise<HTMLImageElement>((res, rej) => {
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => res(img);
		img.onerror = () => rej(new Error('Formato de imagem não suportado por este navegador.'));
		img.src = url;
	}).finally(() => setTimeout(() => URL.revokeObjectURL(url), 0));
}

async function openRaster(file: Blob, name: string): Promise<OpenedDoc> {
	const canvas = await decodeToCanvas(file);
	return { width: canvas.width, height: canvas.height, name, layers: [{ name: '', canvas }] };
}

/** Comprimento SVG → px (null se relativo/ausente). */
export function svgLength(v: string | null | undefined): number | null {
	if (!v) return null;
	const m = /^\s*([\d.]+(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in|q)?\s*$/i.exec(v);
	if (!m) return null;
	const n = parseFloat(m[1]);
	const k: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, q: 96 / 101.6 };
	const r = n * (k[(m[2] ?? 'px').toLowerCase()] ?? 1);
	return r > 0 && Number.isFinite(r) ? r : null;
}

/** Tamanho de rasterização do SVG a partir de width/height/viewBox. Limita o maior lado e amplia ícones pequenos. */
export function svgRasterSize(width: string | null, height: string | null, viewBox: string | null): { w: number; h: number } {
	const vb = viewBox?.trim().split(/[\s,]+/).map(Number);
	const vbw = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : null;
	const vbh = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : null;
	let w = svgLength(width), h = svgLength(height);
	const ratio = vbw && vbh ? vbh / vbw : w && h ? h / w : 1;
	if (w && !h) h = w * ratio;
	else if (h && !w) w = h / ratio;
	else if (!w && !h) {
		if (vbw && vbh) {
			w = vbw;
			h = vbh;
		} else {
			w = SVG_DEFAULT_W;
			h = SVG_DEFAULT_W * ratio;
		}
	}
	let W = w!, H = h!;
	// Ícones (ex.: 24×24) ficam inúteis num editor raster: amplia para 1024 no maior lado.
	const longest = Math.max(W, H);
	if (longest < 256) {
		W = (W * SVG_DEFAULT_W) / longest;
		H = (H * SVG_DEFAULT_W) / longest;
	}
	const k = Math.min(1, MAX_SVG_SIDE / Math.max(W, H));
	return { w: Math.max(1, Math.round(W * k)), h: Math.max(1, Math.round(H * k)) };
}

async function openSvg(file: Blob, name: string): Promise<OpenedDoc> {
	const text = await file.text();
	const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
	const root = xml.documentElement;
	if (!root || root.nodeName.toLowerCase() !== 'svg' || xml.getElementsByTagName('parsererror').length) throw new Error('SVG inválido.');
	const { w, h } = svgRasterSize(root.getAttribute('width'), root.getAttribute('height'), root.getAttribute('viewBox'));
	// Sem viewBox, mantém o sistema de coordenadas original e escala pelo tamanho declarado.
	if (!root.getAttribute('viewBox')) {
		const ow = svgLength(root.getAttribute('width')), oh = svgLength(root.getAttribute('height'));
		if (ow && oh) root.setAttribute('viewBox', `0 0 ${ow} ${oh}`);
	}
	root.setAttribute('width', String(w));
	root.setAttribute('height', String(h));
	const blob = new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' });
	const img = await loadImg(blob);
	const canvas = makeCanvas(w, h);
	ctx2d(canvas).drawImage(img, 0, 0, w, h);
	return { width: w, height: h, name, layers: [{ name: '', canvas }] };
}

// ----- PSD -----

type AgLayer = import('ag-psd').Layer;

/** Aplica a máscara de camada do PSD (tons de cinza → alfa) no canvas do tamanho do documento. */
function applyPsdMask(target: HTMLCanvasElement, mask: NonNullable<AgLayer['mask']>) {
	if (!mask.canvas || mask.disabled) return;
	const W = target.width, H = target.height;
	const m = makeCanvas(W, H);
	const mc = ctx2d(m, true);
	const def = (mask.defaultColor ?? 0) / 255;
	if (def > 0) {
		mc.fillStyle = `rgba(0,0,0,${def})`;
		mc.fillRect(0, 0, W, H);
	}
	const src = ctx2d(mask.canvas, true).getImageData(0, 0, mask.canvas.width, mask.canvas.height);
	const d = src.data;
	for (let i = 0; i < d.length; i += 4) {
		d[i + 3] = d[i];
		d[i] = d[i + 1] = d[i + 2] = 0;
	}
	mc.clearRect(mask.left ?? 0, mask.top ?? 0, src.width, src.height);
	mc.putImageData(src, mask.left ?? 0, mask.top ?? 0);
	const tc = ctx2d(target);
	tc.save();
	tc.globalCompositeOperation = 'destination-in';
	tc.drawImage(m, 0, 0);
	tc.restore();
}

async function openPsd(file: Blob, name: string): Promise<OpenedDoc> {
	const { readPsd } = await import('ag-psd');
	const psd = readPsd(await file.arrayBuffer(), { skipThumbnail: true, skipLinkedFilesData: true });
	const W = psd.width, H = psd.height;
	const layers: LayerInit[] = [];
	let clipBase: HTMLCanvasElement | null = null;

	const walk = (list: AgLayer[], visible: boolean, opacity: number) => {
		for (const l of list) {
			const vis = visible && !l.hidden;
			const op = opacity * (l.opacity ?? 1);
			if (l.children) {
				// Grupo: achata os filhos herdando visibilidade e opacidade.
				walk(l.children, vis, op);
				clipBase = null;
				continue;
			}
			const canvas = makeCanvas(W, H);
			if (l.canvas) ctx2d(canvas).drawImage(l.canvas, l.left ?? 0, l.top ?? 0);
			if (l.mask) applyPsdMask(canvas, l.mask);
			if (l.clipping && clipBase) {
				// Máscara de recorte: limita ao alfa da camada base (aproximação sem a opacidade da base).
				const c = ctx2d(canvas);
				c.save();
				c.globalCompositeOperation = 'destination-in';
				c.drawImage(clipBase, 0, 0);
				c.restore();
			} else if (!l.clipping) clipBase = canvas;
			layers.push({ name: l.name ?? '', canvas, visible: vis, opacity: Math.max(0, Math.min(1, op)), blend: blendFromPsd(l.blendMode) });
		}
	};
	walk(psd.children ?? [], true, 1);

	if (!layers.length) {
		const canvas = makeCanvas(W, H);
		if (psd.canvas) ctx2d(canvas).drawImage(psd.canvas, 0, 0);
		layers.push({ name: '', canvas });
	}
	return { width: W, height: H, name, layers };
}

// =====================================================================
// Exportar
// =====================================================================

let supportCache: Promise<Record<ExportFormat, boolean>> | null = null;

/** Detecta quais formatos o navegador consegue codificar (webp/avif via toBlob). */
export function exportSupport(): Promise<Record<ExportFormat, boolean>> {
	supportCache ??= (async () => {
		const test = async (mime: string) => {
			try {
				const c = makeCanvas(2, 2);
				ctx2d(c).fillRect(0, 0, 1, 1);
				const b = await new Promise<Blob | null>((r) => c.toBlob(r, mime, 0.8));
				return !!b && b.type === mime;
			} catch {
				return false;
			}
		};
		const [webp, avif] = await Promise.all([test('image/webp'), test('image/avif')]);
		return { png: true, jpeg: true, webp, avif, bmp: true, ico: true, svg: true, psd: true };
	})();
	return supportCache;
}

/** Reamostra com qualidade (reduções em etapas de 1/2). */
function resample(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
	if (src.width === w && src.height === h) return src;
	let cur = src;
	while (cur.width / 2 >= w && cur.height / 2 >= h && cur.width > 2 && cur.height > 2) {
		const half = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2));
		const c = ctx2d(half);
		c.imageSmoothingQuality = 'high';
		c.drawImage(cur, 0, 0, half.width, half.height);
		cur = half;
	}
	const out = makeCanvas(w, h);
	const c = ctx2d(out);
	c.imageSmoothingEnabled = true;
	c.imageSmoothingQuality = 'high';
	c.drawImage(cur, 0, 0, w, h);
	return out;
}

const scaledSize = (doc: ImageDoc, scale: number) => {
	const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
	return { w: Math.max(1, Math.round(doc.width * s)), h: Math.max(1, Math.round(doc.height * s)), s };
};

function onBackground(src: HTMLCanvasElement, bg: string): HTMLCanvasElement {
	const c = makeCanvas(src.width, src.height);
	const x = ctx2d(c);
	x.fillStyle = bg || '#ffffff';
	x.fillRect(0, 0, c.width, c.height);
	x.drawImage(src, 0, 0);
	return c;
}

async function blobBytes(b: Blob) {
	return new Uint8Array(await b.arrayBuffer());
}

export async function exportDoc(doc: ImageDoc, format: ExportFormat, opts: ExportOptions): Promise<Blob> {
	const info = fmtInfo(format);
	if (format === 'svg') return new Blob([exportSvg(doc, opts)], { type: info.mime });
	if (format === 'psd') return exportPsd(doc, opts);
	if (format === 'ico') return exportIco(doc, opts);

	const { w, h } = scaledSize(doc, opts.scale);
	let img = resample(doc.flattened(), w, h);
	if (!info.alpha) img = onBackground(img, opts.background);
	if (format === 'bmp') {
		const d = ctx2d(img, true).getImageData(0, 0, w, h);
		return new Blob([encodeBmp({ data: d.data, width: w, height: h }) as BlobPart], { type: info.mime });
	}
	const q = Math.max(0, Math.min(1, opts.quality));
	const blob = await canvasToBlob(img, info.mime, info.lossy ? q : undefined);
	if (blob.type !== info.mime) throw new Error(`Este navegador não consegue gerar ${format.toUpperCase()}.`);
	return blob;
}

async function exportIco(doc: ImageDoc, opts: ExportOptions): Promise<Blob> {
	const sizes = [...new Set((opts.icoSizes?.length ? opts.icoSizes : [16, 32, 48, 64, 128, 256]).map((s) => Math.max(1, Math.min(256, Math.round(s)))))].sort((a, b) => a - b);
	const flat = doc.flattened();
	const entries: { width: number; height: number; png: Uint8Array }[] = [];
	for (const s of sizes) {
		// "contain": encaixa no quadrado com preenchimento transparente.
		const k = s / Math.max(flat.width, flat.height);
		const iw = Math.max(1, Math.round(flat.width * k)), ih = Math.max(1, Math.round(flat.height * k));
		const scaled = resample(flat, iw, ih);
		const sq = makeCanvas(s, s);
		ctx2d(sq).drawImage(scaled, Math.floor((s - iw) / 2), Math.floor((s - ih) / 2));
		entries.push({ width: s, height: s, png: await blobBytes(await canvasToBlob(sq, 'image/png')) });
	}
	return new Blob([encodeIco(entries) as BlobPart], { type: 'image/x-icon' });
}

async function exportPsd(doc: ImageDoc, opts: ExportOptions): Promise<Blob> {
	const { writePsd } = await import('ag-psd');
	const { w, h } = scaledSize(doc, opts.scale);
	const children: AgLayer[] = doc.layers.map((l: Layer) => {
		const full = resample(l.output(), w, h);
		const b = contentBounds(full);
		const base: AgLayer = { name: l.name || 'Camada', opacity: l.opacity, hidden: !l.visible, blendMode: blendToPsd(l.blend) as AgLayer['blendMode'] };
		if (!b) return { ...base, left: 0, top: 0, right: 0, bottom: 0 };
		return { ...base, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h, canvas: cloneCanvas(full, b) };
	});
	const psd: import('ag-psd').Psd = {
		width: w,
		height: h,
		colorMode: 3 as import('ag-psd').ColorMode, // RGB
		bitsPerChannel: 8,
		children,
		canvas: resample(doc.flattened(), w, h)
	};
	const buf = writePsd(psd, { generateThumbnail: true, noBackground: true });
	return new Blob([buf], { type: 'image/vnd.adobe.photoshop' });
}

// ----- SVG -----

type SvgCtx = { defs: string[]; id: number };
const nextId = (c: SvgCtx, p: string) => `${p}${++c.id}`;

/** Gradiente/cor de preenchimento em coordenadas locais (0,0)-(w,h), igual ao `paintStyle` do render. */
function svgPaint(c: SvgCtx, p: Paint, w: number, h: number, attr: 'fill' | 'stroke' = 'fill'): string {
	if (p.kind === 'none') return ` ${attr}="none"`;
	if (p.kind === 'solid') return colorAttrs(p.color, attr, `${attr}-opacity`);
	const id = nextId(c, 'g');
	const cx = w / 2, cy = h / 2;
	const stops = p.stops
		.map((s) => `<stop offset="${num(Math.min(1, Math.max(0, s.offset)))}"${colorAttrs(s.color, 'stop-color', 'stop-opacity')}/>`)
		.join('');
	if (p.kind === 'linear') {
		const a = (p.angle * Math.PI) / 180;
		const len = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
		c.defs.push(
			`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(cx - Math.cos(a) * len)}" y1="${num(cy - Math.sin(a) * len)}" x2="${num(cx + Math.cos(a) * len)}" y2="${num(cy + Math.sin(a) * len)}">${stops}</linearGradient>`
		);
	} else {
		c.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(cx)}" cy="${num(cy)}" r="${num(Math.max(Math.abs(w), Math.abs(h)) / 2)}">${stops}</radialGradient>`);
	}
	return ` ${attr}="url(#${id})"`;
}

const boxTransform = (v: VectorData) =>
	`translate(${num(v.x + v.w / 2)} ${num(v.y + v.h / 2)})${v.rotation ? ` rotate(${num(v.rotation)})` : ''} translate(${num(-v.w / 2)} ${num(-v.h / 2)})`;

function svgShape(c: SvgCtx, s: ShapeData): string {
	const open = s.shape === 'line' || s.shape === 'arrow';
	let attrs = open ? ' fill="none"' : svgPaint(c, s.fill, s.w, s.h);
	const strokeColor = open ? s.stroke || (s.fill.kind === 'solid' ? s.fill.color : '#000') : s.stroke;
	if (strokeColor && s.strokeWidth > 0) {
		attrs += colorAttrs(strokeColor, 'stroke', 'stroke-opacity');
		attrs += ` stroke-width="${num(s.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"`;
		if (s.dash) attrs += ` stroke-dasharray="${num(s.strokeWidth * 3)} ${num(s.strokeWidth * 2)}"`;
	}
	return `<path transform="${boxTransform(s)}" d="${shapeToSvgPath(s)}"${attrs}/>`;
}

function svgText(c: SvgCtx, t: TextData): string {
	const lines = t.text.split('\n');
	const lineH = t.size * t.lineHeight;
	const ax = t.align === 'left' ? 0 : t.align === 'center' ? t.w / 2 : t.w;
	const anchor = t.align === 'left' ? 'start' : t.align === 'center' ? 'middle' : 'end';
	let attrs = svgPaint(c, t.fill, t.w, t.h);
	if (t.stroke && t.strokeWidth > 0)
		attrs += `${colorAttrs(t.stroke, 'stroke', 'stroke-opacity')} stroke-width="${num(t.strokeWidth * 2)}" stroke-linejoin="round" paint-order="stroke"`;
	const font =
		` font-family="${escapeXml(t.font)}" font-size="${num(t.size)}" font-weight="${t.weight}"` +
		(t.italic ? ' font-style="italic"' : '') +
		(t.letterSpacing ? ` letter-spacing="${num(t.letterSpacing)}"` : '');
	const spans = lines.map((l, i) => `<tspan x="${num(ax)}" y="${num(i * lineH + lineH / 2)}">${escapeXml(l)}</tspan>`).join('');
	return `<text transform="${boxTransform(t)}" xml:space="preserve" style="white-space:pre" text-anchor="${anchor}" dominant-baseline="central"${font}${attrs}>${spans}</text>`;
}

/** Filtro SVG equivalente ao `renderEffects` (sombra, brilho, extrusão, contorno). */
export function effectsFilter(id: string, fx: Effects, pad: { x: number; y: number; w: number; h: number }): string {
	const p: string[] = [];
	const body: string[] = [];
	if (fx.extrude.on && fx.extrude.depth > 0) {
		const a = (fx.extrude.angle * Math.PI) / 180;
		const dx = Math.cos(a), dy = Math.sin(a);
		const steps = Math.min(200, Math.round(fx.extrude.depth));
		const base = fx.extrude.color.startsWith('#') ? fx.extrude.color : '#555555';
		for (let i = steps; i >= 1; i--) {
			const shade = mixHex(base, '#000000', (i / steps) * fx.extrude.shade);
			p.push(`<feOffset in="SourceAlpha" dx="${num(dx * i)}" dy="${num(dy * i)}" result="eo${i}"/>`);
			p.push(`<feFlood flood-color="${shade}"/><feComposite in2="eo${i}" operator="in" result="e${i}"/>`);
			body.push(`e${i}`);
		}
	}
	if (fx.outline.on && fx.outline.width > 0) {
		p.push(`<feMorphology in="SourceAlpha" operator="dilate" radius="${num(fx.outline.width)}" result="oa"/>`);
		p.push(`<feFlood${colorAttrs(fx.outline.color, 'flood-color', 'flood-opacity')}/><feComposite in2="oa" operator="in" result="ol"/>`);
		body.push('ol');
	}
	body.push('SourceGraphic');
	p.push(`<feMerge result="body">${body.map((b) => `<feMergeNode in="${b}"/>`).join('')}</feMerge>`);
	const final: string[] = [];
	if (fx.glow.on) {
		p.push(`<feFlood${colorAttrs(fx.glow.color, 'flood-color', 'flood-opacity')}/><feComposite in2="body" operator="in"/>`);
		p.push(`<feGaussianBlur stdDeviation="${num(fx.glow.blur)}" result="glow"/>`);
		for (let i = 0; i < Math.max(1, Math.round(fx.glow.strength)); i++) final.push('glow');
	}
	if (fx.shadow.on) {
		const { color, opacity } = splitColor(fx.shadow.color);
		p.push(`<feFlood flood-color="${escapeXml(color)}" flood-opacity="${num(opacity * fx.shadow.opacity)}"/><feComposite in2="body" operator="in"/>`);
		p.push(`<feGaussianBlur stdDeviation="${num(fx.shadow.blur)}"/><feOffset dx="${num(fx.shadow.x)}" dy="${num(fx.shadow.y)}" result="shadow"/>`);
		final.push('shadow');
	}
	final.push('body');
	p.push(`<feMerge>${final.map((b) => `<feMergeNode in="${b}"/>`).join('')}</feMerge>`);
	return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${num(pad.x)}" y="${num(pad.y)}" width="${num(pad.w)}" height="${num(pad.h)}" color-interpolation-filters="sRGB">${p.join('')}</filter>`;
}

function exportSvg(doc: ImageDoc, opts: ExportOptions): string {
	const W = doc.width, H = doc.height;
	const { w, h } = scaledSize(doc, opts.scale);
	const c: SvgCtx = { defs: [], id: 0 };
	const body: string[] = [];
	for (const l of doc.layers) {
		// Garante o raster do vetor atualizado (e a caixa do texto medida).
		l.output();
		let content = '';
		if (l.vector) content = l.vector.type === 'text' ? svgText(c, l.vector) : svgShape(c, l.vector);
		else {
			if (!opts.svgEmbedRaster) continue;
			const b = contentBounds(l.canvas);
			if (!b) continue;
			const href = cloneCanvas(l.canvas, b).toDataURL('image/png');
			content = `<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${href}" xlink:href="${href}"/>`;
		}
		let attrs = ` id="${escapeXml(nextId(c, 'layer-'))}" data-name="${escapeXml(l.name)}"`;
		if (!l.visible) attrs += ' display="none"';
		if (l.opacity < 1) attrs += ` opacity="${num(l.opacity)}"`;
		const css = blendToCss(l.blend);
		if (css) attrs += ` style="mix-blend-mode:${css}"`;
		if (hasEffects(l.effects)) {
			const fx = l.effects;
			const m =
				10 +
				Math.max(fx.shadow.on ? fx.shadow.blur * 3 + Math.max(Math.abs(fx.shadow.x), Math.abs(fx.shadow.y)) : 0, fx.glow.on ? fx.glow.blur * 3 : 0) +
				(fx.extrude.on ? fx.extrude.depth : 0) +
				(fx.outline.on ? fx.outline.width : 0);
			const id = nextId(c, 'fx');
			c.defs.push(effectsFilter(id, fx, { x: -m, y: -m, w: W + 2 * m, h: H + 2 * m }));
			attrs += ` filter="url(#${id})"`;
		}
		body.push(`<g${attrs}>${content}</g>`);
	}
	return (
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}" style="isolation:isolate">\n` +
		`<title>${escapeXml(doc.name || 'imagem')}</title>\n` +
		(c.defs.length ? `<defs>${c.defs.join('\n')}</defs>\n` : '') +
		body.join('\n') +
		`\n</svg>\n`
	);
}

// =====================================================================
// Salvar
// =====================================================================

type SavePicker = (o: { suggestedName?: string; types?: { description?: string; accept: Record<string, string[]> }[] }) => Promise<{
	createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>;
}>;

export async function saveBlob(blob: Blob, filename: string): Promise<'saved' | 'downloaded' | 'cancelled'> {
	const picker = (globalThis as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
	if (picker) {
		const ext = extOf(filename);
		const mime = blob.type || EXPORT_FORMATS.find((f) => f.ext === ext)?.mime || 'application/octet-stream';
		try {
			const handle = await picker({ suggestedName: filename, types: ext ? [{ description: ext.toUpperCase(), accept: { [mime]: [`.${ext}`] } }] : undefined });
			const w = await handle.createWritable();
			await w.write(blob);
			await w.close();
			return 'saved';
		} catch (e) {
			if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
			// SecurityError (sem gesto do usuário) ou tipo recusado: cai para download.
		}
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
	return 'downloaded';
}
