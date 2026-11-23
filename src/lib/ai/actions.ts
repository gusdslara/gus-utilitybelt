// Catálogo único de ações do Utility Belt para devs e IAs.
// A mesma definição alimenta: window.utilitybelt (navegador), WebMCP (navigator.modelContext),
// /run?action=… (IAs de navegador que só leem a página), /tools.json, /llms.txt, o servidor MCP stdio
// (Claude Desktop/Code, Copilot, Cursor, Gemini CLI…) e a CLI `ub`.
// Tudo aqui é puro e roda no navegador e no Bun. Libs pesadas entram por import dinâmico.

import {
	generatePassword, entropyBits, strengthLabel, uuidV4, uuidV7, generateLorem, cpfDigits, validateCpf,
	cnpjCheck, validateCnpj, randomCpfBase, randomCnpjBase, maskCpf, maskCnpj, whatsappLink, hmac, toHex,
	toBase64, timingSafeEqual, type LoremKind, type LoremLang
} from '../tools/gen.ts';
import { describeCron } from '../tools/cron.ts';
import { decodeWamid, encodeWamid, signWebhook, verifyWebhook } from '../tools/whatsapp.ts';
import { LANGUAGES, getLanguage, languageFromName, detectLanguage, searchLanguages } from '../editor/languages.ts';
import { ActionError, prepareInput, type Action, type ObjectSchema } from './schema.ts';

/** Versão do contrato das ações (nomes/parâmetros). Sobe o major se algo quebrar. */
export const API_VERSION = '1.0.0';

type Algo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
const enc = new TextEncoder();

const obj = (properties: ObjectSchema['properties'], required: string[] = []): ObjectSchema => ({ type: 'object', properties, required });
const define = <I,>(a: Action<I>) => a as unknown as Action;

function encodeBuf(buf: ArrayBuffer, encoding: string) {
	return encoding === 'base64' ? toBase64(buf) : encoding === 'base64url' ? toBase64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : toHex(buf);
}

function b64ToBytes(s: string): Uint8Array {
	const norm = s.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
	const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
	const bin = atob(pad);
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: Uint8Array) {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

/** Entropia estimada de uma senha existente pelo tamanho do alfabeto que ela usa. */
function estimatePool(pw: string) {
	let pool = 0;
	if (/[a-z]/.test(pw)) pool += 26;
	if (/[A-Z]/.test(pw)) pool += 26;
	if (/\d/.test(pw)) pool += 10;
	if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
	return pool;
}

/** Rótulo de força em inglês (contrato da API); a UI traduz pelo nível. */
const STRENGTH_EN = ['None', 'Weak', 'Fair', 'Strong', 'Very strong'];

const svgEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Desenha SVG a partir das codificações do JsBarcode (funciona sem DOM, logo também no Bun). */
function barcodeSvg(encodings: { data: string; text?: string; options: Record<string, unknown> }[], o: { width: number; height: number; displayValue: boolean; margin: number; lineColor: string; background: string; fontSize: number }) {
	const textH = o.displayValue ? o.fontSize + 4 : 0;
	let x = o.margin;
	const bars: string[] = [];
	const texts: string[] = [];
	for (const e of encodings) {
		const h = Number(e.options?.height ?? o.height);
		const start = x;
		let run = 0;
		for (let i = 0; i <= e.data.length; i++) {
			if (e.data[i] === '1') run++;
			else if (run) {
				bars.push(`<rect x="${x + (i - run) * o.width}" y="${o.margin}" width="${run * o.width}" height="${h}"/>`);
				run = 0;
			}
		}
		x += e.data.length * o.width;
		if (o.displayValue && e.text) {
			texts.push(`<text x="${(start + x) / 2}" y="${o.margin + o.height + textH - 2}" text-anchor="middle" font-family="monospace" font-size="${o.fontSize}">${svgEscape(e.text)}</text>`);
		}
	}
	const w = x + o.margin;
	const H = o.height + textH + o.margin * 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}"><rect width="100%" height="100%" fill="${o.background}"/><g fill="${o.lineColor}">${bars.join('')}${texts.join('')}</g></svg>`;
}

export const actions: Action[] = [
	// ------------------------------------------------------------------ Segurança
	define<{ length: number; count: number; preset?: string; lower: boolean; upper: boolean; digits: boolean; symbols: boolean; noAmbiguous: boolean; noRepeat: boolean }>({
		name: 'password_generate',
		title: 'Gerar senhas',
		description: 'Generate cryptographically secure random passwords (CSPRNG, unbiased). Returns the passwords plus estimated entropy in bits and a strength label. Presets: "pin" (6 digits), "strong" (20 chars, all sets), "extreme" (48 chars, no ambiguous chars). Explicit options override the preset.',
		category: 'seguranca',
		uiTool: 'senhas',
		readOnly: true,
		input: obj({
			length: { type: 'integer', minimum: 4, maximum: 512, default: 20, description: 'Password length.' },
			count: { type: 'integer', minimum: 1, maximum: 100, default: 1, description: 'How many passwords to generate.' },
			preset: { type: 'string', enum: ['pin', 'strong', 'extreme'], description: 'Optional preset.' },
			lower: { type: 'boolean', default: true, description: 'Include a-z.' },
			upper: { type: 'boolean', default: true, description: 'Include A-Z.' },
			digits: { type: 'boolean', default: true, description: 'Include 0-9.' },
			symbols: { type: 'boolean', default: true, description: 'Include symbols !@#$%^&*()-_=+[]{};:,.<>?/~' },
			noAmbiguous: { type: 'boolean', default: false, description: 'Exclude look-alike characters (O 0 o I l 1 |).' },
			noRepeat: { type: 'boolean', default: false, description: 'Never repeat a character.' }
		}),
		examples: [{ length: 24, count: 3 } as never, { preset: 'pin' } as never],
		run(i) {
			const o = { ...i };
			if (i.preset === 'pin') Object.assign(o, { length: 6, lower: false, upper: false, digits: true, symbols: false });
			if (i.preset === 'strong') Object.assign(o, { length: 20, lower: true, upper: true, digits: true, symbols: true });
			if (i.preset === 'extreme') Object.assign(o, { length: 48, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true });
			if (!o.lower && !o.upper && !o.digits && !o.symbols) throw new ActionError('Enable at least one character set (lower, upper, digits or symbols).', 'invalid_input');
			const passwords = Array.from({ length: o.count }, () => generatePassword(o));
			const bits = entropyBits(o);
			const { level } = strengthLabel(bits);
			return { passwords, length: o.length, entropyBits: Math.round(bits * 10) / 10, strength: STRENGTH_EN[level], level };
		}
	}),
	define<{ password: string }>({
		name: 'password_strength',
		title: 'Avaliar senha',
		description: 'Estimate the strength of an existing password from its length and character classes (brute-force entropy upper bound). The password is not stored or sent anywhere.',
		category: 'seguranca',
		uiTool: 'senhas',
		readOnly: true,
		input: obj({ password: { type: 'string', description: 'Password to evaluate.' } }, ['password']),
		run({ password }) {
			const pool = estimatePool(password);
			const bits = pool > 1 ? [...password].length * Math.log2(pool) : 0;
			const { level } = strengthLabel(bits);
			return { length: [...password].length, alphabetSize: pool, entropyBits: Math.round(bits * 10) / 10, strength: STRENGTH_EN[level], level };
		}
	}),
	define<{ key: string; message: string; algorithm: Algo; encoding: string }>({
		name: 'hmac_sign',
		title: 'Gerar HMAC',
		description: 'Compute an HMAC signature (SHA-1, SHA-256, SHA-384 or SHA-512) of a message with a secret key. Useful for webhook signatures (GitHub, Stripe, etc).',
		category: 'seguranca',
		uiTool: 'hmac',
		readOnly: true,
		input: obj({
			key: { type: 'string', description: 'Secret key (UTF-8).' },
			message: { type: 'string', default: '', description: 'Message/body to sign (UTF-8).' },
			algorithm: { type: 'string', enum: ALGOS, default: 'SHA-256' },
			encoding: { type: 'string', enum: ['hex', 'base64', 'base64url'], default: 'hex' }
		}, ['key']),
		async run({ key, message, algorithm, encoding }) {
			return { signature: encodeBuf(await hmac(algorithm, key, message), encoding), algorithm, encoding };
		}
	}),
	define<{ key: string; message: string; signature: string; algorithm: Algo; encoding: string }>({
		name: 'hmac_verify',
		title: 'Validar HMAC',
		description: 'Verify an HMAC signature in constant time. Accepts an optional "sha256=" style prefix. Returns valid=true/false and the expected signature.',
		category: 'seguranca',
		uiTool: 'hmac',
		readOnly: true,
		input: obj({
			key: { type: 'string', description: 'Secret key (UTF-8).' },
			message: { type: 'string', default: '', description: 'Message/body that was signed.' },
			signature: { type: 'string', description: 'Signature to check.' },
			algorithm: { type: 'string', enum: ALGOS, default: 'SHA-256' },
			encoding: { type: 'string', enum: ['hex', 'base64', 'base64url'], default: 'hex' }
		}, ['key', 'signature']),
		async run({ key, message, signature, algorithm, encoding }) {
			const expected = encodeBuf(await hmac(algorithm, key, message), encoding);
			let got = signature.trim().replace(/^sha\d+=/i, '');
			if (encoding === 'hex') got = got.toLowerCase().replace(/\s/g, '');
			return { valid: timingSafeEqual(got, expected), expected, algorithm, encoding };
		}
	}),
	define<{ text: string; algorithm: Algo; encoding: string }>({
		name: 'hash_digest',
		title: 'Hash (SHA)',
		description: 'Compute a SHA-1/SHA-256/SHA-384/SHA-512 digest of a UTF-8 text.',
		category: 'seguranca',
		readOnly: true,
		input: obj({
			text: { type: 'string', description: 'Input text (UTF-8).' },
			algorithm: { type: 'string', enum: ALGOS, default: 'SHA-256' },
			encoding: { type: 'string', enum: ['hex', 'base64', 'base64url'], default: 'hex' }
		}, ['text']),
		async run({ text, algorithm, encoding }) {
			return { digest: encodeBuf(await crypto.subtle.digest(algorithm, enc.encode(text)), encoding), algorithm, encoding };
		}
	}),

	// ------------------------------------------------------------------ Dev
	define<{ version: number; count: number; uppercase: boolean; hyphens: boolean; braces: boolean }>({
		name: 'uuid_generate',
		title: 'Gerar UUID',
		description: 'Generate UUIDs. v4 = random; v7 = time-ordered (sortable, best for database primary keys).',
		category: 'dev',
		uiTool: 'uuid',
		readOnly: true,
		input: obj({
			version: { type: 'integer', enum: [4, 7], default: 4 },
			count: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
			uppercase: { type: 'boolean', default: false },
			hyphens: { type: 'boolean', default: true },
			braces: { type: 'boolean', default: false, description: 'Wrap in {} (Microsoft GUID style).' }
		}),
		examples: [{ version: 7, count: 5 } as never],
		run({ version, count, uppercase, hyphens, braces }) {
			const uuids = Array.from({ length: count }, () => {
				let u = version === 7 ? uuidV7() : uuidV4();
				if (!hyphens) u = u.replace(/-/g, '');
				if (uppercase) u = u.toUpperCase();
				return braces ? `{${u}}` : u;
			});
			return { uuids, version };
		}
	}),
	define<{ uuid: string }>({
		name: 'uuid_inspect',
		title: 'Inspecionar UUID',
		description: 'Validate a UUID and report its version, variant and, for v1/v6/v7, the embedded timestamp.',
		category: 'dev',
		uiTool: 'uuid',
		readOnly: true,
		input: obj({ uuid: { type: 'string', description: 'UUID with or without hyphens/braces.' } }, ['uuid']),
		run({ uuid }) {
			const hex = uuid.trim().replace(/[{}\-]/g, '').toLowerCase();
			if (!/^[0-9a-f]{32}$/.test(hex)) return { valid: false, error: 'Not a UUID (expected 32 hex digits).' };
			const version = parseInt(hex[12], 16);
			const vbits = parseInt(hex[16], 16);
			const variant = vbits >> 3 === 0 ? 'NCS' : vbits >> 2 === 2 ? 'RFC 9562' : vbits >> 1 === 6 ? 'Microsoft' : 'Reserved';
			let timestamp: string | undefined;
			if (version === 7) timestamp = new Date(parseInt(hex.slice(0, 12), 16)).toISOString();
			if (version === 1 || version === 6) {
				const t = version === 1 ? BigInt('0x' + hex.slice(13, 16) + hex.slice(8, 12) + hex.slice(0, 8)) : BigInt('0x' + hex.slice(0, 12) + hex.slice(13, 16));
				timestamp = new Date(Number((t - 122192928000000000n) / 10000n)).toISOString();
			}
			const canonical = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
			return { valid: true, canonical, version, variant, nil: /^0+$/.test(hex), max: /^f+$/.test(hex), ...(timestamp ? { timestamp } : {}) };
		}
	}),
	define<{ expression: string; timezone?: string; count: number; language: 'pt' | 'en' | 'es' | 'fr' }>({
		name: 'cron_explain',
		title: 'Explicar cron',
		description: 'Validate a 5-field cron expression (minute hour day-of-month month day-of-week), describe it in plain language (en, pt, es or fr) and list the next run times (ISO 8601) in a given IANA timezone.',
		category: 'dev',
		uiTool: 'cron',
		readOnly: true,
		input: obj({
			expression: { type: 'string', description: 'e.g. "0 9 * * 1-5" or "*/15 * * * *".' },
			timezone: { type: 'string', description: 'IANA timezone, e.g. "America/Sao_Paulo". Defaults to the runtime timezone.' },
			count: { type: 'integer', minimum: 1, maximum: 100, default: 5, description: 'How many upcoming runs to list.' },
			language: { type: 'string', enum: ['en', 'pt', 'es', 'fr'], default: 'en', description: 'Language of the description.' }
		}, ['expression']),
		async run({ expression, timezone, count, language }) {
			const parts = expression.trim().split(/\s+/);
			if (parts.length !== 5) return { valid: false, error: 'The expression must have exactly 5 fields: minute hour day-of-month month day-of-week.' };
			const { CronExpressionParser } = await import('cron-parser');
			try {
				const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
				const it = CronExpressionParser.parse(expression, { tz });
				const next = it.take(count).map((d) => d.toDate().toISOString());
				const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
				return { valid: true, expression: parts.join(' '), description: describeCron(parts, language), timezone: tz, fields: { minute, hour, dayOfMonth, month, dayOfWeek }, next };
			} catch (e) {
				return { valid: false, error: (e as Error).message };
			}
		}
	}),
	define<{ pattern: string; flags: string; text: string; replacement?: string }>({
		name: 'regex_test',
		title: 'Testar regex',
		description: 'Run a JavaScript regular expression against a text. Returns every match with index, numbered and named groups, and (optionally) the text after replacement ($1, $<name>, $& supported).',
		category: 'dev',
		uiTool: 'regex',
		readOnly: true,
		input: obj({
			pattern: { type: 'string', description: 'Regex source without slashes, e.g. "(?<year>\\\\d{4})-(\\\\d{2})".' },
			flags: { type: 'string', default: 'gu', description: 'Any of g i m s u v y d.' },
			text: { type: 'string', description: 'Text to search.' },
			replacement: { type: 'string', description: 'Optional replacement string.' }
		}, ['pattern', 'text']),
		run({ pattern, flags, text, replacement }) {
			let re: RegExp;
			try {
				re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
			} catch (e) {
				return { valid: false, error: (e as Error).message };
			}
			const matches = [...text.matchAll(re)].slice(0, 5000).map((m) => ({ value: m[0], index: m.index ?? 0, groups: m.slice(1), ...(m.groups ? { named: { ...m.groups } } : {}) }));
			const out: Record<string, unknown> = { valid: true, regex: `/${pattern}/${flags}`, count: matches.length, matches };
			if (replacement !== undefined) out.replaced = text.replace(new RegExp(pattern, flags), replacement);
			return out;
		}
	}),
	define<{ code?: string; filename?: string }>({
		name: 'language_detect',
		title: 'Detectar linguagem',
		description: 'Detect the programming/markup language of a code snippet (heuristics) and/or from a filename. Returns ranked candidates with confidence 0-1.',
		category: 'editor',
		readOnly: true,
		input: obj({
			code: { type: 'string', description: 'Source code to analyse.' },
			filename: { type: 'string', description: 'File name or path, e.g. "docker-compose.yml".' }
		}),
		run({ code, filename }) {
			if (!code && !filename) throw new ActionError('Provide "code" and/or "filename".', 'invalid_input');
			const byName = filename ? languageFromName(filename) : null;
			const candidates = code ? detectLanguage(code).slice(0, 5).map((d) => ({ id: d.id, name: getLanguage(d.id).name, confidence: Math.round(d.confidence * 100) / 100 })) : [];
			const best = byName ? { id: byName.id, name: byName.name, source: 'filename' } : candidates[0] ? { ...candidates[0], source: 'content' } : { id: 'plaintext', name: 'Texto puro', source: 'fallback' };
			return { language: best, candidates };
		}
	}),
	define<{ query?: string }>({
		name: 'languages_list',
		title: 'Listar linguagens',
		description: 'List the languages known by the editor/formatter with their ids, extensions and which formatter engine is used (prettier, sql or basic cleanup). Use the id with code_format.',
		category: 'editor',
		readOnly: true,
		input: obj({ query: { type: 'string', description: 'Optional search by name, id, alias or extension.' } }),
		run({ query }) {
			const list = query ? searchLanguages(query) : LANGUAGES;
			return { languages: list.map((l) => ({ id: l.id, name: l.name, extensions: l.ext, formatter: l.fmt.engine })) };
		}
	}),
	define<{ code: string; language?: string; filename?: string; tabWidth: number; useTabs: boolean; printWidth: number }>({
		name: 'code_format',
		title: 'Formatar código',
		description: 'Beautify/format source code. Prettier for JS/TS/JSX/TSX, JSON/JSONC/JSON5, YAML, HTML, Vue, Angular, CSS/SCSS/Less, Markdown/MDX, GraphQL, Handlebars, XML/SVG and PHP; sql-formatter for SQL dialects (PostgreSQL, MySQL, SQLite, T-SQL, PL/SQL). Other languages get whitespace cleanup. Language is taken from "language" (id), else "filename", else auto-detected.',
		category: 'editor',
		readOnly: true,
		input: obj({
			code: { type: 'string', description: 'Source code to format.' },
			language: { type: 'string', description: 'Language id (see languages_list), e.g. "typescript", "postgresql", "yaml".' },
			filename: { type: 'string', description: 'Used to pick the language when "language" is missing.' },
			tabWidth: { type: 'integer', minimum: 1, maximum: 8, default: 2 },
			useTabs: { type: 'boolean', default: false },
			printWidth: { type: 'integer', minimum: 40, maximum: 400, default: 100 }
		}, ['code']),
		async run({ code, language, filename, tabWidth, useTabs, printWidth }) {
			let lang = language ? LANGUAGES.find((l) => l.id === language.toLowerCase()) ?? searchLanguages(language)[0] : null;
			if (language && !lang) throw new ActionError(`Unknown language "${language}". Call languages_list to see valid ids.`, 'invalid_input');
			let detected = false;
			if (!lang && filename) lang = languageFromName(filename);
			if (!lang) {
				const top = detectLanguage(code)[0];
				lang = getLanguage(top?.id);
				detected = true;
			}
			const { formatCode } = await import('../editor/format.ts');
			const r = await formatCode(code, lang, { tabWidth, useTabs, printWidth });
			if (!r.ok) throw new ActionError(`Could not format as ${lang.name}: ${r.error}`, 'failed');
			return { formatted: r.text, language: lang.id, languageName: lang.name, detected, engine: r.basic ? 'basic' : lang.fmt.engine, changed: r.text !== code };
		}
	}),
	define<{ original: string; modified: string; ignoreWhitespace: boolean; context: number; originalName: string; modifiedName: string }>({
		name: 'text_diff',
		title: 'Comparar textos (diff)',
		description: 'Compare two texts line by line. Returns a unified diff patch (git style) plus counts of added/removed lines.',
		category: 'editor',
		readOnly: true,
		input: obj({
			original: { type: 'string', description: 'Old text.' },
			modified: { type: 'string', description: 'New text.' },
			ignoreWhitespace: { type: 'boolean', default: false },
			context: { type: 'integer', minimum: 0, maximum: 100, default: 3, description: 'Context lines around changes.' },
			originalName: { type: 'string', default: 'a' },
			modifiedName: { type: 'string', default: 'b' }
		}, ['original', 'modified']),
		async run({ original, modified, ignoreWhitespace, context, originalName, modifiedName }) {
			const { createTwoFilesPatch, diffLines } = await import('diff');
			let added = 0, removed = 0;
			for (const p of diffLines(original, modified, { ignoreWhitespace })) {
				if (p.added) added += p.count ?? 0;
				if (p.removed) removed += p.count ?? 0;
			}
			const patch = createTwoFilesPatch(originalName, modifiedName, original, modified, '', '', { context, ignoreWhitespace });
			return { equal: added === 0 && removed === 0, added, removed, patch };
		}
	}),

	// ------------------------------------------------------------------ Encode / decode
	define<{ text: string; mode: string; urlSafe: boolean }>({
		name: 'base64',
		title: 'Base64',
		description: 'Encode UTF-8 text to Base64 or decode Base64/Base64URL back to UTF-8 text.',
		category: 'encode',
		readOnly: true,
		input: obj({
			text: { type: 'string' },
			mode: { type: 'string', enum: ['encode', 'decode'], default: 'encode' },
			urlSafe: { type: 'boolean', default: false, description: 'Use Base64URL (- _ and no padding) when encoding.' }
		}, ['text']),
		run({ text, mode, urlSafe }) {
			if (mode === 'decode') {
				try {
					return { result: new TextDecoder('utf-8', { fatal: true }).decode(b64ToBytes(text)) };
				} catch {
					throw new ActionError('Input is not valid Base64 (or does not decode to UTF-8 text).', 'invalid_input');
				}
			}
			const b = bytesToB64(enc.encode(text));
			return { result: urlSafe ? b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b };
		}
	}),
	define<{ text: string; mode: string; component: boolean }>({
		name: 'url_encode',
		title: 'URL encode/decode',
		description: 'Percent-encode or decode text for URLs. component=true uses encodeURIComponent (for query values); false uses encodeURI (for whole URLs).',
		category: 'encode',
		readOnly: true,
		input: obj({
			text: { type: 'string' },
			mode: { type: 'string', enum: ['encode', 'decode'], default: 'encode' },
			component: { type: 'boolean', default: true }
		}, ['text']),
		run({ text, mode, component }) {
			try {
				if (mode === 'decode') return { result: component ? decodeURIComponent(text.replace(/\+/g, ' ')) : decodeURI(text) };
				return { result: component ? encodeURIComponent(text) : encodeURI(text) };
			} catch {
				throw new ActionError('Malformed percent-encoding.', 'invalid_input');
			}
		}
	}),
	define<{ token: string }>({
		name: 'jwt_decode',
		title: 'Decodificar JWT',
		description: 'Decode a JSON Web Token header and payload WITHOUT verifying the signature. Reports iat/nbf/exp as ISO dates and whether it is expired.',
		category: 'encode',
		readOnly: true,
		input: obj({ token: { type: 'string', description: 'The JWT (xxx.yyy.zzz). A leading "Bearer " is ignored.' } }, ['token']),
		run({ token }) {
			const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
			if (parts.length < 2) throw new ActionError('Not a JWT: expected header.payload.signature.', 'invalid_input');
			const part = (s: string) => {
				try {
					return JSON.parse(new TextDecoder().decode(b64ToBytes(s)));
				} catch {
					throw new ActionError('JWT header/payload is not valid Base64URL JSON.', 'invalid_input');
				}
			};
			const header = part(parts[0]);
			const payload = part(parts[1]);
			const iso = (v: unknown) => (typeof v === 'number' ? new Date(v * 1000).toISOString() : undefined);
			const now = Date.now() / 1000;
			return {
				header,
				payload,
				signaturePresent: !!parts[2],
				verified: false,
				times: { issuedAt: iso(payload.iat), notBefore: iso(payload.nbf), expiresAt: iso(payload.exp) },
				expired: typeof payload.exp === 'number' ? payload.exp < now : null
			};
		}
	}),
	define<{ value?: string; timezone?: string }>({
		name: 'timestamp_convert',
		title: 'Converter timestamp',
		description: 'Convert between Unix time (seconds or milliseconds, auto-detected) and ISO 8601 dates. Empty value = now. Also returns the date formatted in the given IANA timezone.',
		category: 'dev',
		readOnly: true,
		input: obj({
			value: { type: 'string', description: 'Unix seconds/ms (e.g. "1735689600") or a date string (e.g. "2026-01-01T12:00:00Z"). Empty = now.' },
			timezone: { type: 'string', description: 'IANA timezone for the "local" field, e.g. "America/Sao_Paulo".' }
		}),
		run({ value, timezone }) {
			let d: Date;
			const v = value?.trim();
			if (!v) d = new Date();
			else if (/^-?\d+(\.\d+)?$/.test(v)) {
				const n = Number(v);
				d = new Date(Math.abs(n) < 1e11 ? n * 1000 : n);
			} else d = new Date(v);
			if (Number.isNaN(d.getTime())) throw new ActionError(`Could not parse "${value}" as a date or Unix timestamp.`, 'invalid_input');
			const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
			let local: string;
			try {
				local = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, dateStyle: 'short', timeStyle: 'medium' }).format(d);
			} catch {
				throw new ActionError(`Unknown timezone "${tz}".`, 'invalid_input');
			}
			return { iso: d.toISOString(), unixSeconds: Math.floor(d.getTime() / 1000), unixMilliseconds: d.getTime(), timezone: tz, local };
		}
	}),

	// ------------------------------------------------------------------ Conteúdo
	define<{ kind: LoremKind; count: number; style: LoremLang }>({
		name: 'lorem_generate',
		title: 'Lorem / Mussum Ipsum',
		description: 'Generate placeholder text: Lorem Ipsum or Mussum Ipsum (Brazilian humor variant), as paragraphs, sentences or words.',
		category: 'conteudo',
		uiTool: 'lorem',
		readOnly: true,
		input: obj({
			kind: { type: 'string', enum: ['paragraphs', 'sentences', 'words'], default: 'paragraphs' },
			count: { type: 'integer', minimum: 1, maximum: 500, default: 3 },
			style: { type: 'string', enum: ['lorem', 'mussum'], default: 'lorem' }
		}),
		run({ kind, count, style }) {
			return { text: generateLorem(kind, count, style) };
		}
	}),
	define<{ phone: string; message: string }>({
		name: 'whatsapp_link',
		title: 'Link do WhatsApp',
		description: 'Build a wa.me click-to-chat link with an optional pre-filled message. Phone must include country and area code (e.g. 5511999998888).',
		category: 'whatsapp',
		uiTool: 'whatsapp',
		readOnly: true,
		input: obj({
			phone: { type: 'string', description: 'Phone with country + area code. Non-digits are ignored.' },
			message: { type: 'string', default: '' }
		}, ['phone']),
		run({ phone, message }) {
			const r = whatsappLink(phone, message);
			if (r.error) throw new ActionError(r.error, 'invalid_input');
			return { url: r.url };
		}
	}),
	define<{ text: string; format: string; size: number; errorCorrection: string; dark: string; light: string; margin: number }>({
		name: 'qr_generate',
		title: 'Gerar QR Code',
		description: 'Generate a QR Code for a text or URL. format "svg" returns SVG markup; "png" returns a data: URL (base64 PNG).',
		category: 'conteudo',
		uiTool: 'qr',
		readOnly: true,
		input: obj({
			text: { type: 'string', description: 'Content (text, URL, Wi-Fi string, Pix payload…).' },
			format: { type: 'string', enum: ['svg', 'png'], default: 'svg' },
			size: { type: 'integer', minimum: 64, maximum: 2048, default: 256, description: 'Width in pixels.' },
			errorCorrection: { type: 'string', enum: ['L', 'M', 'Q', 'H'], default: 'M' },
			dark: { type: 'string', default: '#000000', description: 'Module color (hex).' },
			light: { type: 'string', default: '#ffffff', description: 'Background color (hex).' },
			margin: { type: 'integer', minimum: 0, maximum: 20, default: 2 }
		}, ['text']),
		async run({ text, format, size, errorCorrection, dark, light, margin }) {
			const mod = await import('qrcode');
			const QR = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof import('qrcode');
			const opts = { errorCorrectionLevel: errorCorrection as 'M', margin, width: size, color: { dark, light } };
			if (format === 'png') return { format, mimeType: 'image/png', dataUrl: await QR.toDataURL(text, opts) };
			return { format, mimeType: 'image/svg+xml', svg: await QR.toString(text, { ...opts, type: 'svg' }) };
		}
	}),
	define<{ value: string; format: string; width: number; height: number; displayValue: boolean }>({
		name: 'barcode_generate',
		title: 'Gerar código de barras',
		description: 'Generate a 1D barcode as SVG. Formats: CODE128 (any ASCII), CODE39, EAN13 (12 digits, check digit computed), EAN8 (7 digits), UPC (11 digits), ITF14 (13 digits), MSI, pharmacode.',
		category: 'conteudo',
		uiTool: 'barcode',
		readOnly: true,
		input: obj({
			value: { type: 'string' },
			format: { type: 'string', enum: ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14', 'MSI', 'pharmacode'], default: 'CODE128' },
			width: { type: 'number', minimum: 1, maximum: 6, default: 2, description: 'Bar width in px.' },
			height: { type: 'integer', minimum: 20, maximum: 300, default: 90 },
			displayValue: { type: 'boolean', default: true }
		}, ['value']),
		async run({ value, format, width, height, displayValue }) {
			const mod = await import('jsbarcode');
			const JsBarcode = ((mod as { default?: unknown }).default ?? mod) as (t: object, v: string, o: object) => void;
			const target: { encodings?: { data: string; text?: string; options: Record<string, unknown> }[] } = {};
			let valid = true;
			JsBarcode(target, value, { format, width, height, displayValue, valid: (v: boolean) => (valid = v) });
			if (!valid || !target.encodings?.length) throw new ActionError(`"${value}" is not valid for ${format}.`, 'invalid_input');
			const text = target.encodings.map((e) => e.text ?? '').join('');
			return { format, value, encodedText: text, mimeType: 'image/svg+xml', svg: barcodeSvg(target.encodings, { width, height, displayValue, margin: 10, lineColor: '#000000', background: '#ffffff', fontSize: 16 }) };
		}
	}),

	define<{ appSecret: string; body: string }>({
		name: 'whatsapp_webhook_sign',
		title: 'Assinar webhook do WhatsApp',
		description: 'Compute the X-Hub-Signature-256 header that Meta (WhatsApp Cloud API / Graph webhooks) sends: "sha256=" + hex HMAC-SHA256 of the RAW request body with the App Secret. Use it to test your webhook endpoint.',
		category: 'whatsapp',
		uiTool: 'wa-hmac',
		readOnly: true,
		input: obj({
			appSecret: { type: 'string', description: 'Meta App Secret (App settings → Basic). Not the access token.' },
			body: { type: 'string', default: '', description: 'Raw request body exactly as sent (byte for byte).' }
		}, ['appSecret']),
		async run({ appSecret, body }) {
			return await signWebhook(appSecret, body);
		}
	}),
	define<{ appSecret: string; body: string; signature: string }>({
		name: 'whatsapp_webhook_verify',
		title: 'Validar webhook do WhatsApp',
		description: 'Verify a received X-Hub-Signature-256 header (with or without "sha256=") against the raw body and App Secret, in constant time. If invalid, the usual causes are a wrong App Secret or a body re-serialized by the framework instead of the raw bytes.',
		category: 'whatsapp',
		uiTool: 'wa-hmac',
		readOnly: true,
		input: obj({
			appSecret: { type: 'string' },
			body: { type: 'string', default: '', description: 'Raw request body exactly as received.' },
			signature: { type: 'string', description: 'Value of the X-Hub-Signature-256 header.' }
		}, ['appSecret', 'signature']),
		async run({ appSecret, body, signature }) {
			return await verifyWebhook(appSecret, body, signature);
		}
	}),
	define<{ wamid: string }>({
		name: 'wamid_decode',
		title: 'Decodificar WAMID',
		description: 'Decode WhatsApp message IDs ("wamid.HBgL..."). A WAMID is Base64 of a Thrift compact struct with the chat number (wa_id), direction (fromMe: true = sent by the business number) and the app-generated message id. Accepts one wamid, many (whitespace separated) or a whole webhook JSON (all wamid.* are extracted). Undocumented by Meta: use for debugging.',
		category: 'whatsapp',
		uiTool: 'wamid',
		readOnly: true,
		input: obj({ wamid: { type: 'string', description: 'WAMID(s) or any text/JSON containing them.' } }, ['wamid']),
		examples: [{ wamid: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJBMTE4RTUA' } as never],
		run({ wamid }) {
			let found: string[] = wamid.match(/wamid\.[A-Za-z0-9+/_=-]+/g) ?? [];
			if (!found.length) found = wamid.trim().split(/\s+/).filter(Boolean);
			const results = [...new Set(found)].slice(0, 500).map(decodeWamid);
			return { count: results.length, results };
		}
	}),
	define<{ phone: string; fromMe: boolean; messageId?: string }>({
		name: 'wamid_encode',
		title: 'Gerar WAMID',
		description: 'Build a WAMID in the same format WhatsApp uses (for fixtures and webhook tests). Without messageId a random hex id is used.',
		category: 'whatsapp',
		uiTool: 'wamid',
		readOnly: true,
		input: obj({
			phone: { type: 'string', description: 'Number with country code, e.g. 5511999998888.' },
			fromMe: { type: 'boolean', default: true, description: 'true = sent by the business number; false = received from the contact.' },
			messageId: { type: 'string', description: 'Message id (e.g. 3EB0C0E4FF8C06B19F0477). Empty = random.' }
		}, ['phone']),
		run({ phone, fromMe, messageId }) {
			const digits = phone.replace(/\D/g, '');
			if (digits.length < 8 || digits.length > 15) throw new ActionError('Phone must have 8 to 15 digits with country code.', 'invalid_input');
			const w = encodeWamid({ phone: digits, fromMe, messageId });
			return { wamid: w, ...(decodeWamid(w) as object) };
		}
	}),

	// ------------------------------------------------------------------ Documentos (BR)
	define<{ count: number; formatted: boolean }>({
		name: 'cpf_generate',
		title: 'Gerar CPF',
		description: 'Generate valid (check-digit correct) Brazilian CPF numbers for testing. They are random, not real people.',
		category: 'documentos',
		uiTool: 'cpf-cnpj',
		readOnly: true,
		input: obj({
			count: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
			formatted: { type: 'boolean', default: true, description: 'Use the 000.000.000-00 mask.' }
		}),
		run({ count, formatted }) {
			return { cpfs: Array.from({ length: count }, () => { const s = cpfDigits(randomCpfBase()); return formatted ? maskCpf(s) : s; }) };
		}
	}),
	define<{ value: string }>({
		name: 'cpf_validate',
		title: 'Validar CPF',
		description: 'Validate a Brazilian CPF (check digits). Accepts with or without mask.',
		category: 'documentos',
		uiTool: 'cpf-cnpj',
		readOnly: true,
		input: obj({ value: { type: 'string' } }, ['value']),
		run({ value }) {
			const digits = value.replace(/\D/g, '');
			return { valid: validateCpf(value), digits, formatted: digits.length === 11 ? maskCpf(digits) : null };
		}
	}),
	define<{ count: number; formatted: boolean; alphanumeric: boolean }>({
		name: 'cnpj_generate',
		title: 'Gerar CNPJ',
		description: 'Generate valid Brazilian CNPJ numbers for testing, numeric or the new alphanumeric format (Receita Federal, 2026).',
		category: 'documentos',
		uiTool: 'cpf-cnpj',
		readOnly: true,
		input: obj({
			count: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
			formatted: { type: 'boolean', default: true, description: 'Use the 00.000.000/0000-00 mask.' },
			alphanumeric: { type: 'boolean', default: false }
		}),
		run({ count, formatted, alphanumeric }) {
			return { cnpjs: Array.from({ length: count }, () => { const s = cnpjCheck(randomCnpjBase(alphanumeric)); return formatted ? maskCnpj(s) : s; }) };
		}
	}),
	define<{ value: string }>({
		name: 'cnpj_validate',
		title: 'Validar CNPJ',
		description: 'Validate a Brazilian CNPJ (numeric or alphanumeric). Accepts with or without mask.',
		category: 'documentos',
		uiTool: 'cpf-cnpj',
		readOnly: true,
		input: obj({ value: { type: 'string' } }, ['value']),
		run({ value }) {
			const clean = value.replace(/[.\-/\s]/g, '').toUpperCase();
			return { valid: validateCnpj(value), value: clean, formatted: clean.length === 14 ? maskCnpj(clean) : null, alphanumeric: /[A-Z]/.test(clean) };
		}
	})
];

const registry = new Map<string, Action>();
export function register(list: Action[]) {
	for (const a of list) registry.set(a.name, a);
}
register(actions);

export function getAction(name: string) {
	return registry.get(name);
}

export function listActions(opts: { includeBrowserOnly?: boolean } = {}) {
	return [...registry.values()].filter((a) => opts.includeBrowserOnly !== false || !a.browserOnly);
}

/** Executa uma ação validando a entrada. Sempre resolve com {ok, result|error}: fácil para qualquer cliente. */
export async function callAction(name: string, input: unknown = {}): Promise<{ ok: true; action: string; result: unknown } | { ok: false; action: string; error: { code: string; message: string } }> {
	const a = registry.get(name);
	try {
		if (!a) {
			const near = [...registry.keys()].filter((k) => k.includes(name.split('_')[0])).slice(0, 5);
			throw new ActionError(`Unknown action "${name}".${near.length ? ` Did you mean: ${near.join(', ')}?` : ''} Call list() / tools/list to see all.`, 'not_found');
		}
		const result = await a.run(prepareInput(a.input, input) as never);
		return { ok: true, action: name, result };
	} catch (e) {
		const err = e instanceof ActionError ? e : new ActionError((e as Error)?.message ?? String(e));
		return { ok: false, action: name, error: { code: err.code, message: err.message } };
	}
}

export const CATEGORY_LABELS: Record<Action['category'], string> = {
	seguranca: 'Segurança',
	dev: 'Dev',
	conteudo: 'Conteúdo',
	whatsapp: 'WhatsApp',
	documentos: 'Documentos (BR)',
	editor: 'Código e texto',
	encode: 'Encode / decode',
	app: 'Controle do app'
};
