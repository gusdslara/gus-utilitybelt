// Ajusta <html lang> no HTML pré-renderizado das landing pages de SEO conforme o idioma da rota.
// O app.html traz literalmente <html lang="pt-BR">; demais rotas ficam como estão.
import type { Handle } from '@sveltejs/kit/hooks';
import { langOfPath } from '#lib/seo/pages.ts';
import { LANG_TAG } from '#lib/seo/jsonld.ts';

const DEFAULT_HTML = '<html lang="pt-BR">';

export const handle: Handle = async ({ event, resolve }) => {
	const lang = langOfPath(event.url.pathname);
	if (!lang || lang === 'pt') return resolve(event);
	const tag = `<html lang="${LANG_TAG[lang]}">`;
	return resolve(event, {
		transformPageChunk: ({ html }) => (html.includes(DEFAULT_HTML) ? html.replace(DEFAULT_HTML, tag) : html)
	});
};
