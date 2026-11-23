// Lógica pura dos geradores (sem UI), fácil de testar.

// ---------- Senhas ----------
export type PasswordOpts = {
	length: number;
	lower: boolean;
	upper: boolean;
	digits: boolean;
	symbols: boolean;
	noAmbiguous: boolean;
	noRepeat: boolean;
};

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~';
const AMBIGUOUS = /[O0oIl1|`'"]/g;

/** Índice aleatório sem viés (rejection sampling) usando CSPRNG. */
function randIndex(n: number): number {
	const max = 0xffffffff - (0xffffffff % n);
	const buf = new Uint32Array(1);
	let x: number;
	do {
		crypto.getRandomValues(buf);
		x = buf[0];
	} while (x >= max);
	return x % n;
}

function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = randIndex(i + 1);
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

export function buildPool(o: PasswordOpts): string[] {
	const sets: string[] = [];
	const clean = (s: string) => (o.noAmbiguous ? s.replace(AMBIGUOUS, '') : s);
	if (o.lower) sets.push(clean(LOWER));
	if (o.upper) sets.push(clean(UPPER));
	if (o.digits) sets.push(clean(DIGITS));
	if (o.symbols) sets.push(SYMBOLS);
	return sets.filter((s) => s.length > 0);
}

export function generatePassword(o: PasswordOpts): string {
	const sets = buildPool(o);
	if (sets.length === 0) return '';
	const all = sets.join('');
	const out: string[] = [];
	// Garante ao menos 1 caractere de cada conjunto selecionado
	for (const s of sets) out.push(s[randIndex(s.length)]);
	while (out.length < o.length) {
		const c = all[randIndex(all.length)];
		if (o.noRepeat && out.includes(c)) continue;
		out.push(c);
	}
	return shuffle(out).slice(0, o.length).join('');
}

/** Entropia estimada em bits. */
export function entropyBits(o: PasswordOpts): number {
	const pool = buildPool(o).join('').length;
	if (pool <= 1) return 0;
	return o.length * Math.log2(pool);
}

export function strengthLabel(bits: number): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
	if (bits < 40) return { label: 'Fraca', level: 1 };
	if (bits < 60) return { label: 'Razoável', level: 2 };
	if (bits < 80) return { label: 'Forte', level: 3 };
	return { label: 'Muito forte', level: 4 };
}

// ---------- UUID ----------
export function uuidV4(): string {
	return crypto.randomUUID();
}

export function uuidV7(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	let ms = BigInt(Date.now());
	for (let i = 5; i >= 0; i--) {
		bytes[i] = Number(ms & 0xffn);
		ms >>= 8n;
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x70; // versão 7
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
	const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------- Lorem / Mussum ----------
const LOREM = (
	'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'
).split(' ');

const MUSSUM = (
	'cacilds vidis litro abertis mé faiz questionadis pra cumpadi suco de cevadiss manduma paçoca tistis trem bão interagi no mé quem num gosta di mim que vai caçá sua turma cursus quam quis ante sapien nec suspendisse germanos sed nisi lacus bibendum eget vulputate ut ullamcorper ipsum demonstraveis atleta é bom nóis vamu que vamu inté pneumoultramicroscopicossilicovulcanoconiótico ceis num sabe quanto custa o litro trem de doido mais quantu custa nóis paga ninguém pra ser bão nós num vai pará é bom demais'
).split(' ');

export type LoremKind = 'paragraphs' | 'sentences' | 'words';
export type LoremLang = 'lorem' | 'mussum';

function pick(list: string[]) {
	return list[randIndex(list.length)];
}

function sentence(list: string[]) {
	const n = 6 + randIndex(10);
	const words = Array.from({ length: n }, () => pick(list));
	words[0] = words[0][0].toUpperCase() + words[0].slice(1);
	return words.join(' ') + '.';
}

export function generateLorem(kind: LoremKind, count: number, lang: LoremLang, startWithLorem = true): string {
	const list = lang === 'lorem' ? LOREM : MUSSUM;
	const n = Math.max(1, Math.min(count, 500));
	if (kind === 'words') {
		const words = Array.from({ length: n }, () => pick(list));
		if (startWithLorem) words[0] = words[0][0].toUpperCase() + words[0].slice(1);
		return words.join(' ');
	}
	if (kind === 'sentences') {
		return Array.from({ length: n }, () => sentence(list)).join(' ');
	}
	return Array.from({ length: n }, () => {
		const sentences = 3 + randIndex(4);
		return Array.from({ length: sentences }, () => sentence(list)).join(' ');
	}).join('\n\n');
}

// ---------- CPF / CNPJ ----------
function dv(digits: number[], weights: number[]): number {
	const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
	const r = sum % 11;
	return r < 2 ? 0 : 11 - r;
}

const CPF_W1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_W2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function cpfDigits(base9: number[]): string {
	const d1 = dv(base9, CPF_W1);
	const d2 = dv([...base9, d1], CPF_W2);
	return [...base9, d1, d2].join('');
}

export function validateCpf(raw: string): boolean {
	const s = raw.replace(/\D/g, '');
	if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
	const d = [...s].map(Number);
	return cpfDigits(d.slice(0, 9)) === s;
}

/** CNPJ: aceita o formato numérico e o alfanumérico (novo, da RFB). Valor do caractere = código ASCII - 48. */
const cnpjVal = (c: string) => c.charCodeAt(0) - 48;

export function cnpjCheck(base12: string[]): string {
	const b = base12.map(cnpjVal);
	const d1 = dv(b, CNPJ_W1);
	const d2 = dv([...b, d1], CNPJ_W2);
	return `${base12.join('')}${d1}${d2}`;
}

export function validateCnpj(raw: string): boolean {
	const s = raw.replace(/[.\-/\s]/g, '').toUpperCase();
	if (s.length !== 14 || !/^[0-9A-Z]{12}\d{2}$/.test(s)) return false;
	if (/^(.)\1+$/.test(s)) return false;
	return cnpjCheck([...s.slice(0, 12)]) === s;
}

export function randomCpfBase(): number[] {
	let base: number[];
	do {
		base = Array.from({ length: 9 }, () => randIndex(10));
	} while (new Set(base).size === 1);
	return base;
}

const CNPJ_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function randomCnpjBase(alphanumeric: boolean): string[] {
	const pool = alphanumeric ? CNPJ_CHARS : '0123456789';
	const base = Array.from({ length: 8 }, () => pool[randIndex(pool.length)]);
	// 4 últimos do bloco de ordem: 0001 por padrão (matriz)
	return [...base, ...'0001'.split('')];
}

export function maskCpf(s: string) {
	return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
export function maskCnpj(s: string) {
	return s.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
}

// ---------- WhatsApp ----------
export function whatsappLink(phone: string, message: string): { url: string; error?: string } {
	const digits = phone.replace(/\D/g, '');
	if (digits.length < 10 || digits.length > 15) {
		return { url: '', error: 'Informe o número com DDD (10 a 15 dígitos, ex.: 5511999998888).' };
	}
	const base = `https://wa.me/${digits}`;
	return { url: message.trim() ? `${base}?text=${encodeURIComponent(message)}` : base };
}

// ---------- Utilidades ----------
export async function hmac(algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', key: string, message: string): Promise<ArrayBuffer> {
	const enc = new TextEncoder();
	const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: algo }, false, ['sign']);
	return crypto.subtle.sign('HMAC', k, enc.encode(message));
}

export function toHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function toBase64(buf: ArrayBuffer): string {
	let s = '';
	for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
	return btoa(s);
}

/** Comparação em tempo constante. */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let r = 0;
	for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return r === 0;
}
