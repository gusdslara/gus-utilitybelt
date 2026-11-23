// Documentos para máquinas gerados do catálogo: /tools.json e /llms.txt (prerenderizados no build).
import { listActions, CATEGORY_LABELS, API_VERSION } from './actions.ts';
import { appActions } from './app-actions.ts';
import { describeAction, type Action, type JsonSchema } from './schema.ts';

const all = (): Action[] => [...listActions(), ...appActions.filter((a) => !listActions().some((x) => x.name === a.name))];

export function toolsJson() {
	return {
		name: 'gus-utilitybelt',
		version: API_VERSION,
		description: 'Developer utilities that run 100% locally (browser or Bun): passwords, HMAC/hash, UUID, cron, regex, code formatter, diff, Base64/URL/JWT, timestamps, QR Code, barcodes, Lorem/Mussum Ipsum, WhatsApp links, Brazilian CPF/CNPJ.',
		interfaces: {
			browserJs: 'window.utilitybelt.call(name, input) -> {ok, result|error}',
			webmcp: 'navigator.modelContext tools (same names) registered on page load',
			url: '/run?action=<name>&<param>=<value> (result JSON in #ub-result)',
			mcpStdio: 'bun run mcp  (tools/list, tools/call)',
			cli: 'bun run ub <name> --param value'
		},
		tools: all().map(describeAction)
	};
}

function params(s: JsonSchema & { properties?: Record<string, JsonSchema> }, required: string[] = []) {
	const props = Object.entries(s.properties ?? {});
	if (!props.length) return '  (no parameters)';
	return props
		.map(([k, p]) => {
			const t = p.enum ? p.enum.map((e) => JSON.stringify(e)).join(' | ') : p.type;
			const d = p.default !== undefined ? ` = ${JSON.stringify(p.default)}` : '';
			return `  - ${k}${required.includes(k) ? ' (required)' : ''}: ${t}${d}${p.description ? ` — ${p.description}` : ''}`;
		})
		.join('\n');
}

export function llmsTxt(origin = '') {
	const byCat = new Map<string, Action[]>();
	for (const a of all()) byCat.set(a.category, [...(byCat.get(a.category) ?? []), a]);
	const sections = [...byCat.entries()]
		.map(([cat, list]) => `### ${CATEGORY_LABELS[cat as Action['category']]}\n\n` + list.map((a) => `#### ${a.name}${a.browserOnly ? ' (browser only)' : ''}${a.readOnly ? '' : ' (modifies data)'}\n${a.description}\n${params(a.input, a.input.required)}`).join('\n\n'))
		.join('\n\n');
	return `# Gus Utility Belt

> Developer utility kit (pt-BR UI) that runs 100% locally: nothing is sent to a server. Every tool is also an API action with a JSON Schema, usable by AI agents in the browser, desktop AI apps via MCP, scripts and the terminal.

## How an AI can use it

1. Browser agent that only opens URLs and reads pages (Brave Leo, Copilot, Gemini, Perplexity Comet, ChatGPT Atlas, Claude in Chrome…):
   open ${origin}/run?action=<name>&<param>=<value>  — the result is JSON inside <pre id="ub-result" data-status="ok|error">.
   Complex input: ${origin}/run?action=<name>&input=<URL-encoded JSON object>
   Example: ${origin}/run?action=uuid_generate&version=7&count=3
   Interactive console without the side menu (automation mode): ${origin}/?app=api&automation=1
2. Browser agent that can run JavaScript or uses WebMCP:
   await window.utilitybelt.call('<name>', {...})  → { ok: true, result } | { ok: false, error: { code, message } }
   window.utilitybelt.list() returns every tool with its JSON Schema. Tools are also registered in navigator.modelContext (WebMCP) when the browser supports it.
   Embedding page (iframe): postMessage({ type: 'utilitybelt:call', id, name, input }) → reply { type: 'utilitybelt:result', id, ok, result|error } (pure tools only).
3. Desktop AI (Claude Desktop/Code, VS Code Copilot, Cursor, Windsurf, Gemini CLI, Zed…): MCP stdio server.
   From a clone of the repo: bun run mcp   (command: "bun", args: ["run", "--cwd", "<repo>", "mcp"])
   Claude Code: claude mcp add utilitybelt -- bun run --cwd <repo> mcp
4. Terminal / scripts: bun run ub <name> --param value  (or: bun run ub <name> '{"json":"input"}'). Output is JSON; exit code 1 on error.
5. To show something to the user on screen: app_open { tool: "qr" } or link ${origin}/?tool=qr

Machine-readable catalog: ${origin}/tools.json
Input rules: unknown parameters are rejected; strings are coerced to numbers/booleans; defaults are applied; errors explain how to fix the call.

## Tools

${sections}
`;
}
