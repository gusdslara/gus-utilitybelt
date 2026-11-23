// Tabela de fatos dos formatos (independente de idioma) e as regras que decidem o que cada
// página de par "X para Y" precisa dizer. O texto em si mora em ./copy/<idioma>.ts.

/** Nome usado no slug e na tela (jpeg vira "jpg", que é como as pessoas buscam). */
export type Fmt = 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp' | 'ico' | 'svg' | 'heic' | 'tiff' | 'psd' | 'pdf';

export type FormatFacts = {
	/** id do conversor (InKind/OutFormat) */
	id: string;
	label: string;
	alpha: boolean;
	anim: boolean;
	lossy: boolean;
	vector: boolean;
	/** guarda EXIF (orientação, GPS) */
	exif: boolean;
	/** tamanho típico de uma foto, relativo ao JPG (1). null = não comparável (vetor, ícone, documento). */
	size: number | null;
};

export const FORMATS: Record<Fmt, FormatFacts> = {
	jpg: { id: 'jpeg', label: 'JPG', alpha: false, anim: false, lossy: true, vector: false, exif: true, size: 1 },
	png: { id: 'png', label: 'PNG', alpha: true, anim: false, lossy: false, vector: false, exif: false, size: 3 },
	webp: { id: 'webp', label: 'WebP', alpha: true, anim: false, lossy: true, vector: false, exif: true, size: 0.7 },
	avif: { id: 'avif', label: 'AVIF', alpha: true, anim: false, lossy: true, vector: false, exif: true, size: 0.5 },
	// GIF anima, mas na entrada só o primeiro quadro é lido e na saída o arquivo é estático.
	gif: { id: 'gif', label: 'GIF', alpha: true, anim: true, lossy: false, vector: false, exif: false, size: 2.5 },
	bmp: { id: 'bmp', label: 'BMP', alpha: false, anim: false, lossy: false, vector: false, exif: false, size: 6 },
	ico: { id: 'ico', label: 'ICO', alpha: true, anim: false, lossy: false, vector: false, exif: false, size: null },
	svg: { id: 'svg', label: 'SVG', alpha: true, anim: false, lossy: false, vector: true, exif: false, size: null },
	heic: { id: 'heic', label: 'HEIC', alpha: false, anim: false, lossy: true, vector: false, exif: true, size: 0.5 },
	tiff: { id: 'tiff', label: 'TIFF', alpha: true, anim: false, lossy: false, vector: false, exif: true, size: 5 },
	psd: { id: 'psd', label: 'PSD', alpha: true, anim: false, lossy: false, vector: false, exif: false, size: 6 },
	pdf: { id: 'pdf', label: 'PDF', alpha: false, anim: false, lossy: false, vector: false, exif: false, size: null }
};

export const SOURCES: Fmt[] = ['jpg', 'png', 'webp', 'avif', 'heic', 'gif', 'bmp', 'svg', 'tiff', 'psd', 'ico'];
export const TARGETS: Fmt[] = ['jpg', 'png', 'webp', 'avif', 'pdf', 'ico', 'gif', 'svg', 'bmp', 'tiff'];

const RASTER_LOSSLESS_OUT: Fmt[] = ['png', 'bmp', 'tiff', 'gif'];
const LOSSY_OUT: Fmt[] = ['jpg', 'webp', 'avif'];

/** Pares que fazem sentido: SVG só sai de raster; ICO só vira PNG/JPG/WebP. */
export function validPair(a: Fmt, b: Fmt): boolean {
	if (a === b) return false;
	if (!SOURCES.includes(a) || !TARGETS.includes(b)) return false;
	if (b === 'svg' && FORMATS[a].vector) return false;
	if (a === 'ico') return b === 'png' || b === 'jpg' || b === 'webp';
	return true;
}

export const PAIRS: [Fmt, Fmt][] = SOURCES.flatMap((a) => TARGETS.filter((b) => validPair(a, b)).map((b) => [a, b] as [Fmt, Fmt]));

// Pares mais buscados, em ordem: usados nos hubs e no llms.txt.
export const TOP_PAIRS: [Fmt, Fmt][] = [
	['heic', 'jpg'], ['png', 'jpg'], ['jpg', 'png'], ['webp', 'jpg'], ['webp', 'png'], ['png', 'webp'], ['jpg', 'webp'],
	['jpg', 'pdf'], ['png', 'ico'], ['avif', 'jpg'], ['heic', 'png'], ['png', 'svg'], ['jpg', 'svg'], ['svg', 'png'],
	['png', 'pdf'], ['avif', 'png'], ['gif', 'png'], ['jpg', 'avif'], ['psd', 'png'], ['tiff', 'jpg'], ['bmp', 'jpg'],
	['heic', 'pdf'], ['ico', 'png'], ['png', 'avif']
];

// ——— Regras: o que muda numa conversão X → Y ———

export type NoteKey =
	| 'heic' | 'psd' | 'gifFrame' | 'raster' | 'trace' | 'pdf' | 'ico' | 'icoIn' | 'palette'
	| 'alphaLost' | 'alphaKept' | 'toLossy' | 'lossyToLossless' | 'exact' | 'exif';

export type SizeKey = 'smaller' | 'larger' | 'similar' | 'toSvg' | 'toIco' | 'toPdf' | 'fromSvg' | 'fromIco';

export type NotKey =
	| 'keepLayers' | 'keepAnim' | 'keepVector' | 'noPhotoTrace' | 'icoPhoto' | 'pdfEdit' | 'keepLossless'
	| 'recompress' | 'lossyGrow' | 'heavy' | 'avifCompat' | 'generic';

export type FaqKey =
	| 'heic' | 'psd' | 'anim' | 'trace' | 'pdf' | 'ico' | 'alphaLost' | 'alphaKept' | 'quality' | 'lossless' | 'svgSize';

export type HookKey =
	| 'heic' | 'trace' | 'pdf' | 'ico' | 'psd' | 'gifFrame' | 'raster' | 'icoIn' | 'alpha' | 'palette'
	| 'smaller' | 'lossless' | 'archive' | 'generic';

export type OptKey = 'quality' | 'background' | 'colors' | 'icoSizes' | 'pdfPage' | 'resize';

export type PairAnalysis = {
	notes: NoteKey[];
	size: SizeKey;
	not: NotKey[];
	faq: FaqKey[];
	hook: HookKey;
	opts: OptKey[];
};

export function analyze(a: Fmt, b: Fmt): PairAnalysis {
	const A = FORMATS[a];
	const B = FORMATS[b];
	const notes: NoteKey[] = [];
	if (a === 'heic') notes.push('heic');
	if (a === 'psd') notes.push('psd');
	if (a === 'gif') notes.push('gifFrame');
	if (a === 'svg') notes.push('raster');
	if (a === 'ico') notes.push('icoIn');
	if (b === 'svg') notes.push('trace');
	if (b === 'pdf') notes.push('pdf');
	if (b === 'ico') notes.push('ico');
	if (b === 'gif') notes.push('palette');
	// PDF: a página recebe a imagem como está; não afirmamos nada sobre transparência.
	const alphaLost = A.alpha && !B.alpha && b !== 'pdf';
	if (alphaLost) notes.push('alphaLost');
	else if (A.alpha && B.alpha && b !== 'svg') notes.push('alphaKept');
	if (LOSSY_OUT.includes(b)) notes.push('toLossy');
	if (A.lossy && RASTER_LOSSLESS_OUT.includes(b)) notes.push('lossyToLossless');
	// Sem perda dos dois lados: os pixels passam idênticos.
	if (!A.lossy && !A.vector && b !== 'gif' && RASTER_LOSSLESS_OUT.includes(b)) notes.push('exact');
	if (A.exif) notes.push('exif');

	let size: SizeKey;
	if (b === 'svg') size = 'toSvg';
	else if (b === 'ico') size = 'toIco';
	else if (b === 'pdf') size = 'toPdf';
	else if (a === 'svg') size = 'fromSvg';
	else if (a === 'ico') size = 'fromIco';
	else {
		const r = (B.size ?? 1) / (A.size ?? 1);
		size = r < 0.8 ? 'smaller' : r > 1.25 ? 'larger' : 'similar';
	}

	const not: NotKey[] = [];
	if (a === 'psd') not.push('keepLayers');
	if (a === 'gif') not.push('keepAnim');
	if (a === 'svg') not.push('keepVector');
	if (b === 'svg') not.push('noPhotoTrace');
	if (b === 'ico') not.push('icoPhoto');
	if (b === 'pdf') not.push('pdfEdit');
	if (LOSSY_OUT.includes(b) && !A.lossy && !A.vector) not.push('keepLossless');
	if (LOSSY_OUT.includes(b) && A.lossy) not.push('recompress');
	if (A.lossy && RASTER_LOSSLESS_OUT.includes(b)) not.push('lossyGrow');
	if (b === 'bmp' || b === 'tiff') not.push('heavy');
	if (b === 'avif') not.push('avifCompat');
	if (!not.length) not.push('generic');

	const faq: FaqKey[] = [];
	if (a === 'heic') faq.push('heic');
	if (a === 'psd') faq.push('psd');
	if (a === 'gif') faq.push('anim');
	if (b === 'svg') faq.push('trace');
	if (a === 'svg') faq.push('svgSize');
	if (b === 'pdf') faq.push('pdf');
	if (b === 'ico') faq.push('ico');
	if (alphaLost) faq.push('alphaLost');
	else if (A.alpha && B.alpha && b !== 'svg') faq.push('alphaKept');
	if (LOSSY_OUT.includes(b)) faq.push('quality');
	if (A.lossy && RASTER_LOSSLESS_OUT.includes(b)) faq.push('lossless');

	const hook: HookKey =
		a === 'heic' ? 'heic'
		: b === 'svg' ? 'trace'
		: b === 'pdf' ? 'pdf'
		: b === 'ico' ? 'ico'
		: a === 'psd' ? 'psd'
		: a === 'gif' ? 'gifFrame'
		: a === 'svg' ? 'raster'
		: a === 'ico' ? 'icoIn'
		: alphaLost ? 'alpha'
		: b === 'gif' ? 'palette'
		: LOSSY_OUT.includes(b) && size === 'smaller' ? 'smaller'
		: A.lossy && RASTER_LOSSLESS_OUT.includes(b) && b !== 'bmp' && b !== 'tiff' ? 'lossless'
		: b === 'bmp' || b === 'tiff' ? 'archive'
		: 'generic';

	const opts: OptKey[] = [];
	if (LOSSY_OUT.includes(b)) opts.push('quality');
	if (alphaLost) opts.push('background');
	if (b === 'svg') opts.push('colors');
	if (b === 'ico') opts.push('icoSizes');
	if (b === 'pdf') opts.push('pdfPage');
	if (!opts.length || opts.length < 2) opts.push('resize');

	return { notes, size, not: not.slice(0, 3), faq: faq.slice(0, 4), hook, opts };
}
