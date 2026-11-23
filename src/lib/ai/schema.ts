// Tipos e validação das ações expostas para IA/automação (navegador, WebMCP, MCP stdio, CLI e URL).
// Sem dependências: roda igual no navegador e no Bun.

export type JsonSchema = {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
	description?: string;
	enum?: readonly (string | number)[];
	default?: unknown;
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	items?: JsonSchema;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean;
	examples?: unknown[];
};

export type ObjectSchema = JsonSchema & { type: 'object'; properties: Record<string, JsonSchema> };

export type ActionCategory = 'seguranca' | 'dev' | 'conteudo' | 'whatsapp' | 'documentos' | 'editor' | 'encode' | 'app';

export type Action<I = Record<string, unknown>, O = unknown> = {
	/** snake_case estável: é o nome usado por MCP, WebMCP, CLI e `?action=` */
	name: string;
	title: string;
	description: string;
	category: ActionCategory;
	/** Ferramenta da UI que faz a mesma coisa (para abrir na tela). */
	uiTool?: string;
	input: ObjectSchema;
	/** Não altera nada (só gera/consulta). Vira `readOnlyHint` no MCP. */
	readOnly: boolean;
	/** Só existe no navegador (controla a UI, editor ou clipboard). */
	browserOnly?: boolean;
	examples?: I[];
	run: (input: I) => O | Promise<O>;
};

export class ActionError extends Error {
	constructor(message: string, readonly code: 'not_found' | 'invalid_input' | 'failed' | 'unavailable' = 'failed') {
		super(message);
		this.name = 'ActionError';
	}
}

/**
 * Aplica defaults, converte strings (vindas de URL/CLI) para o tipo do schema e valida.
 * Lança ActionError('invalid_input') com mensagem que a IA consegue corrigir sozinha.
 */
export function prepareInput(schema: ObjectSchema, raw: unknown): Record<string, unknown> {
	const src = raw == null ? {} : raw;
	if (typeof src !== 'object' || Array.isArray(src)) throw new ActionError('Input must be a JSON object.', 'invalid_input');
	const input = src as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	const errors: string[] = [];
	for (const key of Object.keys(input)) {
		if (!(key in schema.properties)) errors.push(`Unknown parameter "${key}". Valid: ${Object.keys(schema.properties).join(', ') || '(none)'}.`);
	}
	for (const [key, prop] of Object.entries(schema.properties)) {
		let v = input[key];
		if (v === undefined || v === '') {
			if (prop.default !== undefined) out[key] = structuredClone(prop.default);
			else if (schema.required?.includes(key)) errors.push(`Missing required parameter "${key}".`);
			continue;
		}
		const r = coerce(v, prop, key);
		if (r.error) errors.push(r.error);
		else out[key] = r.value;
	}
	if (errors.length) throw new ActionError(errors.join(' '), 'invalid_input');
	return out;
}

function coerce(v: unknown, p: JsonSchema, key: string): { value?: unknown; error?: string } {
	switch (p.type) {
		case 'integer':
		case 'number': {
			const n = typeof v === 'string' ? Number(v.trim()) : v;
			if (typeof n !== 'number' || Number.isNaN(n)) return { error: `"${key}" must be a number.` };
			if (p.type === 'integer' && !Number.isInteger(n)) return { error: `"${key}" must be an integer.` };
			if (p.minimum !== undefined && n < p.minimum) return { error: `"${key}" must be >= ${p.minimum}.` };
			if (p.maximum !== undefined && n > p.maximum) return { error: `"${key}" must be <= ${p.maximum}.` };
			if (p.enum && !p.enum.includes(n)) return { error: `"${key}" must be one of: ${p.enum.join(', ')}.` };
			return { value: n };
		}
		case 'boolean': {
			if (typeof v === 'boolean') return { value: v };
			if (typeof v === 'string' && /^(true|1|yes|sim|on)$/i.test(v)) return { value: true };
			if (typeof v === 'string' && /^(false|0|no|nao|não|off)$/i.test(v)) return { value: false };
			return { error: `"${key}" must be true or false.` };
		}
		case 'array': {
			const arr = Array.isArray(v) ? v : typeof v === 'string' ? (v.trim().startsWith('[') ? safeJson(v) : v.split(',')) : null;
			if (!Array.isArray(arr)) return { error: `"${key}" must be an array.` };
			const items: unknown[] = [];
			for (const [i, it] of arr.entries()) {
				const r: { value?: unknown; error?: string } = p.items ? coerce(typeof it === 'string' ? it.trim() : it, p.items, `${key}[${i}]`) : { value: it };
				if (r.error) return r;
				items.push(r.value);
			}
			return { value: items };
		}
		case 'object': {
			const o = typeof v === 'string' ? safeJson(v) : v;
			if (!o || typeof o !== 'object' || Array.isArray(o)) return { error: `"${key}" must be an object.` };
			return { value: o };
		}
		default: {
			if (typeof v !== 'string') {
				if (typeof v === 'number' || typeof v === 'boolean') v = String(v);
				else return { error: `"${key}" must be a string.` };
			}
			const s = v as string;
			if (p.enum && !p.enum.includes(s)) {
				// tolera caixa diferente: "sha-256" → "SHA-256"
				const hit = p.enum.find((e) => String(e).toLowerCase() === s.toLowerCase());
				if (hit === undefined) return { error: `"${key}" must be one of: ${p.enum.join(', ')}.` };
				return { value: hit };
			}
			if (p.minLength !== undefined && s.length < p.minLength) return { error: `"${key}" must have at least ${p.minLength} characters.` };
			if (p.maxLength !== undefined && s.length > p.maxLength) return { error: `"${key}" must have at most ${p.maxLength} characters.` };
			return { value: s };
		}
	}
}

function safeJson(s: string): unknown {
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
}

/** Formato de catálogo público (tools.json, MCP tools/list, WebMCP). */
export function describeAction(a: Action) {
	return {
		name: a.name,
		title: a.title,
		description: a.description,
		category: a.category,
		readOnly: a.readOnly,
		browserOnly: !!a.browserOnly,
		inputSchema: { ...a.input, additionalProperties: false },
		...(a.examples?.length ? { examples: a.examples } : {})
	};
}
