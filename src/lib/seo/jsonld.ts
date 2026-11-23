// Dados estruturados (schema.org) e metatags de cabeçalho das landing pages de SEO.
import { alternatesOf, COPY, hubSlug, isMotionPage, MOTION_COPY, motionSlug, type Lang, type SeoPage } from './pages.ts';
import { abs, SITE_NAME } from './site.ts';

export const LANG_TAG: Record<Lang, string> = { pt: 'pt-BR', en: 'en', es: 'es', fr: 'fr' };
export const OG_LOCALE: Record<Lang, string> = { pt: 'pt_BR', en: 'en_US', es: 'es_ES', fr: 'fr_FR' };

const HOME_LABEL: Record<Lang, string> = { pt: 'Início', en: 'Home', es: 'Inicio', fr: 'Accueil' };

// Lista de recursos (featureList) por idioma: fatos do produto, iguais em todas as páginas.
const FEATURES: Record<Lang, string[]> = {
	pt: [
		'Roda 100% no navegador, sem upload',
		'Conversão em lote com Web Workers',
		'Entrada: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, SVG, HEIC, TIFF, PSD',
		'Saída: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, TIFF, PDF, SVG vetorial, PSD',
		'Qualidade, tamanho alvo em KB e redimensionamento',
		'Remove metadados EXIF/GPS',
		'Editor com camadas, filtros e remoção de fundo com IA local'
	],
	en: [
		'Runs 100% in the browser, no upload',
		'Batch conversion with Web Workers',
		'Input: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, SVG, HEIC, TIFF, PSD',
		'Output: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, TIFF, PDF, vector SVG, PSD',
		'Quality, target size in KB and resizing',
		'Strips EXIF/GPS metadata',
		'Editor with layers, filters and on-device AI background removal'
	],
	es: [
		'Funciona 100 % en el navegador, sin subir archivos',
		'Conversión por lotes con Web Workers',
		'Entrada: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, SVG, HEIC, TIFF, PSD',
		'Salida: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, TIFF, PDF, SVG vectorial, PSD',
		'Calidad, tamaño objetivo en KB y redimensionado',
		'Elimina metadatos EXIF/GPS',
		'Editor con capas, filtros y eliminación de fondo con IA local'
	],
	fr: [
		'Fonctionne à 100 % dans le navigateur, sans envoi',
		'Conversion par lots avec Web Workers',
		'Entrée : JPG, PNG, WebP, AVIF, GIF, BMP, ICO, SVG, HEIC, TIFF, PSD',
		'Sortie : JPG, PNG, WebP, AVIF, GIF, BMP, ICO, TIFF, PDF, SVG vectoriel, PSD',
		'Qualité, taille cible en Ko et redimensionnement',
		'Supprime les métadonnées EXIF/GPS',
		'Éditeur avec calques, filtres et détourage par IA locale'
	]
};

// featureList das páginas do app Motion (Lottie): recursos de animação, não de imagem.
const MOTION_FEATURES: Record<Lang, string[]> = {
	pt: [
		'Roda 100% no navegador, sem upload',
		'Abre Lottie JSON (Bodymovin) e dotLottie (.lottie)',
		'Player com quadro a quadro, velocidade, loop e fundo transparente ou colorido',
		'Editor: cores globais pela paleta, textos, camadas e precomps, velocidade, fps, corte e tamanho da tela',
		'Criador com linha do tempo, keyframes e easing (back, elástico, bounce, hold)',
		'Camadas de forma, texto animado por letra e imagem; mais de 30 presets e modelos prontos',
		'Exporta Lottie JSON, dotLottie, GIF transparente, MP4 (H.264), WebM, sequência PNG e quadro PNG/SVG'
	],
	en: [
		'Runs 100% in the browser, no upload',
		'Opens Lottie JSON (Bodymovin) and dotLottie (.lottie)',
		'Player with frame-by-frame scrubbing, speed, loop and transparent or colored background',
		'Editor: global colors from the palette, texts, layers and precomps, speed, fps, trim and canvas size',
		'Creator with timeline, keyframes and easing (back, elastic, bounce, hold)',
		'Shape, per-character animated text and image layers; 30+ presets and starter templates',
		'Exports Lottie JSON, dotLottie, transparent GIF, MP4 (H.264), WebM, PNG sequence and PNG/SVG frame'
	],
	es: [
		'Funciona 100 % en el navegador, sin subir archivos',
		'Abre Lottie JSON (Bodymovin) y dotLottie (.lottie)',
		'Reproductor fotograma a fotograma, velocidad, bucle y fondo transparente o de color',
		'Editor: colores globales desde la paleta, textos, capas y precomposiciones, velocidad, fps, recorte y lienzo',
		'Creador con línea de tiempo, keyframes y easing (back, elástico, rebote, hold)',
		'Capas de forma, texto animado letra a letra e imagen; más de 30 presets y plantillas',
		'Exporta Lottie JSON, dotLottie, GIF transparente, MP4 (H.264), WebM, secuencia PNG y fotograma PNG/SVG'
	],
	fr: [
		'Fonctionne à 100 % dans le navigateur, sans envoi',
		'Ouvre les Lottie JSON (Bodymovin) et dotLottie (.lottie)',
		'Lecteur image par image, vitesse, boucle et fond transparent ou coloré',
		'Éditeur : couleurs globales via la palette, textes, calques et précompositions, vitesse, fps, découpe et canevas',
		'Créateur avec timeline, keyframes et easing (back, élastique, rebond, hold)',
		'Calques de forme, texte animé lettre par lettre et image ; plus de 30 presets et modèles',
		'Exporte en Lottie JSON, dotLottie, GIF transparent, MP4 (H.264), WebM, séquence PNG et image PNG/SVG'
	]
};

const url = (p: SeoPage) => abs('/' + p.slug);

/** Página "mãe" no breadcrumb: o hub do conversor para pares, o visualizador de Lottie para o Motion. */
function parentOf(p: SeoPage): { slug: string; label: string } | null {
	if (p.kind === 'pair') return { slug: hubSlug('converter', p.lang), label: COPY[p.lang].hubs.converter.label };
	if (isMotionPage(p) && p.kind !== 'lottie-viewer') return { slug: motionSlug('lottie-viewer', p.lang), label: MOTION_COPY[p.lang].pages['lottie-viewer'].label };
	return null;
}

export function jsonLd(p: SeoPage): object[] {
	const inLanguage = LANG_TAG[p.lang];
	const hub = parentOf(p);
	const crumbs = [{ name: HOME_LABEL[p.lang], item: abs('/') }, ...(hub ? [{ name: hub.label, item: abs('/' + hub.slug) }] : []), { name: p.h1, item: url(p) }];
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: p.h1,
			alternateName: SITE_NAME,
			url: url(p),
			description: p.description,
			applicationCategory: 'MultimediaApplication',
			operatingSystem: 'Any (web browser)',
			browserRequirements: 'Requires JavaScript and a modern browser (Chrome, Edge, Firefox, Safari).',
			inLanguage,
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			featureList: isMotionPage(p) ? MOTION_FEATURES[p.lang] : FEATURES[p.lang]
		},
		{
			'@context': 'https://schema.org',
			'@type': 'HowTo',
			name: p.h1,
			inLanguage,
			totalTime: 'PT1M',
			step: p.steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text }))
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			inLanguage,
			mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }))
		}
	];
}

/** Serializa JSON-LD para <script> sem permitir fechar a tag (escapa "<"). */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export type HeadTags = {
	title: string;
	description: string;
	canonical: string;
	lang: string;
	alternates: { hreflang: string; href: string }[];
	meta: { property?: string; name?: string; content: string }[];
};

export function headTags(p: SeoPage): HeadTags {
	const alts = alternatesOf(p);
	const all = [{ lang: p.lang, slug: p.slug }, ...alts].sort((a, b) => a.lang.localeCompare(b.lang));
	const en = all.find((a) => a.lang === 'en') ?? all[0];
	return {
		title: p.title,
		description: p.description,
		canonical: url(p),
		lang: LANG_TAG[p.lang],
		alternates: [
			...all.map((a) => ({ hreflang: LANG_TAG[a.lang], href: abs('/' + a.slug) })),
			{ hreflang: 'x-default', href: abs('/' + en.slug) }
		],
		meta: [
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: SITE_NAME },
			{ property: 'og:title', content: p.title },
			{ property: 'og:description', content: p.description },
			{ property: 'og:url', content: url(p) },
			{ property: 'og:locale', content: OG_LOCALE[p.lang] },
			...alts.map((a) => ({ property: 'og:locale:alternate', content: OG_LOCALE[a.lang] })),
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:title', content: p.title },
			{ name: 'twitter:description', content: p.description }
		]
	};
}
