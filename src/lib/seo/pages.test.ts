/// <reference types="bun" />
// bun test — catálogo de landing pages de SEO: slugs, idiomas, tamanhos de title/description,
// links relacionados, FAQ/passos, unicidade do conteúdo e páginas do app Motion (Lottie).
import { describe, expect, test } from 'bun:test';
import { SEO_PAGES, RESERVED_SLUGS, LANGS, MOTION_KINDS, pageBySlug, alternatesOf, langOfPath, polish, imageOpen, motionOpen, isMotionPage } from './pages.ts';
import { FORMATS, PAIRS, type Fmt } from './formats.ts';
import { headTags, jsonLd, serializeJsonLd } from './jsonld.ts';
import { llmsImageSection, llmsMotionSection } from './llms.ts';

const label = (id: string) => Object.values(FORMATS).find((f) => f.id === id)!.label;

describe('slugs', () => {
	test('únicos, minúsculos, ascii com hífens', () => {
		const slugs = SEO_PAGES.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	test('sem colisão com rotas existentes', () => {
		for (const r of RESERVED_SLUGS) expect(pageBySlug(r)).toBeUndefined();
	});

	test('pageBySlug e langOfPath', () => {
		expect(pageBySlug('png-to-webp')?.lang).toBe('en');
		expect(pageBySlug('/png-para-webp')?.kind).toBe('pair');
		expect(langOfPath('/heic-en-jpg')).toBe('fr');
		expect(langOfPath('/conversor-de-imagens')).toBe('pt');
		expect(langOfPath('/')).toBeNull();
		expect(langOfPath('/run')).toBeNull();
	});

	test('jpeg vira "jpg" no slug, com from/to nos ids do conversor', () => {
		const p = pageBySlug('jpg-a-png')!;
		expect(p.from).toBe('jpeg');
		expect(p.to).toBe('png');
		expect(p.open).toEqual({ mode: 'convert', to: 'png' });
	});
});

describe('idiomas', () => {
	test('toda chave existe nos 4 idiomas', () => {
		const byKey = new Map<string, Set<string>>();
		for (const p of SEO_PAGES) byKey.set(p.key, (byKey.get(p.key) ?? new Set()).add(p.lang));
		for (const [, langs] of byKey) expect([...langs].sort()).toEqual([...LANGS].sort());
		for (const p of SEO_PAGES) expect(alternatesOf(p)).toHaveLength(3);
	});
});

describe('conteúdo', () => {
	test('title ≤ 60 e description entre 140 e 160', () => {
		const bad = SEO_PAGES.filter((p) => p.title.length > 60 || p.description.length < 140 || p.description.length > 160).map((p) => `${p.slug} (${p.title.length}/${p.description.length})`);
		expect(bad).toEqual([]);
	});

	test('descriptions e titles únicos', () => {
		const dupD = SEO_PAGES.length - new Set(SEO_PAGES.map((p) => p.description)).size;
		const dupT = SEO_PAGES.length - new Set(SEO_PAGES.map((p) => p.title)).size;
		expect(dupD).toBe(0);
		expect(dupT).toBe(0);
	});

	test('≥ 3 FAQ, ≥ 3 passos e seções com texto', () => {
		for (const p of SEO_PAGES) {
			expect(p.faq.length).toBeGreaterThanOrEqual(3);
			expect(p.steps.length).toBeGreaterThanOrEqual(3);
			expect(p.sections.length).toBeGreaterThanOrEqual(2);
			for (const s of p.sections) expect(s.body.length).toBeGreaterThan(0);
		}
	});

	test('links relacionados existem, no mesmo idioma, entre 6 e 10', () => {
		for (const p of SEO_PAGES) {
			expect(p.related.length).toBeGreaterThanOrEqual(6);
			expect(p.related.length).toBeLessThanOrEqual(10);
			for (const r of p.related) {
				const target = pageBySlug(r.slug);
				expect(target).toBeDefined();
				expect(target!.lang).toBe(p.lang);
				expect(r.slug).not.toBe(p.slug);
			}
		}
	});

	test('páginas de par citam os dois formatos em title, description, h1 e texto', () => {
		for (const p of SEO_PAGES.filter((x) => x.kind === 'pair')) {
			const A = label(p.from!);
			const B = label(p.to!);
			for (const t of [p.title, p.description, p.h1]) {
				expect(t).toContain(A);
				expect(t).toContain(B);
			}
			const body = p.sections.flatMap((s) => s.body).join(' ');
			expect(body).toContain(A);
			expect(body).toContain(B);
		}
	});

	test('pares: sem idênticos, SVG só de raster, ICO só para PNG/JPG/WebP', () => {
		for (const [a, b] of PAIRS) {
			expect(a).not.toBe(b);
			if (b === 'svg') expect(FORMATS[a].vector).toBe(false);
			if (a === 'ico') expect(['png', 'jpg', 'webp'] as Fmt[]).toContain(b);
		}
	});

	test('texto específico por par: corpo das páginas não se repete', () => {
		const bodies = SEO_PAGES.map((p) => p.sections.flatMap((s) => s.body).join('\n'));
		expect(new Set(bodies).size).toBe(bodies.length);
	});

	test('francês: elisão e espaço fino antes de pontuação dupla', () => {
		expect(polish('fr', 'le AVIF ?')).toBe('l’AVIF ?');
		const fr = pageBySlug('avif-en-png')!;
		expect(JSON.stringify(fr)).not.toMatch(/\b[Ll]e (AVIF|ICO)\b/);
	});
});

describe('head e JSON-LD', () => {
	test('hreflang com os 4 idiomas + x-default para a versão em inglês', () => {
		const h = headTags(pageBySlug('png-para-webp')!);
		expect(h.alternates.map((a) => a.hreflang).sort()).toEqual(['en', 'es', 'fr', 'pt-BR', 'x-default']);
		expect(h.alternates.find((a) => a.hreflang === 'x-default')!.href).toEndWith('/png-to-webp');
		expect(h.canonical).toEndWith('/png-para-webp');
	});

	test('JSON-LD com os 4 tipos e serialização segura', () => {
		const ld = jsonLd(pageBySlug('image-converter')!) as { '@type': string }[];
		expect(ld.map((x) => x['@type'])).toEqual(['WebApplication', 'HowTo', 'FAQPage', 'BreadcrumbList']);
		expect(serializeJsonLd({ a: '</script><b>' })).not.toContain('<');
	});

	test('llms.txt: hubs e pares nos 4 idiomas', () => {
		const md = llmsImageSection();
		for (const s of ['image-converter', 'conversor-de-imagens', 'heic-a-jpg', 'heic-en-jpg', 'remove-image-background']) expect(md).toContain('/' + s + ')');
	});
});

describe('Motion (Lottie)', () => {
	const motion = SEO_PAGES.filter(isMotionPage);

	test('8 tipos × 4 idiomas, com os slugs combinados', () => {
		expect(motion).toHaveLength(MOTION_KINDS.length * LANGS.length);
		const slugs = [
			'visualizador-lottie', 'lottie-viewer', 'visor-lottie', 'visionneuse-lottie',
			'editor-lottie', 'lottie-editor', 'editor-de-lottie', 'editeur-lottie',
			'criar-animacao-lottie', 'lottie-animation-maker', 'crear-animacion-lottie', 'createur-animation-lottie',
			'lottie-para-gif', 'lottie-to-gif', 'lottie-a-gif', 'lottie-en-gif',
			'lottie-para-mp4', 'lottie-to-mp4', 'lottie-a-mp4', 'lottie-en-mp4',
			'lottie-para-webm', 'lottie-to-webm', 'lottie-a-webm', 'lottie-en-webm',
			'json-para-lottie', 'json-to-dotlottie', 'json-a-lottie', 'json-en-lottie',
			'animar-texto', 'animated-text-maker', 'animar-texto-online', 'animer-texte'
		];
		for (const s of slugs) expect(isMotionPage(pageBySlug(s)!)).toBe(true);
		expect(langOfPath('/visionneuse-lottie')).toBe('fr');
		expect(pageBySlug('lottie-a-gif')!.lang).toBe('es');
	});

	test('abertura do app: modo e exportação pré-selecionada', () => {
		expect(pageBySlug('lottie-viewer')!.open).toEqual({ app: 'motion', mode: 'view' });
		expect(pageBySlug('editor-lottie')!.open).toEqual({ app: 'motion', mode: 'view' });
		expect(pageBySlug('crear-animacion-lottie')!.open).toEqual({ app: 'motion', mode: 'create' });
		expect(pageBySlug('animer-texte')!.open).toEqual({ app: 'motion', mode: 'create' });
		expect(pageBySlug('lottie-para-gif')!.open).toEqual({ app: 'motion', mode: 'view', export: 'gif' });
		expect(pageBySlug('lottie-to-mp4')!.open).toEqual({ app: 'motion', mode: 'view', export: 'mp4' });
		expect(pageBySlug('lottie-a-webm')!.open).toEqual({ app: 'motion', mode: 'view', export: 'webm' });
		expect(pageBySlug('json-to-dotlottie')!.open).toEqual({ app: 'motion', mode: 'view', export: 'lottie' });
	});

	test('páginas de imagem continuam sem app (padrão = image); helpers separam os dois apps', () => {
		for (const p of SEO_PAGES.filter((x) => !isMotionPage(x))) {
			expect(p.open.app).toBeUndefined();
			expect(motionOpen(p)).toBeNull();
			expect(imageOpen(p) === p.open).toBe(true);
		}
		const m = pageBySlug('lottie-to-gif')!;
		expect(motionOpen(m)).toEqual({ app: 'motion', mode: 'view', export: 'gif' });
		expect(imageOpen(m).mode).toBe('edit');
	});

	test('4–5 seções, 4–5 passos, 5–6 perguntas e links para Motion + conversor + editor', () => {
		for (const p of motion) {
			expect(p.sections.length).toBeGreaterThanOrEqual(4);
			expect(p.sections.length).toBeLessThanOrEqual(5);
			expect(p.steps.length).toBeGreaterThanOrEqual(4);
			expect(p.steps.length).toBeLessThanOrEqual(5);
			expect(p.faq.length).toBeGreaterThanOrEqual(5);
			expect(p.faq.length).toBeLessThanOrEqual(6);
			const kinds = p.related.map((r) => pageBySlug(r.slug)!.kind);
			expect(kinds).toContain('converter');
			expect(kinds).toContain('editor');
			expect(kinds.filter((k) => (MOTION_KINDS as string[]).includes(k))).toHaveLength(MOTION_KINDS.length - 1);
			expect(new Set(p.faq.map((f) => f.q)).size).toBe(p.faq.length);
		}
	});

	test('todas citam Lottie no title, description e h1', () => {
		for (const p of motion) {
			// "texto animado" também é Lottie, mas o título fala de texto: basta a description
			if (p.kind !== 'text-animation') for (const t of [p.title, p.h1]) expect(t).toMatch(/Lottie/);
			expect(p.description).toMatch(/Lottie/);
		}
	});

	test('francês: espaço fino antes de : ; ? ! também no Motion', () => {
		const fr = motion.filter((p) => p.lang === 'fr');
		for (const p of fr) expect(JSON.stringify(p)).not.toMatch(/ [:;?!](\s|"|$)/);
	});

	test('JSON-LD: featureList do Motion e breadcrumb pelo visualizador', () => {
		const ld = jsonLd(pageBySlug('lottie-to-gif')!) as { '@type': string; featureList?: string[]; itemListElement?: { item: string }[] }[];
		const app = ld.find((x) => x['@type'] === 'WebApplication')!;
		expect(app.featureList!.join(' ')).toContain('dotLottie');
		expect(app.featureList!.join(' ')).not.toContain('HEIC');
		const crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList')!.itemListElement!;
		expect(crumbs).toHaveLength(3);
		expect(crumbs[1].item).toEndWith('/lottie-viewer');
		const img = jsonLd(pageBySlug('image-converter')!) as { '@type': string; featureList?: string[] }[];
		expect(img[0].featureList!.join(' ')).toContain('HEIC');
		expect(() => JSON.parse(serializeJsonLd(ld))).not.toThrow();
	});

	test('hreflang entre os 4 idiomas', () => {
		const h = headTags(pageBySlug('editor-de-lottie')!);
		expect(h.alternates.find((a) => a.hreflang === 'x-default')!.href).toEndWith('/lottie-editor');
		expect(h.alternates.find((a) => a.hreflang === 'fr')!.href).toEndWith('/editeur-lottie');
	});

	test('llms.txt: seção Motion com URLs nos 4 idiomas', () => {
		const md = llmsMotionSection();
		expect(md).toContain('WebCodecs');
		for (const s of ['lottie-viewer', 'visualizador-lottie', 'lottie-a-mp4', 'json-en-lottie', 'animated-text-maker']) expect(md).toContain('/' + s + ')');
	});
});
