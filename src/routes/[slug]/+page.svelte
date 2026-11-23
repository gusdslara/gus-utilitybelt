<script lang="ts">
	// Abre o app já no modo certo (conversor com o formato da página, ou editor) e coloca o texto
	// indexável dentro da área rolável do app. O idioma vem da URL, não da preferência salva.
	import Desktop from '#lib/components/Desktop.svelte';
	import ImageEditor from '#lib/components/image/ImageEditor.svelte';
	import MotionStudio from '#lib/components/motion/MotionStudio.svelte';
	import SeoHead from '#lib/components/seo/SeoHead.svelte';
	import SeoArticle from '#lib/components/seo/SeoArticle.svelte';
	import { i18n } from '#lib/i18n/index.svelte.ts';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import { untrack } from 'svelte';

	let { data } = $props();

	// Estado inicial antes do render (vale também no pré-render).
	untrack(() => {
		const p = data.page;
		i18n.pin(p.lang, Object.fromEntries([[p.lang, `/${p.slug}`], ...data.alternates.map((a) => [a.lang, `/${a.slug}`])]));
		ui.openTool = null;
		const m = data.motion;
		if (m) {
			ui.current = 'motion';
			ui.motionMode = m.mode;
			ui.motionExport = m.export ?? null;
			ui.defaults = { app: 'motion', imageMode: 'edit', convertTo: null, motionMode: m.mode };
		} else {
			const o = data.image;
			const to = o.to === 'jpeg' ? 'jpg' : (o.to ?? null);
			ui.current = 'image';
			ui.imageMode = o.mode;
			ui.convertTo = to;
			ui.defaults = { app: 'image', imageMode: o.mode, convertTo: to, motionMode: 'create' };
		}
	});
</script>

<SeoHead head={data.head} jsonld={data.jsonld} />

{#snippet article()}
	<!-- Links entre landing pages recarregam a página (cada uma tem seu idioma e estado inicial). -->
	<div class="seo-wrap" data-sveltekit-reload>
		<SeoArticle page={data.page} alternates={data.alternates} />
	</div>
{/snippet}

<Desktop ownHead>
	{#snippet imageView()}
		<ImageEditor seo={article} preset={data.image.preset} aiHint={data.image.ai === 'remove-bg'} />
	{/snippet}
	{#snippet motionView()}
		<MotionStudio seo={article} />
	{/snippet}
</Desktop>

<style>
	.seo-wrap { width: 100%; padding: 8px 16px 32px; }
</style>
