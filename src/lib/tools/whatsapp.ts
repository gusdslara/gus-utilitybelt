// WhatsApp: decodificador/gerador de WAMID e assinatura de webhook da Meta (X-Hub-Signature-256).
// Lógica pura, usada pela UI e pela API de IA (roda no navegador e no Bun).
import { hmac, toHex, timingSafeEqual } from './gen.ts';

// ---------------------------------------------------------------- WAMID
// "wamid." + Base64 de uma struct no Thrift Compact Protocol (formato não documentado pela Meta,
// obtido por engenharia reversa e estável há anos):
//   1: struct chat { 1: binary número/JID, 2: i32 tipo do chat }
//   2: bool fromMe  (true = enviada pelo número business; false = recebida do contato)
//   3: binary id da mensagem (gerado pelo app do remetente)

export type ThriftValue = string | number | bigint | boolean | ThriftValue[] | { [field: number]: ThriftValue };

export type WamidInfo = {
	valid: true;
	wamid: string;
	phone: string;
	chatType: number | null;
	fromMe: boolean | null;
	messageId: string;
	/** Campos extras/desconhecidos, para o caso de a Meta mudar o formato. */
	raw: { [field: number]: ThriftValue };
};

export type WamidError = { valid: false; wamid: string; error: 'not_base64' | 'not_thrift' | 'unexpected_shape'; detail?: string };

function b64decode(s: string): Uint8Array {
	const norm = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(norm)) throw new Error('base64');
	const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64encode(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

class Reader {
	pos = 0;
	constructor(readonly buf: Uint8Array) {}
	byte() {
		if (this.pos >= this.buf.length) throw new Error('eof');
		return this.buf[this.pos++];
	}
	varint(): bigint {
		let shift = 0n, out = 0n;
		for (let i = 0; i < 10; i++) {
			const b = this.byte();
			out |= BigInt(b & 0x7f) << shift;
			if (!(b & 0x80)) return out;
			shift += 7n;
		}
		throw new Error('varint');
	}
	zigzag(): bigint {
		const n = this.varint();
		return (n >> 1n) ^ -(n & 1n);
	}
	bytes(n: number) {
		if (this.pos + n > this.buf.length) throw new Error('eof');
		const out = this.buf.subarray(this.pos, this.pos + n);
		this.pos += n;
		return out;
	}
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

function readValue(r: Reader, type: number, depth: number): ThriftValue {
	if (depth > 16) throw new Error('depth');
	switch (type) {
		case 1: return true;
		case 2: return false;
		case 3: return (r.byte() << 24) >> 24;
		case 4:
		case 5: return Number(r.zigzag());
		case 6: return r.zigzag();
		case 7: return new DataView(r.bytes(8).slice().buffer).getFloat64(0, true);
		case 8: {
			const b = r.bytes(Number(r.varint()));
			try {
				return utf8.decode(b);
			} catch {
				return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
			}
		}
		case 9:
		case 10: {
			const h = r.byte();
			let size = h >> 4;
			if (size === 15) size = Number(r.varint());
			const et = h & 0x0f;
			// bool em lista: um byte por item
			return Array.from({ length: size }, () => (et === 1 || et === 2 ? r.byte() === 1 : readValue(r, et, depth + 1)));
		}
		case 12: return readStruct(r, depth + 1);
		default: throw new Error(`type ${type}`);
	}
}

function readStruct(r: Reader, depth = 0): { [field: number]: ThriftValue } {
	const out: { [field: number]: ThriftValue } = {};
	let last = 0;
	for (;;) {
		const h = r.byte();
		if (h === 0) return out;
		const type = h & 0x0f;
		const delta = h >> 4;
		const id = delta ? last + delta : Number(r.zigzag());
		out[id] = readValue(r, type, depth);
		last = id;
	}
}

/** Decodifica um WAMID (com ou sem o prefixo "wamid."). */
export function decodeWamid(input: string): WamidInfo | WamidError {
	const wamid = input.trim();
	const body = wamid.replace(/^wamid\./i, '');
	let bytes: Uint8Array;
	try {
		bytes = b64decode(body);
		if (!bytes.length) throw new Error('empty');
	} catch {
		return { valid: false, wamid, error: 'not_base64' };
	}
	let raw: { [field: number]: ThriftValue };
	try {
		const r = new Reader(bytes);
		raw = readStruct(r);
		if (r.pos !== bytes.length) throw new Error('trailing bytes');
	} catch (e) {
		return { valid: false, wamid, error: 'not_thrift', detail: (e as Error).message };
	}
	const chat = raw[1];
	if (!chat || typeof chat !== 'object' || Array.isArray(chat) || typeof chat[1] !== 'string' || typeof raw[3] !== 'string') {
		return { valid: false, wamid, error: 'unexpected_shape' };
	}
	return {
		valid: true,
		wamid: wamid.startsWith('wamid.') ? wamid : `wamid.${wamid}`,
		phone: chat[1],
		chatType: typeof chat[2] === 'number' ? chat[2] : null,
		fromMe: typeof raw[2] === 'boolean' ? raw[2] : null,
		messageId: raw[3],
		raw
	};
}

function varintBytes(n: number): number[] {
	const out: number[] = [];
	do {
		let b = n & 0x7f;
		n >>>= 7;
		if (n) b |= 0x80;
		out.push(b);
	} while (n);
	return out;
}

/** Id aleatório no estilo dos apps (hex maiúsculo). */
export function randomMessageId(bytes = 16): string {
	const b = new Uint8Array(bytes);
	crypto.getRandomValues(b);
	return [...b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Monta um WAMID no mesmo formato (útil para fixtures e testes de webhook). */
export function encodeWamid(o: { phone: string; messageId?: string; fromMe?: boolean; chatType?: number }): string {
	const enc = new TextEncoder();
	const phone = enc.encode(o.phone);
	const id = enc.encode(o.messageId || randomMessageId());
	const type = o.chatType ?? 1;
	const bytes = [
		0x1c, // campo 1, struct
		0x18, ...varintBytes(phone.length), ...phone, // chat.1 binary
		0x15, ...varintBytes(((type << 1) ^ (type >> 31)) >>> 0), // chat.2 i32 (zigzag)
		0x00,
		(o.fromMe ?? true) ? 0x11 : 0x12, // campo 2 bool
		0x18, ...varintBytes(id.length), ...id, // campo 3 binary
		0x00
	];
	return 'wamid.' + b64encode(Uint8Array.from(bytes));
}

// ---------------------------------------------------------------- Webhook (assinatura da Meta)
// A Meta assina cada POST do webhook com HMAC-SHA256 do corpo BRUTO usando o App Secret e envia
// no header "X-Hub-Signature-256: sha256=<hex>". Reformatar o JSON (ou desescapar \uXXXX) quebra a assinatura.

export async function signWebhook(appSecret: string, body: string) {
	const hex = toHex(await hmac('SHA-256', appSecret, body));
	return { signature: hex, header: `sha256=${hex}`, headerName: 'X-Hub-Signature-256' };
}

export async function verifyWebhook(appSecret: string, body: string, header: string) {
	const { signature, header: expected } = await signWebhook(appSecret, body);
	const got = header.trim().replace(/^x-hub-signature-256:\s*/i, '').replace(/^sha256=/i, '').toLowerCase();
	return { valid: timingSafeEqual(got, signature), expected, hasPrefix: /^(x-hub-signature-256:\s*)?sha256=/i.test(header.trim()) };
}

/** Payload de exemplo (mensagem de texto recebida), igual ao formato da Cloud API. */
export function sampleWebhookBody(phone = '5511999998888') {
	const ts = Math.floor(Date.now() / 1000);
	return JSON.stringify({
		object: 'whatsapp_business_account',
		entry: [{
			id: '102290129340398',
			changes: [{
				field: 'messages',
				value: {
					messaging_product: 'whatsapp',
					metadata: { display_phone_number: '15550783881', phone_number_id: '106540352242922' },
					contacts: [{ profile: { name: 'Cliente' }, wa_id: phone }],
					messages: [{ from: phone, id: encodeWamid({ phone, fromMe: false }), timestamp: String(ts), type: 'text', text: { body: 'Olá!' } }]
				}
			}]
		}]
	});
}
