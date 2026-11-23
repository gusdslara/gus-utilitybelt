// Histórico global do clipboard: tudo que é copiado na ferramenta fica salvo no IndexedDB.
// Gravação imediata a cada cópia (nunca perde nada); nada sai do navegador.
import { t } from '#lib/i18n/index.svelte.ts';

export type ClipType = 'url' | 'color' | 'uuid' | 'json' | 'email' | 'number' | 'doc' | 'code' | 'text';
export type Clip = {
	id: string;
	text: string;
	type: ClipType;
	source: string;
	created: number;
	last: number;
	count: number;
	pinned: boolean;
};

const DB = 'gus-clipboard';
const STORE = 'clips';
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
	dbp ??= new Promise((res, rej) => {
		const r = indexedDB.open(DB, 1);
		r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
		r.onsuccess = () => res(r.result);
		r.onerror = () => rej(r.error);
	});
	return dbp;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	const d = await db();
	return new Promise((res, rej) => {
		const t = d.transaction(STORE, mode);
		const q = fn(t.objectStore(STORE));
		t.oncomplete = () => res(q.result);
		t.onerror = () => rej(t.error);
	});
}

export function detectType(t: string): ClipType {
	const s = t.trim();
	// Lista (uma por linha) do mesmo tipo: ex. vários UUIDs, CPFs ou links
	const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
	if (lines.length > 1) {
		const first = detectType(lines[0]);
		if (first !== 'text' && first !== 'code' && lines.every((l) => detectType(l) === first)) return first;
	}
	if (/^https?:\/\/\S+$/i.test(s)) return 'url';
	if (/^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl|oklch)a?\([^)]*\))$/i.test(s)) return 'color';
	if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(s)) return 'uuid';
	if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(s)) return 'email';
	if (/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2})$/.test(s)) return 'doc';
	if (/^-?\d+([.,]\d+)?$/.test(s)) return 'number';
	if (/^[[{]/.test(s)) {
		try { JSON.parse(s); return 'json'; } catch { /* não é JSON */ }
	}
	if (/[{};<>]|=>|^\s*(const|let|function|import|<\w)/m.test(s) && s.includes('\n')) return 'code';
	return 'text';
}

/** Tipos na ordem em que aparecem nos filtros. */
export const clipTypes: ClipType[] = ['url', 'color', 'uuid', 'json', 'email', 'number', 'doc', 'code', 'text'];

/** Rótulo traduzido do tipo (idioma atual). */
export const typeLabel = (type: ClipType) => t(`clipboard.types.${type}`);

/** Origem padrão gravada nos itens; traduzida só na exibição (sourceLabel). */
export const DEFAULT_SOURCE = 'Geral';
export const sourceLabel = (source: string) => (source === DEFAULT_SOURCE ? t('clipboard.general') : source);

class ClipHistory {
	items = $state<Clip[]>([]);
	ready = $state(false);
	/** Origem atual (ferramenta aberta), usada para etiquetar novas cópias. */
	source = $state(DEFAULT_SOURCE);

	/** Mais recentes primeiro; fixados sempre no topo. */
	sorted = $derived([...this.items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.last - a.last));
	count = $derived(this.items.length);

	async load() {
		if (this.ready) return;
		try {
			this.items = await run<Clip[]>('readonly', (s) => s.getAll());
		} catch (e) {
			console.error('Clipboard: IndexedDB indisponível', e);
		}
		this.ready = true;
	}

	/** Registra uma cópia. Texto repetido não duplica: sobe para o topo e soma o contador. */
	async add(text: string, source = this.source) {
		if (!text || !text.trim()) return;
		const now = Date.now();
		const existing = this.items.find((c) => c.text === text);
		let clip: Clip;
		if (existing) {
			existing.last = now;
			existing.count += 1;
			existing.source = source;
			clip = $state.snapshot(existing) as Clip;
		} else {
			clip = { id: crypto.randomUUID(), text, type: detectType(text), source, created: now, last: now, count: 1, pinned: false };
			this.items.push(clip);
		}
		await run('readwrite', (s) => s.put(clip)).catch(console.error);
	}

	async copy(c: Clip) {
		await this.add(c.text, c.source);
		await navigator.clipboard.writeText(c.text).catch(() => {});
	}

	async togglePin(c: Clip) {
		c.pinned = !c.pinned;
		await run('readwrite', (s) => s.put($state.snapshot(c) as Clip));
	}

	async remove(c: Clip) {
		this.items = this.items.filter((x) => x.id !== c.id);
		await run('readwrite', (s) => s.delete(c.id));
	}

	/** Limpa só os não fixados. */
	async clearUnpinned() {
		const gone = this.items.filter((c) => !c.pinned);
		this.items = this.items.filter((c) => c.pinned);
		for (const c of gone) await run('readwrite', (s) => s.delete(c.id));
	}

	exportJson() {
		const blob = new Blob([JSON.stringify($state.snapshot(this.sorted), null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		Object.assign(document.createElement('a'), { href: url, download: `clipboard-${new Date().toISOString().slice(0, 10)}.json` }).click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	/** Captura Ctrl+C / copiar do menu em qualquer lugar do app. */
	listen() {
		const onCopy = () => {
			const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
			let text = '';
			if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && typeof el.selectionStart === 'number') {
				text = el.value.slice(el.selectionStart, el.selectionEnd ?? el.selectionStart);
			} else {
				text = document.getSelection()?.toString() ?? '';
			}
			// Após o evento, para não atrasar a cópia
			queueMicrotask(() => this.add(text));
		};
		document.addEventListener('copy', onCopy);
		document.addEventListener('cut', onCopy);
		return () => {
			document.removeEventListener('copy', onCopy);
			document.removeEventListener('cut', onCopy);
		};
	}
}

export const clipboard = new ClipHistory();
