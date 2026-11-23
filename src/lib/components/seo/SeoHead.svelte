<script lang="ts">
	// Cabeçalho de SEO das landing pages: title, description, canonical, hreflang, OG/Twitter e JSON-LD.
	// Recebe tudo pronto do load do servidor (o catálogo não vai para o bundle do cliente).
	import type { HeadTags } from '#lib/seo/jsonld.ts';

	let { head, jsonld }: { head: HeadTags; jsonld: string } = $props();

	// "<" já sai escapado no JSON; a tag é montada em partes para não fechar este <script>.
	const ld = $derived(`<script type="application/ld+json">${jsonld}</` + `script>`);
</script>

<svelte:head>
	<title>{head.title}</title>
	<meta name="description" content={head.description} />
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<link rel="canonical" href={head.canonical} />
	{#each head.alternates as alt (alt.hreflang)}
		<link rel="alternate" hreflang={alt.hreflang} href={alt.href} />
	{/each}
	{#each head.meta as m, i (i)}
		{#if m.property}
			<meta property={m.property} content={m.content} />
		{:else}
			<meta name={m.name} content={m.content} />
		{/if}
	{/each}
	{@html ld}
</svelte:head>
