// Testes das partes puras do conversor em lote: detecção, nomes, redimensionamento, ZIP e PDF.
import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	buildPdfBytes,
	crc32,
	formatBytes,
	icoSizesFor,
	outName,
	resolveFormat,
	sniffBytes,
	targetSize,
	zipSync
} from './convert-pure.ts';

const bytes = (...parts: (number[] | string)[]) =>
	new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const pad = (b: Uint8Array, n = 64) => {
	const o = new Uint8Array(Math.max(n, b.length));
	o.set(b);
	return o;
};
const ftyp = (major: string, ...compat: string[]) => {
	const body = [major, '\0\0\0\0', ...compat].join('');
	const size = 8 + body.length;
	return pad(bytes([0, 0, 0, size], 'ftyp', body));
};

describe('sniffBytes', () => {
	test('assinaturas', () => {
		expect(sniffBytes(pad(bytes([0xff, 0xd8, 0xff, 0xe0])))).toBe('jpeg');
		expect(sniffBytes(pad(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])))).toBe('png');
		expect(sniffBytes(pad(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 ')))).toBe('webp');
		expect(sniffBytes(pad(bytes('GIF89a')))).toBe('gif');
		expect(sniffBytes(pad(bytes('GIF87a')))).toBe('gif');
		expect(sniffBytes(pad(bytes('BM', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [40, 0, 0, 0])))).toBe('bmp');
		expect(sniffBytes(pad(bytes([0, 0, 1, 0, 2, 0])))).toBe('ico');
		expect(sniffBytes(pad(bytes([0, 0, 2, 0, 1, 0])))).toBe('ico'); // CUR
		expect(sniffBytes(pad(bytes('8BPS', [0, 1])))).toBe('psd');
		expect(sniffBytes(pad(bytes('II*', [0])))).toBe('tiff');
		expect(sniffBytes(pad(bytes('MM', [0, 0x2a])))).toBe('tiff');
	});
	test('ISOBMFF: HEIC × AVIF', () => {
		expect(sniffBytes(ftyp('heic', 'mif1', 'heic'))).toBe('heic');
		expect(sniffBytes(ftyp('heix', 'mif1'))).toBe('heic');
		expect(sniffBytes(ftyp('avif', 'mif1', 'miaf'))).toBe('avif');
		expect(sniffBytes(ftyp('avis', 'msf1'))).toBe('avif');
		expect(sniffBytes(ftyp('mif1', 'avif', 'miaf'))).toBe('avif');
		expect(sniffBytes(ftyp('mif1', 'heic'))).toBe('heic');
		expect(sniffBytes(ftyp('mif1', 'miaf'))).toBe('heic');
	});
	test('SVG em texto', () => {
		const t = (s: string) => new TextEncoder().encode(s);
		expect(sniffBytes(t('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe('svg');
		expect(sniffBytes(t('﻿  <?xml version="1.0"?>\n<!-- c -->\n<svg width="1">'))).toBe('svg');
		expect(sniffBytes(t('<html><body>oi</body></html>'))).toBe('unknown');
	});
	test('extensão como fallback', () => {
		const junk = pad(bytes('xxxxxxxx'));
		expect(sniffBytes(junk, 'a.HEIF')).toBe('heic');
		expect(sniffBytes(junk, 'foto.jpeg')).toBe('jpeg');
		expect(sniffBytes(junk, 'scan.tif')).toBe('tiff');
		expect(sniffBytes(junk, 'x.psd')).toBe('psd');
		expect(sniffBytes(junk, 'x')).toBe('unknown');
		// bytes mágicos vencem a extensão
		expect(sniffBytes(pad(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])), 'mentira.jpg')).toBe('png');
	});
});

describe('outName / resolveFormat', () => {
	test('troca de extensão', () => {
		expect(outName('foto.HEIC', 'jpeg', 'heic')).toBe('foto.jpg');
		expect(outName('a.b.c.png', 'webp', 'png')).toBe('a.b.c.webp');
		expect(outName('sem-ext', 'png', 'unknown')).toBe('sem-ext.png');
		expect(outName('dir/sub/x.tiff', 'pdf', 'tiff')).toBe('x.pdf');
		expect(outName('.png', 'ico', 'png')).toBe('imagem.ico');
	});
	test("'same'", () => {
		expect(outName('x.jpeg', 'same', 'jpeg')).toBe('x.jpg');
		expect(outName('x.tiff', 'same', 'tiff')).toBe('x.tif');
		expect(outName('x.heic', 'same', 'heic')).toBe('x.png');
		expect(outName('x.svg', 'same', 'svg')).toBe('x.svg');
		expect(resolveFormat('same', 'psd')).toBe('psd');
		expect(resolveFormat('same', 'unknown')).toBe('png');
		expect(resolveFormat('gif', 'png')).toBe('gif');
	});
	test('sem colisão', () => {
		const taken = new Set<string>();
		expect(outName('a.png', 'jpeg', 'png', taken)).toBe('a.jpg');
		expect(outName('a.webp', 'jpeg', 'webp', taken)).toBe('a (2).jpg');
		expect(outName('A.gif', 'jpeg', 'gif', taken)).toBe('A (3).jpg');
		expect(outName('b.png', 'jpeg', 'png', taken)).toBe('b.jpg');
	});
});

describe('targetSize / icoSizesFor', () => {
	test('modos', () => {
		expect(targetSize(4000, 3000, { mode: 'none' })).toEqual({ width: 4000, height: 3000 });
		expect(targetSize(4000, 3000, { mode: 'percent', value: 25 })).toEqual({ width: 1000, height: 750 });
		expect(targetSize(4000, 3000, { mode: 'fit', width: 1920, height: 1080, upscale: false })).toEqual({ width: 1440, height: 1080 });
		expect(targetSize(400, 300, { mode: 'fit', width: 1920, height: 1080, upscale: false })).toEqual({ width: 400, height: 300 });
		expect(targetSize(400, 300, { mode: 'fit', width: 800, height: 0, upscale: true })).toEqual({ width: 800, height: 600 });
		expect(targetSize(400, 300, { mode: 'exact', width: 100, height: 100 })).toEqual({ width: 100, height: 100 });
		expect(targetSize(400, 300, { mode: 'exact', width: 200, height: 0 })).toEqual({ width: 200, height: 150 });
		expect(targetSize(100, 100, { mode: 'percent', value: 100000 })).toEqual({ width: 16384, height: 16384 });
	});
	test('ICO', () => {
		expect(icoSizesFor([16, 32, 256, 32], 64, 40)).toEqual([16, 32]);
		expect(icoSizesFor([256], 10, 10)).toEqual([10]);
		expect(icoSizesFor([], 1000, 1000)).toEqual([16, 32, 48, 256]);
	});
});

test('formatBytes', () => {
	expect(formatBytes(0)).toBe('0 B');
	expect(formatBytes(1023)).toBe('1023 B');
	expect(formatBytes(1024)).toBe('1 KB');
	expect(formatBytes(1536)).toBe('1.5 KB');
	expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
	expect(formatBytes(150 * 1024 * 1024)).toBe('150 MB');
	expect(formatBytes(-1)).toBe('—');
});

test('crc32', () => {
	expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
	expect(crc32(new Uint8Array())).toBe(0);
	// incremental
	const a = new TextEncoder().encode('12345'), b = new TextEncoder().encode('6789');
	expect(crc32(b, crc32(a))).toBe(0xcbf43926);
});

describe('ZIP', () => {
	const files = [
		{ name: 'olá.png', data: new Uint8Array([1, 2, 3, 4, 5]) },
		{ name: 'pasta/ação 📷.jpg', data: new TextEncoder().encode('conteúdo qualquer') },
		{ name: 'vazio.txt', data: new Uint8Array() }
	];
	const zip = zipSync(files, new Date(2024, 5, 15, 13, 45, 30));
	const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

	test('estrutura lida de volta', () => {
		const eo = zip.length - 22;
		expect(v.getUint32(eo, true)).toBe(0x06054b50);
		expect(v.getUint16(eo + 8, true)).toBe(3);
		expect(v.getUint16(eo + 10, true)).toBe(3);
		const cdSize = v.getUint32(eo + 12, true), cdOff = v.getUint32(eo + 16, true);
		expect(cdOff + cdSize).toBe(eo);
		let p = cdOff;
		const dec = new TextDecoder();
		for (const f of files) {
			expect(v.getUint32(p, true)).toBe(0x02014b50);
			expect(v.getUint16(p + 8, true) & 0x0800).toBe(0x0800);
			expect(v.getUint16(p + 10, true)).toBe(0); // STORE
			const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true);
			const nlen = v.getUint16(p + 28, true), lho = v.getUint32(p + 42, true);
			expect(dec.decode(zip.subarray(p + 46, p + 46 + nlen))).toBe(f.name);
			expect(size).toBe(f.data.length);
			// cabeçalho local
			expect(v.getUint32(lho, true)).toBe(0x04034b50);
			expect(v.getUint16(lho + 6, true) & 0x0800).toBe(0x0800);
			expect(v.getUint32(lho + 14, true)).toBe(crc);
			const lnlen = v.getUint16(lho + 26, true), extra = v.getUint16(lho + 28, true);
			expect(dec.decode(zip.subarray(lho + 30, lho + 30 + lnlen))).toBe(f.name);
			const data = zip.subarray(lho + 30 + lnlen + extra, lho + 30 + lnlen + extra + size);
			expect(crc32(data)).toBe(crc);
			expect([...data]).toEqual([...f.data]);
			p += 46 + nlen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
		}
	});

	const unzip = Bun.which('unzip');
	test.skipIf(!unzip)('extrai com unzip -t', () => {
		const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'ubzip-'));
		try {
			const f = join(dir, 't.zip');
			writeFileSync(f, zip);
			const r = Bun.spawnSync([unzip!, '-t', f]);
			expect(r.exitCode).toBe(0);
			expect(r.stdout.toString()).toContain('No errors');
			const x = Bun.spawnSync([unzip!, '-o', '-q', f, '-d', join(dir, 'out')]);
			expect(x.exitCode).toBe(0);
			expect(existsSync(join(dir, 'out', 'olá.png'))).toBe(true);
			expect(readFileSync(join(dir, 'out', 'pasta', 'ação 📷.jpg'), 'utf8')).toBe('conteúdo qualquer');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('PDF', () => {
	const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
	const latin1 = (u: Uint8Array) => new TextDecoder('latin1').decode(u);

	for (const size of ['image', 'a4', 'letter'] as const) {
		test(`estrutura e xref (${size})`, () => {
			const pdf = buildPdfBytes(
				[
					{ jpeg, width: 800, height: 600 },
					{ jpeg, width: 300, height: 1200 }
				],
				size
			);
			const s = latin1(pdf);
			expect(s.startsWith('%PDF-1.4\n')).toBe(true);
			expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
			expect(s).toContain('/Count 2');
			expect(s).toContain('/Filter /DCTDecode');
			const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(s)![1]);
			expect(s.slice(startxref, startxref + 4)).toBe('xref');
			const m = /xref\n0 (\d+)\n/.exec(s.slice(startxref))!;
			const count = Number(m[1]);
			expect(count).toBe(3 + 2 * 3);
			const table = s.slice(startxref + m[0].length).split('\n').slice(0, count);
			expect(table[0]).toBe('0000000000 65535 f ');
			for (let i = 1; i < count; i++) {
				expect(table[i]).toMatch(/^\d{10} 00000 n $/);
				const off = Number(table[i].slice(0, 10));
				expect(s.slice(off, off + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
			}
			// /Length do stream da imagem bate com o JPEG
			expect(s).toContain(`/Length ${jpeg.length} >>\nstream\n`);
			if (size === 'a4') {
				expect(s).toContain('/MediaBox [0 0 841.89 595.28]'); // paisagem para 800×600
				expect(s).toContain('/MediaBox [0 0 595.28 841.89]');
			}
			if (size === 'image') expect(s).toContain('/MediaBox [0 0 600 450]');
		});
	}

	test('sem páginas → erro', () => {
		expect(() => buildPdfBytes([], 'a4')).toThrow();
	});
});
