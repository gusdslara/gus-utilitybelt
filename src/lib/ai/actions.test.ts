/// <reference types="bun" />
// bun test — contrato das ações usadas por IAs (MCP, WebMCP, CLI, /run).
import { describe, expect, test } from 'bun:test';
import { actions, callAction, listActions } from './actions.ts';
import { describeAction, prepareInput } from './schema.ts';

const ok = async (name: string, input: unknown = {}) => {
	const r = await callAction(name, input);
	if (!r.ok) throw new Error(`${name}: ${r.error.message}`);
	return r.result as Record<string, any>;
};

describe('catálogo', () => {
	test('nomes únicos em snake_case e schemas válidos', () => {
		const names = actions.map((a) => a.name);
		expect(new Set(names).size).toBe(names.length);
		for (const a of actions) {
			expect(a.name).toMatch(/^[a-z][a-z0-9_]{2,63}$/);
			expect(a.description.length).toBeGreaterThan(20);
			const d = describeAction(a);
			expect(d.inputSchema.type).toBe('object');
			for (const r of a.input.required ?? []) expect(a.input.properties[r]).toBeDefined();
		}
	});
	test('ações puras não dependem do navegador', () => {
		expect(listActions({ includeBrowserOnly: false }).every((a) => !a.browserOnly)).toBe(true);
	});
});

describe('validação de entrada', () => {
	const schema = actions.find((a) => a.name === 'uuid_generate')!.input;
	test('converte strings e aplica defaults', () => {
		expect(prepareInput(schema, { version: '7', uppercase: 'true' })).toEqual({ version: 7, count: 1, uppercase: true, hyphens: true, braces: false });
	});
	test('rejeita parâmetros desconhecidos e enum inválido', async () => {
		const r = await callAction('uuid_generate', { version: 5, foo: 1 });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error.message).toContain('foo');
	});
	test('ação inexistente', async () => {
		const r = await callAction('nao_existe');
		expect(!r.ok && r.error.code).toBe('not_found');
	});
});

describe('resultados', () => {
	test('senha', async () => {
		const r = await ok('password_generate', { length: 32, count: 3, symbols: false });
		expect(r.passwords).toHaveLength(3);
		expect(r.passwords[0]).toMatch(/^[A-Za-z0-9]{32}$/);
	});
	test('HMAC assina e valida (vetor RFC 4231 caso 2)', async () => {
		const sig = (await ok('hmac_sign', { key: 'Jefe', message: 'what do ya want for nothing?' })).signature;
		expect(sig).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
		expect((await ok('hmac_verify', { key: 'Jefe', message: 'what do ya want for nothing?', signature: 'sha256=' + sig.toUpperCase() })).valid).toBe(true);
	});
	test('SHA-256', async () => {
		expect((await ok('hash_digest', { text: 'abc' })).digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});
	test('UUID v7 gera e inspeciona', async () => {
		const [u] = (await ok('uuid_generate', { version: 7 })).uuids;
		const info = await ok('uuid_inspect', { uuid: u });
		expect(info.version).toBe(7);
		expect(Math.abs(Date.parse(info.timestamp) - Date.now())).toBeLessThan(5000);
	});
	test('cron', async () => {
		const r = await ok('cron_explain', { expression: '0 9 * * 1-5', timezone: 'UTC', count: 3 });
		expect(r.valid).toBe(true);
		expect(r.next).toHaveLength(3);
		expect(new Date(r.next[0]).getUTCHours()).toBe(9);
		expect((await ok('cron_explain', { expression: '* *' })).valid).toBe(false);
	});
	test('regex com grupos nomeados e substituição', async () => {
		const r = await ok('regex_test', { pattern: '(?<a>\\d{4})-(\\d{2})', text: 'x 2026-11 y', replacement: '$2/$<a>' });
		expect(r.count).toBe(1);
		expect(r.matches[0].named).toEqual({ a: '2026' });
		expect(r.replaced).toBe('x 11/2026 y');
	});
	test('formatação TS, SQL e JSON', async () => {
		expect((await ok('code_format', { code: 'const a={b:1}', language: 'typescript' })).formatted).toBe('const a = { b: 1 };\n');
		expect((await ok('code_format', { code: 'select 1', filename: 'q.sql' })).formatted).toContain('SELECT');
		expect((await ok('code_format', { code: '{"a":[1]}' })).language).toBe('json');
	});
	test('diff', async () => {
		const r = await ok('text_diff', { original: 'a\nb\n', modified: 'a\nc\n' });
		expect([r.added, r.removed]).toEqual([1, 1]);
		expect(r.patch).toContain('+c');
	});
	test('base64 ida e volta com UTF-8', async () => {
		const e = (await ok('base64', { text: 'ação ✓' })).result;
		expect((await ok('base64', { text: e, mode: 'decode' })).result).toBe('ação ✓');
	});
	test('JWT', async () => {
		const r = await ok('jwt_decode', { token: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxfQ.sig' });
		expect(r.payload.sub).toBe('1');
		expect(r.expired).toBe(true);
	});
	test('timestamp', async () => {
		expect((await ok('timestamp_convert', { value: '1735689600' })).iso).toBe('2025-01-01T00:00:00.000Z');
		expect((await ok('timestamp_convert', { value: '1735689600000' })).unixSeconds).toBe(1735689600);
	});
	test('QR e código de barras', async () => {
		expect((await ok('qr_generate', { text: 'oi' })).svg).toStartWith('<svg');
		expect((await ok('qr_generate', { text: 'oi', format: 'png' })).dataUrl).toStartWith('data:image/png;base64,');
		const b = await ok('barcode_generate', { value: '789123456789', format: 'EAN13' });
		expect(b.encodedText).toBe('7891234567895');
		expect((await callAction('barcode_generate', { value: 'abc', format: 'EAN13' })).ok).toBe(false);
	});
	test('CPF e CNPJ gerados são válidos', async () => {
		for (const c of (await ok('cpf_generate', { count: 20 })).cpfs) expect((await ok('cpf_validate', { value: c })).valid).toBe(true);
		for (const alphanumeric of [false, true])
			for (const c of (await ok('cnpj_generate', { count: 20, alphanumeric })).cnpjs) expect((await ok('cnpj_validate', { value: c })).valid).toBe(true);
	});
	test('WAMID decodifica exemplo da documentação da Meta e faz ida e volta', async () => {
		const doc = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJBMTE4RTUA';
		const r = await ok('wamid_decode', { wamid: `{"messages":[{"id":"${doc}"}]} x` });
		expect(r.count).toBe(1);
		expect(r.results[0]).toMatchObject({ valid: true, phone: '16503879439', fromMe: true, messageId: 'CB6B39DAA892A118E5', chatType: 1 });
		expect((await ok('wamid_encode', { phone: '+1 650 387 9439', messageId: 'CB6B39DAA892A118E5' })).wamid).toBe(doc);
		const g = await ok('wamid_encode', { phone: '5511999998888', fromMe: false });
		expect(g.fromMe).toBe(false);
		expect((await ok('wamid_decode', { wamid: 'aGVsbG8=' })).results[0].valid).toBe(false);
	});
	test('assinatura do webhook do WhatsApp', async () => {
		const body = '{"object":"whatsapp_business_account","x":"\\u00e1"}';
		const s = await ok('whatsapp_webhook_sign', { appSecret: 'segredo', body });
		expect(s.header).toMatch(/^sha256=[0-9a-f]{64}$/);
		expect((await ok('whatsapp_webhook_verify', { appSecret: 'segredo', body, signature: s.header })).valid).toBe(true);
		expect((await ok('whatsapp_webhook_verify', { appSecret: 'segredo', body: body.replace('\\u00e1', 'á'), signature: s.header })).valid).toBe(false);
	});
	test('WhatsApp', async () => {
		expect((await ok('whatsapp_link', { phone: '+55 (11) 99999-8888', message: 'olá mundo' })).url).toBe('https://wa.me/5511999998888?text=ol%C3%A1%20mundo');
	});
});
