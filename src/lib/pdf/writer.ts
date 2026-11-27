// Gerador de PDF 1.4 mínimo e puro: uma imagem por página, com posição/recorte livres.
// Imagens: JPEG embutido sem recodificar (/DCTDecode, RGB ou cinza) ou bitmap comprimido (/FlateDecode,
// 1 bit para P&B — páginas escaneadas ficam com poucos KB — ou 8 bits cinza/RGB).

export type PdfImage =
	| { kind: 'jpeg'; bytes: Uint8Array; width: number; height: number; gray?: boolean }
	| { kind: 'flate'; bytes: Uint8Array; width: number; height: number; bpc: 1 | 8; colors: 1 | 3 };

export type Box = { x: number; y: number; w: number; h: number };

/** Medidas em pontos (1/72 pol.), origem embaixo à esquerda. */
export type PdfPageSpec = { width: number; height: number; image: PdfImage; rect: Box; clip?: Box };

export type PdfInfo = { title?: string; author?: string; subject?: string; creator?: string };

const enc = new TextEncoder();
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** String de texto PDF: ASCII simples entre parênteses, senão UTF-16BE em hexadecimal. */
export function pdfText(s: string): string {
	if (/^[\x20-\x7e]*$/.test(s)) return `(${s.replace(/[\\()]/g, (c) => '\\' + c)})`;
	let hex = 'FEFF';
	for (const ch of s) {
		const cp = ch.codePointAt(0)!;
		if (cp > 0xffff) {
			const v = cp - 0x10000;
			hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
		} else hex += cp.toString(16).padStart(4, '0');
	}
	return `<${hex.toUpperCase()}>`;
}

function pdfDate(d: Date): string {
	const p = (v: number) => String(v).padStart(2, '0');
	return `(D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z)`;
}

/** Partes binárias do PDF (para montar um Blob sem copiar as imagens). */
export function buildPdfParts(pages: PdfPageSpec[], info: PdfInfo = {}, now = new Date()): Uint8Array[] {
	if (!pages.length) throw new Error('PDF sem páginas.');
	const parts: Uint8Array[] = [];
	const offsets: number[] = [];
	let pos = 0;
	const push = (p: Uint8Array | string) => {
		const u = typeof p === 'string' ? enc.encode(p) : p;
		parts.push(u);
		pos += u.length;
	};
	const obj = (num: number, ...body: (Uint8Array | string)[]) => {
		offsets[num] = pos;
		push(`${num} 0 obj\n`);
		body.forEach(push);
		push('\nendobj\n');
	};
	push('%PDF-1.4\n');
	push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // marca de arquivo binário

	// 1 catálogo, 2 páginas, 3 info; depois 3 objetos por página (página, imagem, conteúdo).
	const first = 4;
	const kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(' ');
	obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
	obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
	const infoEntries = [
		`/Producer ${pdfText('Gus Utility Belt')}`,
		`/Creator ${pdfText(info.creator ?? 'Gus Utility Belt')}`,
		`/CreationDate ${pdfDate(now)}`
	];
	if (info.title) infoEntries.push(`/Title ${pdfText(info.title)}`);
	if (info.author) infoEntries.push(`/Author ${pdfText(info.author)}`);
	if (info.subject) infoEntries.push(`/Subject ${pdfText(info.subject)}`);
	obj(3, `<< ${infoEntries.join(' ')} >>`);

	pages.forEach((pg, i) => {
		const pageNum = first + i * 3, imgNum = pageNum + 1, contNum = pageNum + 2;
		const { image: im, rect: r, clip } = pg;
		let content = 'q\n';
		if (clip) content += `${n2(clip.x)} ${n2(clip.y)} ${n2(clip.w)} ${n2(clip.h)} re W n\n`;
		content += `${n2(r.w)} 0 0 ${n2(r.h)} ${n2(r.x)} ${n2(r.y)} cm\n/Im0 Do\nQ\n`;
		const procSet = im.kind === 'jpeg' ? (im.gray ? '/ImageB' : '/ImageC') : im.colors === 1 ? '/ImageB' : '/ImageC';
		obj(
			pageNum,
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(pg.width)} ${n2(pg.height)}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> /ProcSet [/PDF ${procSet}] >> /Contents ${contNum} 0 R >>`
		);
		let dict: string;
		if (im.kind === 'jpeg') {
			dict = `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /${im.gray ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>`;
		} else {
			dict = `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /${im.colors === 1 ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent ${im.bpc} /Filter /FlateDecode /Length ${im.bytes.length} >>`;
		}
		obj(imgNum, dict, '\nstream\n', im.bytes, '\nendstream');
		obj(contNum, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
	});
	const count = first + pages.length * 3;
	const xref = pos;
	let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
	for (let i = 1; i < count; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
	push(x);
	push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
	return parts;
}

export function concatParts(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
	let o = 0;
	for (const p of parts) { out.set(p, o); o += p.length; }
	return out;
}

// =====================================================================
// JPEG: dimensões, componentes e orientação EXIF (para embutir o original sem recodificar)
// =====================================================================

export type JpegInfo = { width: number; height: number; components: number; orientation: number; progressive: boolean };

export function jpegInfo(b: Uint8Array): JpegInfo | null {
	if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
	let orientation = 1;
	let i = 2;
	while (i + 4 <= b.length) {
		if (b[i] !== 0xff) { i++; continue; }
		const m = b[i + 1];
		if (m === 0xff) { i++; continue; }
		if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
		const len = (b[i + 2] << 8) | b[i + 3];
		if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
			orientation = exifOrientation(b, i + 10, len - 8) ?? orientation;
		}
		// SOF0..SOF15, exceto DHT (C4), JPG (C8) e DAC (CC)
		if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
			const height = (b[i + 5] << 8) | b[i + 6];
			const width = (b[i + 7] << 8) | b[i + 8];
			return { width, height, components: b[i + 9], orientation, progressive: m === 0xc2 || m === 0xc6 || m === 0xca || m === 0xce };
		}
		if (m === 0xda || m === 0xd9) break;
		i += 2 + len;
	}
	return null;
}

function exifOrientation(b: Uint8Array, start: number, len: number): number | null {
	const end = Math.min(b.length, start + len);
	if (start + 8 > end) return null;
	const le = b[start] === 0x49;
	const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
	const u32 = (o: number) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 2 ** 24 : b[o] * 2 ** 24 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]));
	const ifd = start + u32(start + 4);
	if (ifd + 2 > end) return null;
	const n = u16(ifd);
	for (let k = 0; k < n; k++) {
		const e = ifd + 2 + k * 12;
		if (e + 12 > end) break;
		if (u16(e) === 0x0112) return u16(e + 8);
	}
	return null;
}
