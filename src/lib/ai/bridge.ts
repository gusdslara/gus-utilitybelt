// Ponte entre o app e qualquer IA/automação que esteja no navegador:
// - window.utilitybelt: API JS (console, Playwright/Puppeteer, extensões, agentes que executam JS).
// - WebMCP (navigator.modelContext): agentes do navegador (Chrome/Edge com WebMCP, extensões MCP-B)
//   enxergam cada ação como ferramenta tipada, sem clicar na tela.
// - postMessage: páginas que embutem o app em <iframe> chamam ações puras (sem acesso a arquivos).
// - Evento "utilitybelt:ready" no window quando tudo está pronto.
import { callAction, getAction, listActions, register, API_VERSION } from './actions.ts';
import { appActions } from './app-actions.ts';
import { describeAction, type Action } from './schema.ts';

export const BRIDGE_VERSION = API_VERSION;

type CallResult = Awaited<ReturnType<typeof callAction>>;

/** Converte o resultado para o formato de conteúdo MCP (texto JSON + imagem quando houver PNG). */
export function toMcpContent(r: CallResult) {
	if (!r.ok) return { isError: true, content: [{ type: 'text' as const, text: `Error (${r.error.code}): ${r.error.message}` }] };
	const content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[] = [{ type: 'text', text: JSON.stringify(r.result, null, 2) }];
	const res = r.result as { dataUrl?: string };
	const m = typeof res?.dataUrl === 'string' && res.dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
	if (m) content.push({ type: 'image', data: m[2], mimeType: m[1] });
	return { content, structuredContent: r.result as Record<string, unknown> };
}

type ModelContext = {
	registerTool?: (tool: unknown, opts?: { signal?: AbortSignal }) => unknown;
	provideContext?: (ctx: { tools: unknown[] }) => unknown;
};

function webMcpTool(a: Action) {
	return {
		name: a.name,
		title: a.title,
		description: a.description,
		inputSchema: describeAction(a).inputSchema,
		annotations: { title: a.title, readOnlyHint: a.readOnly, destructiveHint: !a.readOnly, idempotentHint: a.readOnly, openWorldHint: false },
		execute: async (input: unknown) => toMcpContent(await callAction(a.name, input))
	};
}

function installWebMcp(signal: AbortSignal) {
	const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
	if (!mc) return 'unavailable';
	const tools = listActions().map(webMcpTool);
	try {
		if (typeof mc.registerTool === 'function') {
			const handles = tools.map((t) => mc.registerTool!(t, { signal }) as { unregister?: () => void } | undefined);
			signal.addEventListener('abort', () => handles.forEach((h) => h?.unregister?.()));
			return 'registerTool';
		}
		if (typeof mc.provideContext === 'function') {
			mc.provideContext({ tools });
			return 'provideContext';
		}
	} catch (e) {
		console.warn('[utilitybelt] WebMCP indisponível:', e);
	}
	return 'unavailable';
}

function help() {
	const rows = listActions().map((a) => `  ${a.name.padEnd(20)} ${a.readOnly ? '' : '(altera) '}${a.title}`);
	console.log(
		`%cGus Utility Belt — API para devs e IAs (v${BRIDGE_VERSION})`,
		'font-weight:bold;color:#dd206b',
		`\n\nawait utilitybelt.call('uuid_generate', { version: 7, count: 3 })  // {ok, result|error}\nawait utilitybelt.actions.cpf_generate({ count: 2 })            // resultado direto (lança erro)\nutilitybelt.list() / utilitybelt.describe('qr_generate')          // catálogo com JSON Schema\n\nAções:\n${rows.join('\n')}\n\nDocs: /llms.txt · Catálogo: /tools.json · Console: /run`
	);
}

export function ensureAppActions() {
	register(appActions);
}

export function installBridge() {
	if (typeof window === 'undefined') return () => {};
	ensureAppActions();
	const ctrl = new AbortController();

	const run = async (name: string, input?: unknown) => {
		const r = await callAction(name, input);
		if (!r.ok) throw Object.assign(new Error(r.error.message), { code: r.error.code });
		return r.result;
	};
	const shortcuts = Object.fromEntries(listActions().map((a) => [a.name, (input?: unknown) => run(a.name, input)]));
	const webmcp = installWebMcp(ctrl.signal);

	const api = {
		version: BRIDGE_VERSION,
		webmcp,
		list: () => listActions().map(describeAction),
		describe: (name: string) => {
			const a = getAction(name);
			return a ? describeAction(a) : null;
		},
		call: callAction,
		run,
		actions: shortcuts,
		help
	};
	Object.defineProperty(window, 'utilitybelt', { value: Object.freeze(api), configurable: true });

	// iframe/janela externa: só ações puras (sem ler/escrever arquivos do usuário).
	const onMessage = async (ev: MessageEvent) => {
		const d = ev.data as { type?: string; id?: unknown; name?: string; input?: unknown };
		if (!d || d.type !== 'utilitybelt:call' || typeof d.name !== 'string') return;
		const sameOrigin = ev.origin === location.origin;
		const a = getAction(d.name);
		const reply = a?.browserOnly && !sameOrigin
			? { ok: false, action: d.name, error: { code: 'forbidden', message: 'App/editor/clipboard actions are only available to same-origin callers or WebMCP.' } }
			: await callAction(d.name, d.input);
		(ev.source as WindowProxy | null)?.postMessage({ type: 'utilitybelt:result', id: d.id, ...reply }, { targetOrigin: ev.origin === 'null' ? '*' : ev.origin });
	};
	window.addEventListener('message', onMessage, { signal: ctrl.signal });

	window.dispatchEvent(new CustomEvent('utilitybelt:ready', { detail: { version: BRIDGE_VERSION, actions: listActions().length, webmcp } }));
	return () => {
		ctrl.abort();
		delete (window as { utilitybelt?: unknown }).utilitybelt;
	};
}
