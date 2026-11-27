<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { animate } from 'motion';
	import { replaceState } from '$app/navigation';
	import { categories, categoryLabel, toolTitle, toolDescription } from '#lib/tools/registry.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Dock from '#lib/components/Dock.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import ToolView from '#lib/components/ToolView.svelte';
	import ClipboardView from '#lib/components/ClipboardView.svelte';
	import ApiConsole from '#lib/components/ApiConsole.svelte';
	import { clipboard } from '#lib/clipboard/history.svelte.ts';
	import { ui, type AppId } from '#lib/ai/ui.svelte.ts';
	import { ChevronDown, PanelLeftOpen } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { abs } from '#lib/seo/site.ts';

	// Desktop do app (dock + janela). As rotas de SEO passam `imageView` (app Imagem renderizado no
	// servidor, para o conteúdo indexável sair no HTML) e `ownHead` (título/meta próprios).
	let { imageView, motionView, ownHead = false }: { imageView?: Snippet; motionView?: Snippet; ownHead?: boolean } = $props();

	let windowEl: HTMLElement | undefined = $state();
	let urlReady = $state(false);

	const cat = $derived(categories.find((c) => c.id === ui.current) ?? null);
	const title = $derived(ui.current === 'editor' ? t('app.dock.editor') : ui.current === 'image' ? t('app.dock.image') : ui.current === 'motion' ? t('app.dock.motion') : ui.current === 'pdf' ? t('app.dock.pdf') : ui.current === 'clipboard' ? t('app.dock.clipboard') : ui.current === 'api' ? t('app.dock.api') : cat ? categoryLabel(cat.id) : '');

	onMount(() => {
		// Link direto: /?app=dev&tool=uuid (ou só ?tool=uuid)
		ui.fromUrl(new URL(location.href));
		urlReady = true;
		clipboard.load();
		return clipboard.listen();
	});

	// Mantém a URL em sincronia: qualquer tela pode ser compartilhada ou aberta por uma IA.
	$effect(() => {
		const search = ui.toSearch();
		if (!urlReady) return;
		untrack(() => {
			if (location.search !== search) replaceState(location.pathname + search, {});
		});
	});

	// Dock: o item API e IA abre direto no modo automação (igual a ?app=api&automation=1).
	function selectApp(id: AppId) {
		ui.select(id);
		ui.automation = id === 'api';
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && ui.chromeless && !e.defaultPrevented) ui.automation = false;
	}

	// Etiqueta cada cópia com a ferramenta de onde veio.
	$effect(() => {
		const tool = cat?.tools.find((id) => id === ui.openTool);
		clipboard.source = tool ? toolTitle(tool) : title;
	});

	// Entrada suave da janela ao trocar de app (Motion, só transform/opacity).
	$effect(() => {
		void ui.current;
		const el = windowEl;
		if (!el) return;
		untrack(() => {
			const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (reduce) return;
			animate(el, { opacity: [0.2, 1], transform: ['translateY(10px) scale(0.985)', 'translateY(0) scale(1)'] }, { duration: 0.38, ease: [0.2, 0.8, 0.2, 1] });
		});
	});
</script>

<svelte:head>
	{#if !ownHead}
		<title>{t('app.meta.title')}</title>
		<meta name="description" content={t('app.meta.description')} />
		<link rel="canonical" href={abs('/')} />
	{/if}
	<meta name="theme-color" content="#0b0d12" />
</svelte:head>

<svelte:window onkeydown={onKey} />

<main class="desktop" class:automation={ui.chromeless} aria-label="Gus Utility Belt">
	<div class="wallpaper" aria-hidden="true"></div>

	<section class="window" bind:this={windowEl} aria-label={title}>
		{#if cat}
			<header class="titlebar">
				<h1 id="win-title" class="title">{title}</h1>
				<span class="sub">{t('app.toolsCount', { count: cat.tools.length })}</span>
			</header>
		{/if}

		<div class="content">
			{#if ui.current === 'editor'}
				<Editor />
			{:else if ui.current === 'motion'}
				{#if motionView}
					{@render motionView()}
				{:else}
					{#await import('#lib/components/motion/MotionStudio.svelte') then m}
						<m.default />
					{/await}
				{/if}
			{:else if ui.current === 'pdf'}
				{#await import('#lib/components/pdf/PdfStudio.svelte') then m}
					<m.default />
				{/await}
			{:else if ui.current === 'image'}
				{#if imageView}
					{@render imageView()}
				{:else}
					<!-- Carregado sob demanda: o editor de imagens não pesa nos outros apps. -->
					{#await import('#lib/components/image/ImageEditor.svelte') then m}
						<m.default />
					{/await}
				{/if}
			{:else if ui.current === 'clipboard'}
				<ClipboardView />
			{:else if ui.current === 'api'}
				<ApiConsole />
			{:else if cat}
				<div class="accordion">
					{#each cat.tools as id (id)}
						{@const isOpen = ui.openTool === id}
						<div class="item" class:open={isOpen} data-tool={id}>
							<h2 class="head">
								<button class="trigger" aria-expanded={isOpen} aria-controls={`panel-${id}`} id={`btn-${id}`} onclick={() => ui.toggle(id)}>
									<span class="txt">
										<strong>{toolTitle(id)}</strong>
										<span class="desc">{toolDescription(id)}</span>
									</span>
									<span class="chev" class:rot={isOpen}><ChevronDown size={18} /></span>
								</button>
							</h2>
							{#if isOpen}
								<div class="panel" id={`panel-${id}`} role="region" aria-labelledby={`btn-${id}`}>
									<ToolView {id} />
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	{#if ui.chromeless}
		<button class="exit-auto" onclick={() => (ui.automation = false)} data-ub="automation-exit" title={t('api.automationHint')}>
			<PanelLeftOpen size={16} aria-hidden="true" />
			<span>{t('api.automationExit')}</span>
			<kbd>Esc</kbd>
		</button>
	{:else}
		<Dock current={ui.current} onselect={selectApp} />
	{/if}
</main>

<style>
	.desktop { position: fixed; inset: 0; overflow: hidden; }
	.wallpaper {
		position: absolute; inset: 0;
		background:
			radial-gradient(900px 600px at 12% 8%, var(--wallpaper-1), transparent 60%),
			radial-gradient(800px 700px at 92% 20%, var(--wallpaper-2), transparent 60%),
			radial-gradient(1000px 800px at 50% 110%, var(--wallpaper-3), transparent 60%),
			var(--bg);
	}
	.window {
		position: absolute;
		left: 92px; right: 12px; top: 12px; bottom: 12px;
		display: flex; flex-direction: column;
		background: var(--surface);
		backdrop-filter: blur(28px) saturate(1.3);
		-webkit-backdrop-filter: blur(28px) saturate(1.3);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-dock);
		overflow: hidden;
	}
	.titlebar {
		display: flex; align-items: baseline; gap: 12px; padding: 14px 20px;
		border-bottom: 1px solid var(--border);
		background: rgb(255 255 255 / 0.02);
	}
	.title { font-size: 1.05rem; font-weight: 650; letter-spacing: -0.01em; }
	.sub { color: var(--text-3); font-size: 0.82rem; }
	.content { flex: 1; min-height: 0; overflow: auto; }

	.accordion { width: 100%; max-width: 1100px; margin: 0 auto; padding: var(--space-3); display: grid; gap: var(--space-2); align-content: start; }
	.item { border: 1px solid var(--border); border-radius: var(--radius); background: rgb(0 0 0 / 0.14); transition: border-color 0.2s var(--ease), background 0.2s; }
	.item.open { border-color: rgb(221 32 107 / 0.35); background: rgb(0 0 0 / 0.22); }
	.head { margin: 0; font-size: inherit; }
	.trigger {
		width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
		background: none; border: 0; padding: 14px 16px; color: var(--text); text-align: left; border-radius: var(--radius);
	}
	.trigger:hover { background: rgb(255 255 255 / 0.03); }
	.txt { display: grid; gap: 2px; }
	.txt strong { font-weight: 600; }
	.desc { font-size: 0.82rem; color: var(--text-3); }
	.chev { color: var(--text-2); transition: transform 0.25s var(--ease); display: inline-flex; }
	.chev.rot { transform: rotate(180deg); }
	.panel { padding: 4px 18px 20px; animation: fade 0.25s var(--ease); }
	@keyframes fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

	@media (max-width: 720px) {
		.window { left: 6px; right: 6px; top: 6px; bottom: 76px; }
	}
	/* Modo automação: sem dock, a janela ocupa a tela toda. */
	.desktop.automation .window { inset: 0; border: 0; border-radius: 0; box-shadow: none; }
	.exit-auto {
		position: fixed; right: 16px; bottom: 16px; z-index: 10;
		display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px 0 14px;
		border: 1px solid rgb(221 32 107 / 0.45); border-radius: 99px;
		background: var(--surface-solid); color: var(--text); font-size: 0.84rem; font-weight: 550;
		box-shadow: var(--shadow-dock);
		animation: fade 0.25s var(--ease);
		transition: background 0.15s, border-color 0.15s, transform 0.2s var(--ease);
	}
	.exit-auto:hover { border-color: var(--accent); transform: translateY(-1px); }
	.exit-auto:active { transform: none; }
	.exit-auto kbd { font-family: var(--mono); font-size: 0.7rem; color: var(--text-3); border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; }
	@media (max-width: 720px) { .exit-auto kbd { display: none; } }
	@media (prefers-reduced-motion: reduce) { .exit-auto { animation: none; transition: none; } }
</style>
