// Sitemap com todas as landing pages de SEO + a raiz, com alternativas hreflang por idioma.
import { SEO_PAGES, alternatesOf } from '#lib/seo/pages.ts';
import { LANG_TAG } from '#lib/seo/jsonld.ts';
import { abs } from '#lib/seo/site.ts';

export const prerender = true;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sitemapXml(lastmod = new Date().toISOString().slice(0, 10)): string {
	const urls = SEO_PAGES.map((p) => {
		const all = [{ lang: p.lang, slug: p.slug }, ...alternatesOf(p)];
		const en = all.find((a) => a.lang === 'en') ?? all[0];
		const links = [
			...all.map((a) => `    <xhtml:link rel="alternate" hreflang="${LANG_TAG[a.lang]}" href="${esc(abs('/' + a.slug))}"/>`),
			`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs('/' + en.slug))}"/>`
		].join('\n');
		return `  <url>\n    <loc>${esc(abs('/' + p.slug))}</loc>\n    <lastmod>${lastmod}</lastmod>\n${links}\n  </url>`;
	});
	const home = `  <url>\n    <loc>${esc(abs('/'))}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[home, ...urls].join('\n')}\n</urlset>\n`;
}

export function GET() {
	return new Response(sitemapXml(), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
