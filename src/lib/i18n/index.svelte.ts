// i18n no mesmo modelo da landing (gusdslara.github.io): t('a.b', { var }) com chaves aninhadas,
// interpolação {var}, preferência em localStorage['user_language'], detecção pelo navegador,
// fallback em inglês e <html lang> atualizado. Aqui com runes (Svelte 5) e francês incluído.
// As mensagens ficam por área em ./messages/*.ts, cada arquivo com os 4 idiomas lado a lado.
import { messages, type Messages } from './messages/index.ts';

export const LANGUAGES = [
	{ value: 'pt', label: 'Português', short: 'PT', tag: 'pt-BR' },
	{ value: 'en', label: 'English', short: 'EN', tag: 'en' },
	{ value: 'es', label: 'Español', short: 'ES', tag: 'es' },
	{ value: 'fr', label: 'Français', short: 'FR', tag: 'fr' }
] as const;

export type Language = (typeof LANGUAGES)[number]['value'];
const CODES = LANGUAGES.map((l) => l.value) as Language[];
const STORAGE_KEY = 'user_language';

export function detectLanguage(): Language {
	if (typeof window === 'undefined') return 'pt';
	try {
		const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
		if (stored && CODES.includes(stored)) return stored;
	} catch {
		/* storage bloqueado */
	}
	for (const l of navigator.languages ?? [navigator.language]) {
		const code = l.toLowerCase().slice(0, 2) as Language;
		if (CODES.includes(code)) return code;
	}
	return 'en';
}

class I18n {
	/** Pré-render em pt (idioma original do app); o cliente troca no mount. */
	lang = $state<Language>('pt');
	tag = $derived(LANGUAGES.find((l) => l.value === this.lang)!.tag);

	/** Páginas com idioma na URL (SEO): o idioma da rota vale mais que a preferência salva. */
	pinned = false;
	/** Mesma página em outros idiomas (o seletor navega para lá em vez de só traduzir). */
	alternates = $state<Partial<Record<Language, string>>>({});

	init() {
		if (this.pinned) return;
		this.set(detectLanguage(), false);
	}

	/** Fixa o idioma da página (antes do render, inclusive no pré-render). */
	pin(lang: Language, alternates: Partial<Record<Language, string>> = {}) {
		this.pinned = true;
		this.alternates = alternates;
		this.set(lang, false);
	}

	set(lang: Language, persist = true) {
		if (!CODES.includes(lang)) return;
		this.lang = lang;
		if (typeof document !== 'undefined') document.documentElement.lang = this.tag;
		if (persist) {
			try {
				localStorage.setItem(STORAGE_KEY, lang);
			} catch {
				/* sem storage */
			}
		}
	}
}

export const i18n = new I18n();

function resolve(obj: unknown, path: string): unknown {
	let cur = obj as Record<string, unknown> | undefined;
	for (const k of path.split('.')) {
		if (cur == null) return undefined;
		cur = cur[k] as Record<string, unknown> | undefined;
	}
	return cur;
}

// Chaves tipadas: autocompletar e erro de tipo em chave inexistente.
type Leaves<T, P extends string = ''> = {
	[K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends readonly unknown[] ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

/** Traduz. Reativo: em template/$derived reavalia quando o idioma muda. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
	let value = resolve(messages[i18n.lang], key) ?? resolve(messages.en, key);
	if (typeof value !== 'string') return key;
	if (vars) for (const [k, v] of Object.entries(vars)) value = (value as string).replaceAll(`{${k}}`, String(v));
	return value as string;
}

/** Lista traduzida (ex.: nomes de dias). */
export function tl(key: MessageKey): string[] {
	const v = resolve(messages[i18n.lang], key) ?? resolve(messages.en, key);
	return Array.isArray(v) ? (v as string[]) : [];
}
