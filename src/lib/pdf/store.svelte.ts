// Estado do app PDF: páginas (de imagens ou do scanner), ajustes do PDF e exportação.
// O processamento pesado vai para o worker (scan/client.ts); aqui só ficam Blobs e URLs de preview.
import { scan } from '../scan/client.ts';
import { defaultParams, type PageParams } from '../scan/protocol.ts';
import type { Quad, Rotation } from '../scan/geometry.ts';
import type { ScanFilter } from '../scan/enhance.ts';
import { buildPdfParts, type PdfPageSpec } from './writer.ts';
import { defaultPdfSettings, type PdfSettings } from './layout.ts';

export type Page = {
	id: string;
	name: string;
	src: Blob;
	/** Dimensões da origem (já com a orientação EXIF aplicada). */
	width: number;
	height: number;
	origin: 'file' | 'scan';
	params: PageParams;
	/** Documento detectado automaticamente na origem (pode não estar aplicado). */
	detected: Quad | null;
	preview: string | null;
	previewW: number;
	previewH: number;
	busy: boolean;
	error: string | null;
};

export type ExportResult = { blob: Blob; url: string; name: string; pages: number; ms: number; passthrough: number };

const PREVIEW_SIDE = 1100;
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const baseName = (n: string) => n.replace(/\.[a-z0-9]{1,5}$/i, '') || 'imagem';

/** Decodifica no main o que o worker não consegue (HEIC via heic-to; SVG via <img>) e devolve um JPEG/PNG. */
async function normalizeSource(file: Blob, name: string): Promise<Blob> {
	const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
	const brand = new TextDecoder().decode(head.slice(4, 12));
	const isHeic = /\.(heic|heif)$/i.test(name) || /^ftyp(heic|heix|hevc|mif1|msf1|heis)/.test(brand) || /heic|heif/.test(file.type);
	if (isHeic) {
		const { heicTo } = await import('heic-to');
		return heicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.decoding = 'async';
		await new Promise<void>((res, rej) => {
			img.onload = () => res();
			img.onerror = () => rej(new Error('format'));
			img.src = url;
		});
		let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
		const k = Math.max(1, 2048 / Math.max(w, h)); // SVG: rasteriza com boa resolução
		w = Math.round(w * k);
		h = Math.round(h * k);
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const g = c.getContext('2d')!;
		g.fillStyle = '#fff';
		g.fillRect(0, 0, w, h);
		g.drawImage(img, 0, 0, w, h);
		return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('format'))), 'image/png'));
	} finally {
		URL.revokeObjectURL(url);
	}
}

class PdfStore {
	pages = $state<Page[]>([]);
	settings = $state<PdfSettings>(defaultPdfSettings());
	filename = $state('documento');
	/** Filtro padrão das páginas vindas do scanner. */
	scanFilter = $state<ScanFilter>('enhance');
	/** Recortar automaticamente o documento detectado em fotos importadas. */
	autoCropImports = $state(false);
	importing = $state(0);
	importErrors = $state<string[]>([]);
	exporting = $state(false);
	exportProgress = $state(0);
	result = $state<ExportResult | null>(null);
	private cancel = false;
	private versions = new Map<string, number>();
	private queue: string[] = [];
	private rendering = 0;

	get count() {
		return this.pages.length;
	}

	byId(id: string) {
		return this.pages.find((p) => p.id === id);
	}

	/** Adiciona imagens (arquivos, colagem, galeria). */
	async addFiles(files: Iterable<File | Blob>, origin: 'file' | 'scan' = 'file') {
		const list = [...files].filter((f) => f.size > 0);
		if (!list.length) return;
		this.importing += list.length;
		this.result = null;
		// Lugares reservados na ordem de chegada; preenchidos conforme cada arquivo é lido.
		const slots = list.map((f) => this.placeholder((f as File).name || `${origin === 'scan' ? 'scan' : 'imagem'}-${this.pages.length + 1}`, f, origin));
		await Promise.all(
			slots.map(async (id, i) => {
				try {
					await this.probe(id, list[i]);
				} catch (e) {
					this.importErrors = [...this.importErrors, `${(list[i] as File).name ?? 'imagem'}: ${e instanceof Error ? e.message : String(e)}`];
					this.remove(id);
				} finally {
					this.importing--;
				}
			})
		);
	}

	/** Página vinda da câmera, já com o recorte revisado. */
	/** `key`: id já usado no worker durante a revisão (reaproveita a imagem decodificada). */
	async addScan(src: Blob, params: Partial<PageParams>, size?: { width: number; height: number; detected: Quad | null }, key?: string) {
		const n = this.pages.filter((p) => p.origin === 'scan').length + 1;
		const id = this.placeholder(`scan-${String(n).padStart(2, '0')}`, src, 'scan', key);
		const p = this.byId(id)!;
		p.params = { ...defaultParams(), filter: this.scanFilter, ...params };
		this.result = null;
		if (size) {
			p.width = size.width;
			p.height = size.height;
			p.detected = size.detected;
			p.busy = false;
			this.refresh(id);
		} else {
			await this.probe(id, src);
		}
		return id;
	}

	private placeholder(name: string, src: Blob, origin: 'file' | 'scan', id = uid()) {
		this.pages.push({ id, name: baseName(name), src, width: 0, height: 0, origin, params: defaultParams(), detected: null, preview: null, previewW: 3, previewH: 4, busy: true, error: null });
		return id;
	}

	private async probe(id: string, file: Blob) {
		let src = file;
		let info;
		try {
			info = await scan.probe(id, src, true);
		} catch {
			src = await normalizeSource(file, (file as File).name ?? '').catch(() => {
				throw new Error('formato não suportado');
			});
			info = await scan.probe(id, src, true);
		}
		const p = this.byId(id);
		if (!p) return;
		p.src = src;
		p.width = info.width;
		p.height = info.height;
		p.previewW = info.width;
		p.previewH = info.height;
		p.detected = info.quad;
		if (p.origin === 'scan') {
			p.params = { ...p.params, quad: p.params.quad ?? info.quad, filter: p.params.filter === 'original' ? this.scanFilter : p.params.filter };
		} else if (this.autoCropImports && info.quad && info.score > 0.45) {
			p.params = { ...p.params, quad: info.quad };
		}
		this.refresh(id);
	}

	setParams(id: string, patch: Partial<PageParams>) {
		const p = this.byId(id);
		if (!p) return;
		p.params = { ...p.params, ...patch };
		this.result = null;
		this.refresh(id);
	}

	rotate(id: string, dir: 1 | -1) {
		const p = this.byId(id);
		if (p) this.setParams(id, { rotation: (((p.params.rotation + dir * 90) % 360) + 360) % 360 as Rotation });
	}

	applyFilterAll(filter: ScanFilter) {
		for (const p of this.pages) if (p.params.filter !== filter) this.setParams(p.id, { filter });
	}

	autoCropAll() {
		for (const p of this.pages) if (p.detected) this.setParams(p.id, { quad: p.detected });
	}

	remove(id: string) {
		const i = this.pages.findIndex((p) => p.id === id);
		if (i < 0) return;
		const [p] = this.pages.splice(i, 1);
		if (p.preview) URL.revokeObjectURL(p.preview);
		this.versions.delete(id);
		scan.forget(id);
		this.result = null;
	}

	duplicate(id: string) {
		const i = this.pages.findIndex((p) => p.id === id);
		if (i < 0) return;
		const p = this.pages[i];
		const nid = uid();
		this.pages.splice(i + 1, 0, { ...$state.snapshot(p), src: p.src, id: nid, preview: null, busy: true } as Page);
		this.result = null;
		this.refresh(nid);
	}

	move(from: number, to: number) {
		if (from === to || from < 0 || to < 0 || from >= this.pages.length || to >= this.pages.length) return;
		const [p] = this.pages.splice(from, 1);
		this.pages.splice(to, 0, p);
		this.result = null;
	}

	sortByName() {
		const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
		this.pages.sort((a, b) => coll.compare(a.name, b.name));
		this.result = null;
	}

	reverse() {
		this.pages.reverse();
		this.result = null;
	}

	clear() {
		for (const p of this.pages) {
			if (p.preview) URL.revokeObjectURL(p.preview);
			scan.forget(p.id);
		}
		this.pages = [];
		this.versions.clear();
		this.importErrors = [];
		this.clearResult();
	}

	clearResult() {
		if (this.result) URL.revokeObjectURL(this.result.url);
		this.result = null;
	}

	/** Agenda o preview (fila com 2 em paralelo; versões antigas são descartadas). */
	refresh(id: string) {
		this.versions.set(id, (this.versions.get(id) ?? 0) + 1);
		const p = this.byId(id);
		if (p) p.busy = true;
		if (!this.queue.includes(id)) this.queue.push(id);
		this.pump();
	}

	private pump() {
		while (this.rendering < 2 && this.queue.length) {
			const id = this.queue.shift()!;
			const p = this.byId(id);
			if (!p) continue;
			const v = this.versions.get(id);
			this.rendering++;
			scan
				.render(id, p.src, p.params, PREVIEW_SIDE, 0.8)
				.then((r) => {
					const cur = this.byId(id);
					if (!cur) return;
					if (this.versions.get(id) !== v) return; // mudou de novo: o próximo render cuida
					if (cur.preview) URL.revokeObjectURL(cur.preview);
					cur.preview = URL.createObjectURL(r.blob);
					cur.previewW = r.width;
					cur.previewH = r.height;
					cur.busy = false;
					cur.error = null;
				})
				.catch((e) => {
					const cur = this.byId(id);
					if (cur) {
						cur.busy = false;
						cur.error = e instanceof Error ? e.message : String(e);
					}
				})
				.finally(() => {
					this.rendering--;
					this.pump();
				});
		}
	}

	get outName() {
		const n = this.filename.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\.pdf$/i, '') || 'documento';
		return `${n}.pdf`;
	}

	async exportPdf(): Promise<ExportResult | null> {
		if (!this.pages.length || this.exporting) return null;
		this.clearResult();
		this.exporting = true;
		this.exportProgress = 0;
		this.cancel = false;
		const t0 = performance.now();
		try {
			const specs: PdfPageSpec[] = [];
			let passthrough = 0;
			const settings = $state.snapshot(this.settings) as PdfSettings;
			for (let i = 0; i < this.pages.length; i++) {
				if (this.cancel) return null;
				const p = this.pages[i];
				const r = await scan.pdfPage(p.id, p.src, p.params, settings);
				specs.push(r.spec);
				if (r.passthrough) passthrough++;
				this.exportProgress = (i + 1) / this.pages.length;
			}
			const blob = new Blob(buildPdfParts(specs, { title: this.outName.replace(/\.pdf$/, '') }) as BlobPart[], { type: 'application/pdf' });
			const res: ExportResult = { blob, url: URL.createObjectURL(blob), name: this.outName, pages: specs.length, ms: performance.now() - t0, passthrough };
			this.result = res;
			return res;
		} finally {
			this.exporting = false;
		}
	}

	stopExport() {
		this.cancel = true;
	}

	/** Páginas como imagens (JPEG; P&B em PNG), num ZIP. */
	async exportImages(): Promise<{ blob: Blob; name: string } | null> {
		if (!this.pages.length || this.exporting) return null;
		this.exporting = true;
		this.exportProgress = 0;
		this.cancel = false;
		try {
			const files: { name: string; blob: Blob }[] = [];
			const base = this.outName.replace(/\.pdf$/, '');
			for (let i = 0; i < this.pages.length; i++) {
				if (this.cancel) return null;
				const p = this.pages[i];
				const png = p.params.filter === 'bw';
				const r = await scan.image(p.id, p.src, p.params, png ? 'image/png' : 'image/jpeg', 0.92);
				files.push({ name: `${base}-${String(i + 1).padStart(2, '0')}.${png ? 'png' : 'jpg'}`, blob: r.blob });
				this.exportProgress = (i + 1) / this.pages.length;
			}
			if (files.length === 1) return files[0];
			const { zipFiles } = await import('../image/convert.ts');
			return { blob: await zipFiles(files), name: `${base}.zip` };
		} finally {
			this.exporting = false;
		}
	}
}

export const pdf = new PdfStore();
