// Endereço público do site, usado em canonical, hreflang, sitemap, robots e JSON-LD.
// Domínio padrão provisório: o dono confirma o definitivo (ou define PUBLIC_SITE_URL no build).
export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '') || 'https://utilitybelt.gustavolara.pro';

export const SITE_NAME = 'Gus Utility Belt';

/** URL absoluta a partir de um caminho ("/png-to-webp" ou "png-to-webp"). */
export function abs(path = '/'): string {
	if (/^https?:\/\//.test(path)) return path;
	if (path === '' || path === '/') return SITE_URL + '/';
	return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
