<script lang="ts">
	// App Motion: criar animações (exporta Lottie, GIF, MP4…) e abrir/editar arquivos Lottie prontos.
	import type { Snippet } from 'svelte';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import type { LottieJSON } from '#lib/motion/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Creator from './Creator.svelte';
	import Viewer from './Viewer.svelte';
	import ExportDialog from './ExportDialog.svelte';
	import { Wand2, FileJson } from '@lucide/svelte';

	let { seo }: { seo?: Snippet } = $props();
	let exporting = $state<{ json: LottieJSON; name: string } | null>(null);
	const onexport = (json: LottieJSON, name: string) => (exporting = { json, name });
</script>

<div class="motion">
	<div class="modes" role="tablist" aria-label={t('motion.modeLabel')}>
		<button role="tab" aria-selected={ui.motionMode === 'create'} onclick={() => (ui.motionMode = 'create')}><Wand2 size={15} />{t('motion.modeCreate')}</button>
		<button role="tab" aria-selected={ui.motionMode === 'view'} onclick={() => (ui.motionMode = 'view')}><FileJson size={15} />{t('motion.modeView')}</button>
		<span class="tag">{t('motion.tagline')}</span>
	</div>
	<div class="main" class:with-seo={!!seo}>
		<div class="app">
			{#if ui.motionMode === 'create'}<Creator {onexport} />{:else}<Viewer {onexport} />{/if}
		</div>
		{#if seo}<div class="seo">{@render seo()}</div>{/if}
	</div>
</div>

{#if exporting}
	<ExportDialog json={exporting.json} name={exporting.name} initial={ui.motionExport} onclose={() => (exporting = null)} />
{/if}

<style>
	.motion { height: 100%; display: flex; flex-direction: column; min-height: 0; }
	.modes { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border); background: rgb(255 255 255 / 0.02); }
	.modes button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; min-height: 34px; border: 0; border-radius: 8px; background: transparent; color: var(--text-2); font-size: 0.84rem; font-weight: 600; }
	.modes button[aria-selected='true'] { background: var(--accent); color: #fff; }
	.tag { margin-left: auto; font-size: 0.74rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.main { flex: 1; min-height: 0; }
	.app { height: 100%; min-height: 0; }
	/* Páginas de SEO: app com altura da janela e o texto indexável rolando abaixo. */
	.main.with-seo { overflow: auto; }
	.main.with-seo .app { height: 100%; min-height: 560px; }
	.seo { padding: 8px 16px 32px; border-top: 1px solid var(--border); }
	@media (max-width: 640px) { .tag { display: none; } }
</style>
