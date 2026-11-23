// Ações que só existem no navegador: controlam a janela, o editor (arquivos no IndexedDB ou na pasta
// local aberta) e o histórico do clipboard. Registradas pela ponte (bridge.ts) por cima das ações puras.
import { categories, categoryLabel, toolTitle, type ToolId } from '#lib/tools/registry.ts';
import { workspace } from '#lib/fs/workspace.svelte.ts';
import { clipboard, detectType, type ClipType } from '#lib/clipboard/history.svelte.ts';
import { languageFromName, getLanguage, detectLanguage, LANGUAGES } from '#lib/editor/languages.ts';
import { ui, APP_IDS, TOOL_IDS, type AppId } from './ui.svelte.ts';
import { ActionError, type Action, type ObjectSchema } from './schema.ts';

const obj = (properties: ObjectSchema['properties'], required: string[] = []): ObjectSchema => ({ type: 'object', properties, required });
const define = <I,>(a: Action<I>) => a as unknown as Action;
const clean = (p: string) => p.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');

let initing: Promise<void> | null = null;
async function ready() {
	if (workspace.ready) return;
	// O Editor já pode estar inicializando: espera um pouco antes de iniciar de novo.
	for (let i = 0; i < 40 && !workspace.ready; i++) await new Promise((r) => setTimeout(r, 50));
	if (!workspace.ready) await (initing ??= workspace.init());
}

function findNode(path?: string) {
	if (!path) return workspace.active;
	const p = clean(path);
	return workspace.nodes.find((n) => n.path === p && n.kind === 'file') ?? workspace.scratches.find((s) => s.path === path || s.name === path) ?? null;
}

function langOf(n: { name: string; lang?: string; scratch?: boolean; content: string }) {
	if (n.lang) return getLanguage(n.lang).id;
	if (!n.scratch) {
		const l = languageFromName(n.name);
		if (l) return l.id;
	}
	return detectLanguage(n.content)[0]?.id ?? 'plaintext';
}

export const appActions: Action[] = [
	define<{ app?: string; tool?: string; automation?: boolean }>({
		name: 'app_open',
		title: 'Abrir app/ferramenta',
		description: `Show an app or tool on screen for the user. Apps: ${APP_IDS.join(', ')}. Tools: ${TOOL_IDS.join(', ')} (opening a tool also switches to its app). automation=true hides the side menu on the "api" app (for automation/kiosk use).`,
		category: 'app',
		readOnly: true,
		browserOnly: true,
		input: obj({
			app: { type: 'string', enum: APP_IDS },
			tool: { type: 'string', enum: TOOL_IDS },
			automation: { type: 'boolean', description: 'Hide the side menu (only applies to the "api" app).' }
		}),
		run({ app, tool, automation }) {
			if (!app && !tool) throw new ActionError('Provide "app" and/or "tool".', 'invalid_input');
			if (tool) ui.openToolById(tool as ToolId);
			else ui.select(app as AppId);
			if (automation !== undefined) ui.automation = !!automation;
			return { app: ui.current, tool: ui.openTool, automation: ui.chromeless };
		}
	}),
	define<Record<string, never>>({
		name: 'app_state',
		title: 'Estado do app',
		description: 'Return what is on screen now (app, open tool), the editor active file and storage backend, clipboard history size and the available apps/tools.',
		category: 'app',
		readOnly: true,
		browserOnly: true,
		input: obj({}),
		run() {
			const a = workspace.active;
			return {
				app: ui.current,
				tool: ui.openTool,
				editor: { ready: workspace.ready, backend: workspace.backend, root: workspace.rootName, activeFile: a ? { path: a.scratch ? a.name : a.path, draft: !!a.scratch, dirty: a.dirty, language: langOf(a) } : null },
				clipboard: { items: clipboard.count },
				apps: categories.map((c) => ({ app: c.id, label: categoryLabel(c.id), tools: c.tools.map((id) => ({ tool: id, title: toolTitle(id) })) }))
			};
		}
	}),
	define<Record<string, never>>({
		name: 'editor_list_files',
		title: 'Listar arquivos do editor',
		description: 'List files and folders in the editor workspace (browser IndexedDB, or the local folder the user opened) and the unsaved drafts.',
		category: 'editor',
		readOnly: true,
		browserOnly: true,
		input: obj({}),
		async run() {
			await ready();
			return {
				backend: workspace.backend,
				root: workspace.rootName,
				active: workspace.active ? (workspace.active.scratch ? workspace.active.name : workspace.active.path) : null,
				entries: workspace.sorted.map((n) => ({ path: n.path, kind: n.kind, ...(n.kind === 'file' ? { size: n.content.length, dirty: n.dirty } : {}) })),
				drafts: workspace.scratches.map((s) => ({ name: s.name, size: s.content.length }))
			};
		}
	}),
	define<{ path?: string }>({
		name: 'editor_read_file',
		title: 'Ler arquivo do editor',
		description: 'Read a file (or draft, by its name e.g. "Sem título-1") from the editor. Without "path" reads the file currently open.',
		category: 'editor',
		readOnly: true,
		browserOnly: true,
		input: obj({ path: { type: 'string', description: 'Workspace path like "projeto/README.md", or draft name.' } }),
		async run({ path }) {
			await ready();
			const n = findNode(path);
			if (!n) throw new ActionError(path ? `File "${path}" not found. Call editor_list_files.` : 'No file is open.', 'not_found');
			return { path: n.scratch ? n.name : n.path, draft: !!n.scratch, language: langOf(n), dirty: n.dirty, content: n.content };
		}
	}),
	define<{ path: string; content: string; save: boolean; open: boolean }>({
		name: 'editor_write_file',
		title: 'Escrever arquivo no editor',
		description: 'Create or overwrite a file in the editor workspace (missing folders are created). save=true persists it (IndexedDB, or the real disk if the user opened a local folder); open=true shows it on screen.',
		category: 'editor',
		readOnly: false,
		browserOnly: true,
		input: obj({
			path: { type: 'string', description: 'e.g. "projeto/src/main.ts".' },
			content: { type: 'string' },
			save: { type: 'boolean', default: true },
			open: { type: 'boolean', default: true }
		}, ['path', 'content']),
		async run({ path, content, save, open }) {
			await ready();
			const p = clean(path);
			const prevActive = workspace.activePath;
			const existed = workspace.exists(p);
			if (!existed) {
				const parts = p.split('/');
				for (let i = 1; i < parts.length; i++) {
					const dir = parts.slice(0, i).join('/');
					if (!workspace.exists(dir)) {
						const err = await workspace.create(dir, 'dir');
						if (err) throw new ActionError(err, 'failed');
					}
				}
				const err = await workspace.create(p, 'file');
				if (err) throw new ActionError(err, 'failed');
			}
			workspace.select(p);
			workspace.update(content);
			if (save) await workspace.save(p);
			if (workspace.error) throw new ActionError(workspace.error, 'failed');
			if (open) ui.select('editor');
			else if (prevActive) workspace.select(prevActive);
			return { path: p, created: !existed, saved: save, bytes: content.length, backend: workspace.backend };
		}
	}),
	define<{ content: string; language?: string }>({
		name: 'editor_new_draft',
		title: 'Novo rascunho no editor',
		description: 'Open a new unnamed draft in the editor with the given content (language auto-detected unless provided) and show it to the user. Good for handing code to the user to review/format/save.',
		category: 'editor',
		readOnly: false,
		browserOnly: true,
		input: obj({
			content: { type: 'string', default: '' },
			language: { type: 'string', description: 'Language id (see languages_list).' }
		}),
		async run({ content, language }) {
			await ready();
			if (language && !LANGUAGES.some((l) => l.id === language)) throw new ActionError(`Unknown language "${language}". Call languages_list.`, 'invalid_input');
			const n = workspace.newScratch(true);
			workspace.update(content);
			if (language) workspace.setLang(n.path, language, false);
			else {
				const top = detectLanguage(content)[0];
				if (top && top.confidence >= 0.6) workspace.setLang(n.path, top.id, true);
			}
			ui.select('editor');
			return { draft: n.name, language: langOf(n) };
		}
	}),
	define<{ limit: number; type?: string; search?: string }>({
		name: 'clipboard_history',
		title: 'Histórico do clipboard',
		description: 'List what the user copied inside the Utility Belt (newest first, pinned on top). Only copies made in this app are recorded.',
		category: 'app',
		readOnly: true,
		browserOnly: true,
		input: obj({
			limit: { type: 'integer', minimum: 1, maximum: 500, default: 20 },
			type: { type: 'string', enum: ['url', 'color', 'uuid', 'json', 'email', 'number', 'doc', 'code', 'text'] },
			search: { type: 'string', description: 'Case-insensitive substring filter.' }
		}),
		async run({ limit, type, search }) {
			await clipboard.load();
			const q = search?.toLowerCase();
			const items = clipboard.sorted.filter((c) => (!type || c.type === type) && (!q || c.text.toLowerCase().includes(q))).slice(0, limit);
			return { total: clipboard.count, items: items.map(({ text, type, source, pinned, count, last }) => ({ text, type, source, pinned, timesCopied: count, lastCopied: new Date(last).toISOString() })) };
		}
	}),
	define<{ text: string }>({
		name: 'clipboard_copy',
		title: 'Copiar para o clipboard',
		description: 'Put text on the system clipboard (when the browser allows it) and record it in the Utility Belt clipboard history.',
		category: 'app',
		readOnly: false,
		browserOnly: true,
		input: obj({ text: { type: 'string' } }, ['text']),
		async run({ text }) {
			await clipboard.load();
			await clipboard.add(text, 'IA');
			let system = false;
			try {
				await navigator.clipboard.writeText(text);
				system = true;
			} catch {
				/* sem foco/gesto do usuário: fica só no histórico */
			}
			return { copiedToSystemClipboard: system, recorded: true, type: detectType(text) as ClipType };
		}
	})
];
