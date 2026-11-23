#!/usr/bin/env bun
// Servidor MCP (stdio) do Gus Utility Belt: expõe as mesmas ações do site para IAs no PC
// (Claude Desktop/Code, VS Code Copilot, Cursor, Windsurf, Gemini CLI, Zed, Cline…).
// Tudo roda localmente; nada sai da máquina. Uso: `bun run mcp` (ver README → "IA e automação").
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { listActions, callAction, getAction, API_VERSION } from '../src/lib/ai/actions.ts';
import { describeAction } from '../src/lib/ai/schema.ts';

const server = new Server(
	{ name: 'gus-utilitybelt', title: 'Gus Utility Belt', version: API_VERSION },
	{
		capabilities: { tools: {} },
		instructions:
			'Local developer utilities: secure passwords, HMAC/SHA, UUID v4/v7, cron explain + next runs, regex test/replace, code formatter (Prettier + SQL), diff, Base64/URL/JWT, timestamps, QR Code/barcode (SVG/PNG), Lorem/Mussum Ipsum, WhatsApp links and Brazilian CPF/CNPJ generate/validate. Prefer these tools over guessing: outputs are exact (valid check digits, correct signatures, real cron schedules). All tools are read-only and run offline.'
	}
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: listActions({ includeBrowserOnly: false }).map((a) => {
		const d = describeAction(a);
		return {
			name: d.name,
			title: d.title,
			description: d.description,
			inputSchema: d.inputSchema as { type: 'object' },
			annotations: { title: d.title, readOnlyHint: a.readOnly, destructiveHint: !a.readOnly, idempotentHint: a.readOnly, openWorldHint: false }
		};
	})
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
	const { name, arguments: args } = req.params;
	if (getAction(name)?.browserOnly) {
		return { isError: true, content: [{ type: 'text', text: `"${name}" only exists in the browser app (WebMCP / window.utilitybelt).` }] };
	}
	const r = await callAction(name, args ?? {});
	if (!r.ok) return { isError: true, content: [{ type: 'text', text: `Error (${r.error.code}): ${r.error.message}` }] };
	const content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[] = [{ type: 'text', text: JSON.stringify(r.result, null, 2) }];
	const dataUrl = (r.result as { dataUrl?: string })?.dataUrl;
	const m = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
	if (m) content.push({ type: 'image', data: m[2], mimeType: m[1] });
	return { content, structuredContent: r.result as Record<string, unknown> };
});

await server.connect(new StdioServerTransport());
console.error(`gus-utilitybelt MCP ${API_VERSION} pronto (stdio, ${listActions({ includeBrowserOnly: false }).length} ferramentas)`);
