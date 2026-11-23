// robots.txt: tudo liberado, com o endereço absoluto do sitemap.
import { abs } from '#lib/seo/site.ts';

export const prerender = true;

export function GET() {
	const body = `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`;
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
