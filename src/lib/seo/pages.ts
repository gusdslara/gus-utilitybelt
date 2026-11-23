// Catálogo das landing pages de SEO/GEO (conversor e editor de imagens + app Motion/Lottie) nos 4 idiomas.
// As páginas de par "X para Y" são montadas a partir da tabela de fatos (formats.ts) +
// frases nativas de cada idioma (copy/*.ts), para que cada uma tenha texto específico.
import { analyze, FORMATS, PAIRS, TOP_PAIRS, validPair, type Fmt } from './formats.ts';
import { SITE_NAME } from './site.ts';
import type { Copy, MotionCopy, MotionFaqKey, MotionKind, MotionSectionKey, QA } from './copy/types.ts';
import { en } from './copy/en.ts';
import { pt } from './copy/pt.ts';
import { es } from './copy/es.ts';
import { fr } from './copy/fr.ts';
import { motionPt } from './copy/motion-pt.ts';
import { motionEn } from './copy/motion-en.ts';
import { motionEs } from './copy/motion-es.ts';
import { motionFr } from './copy/motion-fr.ts';

export type { MotionKind } from './copy/types.ts';

export type Lang = 'pt' | 'en' | 'es' | 'fr';
export type HubKind = 'converter' | 'compress' | 'resize' | 'editor' | 'remove-bg';
export type SeoKind = HubKind | 'pair' | MotionKind;

/** Como uma página do app Imagem abre (app ausente = 'image', compatível com as páginas antigas). */
export type ImageOpen = {
	app?: 'image';
	mode: 'convert' | 'edit';
	to?: string;
	preset?: 'compress' | 'resize';
	ai?: 'remove-bg';
	export?: never;
};
/** Formato pré-selecionado no diálogo de exportação do Motion. */
export type MotionExport = 'gif' | 'mp4' | 'webm' | 'lottie' | 'json';
/** Como uma página do app Motion abre: 'view' = abrir/editar Lottie, 'create' = criador. */
export type MotionOpen = {
	app: 'motion';
	mode: 'view' | 'create';
	export?: MotionExport;
	// campos do app Imagem nunca existem aqui (permite ler p.open.to sem estreitar o tipo)
	to?: never;
	preset?: never;
	ai?: never;
};
export type SeoOpen = ImageOpen | MotionOpen;

export type SeoPage = {
	slug: string;
	lang: Lang;
	key: string;
	kind: SeoKind;
	from?: string;
	to?: string; // páginas de par: ids InKind/OutFormat (jpeg png webp avif gif bmp ico svg heic tiff psd | pdf)
	title: string;
	description: string;
	h1: string;
	lead: string;
	sections: { h2: string; body: string[] }[];
	steps: string[];
	faq: { q: string; a: string }[];
	related: { slug: string; label: string }[];
	// como a página abre o app
	open: SeoOpen;
};

/** A página abre o app Motion? */
export const isMotionPage = (p: SeoPage): p is SeoPage & { open: MotionOpen } => p.open.app === 'motion';

/** Abertura no app Imagem (páginas do Motion caem no editor, por segurança). */
export function imageOpen(p: SeoPage): ImageOpen {
	return p.open.app === 'motion' ? { mode: 'edit' } : p.open;
}

/** Abertura no app Motion; null para páginas do app Imagem. */
export function motionOpen(p: SeoPage): MotionOpen | null {
	return p.open.app === 'motion' ? p.open : null;
}

export const LANGS: Lang[] = ['pt', 'en', 'es', 'fr'];
export const COPY: Record<Lang, Copy> = { pt, en, es, fr };
export const MOTION_COPY: Record<Lang, MotionCopy> = { pt: motionPt, en: motionEn, es: motionEs, fr: motionFr };
const HUBS: HubKind[] = ['converter', 'editor', 'remove-bg', 'compress', 'resize'];

const HUB_SLUGS: Record<HubKind, Record<Lang, string>> = {
	converter: { pt: 'conversor-de-imagens', en: 'image-converter', es: 'convertidor-de-imagenes', fr: 'convertisseur-image' },
	editor: { pt: 'editor-de-imagens-online', en: 'online-image-editor', es: 'editor-de-imagenes-online', fr: 'editeur-image-en-ligne' },
	'remove-bg': { pt: 'remover-fundo-de-imagem', en: 'remove-image-background', es: 'quitar-fondo-de-imagen', fr: 'supprimer-arriere-plan-image' },
	compress: { pt: 'comprimir-imagem', en: 'compress-image', es: 'comprimir-imagen', fr: 'compresser-image' },
	resize: { pt: 'redimensionar-imagem', en: 'resize-image', es: 'redimensionar-imagen', fr: 'redimensionner-image' }
};

const HUB_OPEN: Record<HubKind, ImageOpen> = {
	converter: { mode: 'convert' },
	editor: { mode: 'edit' },
	'remove-bg': { mode: 'edit', ai: 'remove-bg' },
	compress: { mode: 'convert', preset: 'compress' },
	resize: { mode: 'convert', preset: 'resize' }
};

const PAIR_SEP: Record<Lang, string> = { pt: 'para', en: 'to', es: 'a', fr: 'en' };

/** Rotas que já existem no app: nenhum slug pode colidir com elas. */
export const RESERVED_SLUGS = ['run', 'tools.json', 'llms.txt', 'sitemap.xml', 'robots.txt'];

export const hubSlug = (kind: HubKind, lang: Lang) => HUB_SLUGS[kind][lang];
export const pairSlug = (a: Fmt, b: Fmt, lang: Lang) => `${a}-${PAIR_SEP[lang]}-${b}`;

const DESC_MIN = 140;
const DESC_MAX = 160;
const TITLE_MAX = 60;

/** Escolhe a primeira candidata com 140–160 caracteres; senão corta na palavra (com reticências). */
export function fitDescription(candidates: string[]): string {
	const ok = candidates.find((c) => c.length >= DESC_MIN && c.length <= DESC_MAX);
	if (ok) return ok;
	const long = candidates.find((c) => c.length > DESC_MAX);
	if (long) {
		const cut = long.slice(0, DESC_MAX - 1);
		return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:—-]+$/, '') + '…';
	}
	return candidates[0];
}

/** Acrescenta a marca ao título quando ainda cabe em 60 caracteres. */
function withBrand(title: string): string {
	if (title.includes(SITE_NAME)) return title;
	const branded = `${title} | ${SITE_NAME}`;
	return branded.length <= TITLE_MAX ? branded : title;
}

// Popularidade dos pares (para escolher links relacionados mais úteis primeiro).
const rank = (a: Fmt, b: Fmt) => {
	const i = TOP_PAIRS.findIndex(([x, y]) => x === a && y === b);
	return i < 0 ? 100 + PAIRS.findIndex(([x, y]) => x === a && y === b) : i;
};

function pairPage(a: Fmt, b: Fmt, lang: Lang): SeoPage {
	const c = COPY[lang];
	const A = FORMATS[a].label;
	const B = FORMATS[b].label;
	const fa = c.fmt[a];
	const fb = c.fmt[b];
	const an = analyze(a, b);
	const sizeText = c.size[an.size](A, B);

	const sections = [
		{ h2: c.h2.why(A, B), body: [fa.pain, fb.gain].filter(Boolean) },
		{ h2: c.h2.changes(A, B), body: an.notes.map((k) => c.note[k](A, B)) },
		{ h2: c.h2.size(A, B), body: [sizeText, c.sizeTip(A, B)] },
		{ h2: c.h2.not(A, B), body: an.not.map((k) => c.not[k](A, B)) },
		{ h2: c.h2.about(A, B), body: [fa.about, fb.about] }
	];

	const specific: QA[] = an.faq.slice(0, 3).map((k) => c.faq[k](A, B));
	const faq: QA[] = [{ q: c.faqSize(A, B), a: sizeText }, c.faqBatch(A, B), ...specific, c.general.free, c.general.upload, c.general.phone];

	const steps = [c.steps.add(A, B), c.steps.target(A, B), ...an.opts.map((k) => c.opt[k](A, B)), c.steps.convert(A, B)];

	// Relacionados: hub, par inverso, mesma origem, mesmo destino, editor e compressão.
	const pairLink = (x: Fmt, y: Fmt) => ({ slug: pairSlug(x, y, lang), label: c.pairLabel(FORMATS[x].label, FORMATS[y].label) });
	const byRank = (list: [Fmt, Fmt][]) => list.sort((p, q) => rank(...p) - rank(...q));
	const related = [
		{ slug: hubSlug('converter', lang), label: c.hubs.converter.label },
		...(validPair(b, a) ? [pairLink(b, a)] : []),
		...byRank(PAIRS.filter(([x, y]) => x === a && y !== b && !(y === a)))
			.slice(0, 3)
			.map(([x, y]) => pairLink(x, y)),
		...byRank(PAIRS.filter(([x, y]) => y === b && x !== a && !(x === b && y === a)))
			.slice(0, 3)
			.map(([x, y]) => pairLink(x, y)),
		{ slug: hubSlug('editor', lang), label: c.hubs.editor.label },
		{ slug: hubSlug('compress', lang), label: c.hubs.compress.label }
	];

	return {
		slug: pairSlug(a, b, lang),
		lang,
		key: `${a}-${b}`,
		kind: 'pair',
		from: FORMATS[a].id,
		to: FORMATS[b].id,
		title: withBrand(c.pairTitle(A, B)),
		description: fitDescription(c.pairDesc(A, B, c.hook[an.hook](A, B)).map((d) => polish(lang, d))),
		h1: c.pairH1(A, B),
		lead: c.pairLead(A, B, fa, fb),
		sections,
		steps,
		faq,
		related: dedupe(related).slice(0, 10),
		open: { mode: 'convert', to: FORMATS[b].id }
	};
}

/** Acabamento tipográfico por idioma. Francês: elisão (l’AVIF, de l’ICO) e espaço fino inseparável antes de : ; ? ! */
export function polish(lang: Lang, text: string): string {
	if (lang !== 'fr') return text;
	return text
		.replace(/\b([Ll])e (AVIF|ICO)\b/g, '$1’$2')
		.replace(/\b([Dd])u (AVIF|ICO)\b/g, '$1e l’$2')
		.replace(/ ([:;?!])(?=\s|$)/g, '\u202f$1');
}

function polishPage(p: SeoPage): SeoPage {
	if (p.lang !== 'fr') return p;
	const f = (t: string) => polish(p.lang, t);
	return {
		...p,
		title: f(p.title),
		description: f(p.description),
		h1: f(p.h1),
		lead: f(p.lead),
		sections: p.sections.map((s) => ({ h2: f(s.h2), body: s.body.map(f) })),
		steps: p.steps.map(f),
		faq: p.faq.map((x) => ({ q: f(x.q), a: f(x.a) })),
		related: p.related.map((r) => ({ ...r, label: f(r.label) }))
	};
}

function hubPage(kind: HubKind, lang: Lang): SeoPage {
	const c = COPY[lang];
	const h = c.hubs[kind];
	const others = HUBS.filter((k) => k !== kind).map((k) => ({ slug: hubSlug(k, lang), label: c.hubs[k].label }));
	const pairs = TOP_PAIRS.slice(0, 10 - others.length).map(([a, b]) => ({ slug: pairSlug(a, b, lang), label: c.pairLabel(FORMATS[a].label, FORMATS[b].label) }));
	return {
		slug: hubSlug(kind, lang),
		lang,
		key: kind,
		kind,
		title: withBrand(h.title),
		description: h.description,
		h1: h.h1,
		lead: h.lead,
		sections: h.sections,
		steps: h.steps,
		faq: [...h.faq, ...(h.faq.length < 4 ? [c.general.free] : [])],
		related: [...others, ...pairs],
		open: HUB_OPEN[kind]
	};
}

function dedupe<T extends { slug: string }>(list: T[]): T[] {
	const seen = new Set<string>();
	return list.filter((x) => !seen.has(x.slug) && seen.add(x.slug));
}

// ---------------------------------------------------------------------------------------------
// App Motion (Lottie): visualizador, editor, criador, conversões e texto animado.

export const MOTION_KINDS: MotionKind[] = ['lottie-viewer', 'lottie-editor', 'lottie-maker', 'text-animation', 'lottie-to-gif', 'lottie-to-mp4', 'lottie-to-webm', 'json-to-lottie'];

const MOTION_SLUGS: Record<MotionKind, Record<Lang, string>> = {
	'lottie-viewer': { pt: 'visualizador-lottie', en: 'lottie-viewer', es: 'visor-lottie', fr: 'visionneuse-lottie' },
	'lottie-editor': { pt: 'editor-lottie', en: 'lottie-editor', es: 'editor-de-lottie', fr: 'editeur-lottie' },
	'lottie-maker': { pt: 'criar-animacao-lottie', en: 'lottie-animation-maker', es: 'crear-animacion-lottie', fr: 'createur-animation-lottie' },
	'text-animation': { pt: 'animar-texto', en: 'animated-text-maker', es: 'animar-texto-online', fr: 'animer-texte' },
	'lottie-to-gif': { pt: 'lottie-para-gif', en: 'lottie-to-gif', es: 'lottie-a-gif', fr: 'lottie-en-gif' },
	'lottie-to-mp4': { pt: 'lottie-para-mp4', en: 'lottie-to-mp4', es: 'lottie-a-mp4', fr: 'lottie-en-mp4' },
	'lottie-to-webm': { pt: 'lottie-para-webm', en: 'lottie-to-webm', es: 'lottie-a-webm', fr: 'lottie-en-webm' },
	'json-to-lottie': { pt: 'json-para-lottie', en: 'json-to-dotlottie', es: 'json-a-lottie', fr: 'json-en-lottie' }
};

const MOTION_OPEN: Record<MotionKind, MotionOpen> = {
	'lottie-viewer': { app: 'motion', mode: 'view' },
	'lottie-editor': { app: 'motion', mode: 'view' },
	'lottie-maker': { app: 'motion', mode: 'create' },
	'text-animation': { app: 'motion', mode: 'create' },
	'lottie-to-gif': { app: 'motion', mode: 'view', export: 'gif' },
	'lottie-to-mp4': { app: 'motion', mode: 'view', export: 'mp4' },
	'lottie-to-webm': { app: 'motion', mode: 'view', export: 'webm' },
	'json-to-lottie': { app: 'motion', mode: 'view', export: 'lottie' }
};

// Seções compartilhadas (depois das duas próprias) e perguntas compartilhadas (depois das duas próprias).
const MOTION_SECTIONS: Record<MotionKind, MotionSectionKey[]> = {
	'lottie-viewer': ['edit', 'export', 'tips'],
	'lottie-editor': ['export', 'tips', 'choose'],
	'lottie-maker': ['export', 'tips', 'choose'],
	'text-animation': ['export', 'choose', 'tips'],
	'lottie-to-gif': ['choose', 'tips', 'edit'],
	'lottie-to-mp4': ['choose', 'tips', 'edit'],
	'lottie-to-webm': ['choose', 'tips', 'export'],
	'json-to-lottie': ['choose', 'tips', 'export']
};

const MOTION_FAQ: Record<MotionKind, MotionFaqKey[]> = {
	'lottie-viewer': ['dotlottie', 'expressions', 'privacy', 'phone'],
	'lottie-editor': ['dotlottie', 'expressions', 'fonts', 'privacy'],
	'lottie-maker': ['fonts', 'webcodecs', 'free', 'privacy'],
	'text-animation': ['fonts', 'gifAlpha', 'free', 'privacy'],
	'lottie-to-gif': ['gifAlpha', 'dotlottie', 'expressions', 'privacy'],
	'lottie-to-mp4': ['webcodecs', 'dotlottie', 'fonts', 'privacy'],
	'lottie-to-webm': ['dotlottie', 'expressions', 'privacy'],
	'json-to-lottie': ['dotlottie', 'privacy', 'phone']
};

export const motionSlug = (kind: MotionKind, lang: Lang) => MOTION_SLUGS[kind][lang];

function motionPage(kind: MotionKind, lang: Lang): SeoPage {
	const m = MOTION_COPY[lang];
	const c = COPY[lang];
	const t = m.pages[kind];
	// Relacionados: demais páginas do Motion + hubs do conversor e do editor de imagens.
	const related = [
		...MOTION_KINDS.filter((k) => k !== kind).map((k) => ({ slug: motionSlug(k, lang), label: m.pages[k].label })),
		{ slug: hubSlug('converter', lang), label: c.hubs.converter.label },
		{ slug: hubSlug('editor', lang), label: c.hubs.editor.label }
	];
	return {
		slug: motionSlug(kind, lang),
		lang,
		key: kind,
		kind,
		title: withBrand(t.title),
		description: t.description,
		h1: t.h1,
		lead: t.lead,
		sections: [...t.sections, ...MOTION_SECTIONS[kind].map((k) => m.sections[k])],
		steps: t.steps,
		faq: [...t.faq, ...MOTION_FAQ[kind].map((k) => m.faq[k])],
		related,
		open: MOTION_OPEN[kind]
	};
}

export const SEO_PAGES: SeoPage[] = LANGS.flatMap((lang) => [
	...HUBS.map((k) => polishPage(hubPage(k, lang))),
	...PAIRS.map(([a, b]) => polishPage(pairPage(a, b, lang))),
	...MOTION_KINDS.map((k) => polishPage(motionPage(k, lang)))
]);

const BY_SLUG = new Map(SEO_PAGES.map((p) => [p.slug, p]));
const BY_KEY = new Map<string, SeoPage[]>();
for (const p of SEO_PAGES) BY_KEY.set(p.key, [...(BY_KEY.get(p.key) ?? []), p]);

export function pageBySlug(slug: string): SeoPage | undefined {
	return BY_SLUG.get(slug.replace(/^\/+|\/+$/g, '').toLowerCase());
}

/** A mesma página nos outros idiomas. */
export function alternatesOf(p: SeoPage): { lang: Lang; slug: string }[] {
	return (BY_KEY.get(p.key) ?? []).filter((x) => x.lang !== p.lang).map((x) => ({ lang: x.lang, slug: x.slug }));
}

/** Idioma de uma rota de SEO ("/png-to-webp" → "en"); null para o app e demais rotas. */
export function langOfPath(pathname: string): Lang | null {
	const slug = pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
	return BY_SLUG.get(slug)?.lang ?? null;
}

/** Página do mesmo tipo em outro idioma (útil para trocar de idioma na landing). */
export function pageInLang(p: SeoPage, lang: Lang): SeoPage | undefined {
	return (BY_KEY.get(p.key) ?? []).find((x) => x.lang === lang);
}

export const SEO_SLUGS: string[] = SEO_PAGES.map((p) => p.slug);
