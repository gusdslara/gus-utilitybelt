// Estado do editor: pasta virtual persistida no IndexedDB ou pasta real do PC (File System Access API).
import { idb, type StoredNode } from './idb';
import { t } from '#lib/i18n/index.svelte.ts';

export type Node = {
	path: string; // ex.: "src/main.ts" (sem barra inicial)
	name: string;
	kind: 'file' | 'dir';
	content: string;
	/** Conteúdo da última versão salva (base para o Diff). */
	saved: string;
	dirty: boolean;
	/** Linguagem definida pelo usuário ou detectada (id de languages.ts). Vazio = pela extensão. */
	lang?: string;
	/** true quando `lang` veio da detecção automática (não da escolha do usuário). */
	langAuto?: boolean;
	/** Rascunho sem nome: ainda não existe na pasta. */
	scratch?: boolean;
	handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
};

type Backend = 'virtual' | 'local';

const SKIP = new Set(['.git', 'node_modules', '.svelte-kit', 'dist', 'build']);
const MAX_LOAD = 512 * 1024; // arquivos maiores não são carregados no editor
const SCRATCH_KEY = 'ub.editor.scratches';
export const SCRATCH_PREFIX = 'untitled:';

type StoredScratch = { path: string; name: string; content: string; lang?: string; langAuto?: boolean };

function nameOf(path: string) {
	return path.split('/').pop() ?? path;
}
function parentOf(path: string) {
	const i = path.lastIndexOf('/');
	return i === -1 ? '' : path.slice(0, i);
}

class Workspace {
	rootName = $state('workspace');
	backend = $state<Backend>('virtual');
	nodes = $state<Node[]>([]);
	activePath = $state<string | null>(null);
	ready = $state(false);
	error = $state<string | null>(null);

	/** Rascunhos sem nome (não aparecem na pasta até serem salvos). */
	scratches = $state<Node[]>([]);

	active = $derived(
		this.scratches.find((n) => n.path === this.activePath) ??
			this.nodes.find((n) => n.path === this.activePath && n.kind === 'file') ??
			null
	);
	dirtyCount = $derived(this.nodes.filter((n) => n.dirty).length);
	canLocal = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

	/** Ordena: pastas antes de arquivos, alfabético. */
	sorted = $derived(
		[...this.nodes].sort((a, b) => {
			const pa = a.path.split('/'), pb = b.path.split('/');
			const n = Math.min(pa.length, pb.length);
			for (let i = 0; i < n; i++) {
				if (pa[i] !== pb[i]) {
					const aIsDir = i < pa.length - 1 || a.kind === 'dir';
					const bIsDir = i < pb.length - 1 || b.kind === 'dir';
					if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
					return pa[i].localeCompare(pb[i]);
				}
			}
			return pa.length - pb.length;
		})
	);

	async init() {
		try {
			const stored = await idb.all();
			if (stored.length === 0) {
				// Pasta padrão de cara (no idioma do momento da criação; depois fica como está)
				const dir = t('editor.seed.dir');
				const seed: StoredNode[] = [
					{ path: dir, kind: 'dir' },
					{ path: `${dir}/README.md`, kind: 'file', content: t('editor.seed.readme') },
					{ path: `${dir}/${t('editor.seed.notesName')}`, kind: 'file', content: t('editor.seed.notes') }
				];
				for (const s of seed) await idb.put(s);
				this.nodes = seed.map((s) => this.toNode(s));
			} else {
				this.nodes = stored.map((s) => this.toNode(s));
			}
		} catch (e) {
			this.error = t('editor.ws.noIdb');
			console.error(e);
		}
		if (this.scratches.length === 0) this.loadScratches();
		// Ao abrir, já começa num rascunho sem nome: é só colar e formatar.
		const empty = this.scratches.find((s) => !s.content);
		this.activePath = (empty ?? this.newScratch(false)).path;
		this.ready = true;
	}

	// ---------- Rascunhos sem nome ----------

	private loadScratches() {
		try {
			const raw = localStorage.getItem(SCRATCH_KEY);
			const list: StoredScratch[] = raw ? JSON.parse(raw) : [];
			this.scratches = list.map((s) => ({ ...s, kind: 'file', saved: '', dirty: !!s.content, scratch: true }));
		} catch {
			this.scratches = [];
		}
	}

	private persistTimer: ReturnType<typeof setTimeout> | undefined;
	private persistScratches() {
		clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			try {
				const list: StoredScratch[] = this.scratches.map(({ path, name, content, lang, langAuto }) => ({ path, name, content, lang, langAuto }));
				localStorage.setItem(SCRATCH_KEY, JSON.stringify(list));
			} catch {
				/* sem storage: rascunho vale só nesta sessão */
			}
		}, 300);
	}

	/** Cria um rascunho sem nome e o abre. */
	newScratch(select = true): Node {
		let n = 1;
		const used = new Set(this.scratches.map((s) => s.name));
		while (used.has(t('editor.ws.untitled', { n }))) n++;
		const node: Node = { path: `${SCRATCH_PREFIX}${Date.now().toString(36)}${n}`, name: t('editor.ws.untitled', { n }), kind: 'file', content: '', saved: '', dirty: false, scratch: true };
		this.scratches = [...this.scratches, node];
		if (select) this.activePath = node.path;
		this.persistScratches();
		return node;
	}

	closeScratch(path: string) {
		this.scratches = this.scratches.filter((s) => s.path !== path);
		if (this.activePath === path) this.activePath = this.scratches[0]?.path ?? this.nodes.find((n) => n.kind === 'file')?.path ?? null;
		this.persistScratches();
	}

	/** Grava um rascunho como arquivo na pasta atual. Retorna erro ou null. */
	async saveScratchAs(path: string, target: string): Promise<string | null> {
		const s = this.scratches.find((x) => x.path === path);
		if (!s) return t('editor.ws.draftNotFound');
		const err = await this.create(target, 'file');
		if (err) return err;
		const file = this.nodes.find((n) => n.path === target.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/'));
		if (!file) return t('editor.ws.createFailed');
		file.content = s.content;
		file.lang = s.langAuto ? undefined : s.lang;
		await this.save(file.path);
		this.closeScratch(path);
		this.activePath = file.path;
		return null;
	}

	/** Define a linguagem do item (auto = veio da detecção). */
	setLang(path: string, lang: string | undefined, auto = false) {
		const n = this.scratches.find((x) => x.path === path) ?? this.nodes.find((x) => x.path === path);
		if (!n) return;
		n.lang = lang;
		n.langAuto = auto;
		if (n.scratch) this.persistScratches();
	}

	private toNode(s: StoredNode): Node {
		return { path: s.path, name: nameOf(s.path), kind: s.kind, content: s.content ?? '', saved: s.content ?? '', dirty: false };
	}

	select(path: string) {
		const n = this.scratches.find((x) => x.path === path) ?? this.nodes.find((x) => x.path === path);
		if (n?.kind === 'file') this.activePath = path;
	}

	update(content: string) {
		const n = this.active;
		if (!n) return;
		n.content = content;
		if (n.scratch) {
			n.dirty = content.length > 0;
			this.persistScratches();
		} else {
			n.dirty = content !== n.saved;
		}
	}

	exists(path: string) {
		return this.nodes.some((n) => n.path === path);
	}

	/** Cria arquivo ou pasta. Retorna erro (string) ou null. */
	async create(path: string, kind: 'file' | 'dir'): Promise<string | null> {
		path = path.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
		if (!path) return t('editor.ws.invalidName');
		if (/[<>:"|?*\\]/.test(path)) return t('editor.ws.invalidChars');
		if (this.exists(path)) return t('editor.ws.exists');
		const parent = parentOf(path);
		if (parent && !this.nodes.some((n) => n.path === parent && n.kind === 'dir')) {
			return t('editor.ws.noParent', { dir: parent });
		}
		if (this.backend === 'local' && this.root) {
			try {
				await this.localCreate(path, kind);
			} catch (e) {
				return t('editor.ws.diskCreate', { error: (e as Error).message });
			}
		} else {
			await idb.put({ path, kind, content: kind === 'file' ? '' : undefined });
		}
		const node: Node = { path, name: nameOf(path), kind, content: '', saved: '', dirty: false };
		this.nodes = [...this.nodes, node];
		if (kind === 'file') this.activePath = path;
		return null;
	}

	async remove(path: string) {
		const victims = this.nodes.filter((n) => n.path === path || n.path.startsWith(path + '/'));
		if (this.backend === 'local' && this.root) {
			try {
				const parentPath = parentOf(path);
				const dir = parentPath ? await this.localDir(parentPath) : this.root;
				await dir.removeEntry(nameOf(path), { recursive: true });
			} catch (e) {
				this.error = t('editor.ws.diskDelete', { error: (e as Error).message });
				return;
			}
		} else {
			for (const v of victims) await idb.remove(v.path);
		}
		const removed = new Set(victims.map((v) => v.path));
		this.nodes = this.nodes.filter((n) => !removed.has(n.path));
		if (this.activePath && removed.has(this.activePath)) {
			this.activePath = this.scratches[0]?.path ?? this.nodes.find((n) => n.kind === 'file')?.path ?? null;
		}
	}

	/** Salva o arquivo ativo (virtual: IndexedDB; local: grava no disco). */
	async save(path = this.activePath) {
		const n = this.nodes.find((x) => x.path === path && x.kind === 'file');
		if (!n) return;
		if (this.backend === 'local' && this.root) {
			try {
				const fh = await this.localFile(n.path);
				const w = await fh.createWritable();
				await w.write(n.content);
				await w.close();
			} catch (e) {
				this.error = t('editor.ws.saveFailed', { error: (e as Error).message });
				return;
			}
		} else {
			await idb.put({ path: n.path, kind: 'file', content: n.content });
		}
		n.saved = n.content;
		n.dirty = false;
	}

	/** Salvar como: baixa o arquivo pelo navegador (ou escolhe destino no disco, se suportado). */
	async saveAs(path = this.activePath, suggestedName?: string) {
		const n = this.active?.path === path ? this.active : this.nodes.find((x) => x.path === path && x.kind === 'file');
		if (!n) return;
		const suggested = suggestedName ?? n.name;
		const picker = (window as any).showSaveFilePicker;
		if (picker) {
			try {
				const fh: FileSystemFileHandle = await picker({ suggestedName: suggested });
				const w = await fh.createWritable();
				await w.write(n.content);
				await w.close();
				return;
			} catch (e) {
				if ((e as Error).name === 'AbortError') return;
			}
		}
		const url = URL.createObjectURL(new Blob([n.content], { type: 'text/plain;charset=utf-8' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = suggested;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	/** Abre uma pasta real do PC. */
	async openLocal() {
		if (!this.canLocal) {
			this.error = t('editor.ws.noLocal');
			return;
		}
		try {
			const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
			const entries: Node[] = [];
			await this.walk(dir, '', entries);
			this.root = dir;
			this.backend = 'local';
			this.rootName = dir.name;
			this.nodes = entries;
			this.activePath = entries.find((n) => n.kind === 'file')?.path ?? this.scratches[0]?.path ?? null;
			this.error = null;
		} catch (e) {
			if ((e as Error).name !== 'AbortError') this.error = t('editor.ws.openFailed', { error: (e as Error).message });
		}
	}

	/** Volta para a pasta virtual padrão. */
	async useVirtual() {
		this.root = null;
		this.backend = 'virtual';
		this.rootName = 'workspace';
		this.nodes = [];
		await this.init();
	}

	private root: FileSystemDirectoryHandle | null = null;

	private async walk(dir: FileSystemDirectoryHandle, prefix: string, out: Node[]) {
		for await (const [name, handle] of (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
			if (SKIP.has(name)) continue;
			const path = prefix ? `${prefix}/${name}` : name;
			if (handle.kind === 'directory') {
				out.push({ path, name, kind: 'dir', content: '', saved: '', dirty: false, handle: handle as FileSystemDirectoryHandle });
				await this.walk(handle as FileSystemDirectoryHandle, path, out);
			} else {
				const fh = handle as FileSystemFileHandle;
				const file = await fh.getFile();
				let content = '';
				if (file.size <= MAX_LOAD) {
					try { content = await file.text(); } catch { content = ''; }
				} else {
					content = t('editor.ws.bigFile', { size: Math.round(file.size / 1024) });
				}
				out.push({ path, name, kind: 'file', content, saved: content, dirty: false, handle: fh });
			}
		}
	}

	private async localDir(path: string): Promise<FileSystemDirectoryHandle> {
		let d = this.root!;
		for (const seg of path.split('/').filter(Boolean)) d = await d.getDirectoryHandle(seg);
		return d;
	}

	private async localFile(path: string): Promise<FileSystemFileHandle> {
		const parent = parentOf(path);
		const dir = parent ? await this.localDir(parent) : this.root!;
		return dir.getFileHandle(nameOf(path), { create: true });
	}

	private async localCreate(path: string, kind: 'file' | 'dir') {
		const parent = parentOf(path);
		const dir = parent ? await this.localDir(parent) : this.root!;
		if (kind === 'dir') await dir.getDirectoryHandle(nameOf(path), { create: true });
		else await dir.getFileHandle(nameOf(path), { create: true });
	}
}

export const workspace = new Workspace();
