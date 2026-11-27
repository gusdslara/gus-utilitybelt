// Layout das páginas do PDF: tamanho do papel, orientação, encaixe, margem e qualidade. Puro.
import type { Box } from './writer.ts';

export type PageSizeId = 'fit' | 'a4' | 'letter' | 'legal' | 'a3' | 'a5';
export type Orientation = 'auto' | 'portrait' | 'landscape';
export type FitMode = 'contain' | 'cover' | 'stretch';
export type QualityId = 'original' | 'high' | 'balanced' | 'small';

export type PdfSettings = {
	size: PageSizeId;
	orientation: Orientation;
	fit: FitMode;
	/** Margem em milímetros. */
	margin: number;
	quality: QualityId;
};

export const defaultPdfSettings = (): PdfSettings => ({ size: 'a4', orientation: 'auto', fit: 'contain', margin: 0, quality: 'balanced' });

/** Retrato, em pontos. */
export const PAGE_SIZES: Record<Exclude<PageSizeId, 'fit'>, [number, number]> = {
	a4: [595.28, 841.89],
	letter: [612, 792],
	legal: [612, 1008],
	a3: [841.89, 1190.55],
	a5: [419.53, 595.28]
};
export const PAGE_SIZE_IDS: PageSizeId[] = ['fit', 'a4', 'letter', 'legal', 'a3', 'a5'];
export const MARGINS = [0, 5, 10, 20];

export const QUALITY: Record<QualityId, { dpi: number; jpeg: number; passthrough: boolean }> = {
	original: { dpi: Infinity, jpeg: 0.95, passthrough: true },
	high: { dpi: 300, jpeg: 0.9, passthrough: false },
	balanced: { dpi: 200, jpeg: 0.8, passthrough: false },
	small: { dpi: 130, jpeg: 0.62, passthrough: false }
};
export const QUALITY_IDS: QualityId[] = ['original', 'high', 'balanced', 'small'];

const MM = 72 / 25.4;
/** No modo "ajustar à imagem", o lado maior vira o de um A4 (impressão e leitura com tamanho natural). */
const FIT_LONG = 841.89;

export type PageLayout = { width: number; height: number; rect: Box; clip?: Box };

/** Onde a imagem (iw×ih px, já girada) fica na página. */
export function layoutPage(iw: number, ih: number, s: PdfSettings): PageLayout {
	const m = Math.max(0, s.margin) * MM;
	if (s.size === 'fit') {
		const k = FIT_LONG / Math.max(iw, ih);
		const w = iw * k, h = ih * k;
		return { width: w + 2 * m, height: h + 2 * m, rect: { x: m, y: m, w, h } };
	}
	const [a, b] = PAGE_SIZES[s.size];
	const land = s.orientation === 'landscape' || (s.orientation === 'auto' && iw > ih);
	const PW = land ? b : a, PH = land ? a : b;
	const aw = Math.max(1, PW - 2 * m), ah = Math.max(1, PH - 2 * m);
	const area: Box = { x: m, y: m, w: aw, h: ah };
	if (s.fit === 'stretch') return { width: PW, height: PH, rect: area };
	const k = s.fit === 'cover' ? Math.max(aw / iw, ah / ih) : Math.min(aw / iw, ah / ih);
	const w = iw * k, h = ih * k;
	const rect: Box = { x: m + (aw - w) / 2, y: m + (ah - h) / 2, w, h };
	return s.fit === 'cover' ? { width: PW, height: PH, rect, clip: area } : { width: PW, height: PH, rect };
}

/** Pixels finais da imagem para a qualidade escolhida (nunca amplia). */
export function targetPixels(iw: number, ih: number, rect: Box, dpi: number): { w: number; h: number } {
	if (!isFinite(dpi)) return { w: iw, h: ih };
	const k = Math.min(1, ((rect.w / 72) * dpi) / iw, ((rect.h / 72) * dpi) / ih);
	return { w: Math.max(1, Math.round(iw * k)), h: Math.max(1, Math.round(ih * k)) };
}
