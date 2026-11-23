// Partes puras do conversor em lote (sem DOM): tipos, detecção por bytes mágicos, nomes de saída,
// cálculo de redimensionamento, CRC32 + ZIP (STORE) e PDF mínimo com JPEG (DCTDecode).
// Compartilhado entre a thread principal (convert.ts) e o worker (workers/convert.worker.ts); testado com `bun test`.

// =====================================================================
// Tipos e tabelas de formatos
// =====================================================================

export type InKind = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp' | 'ico' | 'svg' | 'heic' | 'tiff' | 'psd' | 'unknown';
export type OutFormat = 'same' | 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp' | 'ico' | 'tiff' | 'pdf' | 'svg' | 'psd';
export type OutId = Exclude<OutFormat, 'same'>;

export const IN_KINDS: InKind[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'ico', 'svg', 'heic', 'tiff', 'psd', 'unknown'];

export const OUT_FORMATS: { id: OutId; ext: string; mime: string; lossy: boolean; alpha: boolean }[] = [
	{ id: 'jpeg', ext: 'jpg', mime: 'image/jpeg', lossy: true, alpha: false },
	{ id: 'png', ext: 'png', mime: 'image/png', lossy: false, alpha: true },
	{ id: 'webp', ext: 'webp', mime: 'image/webp', lossy: true, alpha: true },
	{ id: 'avif', ext: 'avif', mime: 'image/avif', lossy: true, alpha: true },
	{ id: 'gif', ext: 'gif', mime: 'image/gif', lossy: false, alpha: true },
	// BMP: 32 bits com alfa quando há transparência; 24 bits (achatado no fundo) quando não há.
	{ id: 'bmp', ext: 'bmp', mime: 'image/bmp', lossy: false, alpha: true },
	{ id: 'ico', ext: 'ico', mime: 'image/x-icon', lossy: false, alpha: true },
	{ id: 'tiff', ext: 'tif', mime: 'image/tiff', lossy: false, alpha: true },
	{ id: 'pdf', ext: 'pdf', mime: 'application/pdf', lossy: true, alpha: false },
	{ id: 'svg', ext: 'svg', mime: 'image/svg+xml', lossy: false, alpha: true },
	{ id: 'psd', ext: 'psd', mime: 'image/vnd.adobe.photoshop', lossy: false, alpha: true }
];

export const outInfo = (id: OutId) => OUT_FORMATS.find((f) => f.id === id)!;

export const CONVERT_ACCEPT =
	'image/*,.jpg,.jpeg,.jfif,.png,.webp,.avif,.gif,.bmp,.dib,.ico,.cur,.svg,.heic,.heif,.hif,.tif,.tiff,.psd,' +
	'image/heic,image/heif,image/tiff,image/svg+xml,image/vnd.adobe.photoshop';

export type Resize =
	| { mode: 'none' }
	| { mode: 'percent'; value: number }
	| { mode: 'fit'; width: number; height: number; upscale: boolean }
	| { mode: 'exact'; width: number; height: number };

export type ConvertOptions = {
	format: OutFormat;
	/** 0..1 (formatos com perda). */
	quality: number;
	/** Tamanho-alvo em KB para formatos com perda (busca binária na qualidade, ≤ 7 codificações). */
	maxKB: number | null;
	resize: Resize;
	/** Cor hex do fundo quando o destino não tem alfa (JPEG, PDF, BMP 24 bits). */
	background: string;
	/** Paleta da vetorização SVG (2..64). */
	svgColors: number;
	icoSizes: number[];
	pdfPage: 'image' | 'a4' | 'letter';
};

export const defaultConvertOptions = (): ConvertOptions => ({
	format: 'webp',
	quality: 0.85,
	maxKB: null,
	resize: { mode: 'none' },
	background: '#ffffff',
	svgColors: 16,
	icoSizes: [16, 32, 48, 64, 128, 256],
	pdfPage: 'image'
});

/** Página PDF pronta para juntar várias imagens num PDF só (JPEG cru + tamanho em px). */
export type PdfPage = { jpeg: Uint8Array; width: number; height: number };

// ----- Protocolo thread principal ↔ worker -----

export type WorkerReq = {
	id: string;
	name: string;
	kind: InKind;
	opts: ConvertOptions;
	/** Arquivo original (decodificado no worker) ... */
	file?: Blob;
	/** ... ou bitmap já decodificado na thread principal (SVG, HEIC, fallback via <img>). */
	bitmap?: ImageBitmap;
	/** O bitmap já está no tamanho final (SVG rasterizado direto no alvo): não redimensiona de novo. */
	presized?: boolean;
	/** Tamanho original informado pela thread principal (SVG/HEIC). */
	srcWidth?: number;
	srcHeight?: number;
};

export type WorkerRes =
	| { id: string; type: 'progress'; value: number }
	| {
			id: string;
			type: 'done';
			buffer: ArrayBuffer;
			mime: string;
			width: number;
			height: number;
			srcWidth: number;
			srcHeight: number;
			/** PDF: `buffer` é o JPEG da página; a thread principal monta o PDF (sem copiar os bytes). */
			pdf?: boolean;
	  }
	/** `retryMain`: o worker não conseguiu decodificar; a thread principal tenta via <img> e reenvia o bitmap. */
	| { id: string; type: 'error'; message: string; retryMain?: boolean };

// =====================================================================
// Detecção do tipo de entrada
// =====================================================================

const EXT_KIND: Record<string, InKind> = {
	jpg: 'jpeg', jpeg: 'jpeg', jfif: 'jpeg', jpe: 'jpeg', pjpeg: 'jpeg',
	png: 'png', apng: 'png',
	webp: 'webp',
	avif: 'avif',
	gif: 'gif',
	bmp: 'bmp', dib: 'bmp',
	ico: 'ico', cur: 'ico',
	svg: 'svg',
	heic: 'heic', heif: 'heic', hif: 'heic',
	tif: 'tiff', tiff: 'tiff',
	psd: 'psd', psb: 'psd'
};

export const extOf = (name: string | undefined) => /\.([a-z0-9]+)$/i.exec(name ?? '')?.[1]?.toLowerCase() ?? '';

const ascii = (b: Uint8Array, at: number, len: number) => {
	let s = '';
	for (let i = 0; i < len && at + i < b.length; i++) s += String.fromCharCode(b[at + i]);
	return s;
};

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

/** Tipo pelos bytes iniciais (idealmente ≥ 512 bytes, para achar `<svg` depois de comentários); senão pela extensão. */
export function sniffBytes(head: Uint8Array, name?: string): InKind {
	const b = head;
	const n = b.length;
	if (n >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
	if (n >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return 'png';
	if (n >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
	if (n >= 6 && ascii(b, 0, 4) === 'GIF8') return 'gif';
	if (n >= 4 && ascii(b, 0, 4) === '8BPS') return 'psd';
	if (n >= 4 && ((b[0] === 0x49 && b[1] === 0x49 && (b[2] === 0x2a || b[2] === 0x2b) && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && (b[3] === 0x2a || b[3] === 0x2b))))
		return 'tiff';
	if (n >= 12 && ascii(b, 4, 4) === 'ftyp') {
		// ISOBMFF: marca principal + marcas compatíveis (mif1/msf1 podem ser AVIF ou HEIC).
		const boxSize = Math.min(n, ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0 || n);
		const brands = [ascii(b, 8, 4)];
		for (let p = 16; p + 4 <= boxSize; p += 4) brands.push(ascii(b, p, 4));
		if (AVIF_BRANDS.has(brands[0])) return 'avif';
		if (HEIC_BRANDS.has(brands[0])) return 'heic';
		if (brands.some((x) => AVIF_BRANDS.has(x))) return 'avif';
		if (brands.some((x) => HEIC_BRANDS.has(x) || x === 'mif1' || x === 'msf1')) return 'heic';
	}
	if (n >= 26 && b[0] === 0x42 && b[1] === 0x4d) {
		const hdr = b[14] | (b[15] << 8) | (b[16] << 16) | (b[17] << 24);
		if ([12, 16, 40, 52, 56, 64, 108, 124].includes(hdr)) return 'bmp';
	}
	if (n >= 6 && b[0] === 0 && b[1] === 0 && (b[2] === 1 || b[2] === 2) && b[3] === 0 && (b[4] | (b[5] << 8)) > 0) return 'ico';
	// Texto: SVG (com ou sem <?xml, comentários, BOM).
	const txt = new TextDecoder().decode(b.subarray(0, Math.min(n, 4096))).replace(/^﻿/, '').trimStart();
	if (txt.startsWith('<') && /<svg[\s>/]/i.test(txt)) return 'svg';
	return EXT_KIND[extOf(name)] ?? 'unknown';
}

// =====================================================================
// Formato de saída e nomes
// =====================================================================

/** 'same' → mesmo formato quando sabemos codificá-lo; HEIC/desconhecido → PNG. */
export function resolveFormat(format: OutFormat, srcKind: InKind): OutId {
	if (format !== 'same') return format;
	switch (srcKind) {
		case 'jpeg': case 'png': case 'webp': case 'avif': case 'gif': case 'bmp': case 'ico': case 'svg': case 'tiff': case 'psd':
			return srcKind;
		default:
			return 'png';
	}
}

/** Troca a extensão e evita colisão ("foto (2).png"), comparando sem diferenciar maiúsculas. */
export function outName(srcName: string, format: OutFormat, srcKind: InKind, taken?: Set<string>): string {
	const ext = outInfo(resolveFormat(format, srcKind)).ext;
	const base = (srcName.split(/[\\/]/).pop() ?? '').replace(/\.[^./]{1,8}$/, '').trim() || 'imagem';
	return dedupeName(`${base}.${ext}`, taken);
}

/** Acrescenta " (2)", " (3)"… antes da extensão até o nome ficar livre em `taken` (e registra nele). */
export function dedupeName(name: string, taken?: Set<string>): string {
	if (!taken) return name;
	const m = /^(.*?)(\.[^.]+)?$/.exec(name)!;
	const stem = m[1], ext = m[2] ?? '';
	let out = name;
	for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${stem} (${i})${ext}`;
	taken.add(out.toLowerCase());
	return out;
}

// =====================================================================
// Redimensionamento
// =====================================================================

/** Lado máximo de saída (limite prático de canvas nos navegadores). */
export const MAX_SIDE = 16384;

/** Tamanho final a partir do original e do modo de redimensionamento. */
export function targetSize(w: number, h: number, r: Resize): { width: number; height: number } {
	let W = w, H = h;
	const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
	if (r.mode === 'percent') {
		const k = pos(r.value) / 100 || 1;
		W = w * k;
		H = h * k;
	} else if (r.mode === 'fit') {
		const bw = pos(r.width), bh = pos(r.height);
		if (bw || bh) {
			let k = Math.min(bw ? bw / w : Infinity, bh ? bh / h : Infinity);
			if (!r.upscale) k = Math.min(1, k);
			W = w * k;
			H = h * k;
		}
	} else if (r.mode === 'exact') {
		const bw = pos(r.width), bh = pos(r.height);
		if (bw && bh) {
			W = bw;
			H = bh;
		} else if (bw) {
			W = bw;
			H = (h * bw) / w;
		} else if (bh) {
			H = bh;
			W = (w * bh) / h;
		}
	}
	const k = Math.min(1, MAX_SIDE / Math.max(W, H));
	return { width: Math.max(1, Math.round(W * k)), height: Math.max(1, Math.round(H * k)) };
}

/** Tamanhos válidos do ICO: únicos, 1..256, ≤ lado da imagem, no mínimo um. */
export function icoSizesFor(sizes: number[], srcW: number, srcH: number): number[] {
	const side = Math.max(1, Math.min(256, Math.max(srcW, srcH)));
	const all = [...new Set((sizes?.length ? sizes : [16, 32, 48, 256]).map((s) => Math.max(1, Math.min(256, Math.round(s)))))].sort((a, b) => a - b);
	const ok = all.filter((s) => s <= side);
	return ok.length ? ok : [Math.min(side, all[0] ?? side)];
}

/** Qualidades da busca binária por tamanho-alvo (usado pelo worker; exposto para teste). */
export const MAXKB_MIN_Q = 0.05;
export const MAXKB_MAX_ENCODES = 7;

// =====================================================================
// Bytes
// =====================================================================

export function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '—';
	if (n < 1024) return `${Math.round(n)} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let v = n / 1024, i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')} ${units[i]}`;
}

const enc = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}

// =====================================================================
// CRC32 e ZIP (STORE)
// =====================================================================

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

/** CRC32 incremental: comece com `crc = 0` e passe o retorno nas próximas chamadas. */
export function crc32(data: Uint8Array, crc = 0): number {
	let c = ~crc >>> 0;
	for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
	return ~c >>> 0;
}

export const ZIP_MAX = 0xffffffff;
export const ZIP_MAX_ENTRIES = 0xffff;

export type ZipEntryMeta = { name: string; crc: number; size: number };

function dosDateTime(d: Date) {
	const year = Math.max(1980, d.getFullYear());
	return {
		time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
		date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
	};
}

/**
 * Monta o ZIP sem copiar os dados: devolve as partes na ordem final
 * (cabeçalho local, `data(i)`, … diretório central, EOCD). `data(i)` é o conteúdo da entrada i (Blob ou bytes).
 * Método STORE, flag UTF-8 (bit 11). Sem ZIP64: erro acima de 4 GB ou 65535 entradas.
 */
export function zipLayout<T>(entries: ZipEntryMeta[], data: (i: number) => T, when = new Date()): (Uint8Array | T)[] {
	if (entries.length > ZIP_MAX_ENTRIES) throw new Error(`ZIP com mais de ${ZIP_MAX_ENTRIES} arquivos não é suportado.`);
	const { time, date } = dosDateTime(when);
	const parts: (Uint8Array | T)[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	entries.forEach((e, i) => {
		const name = enc.encode(e.name);
		if (name.length > 0xffff) throw new Error('Nome de arquivo longo demais para ZIP.');
		if (e.size > ZIP_MAX || offset > ZIP_MAX) throw new Error('ZIP maior que 4 GB não é suportado; baixe em partes.');
		const lh = new Uint8Array(30 + name.length);
		const lv = new DataView(lh.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, 20, true); // versão necessária 2.0
		lv.setUint16(6, 0x0800, true); // bit 11: nomes em UTF-8
		lv.setUint16(8, 0, true); // STORE
		lv.setUint16(10, time, true);
		lv.setUint16(12, date, true);
		lv.setUint32(14, e.crc >>> 0, true);
		lv.setUint32(18, e.size, true);
		lv.setUint32(22, e.size, true);
		lv.setUint16(26, name.length, true);
		lv.setUint16(28, 0, true);
		lh.set(name, 30);

		const ch = new Uint8Array(46 + name.length);
		const cv = new DataView(ch.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(4, 0x031e, true); // feito por: Unix, 3.0
		cv.setUint16(6, 20, true);
		cv.setUint16(8, 0x0800, true);
		cv.setUint16(10, 0, true);
		cv.setUint16(12, time, true);
		cv.setUint16(14, date, true);
		cv.setUint32(16, e.crc >>> 0, true);
		cv.setUint32(20, e.size, true);
		cv.setUint32(24, e.size, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(38, (0o100644 << 16) >>> 0, true); // atributos externos: arquivo comum rw-r--r--
		cv.setUint32(42, offset, true);
		ch.set(name, 46);

		parts.push(lh, data(i));
		central.push(ch);
		offset += lh.length + e.size;
	});
	const cd = concat(central);
	if (offset + cd.length > ZIP_MAX) throw new Error('ZIP maior que 4 GB não é suportado; baixe em partes.');
	const eocd = new Uint8Array(22);
	const ev = new DataView(eocd.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, cd.length, true);
	ev.setUint32(16, offset, true);
	parts.push(cd, eocd);
	return parts;
}

/** ZIP completo em memória (para testes e lotes pequenos). */
export function zipSync(files: { name: string; data: Uint8Array }[], when?: Date): Uint8Array {
	const meta = files.map((f) => ({ name: f.name, crc: crc32(f.data), size: f.data.length }));
	return concat(zipLayout(meta, (i) => files[i].data, when));
}

// =====================================================================
// PDF 1.4 mínimo (uma página por JPEG)
// =====================================================================

const PAGE_PT = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const PDF_MARGIN = 36; // 0,5 pol.
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * Partes de um PDF 1.4 válido: cada JPEG vira um XObject /DCTDecode numa página.
 * 'image': página do tamanho da imagem (96 dpi → pt). 'a4'/'letter': orientação conforme a imagem, encaixada e centralizada com margem.
 */
export function buildPdfParts(pages: PdfPage[], pageSize: 'image' | 'a4' | 'letter'): Uint8Array[] {
	if (!pages.length) throw new Error('PDF sem páginas.');
	const parts: Uint8Array[] = [];
	const offsets: number[] = [];
	let pos = 0;
	const push = (p: Uint8Array | string) => {
		const u = typeof p === 'string' ? enc.encode(p) : p;
		parts.push(u);
		pos += u.length;
	};
	const obj = (num: number, body: string | (Uint8Array | string)[]) => {
		offsets[num] = pos;
		push(`${num} 0 obj\n`);
		if (typeof body === 'string') push(body);
		else body.forEach(push);
		push('\nendobj\n');
	};
	// cabeçalho + comentário com bytes > 127 (marca o arquivo como binário para transferências)
	push(concat([enc.encode('%PDF-1.4\n%'), new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]), enc.encode('\n')]));

	const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
	obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
	obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
	pages.forEach((pg, i) => {
		const pageNum = 3 + i * 3, imgNum = pageNum + 1, contNum = pageNum + 2;
		const iw = pg.width * 0.75, ih = pg.height * 0.75; // px a 96 dpi → pt
		let PW: number, PH: number, dw: number, dh: number;
		if (pageSize === 'image') {
			PW = dw = iw;
			PH = dh = ih;
		} else {
			const [a, b] = PAGE_PT[pageSize];
			[PW, PH] = pg.width > pg.height ? [b, a] : [a, b];
			const k = Math.min((PW - PDF_MARGIN * 2) / iw, (PH - PDF_MARGIN * 2) / ih, 1);
			dw = iw * k;
			dh = ih * k;
		}
		const x = (PW - dw) / 2, y = (PH - dh) / 2;
		const content = `q\n${n2(dw)} 0 0 ${n2(dh)} ${n2(x)} ${n2(y)} cm\n/Im0 Do\nQ\n`;
		obj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(PW)} ${n2(PH)}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contNum} 0 R >>`);
		obj(imgNum, [
			`<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`,
			pg.jpeg,
			'\nendstream'
		]);
		obj(contNum, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
	});
	const count = 3 + pages.length * 3;
	const xref = pos;
	let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
	for (let i = 1; i < count; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
	push(x);
	push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
	return parts;
}

export function buildPdfBytes(pages: PdfPage[], pageSize: 'image' | 'a4' | 'letter'): Uint8Array {
	return concat(buildPdfParts(pages, pageSize));
}
