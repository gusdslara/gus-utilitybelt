<script lang="ts">
	// Conteúdo visível das landing pages de SEO: texto real, indexável, abaixo do app.
	// HTML semântico (article, ol, details/summary, nav) e largura de leitura confortável.
	import { ShieldCheck, ChevronDown } from '@lucide/svelte';
	import type { Lang, SeoPage } from '#lib/seo/pages.ts';

	// Só tipos daqui: o catálogo fica no servidor (load) e não vai para o bundle do cliente.
	const LANG_TAG: Record<Lang, string> = { pt: 'pt-BR', en: 'en', es: 'es', fr: 'fr' };

	let { page, alternates }: { page: SeoPage; alternates: { lang: Lang; slug: string }[] } = $props();

	const UI: Record<Lang, { steps: string; faq: string; related: string; also: string; trust: string }> = {
		pt: {
			steps: 'Como usar',
			faq: 'Perguntas frequentes',
			related: 'Veja também',
			also: 'Também em:',
			trust: 'Processado no seu aparelho: nenhum arquivo é enviado. Grátis, sem cadastro e sem marca d’água.'
		},
		en: {
			steps: 'How to use it',
			faq: 'Frequently asked questions',
			related: 'Related tools',
			also: 'Also in:',
			trust: 'Processed on your device: no file is ever uploaded. Free, no sign-up, no watermark.'
		},
		es: {
			steps: 'Cómo usarlo',
			faq: 'Preguntas frecuentes',
			related: 'Ver también',
			also: 'También en:',
			trust: 'Se procesa en tu dispositivo: ningún archivo se sube. Gratis, sin registro y sin marca de agua.'
		},
		fr: {
			steps: 'Mode d’emploi',
			faq: 'Questions fréquentes',
			related: 'Voir aussi',
			also: 'Aussi en :',
			trust: 'Traité sur votre appareil : aucun fichier n’est envoyé. Gratuit, sans inscription ni filigrane.'
		}
	};
	const LANG_NAME: Record<Lang, string> = { pt: 'Português', en: 'English', es: 'Español', fr: 'Français' };

	const ui = $derived(UI[page.lang]);
	const alts = $derived(alternates);
</script>

<article class="seo" lang={LANG_TAG[page.lang]}>
	<header>
		<h1>{page.h1}</h1>
		<p class="lead">{page.lead}</p>
		<p class="trust"><ShieldCheck size={16} strokeWidth={2} aria-hidden="true" /> <span>{ui.trust}</span></p>
	</header>

	<section aria-labelledby="seo-steps">
		<h2 id="seo-steps">{ui.steps}</h2>
		<ol class="steps">
			{#each page.steps as step, i (i)}
				<li>{step}</li>
			{/each}
		</ol>
	</section>

	{#each page.sections as s, i (i)}
		<section>
			<h2>{s.h2}</h2>
			{#each s.body as para, j (j)}
				<p>{para}</p>
			{/each}
		</section>
	{/each}

	<section aria-labelledby="seo-faq">
		<h2 id="seo-faq">{ui.faq}</h2>
		<div class="faq">
			{#each page.faq as f, i (i)}
				<details>
					<summary><span>{f.q}</span> <ChevronDown class="chev" size={16} strokeWidth={2} aria-hidden="true" /></summary>
					<p>{f.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<nav aria-labelledby="seo-related" class="related">
		<h2 id="seo-related">{ui.related}</h2>
		<ul>
			{#each page.related as r (r.slug)}
				<li><a href="/{r.slug}">{r.label}</a></li>
			{/each}
		</ul>
	</nav>

	{#if alts.length}
		<p class="langs">
			{ui.also}
			{#each alts as a, i (a.slug)}
				{#if i > 0}<span aria-hidden="true"> · </span>{/if}<a href="/{a.slug}" hreflang={LANG_TAG[a.lang]} lang={LANG_TAG[a.lang]}>{LANG_NAME[a.lang]}</a>
			{/each}
		</p>
	{/if}
</article>

<style>
	.seo {
		max-width: 72ch;
		margin: 0 auto;
		padding: var(--space-8) var(--space-4) calc(var(--space-8) * 2);
		color: var(--text-2);
		line-height: 1.65;
		font-size: 15px;
	}
	h1 {
		color: var(--text);
		font-size: clamp(1.45rem, 1.1rem + 1.6vw, 2rem);
		line-height: 1.2;
		letter-spacing: -0.01em;
		margin: 0 0 var(--space-3);
		text-wrap: balance;
	}
	h2 {
		color: var(--text);
		font-size: 1.15rem;
		line-height: 1.3;
		margin: var(--space-8) 0 var(--space-3);
		text-wrap: balance;
	}
	p {
		margin: 0 0 var(--space-3);
	}
	.lead {
		font-size: 1.05rem;
		color: var(--text);
		opacity: 0.92;
	}
	.trust {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		font-size: 0.875rem;
		color: var(--text-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}
	.trust :global(svg) {
		flex: none;
		margin-top: 3px;
		color: var(--ok);
	}
	.steps {
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
		display: grid;
		gap: var(--space-2);
	}
	.steps li {
		counter-increment: step;
		position: relative;
		padding: var(--space-2) var(--space-3) var(--space-2) calc(var(--space-8) + var(--space-2));
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-solid);
	}
	.steps li::before {
		content: counter(step);
		position: absolute;
		left: var(--space-3);
		top: var(--space-2);
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--text);
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1;
		margin-top: 1px;
	}
	.faq {
		display: grid;
		gap: var(--space-2);
	}
	details {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-solid);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 44px;
		padding: var(--space-2) var(--space-3);
		color: var(--text);
		font-weight: 500;
		cursor: pointer;
		list-style: none;
		border-radius: var(--radius-sm);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		background: var(--surface-2);
	}
	summary :global(.chev) {
		flex: none;
		color: var(--text-3);
		transition: transform 0.2s var(--ease);
	}
	details[open] summary :global(.chev) {
		transform: rotate(180deg);
	}
	details p {
		padding: 0 var(--space-3) var(--space-3);
		margin: 0;
	}
	.related ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.related a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text);
		text-decoration: none;
		font-size: 0.9rem;
		background: var(--surface-solid);
		transition: border-color 0.15s var(--ease), background 0.15s var(--ease);
	}
	.related a:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.langs {
		margin-top: var(--space-6);
		font-size: 0.875rem;
		color: var(--text-3);
	}
	.langs a {
		color: var(--text-2);
		text-underline-offset: 3px;
	}
	.langs a:hover {
		color: var(--text);
	}
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		summary :global(.chev),
		.related a {
			transition: none;
		}
	}
</style>
