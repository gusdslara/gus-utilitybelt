#!/usr/bin/env bun
// CLI do Gus Utility Belt: as mesmas ações do site/MCP no terminal. Saída JSON (pipe para jq).
//   bun run ub                                lista as ações
//   bun run ub help <ação>                    parâmetros (JSON Schema)
//   bun run ub uuid_generate --version 7 --count 3
//   bun run ub cpf_validate 529.982.247-25    posicional = parâmetro principal
//   bun run ub hmac_sign '{"key":"s3cr3t","message":"oi"}'
//   echo 'select 1' | bun run ub code_format --language sql --raw
//   bun run ub code_format --code @arquivo.ts  (@ lê de arquivo; "-" lê do stdin)
//   --no-<flag> desliga booleanos; --raw imprime só o campo principal como texto
import { fstatSync } from 'node:fs';
import { listActions, callAction, getAction, API_VERSION } from '../src/lib/ai/actions.ts';
import { describeAction } from '../src/lib/ai/schema.ts';

const argv = process.argv.slice(2);
const out = (v: unknown) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const MAIN = ['code', 'text', 'content', 'token', 'expression', 'value', 'uuid', 'password', 'pattern', 'phone'];
const RAW_KEYS = ['formatted', 'result', 'text', 'svg', 'dataUrl', 'url', 'header', 'wamid', 'signature', 'digest', 'patch', 'passwords', 'uuids', 'cpfs', 'cnpjs'];

/** Só lê o stdin quando há pipe/arquivo de verdade (evita travar em terminais e agentes sem TTY). */
function stdinPiped() {
	try {
		const st = fstatSync(0);
		return st.isFIFO() || st.isFile();
	} catch {
		return false;
	}
}

let stdinCache: string | null = null;
async function readStdin() {
	if (stdinCache === null) stdinCache = stdinPiped() ? (await Bun.stdin.text()).trim() : '';
	return stdinCache;
}

async function value(v: string) {
	if (v === '-') return readStdin();
	if (v.startsWith('@')) return Bun.file(v.slice(1)).text();
	return v;
}

const name = argv[0];
if (!name || name === '--help' || name === '-h' || name === 'list') {
	const rows = listActions({ includeBrowserOnly: false }).map((a) => `  ${a.name.padEnd(20)} ${a.title}`);
	out(`Gus Utility Belt CLI ${API_VERSION}\n\nUso: bun run ub <ação> [valor] [--param valor …] ['{"json":"input"}'] [--raw]\n     bun run ub help <ação>\n\nAções:\n${rows.join('\n')}`);
	process.exit(0);
}
if (name === 'help' || name === 'schema') {
	const a = argv[1] ? getAction(argv[1]) : null;
	if (argv[1] && !a) {
		console.error(`ação desconhecida: ${argv[1]}`);
		process.exit(1);
	}
	out(a ? describeAction(a) : listActions({ includeBrowserOnly: false }).map(describeAction));
	process.exit(0);
}

const action = getAction(name);
const input: Record<string, unknown> = {};
const positional: string[] = [];
let raw = false;

for (let i = 1; i < argv.length; i++) {
	const a = argv[i];
	if (a === '--raw') raw = true;
	else if (a.startsWith('--')) {
		const eq = a.indexOf('=');
		const key = (eq > -1 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
		const prop = action?.input.properties[key];
		const negated = key.startsWith('no') && key.length > 2 ? key[2].toLowerCase() + key.slice(3) : '';
		if (!prop && negated && action?.input.properties[negated]?.type === 'boolean') {
			input[negated] = false; // --no-symbols
			continue;
		}
		const next = argv[i + 1];
		const v = eq > -1 ? a.slice(eq + 1) : prop?.type === 'boolean' && (next === undefined || next.startsWith('--')) ? 'true' : argv[++i];
		input[key] = await value(String(v ?? ''));
	} else if (a.trim().startsWith('{')) Object.assign(input, JSON.parse(a));
	else positional.push(a);
}

// Posicional ou stdin viram o parâmetro principal da ação.
const mainKey = action ? MAIN.find((k) => k in action.input.properties && !(k in input)) : undefined;
if (mainKey && positional.length) input[mainKey] = await value(positional.join(' '));
else if (mainKey) {
	const s = await readStdin();
	if (s) {
		if (s.startsWith('{') && !['code', 'text', 'content'].includes(mainKey)) Object.assign(input, JSON.parse(s));
		else input[mainKey] = s;
	}
}

const r = await callAction(name, input);
if (!r.ok) {
	console.error(`erro (${r.error.code}): ${r.error.message}`);
	process.exit(1);
}
if (raw) {
	const res = r.result as Record<string, unknown>;
	const key = RAW_KEYS.find((k) => k in res);
	const v = key ? res[key] : res;
	out(Array.isArray(v) ? v.join('\n') : v);
} else out(r.result);
