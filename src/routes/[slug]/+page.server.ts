// Landing pages de SEO/GEO (conversor, editor, remover fundo, comprimir, redimensionar e cada par de formatos),
// pré-renderizadas em pt/en/es/fr. O load roda só no build: o catálogo de textos não vai para o cliente.
import { error } from '@sveltejs/kit';
import { SEO_SLUGS, pageBySlug, alternatesOf, motionOpen, imageOpen } from '#lib/seo/pages.ts';
import { headTags, jsonLd, serializeJsonLd } from '#lib/seo/jsonld.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => SEO_SLUGS.map((slug) => ({ slug }));

export const load: PageServerLoad = ({ params }) => {
	const page = pageBySlug(params.slug);
	if (!page) error(404, 'Not found');
	return {
		page,
		alternates: alternatesOf(page),
		head: headTags(page),
		jsonld: serializeJsonLd(jsonLd(page)),
		// Como a página abre o app (calculado aqui para o catálogo não ir ao cliente).
		motion: motionOpen(page),
		image: imageOpen(page)
	};
};
