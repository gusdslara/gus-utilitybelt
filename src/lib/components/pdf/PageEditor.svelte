<script lang="ts">
	// Editor de uma página: abre no resultado processado (filtro), com aba de recorte (cantos com correção de perspectiva)
	// e download da imagem final em resolução total.
	import { onDestroy, onMount, untrack } from 'svelte';
	import { pdf } from '#lib/pdf/store.svelte.ts';
	import { scan } from '#lib/scan/client.ts';
	import { FULL_QUAD, isFullQuad, rotateQuad, unrotateQuad, type Quad, type Rotation } from '#lib/scan/geometry.ts';
	import { SCAN_FILTERS, type ScanFilter } from '#lib/scan/enhance.ts';
	import type { PageParams } from '#lib/scan/protocol.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import QuadEditor from './QuadEditor.svelte';
	import { portal } from './portal.ts';
	import { X, Crop, RotateCcw, RotateCw, WandSparkles, Maximize, LoaderCircle, Check, Download, Eye } from '@lucide/svelte';
	import { saveBlob } from '#lib/image/io.ts';

	let { id, onclose }: { id: string; onclose: () => void } = $props();

	const page = $derived(pdf.byId(id));
	const index = $derived(pdf.pages.findIndex((p) => p.id === id));
	let draft = $state<PageParams>(untrack(() => structuredClone($state.snapshot(pdf.byId(id)!.params)) as PageParams));
	let tab = $state<'crop' | 'filter'>('filter');
	let saving = $state(false);
	let srcPreview = $state<{ url: string; w: number; h: number } | null>(null);
	let result = $state<{ url: string; w: number; h: number } | null>(null);
	let busy = $state(false);
	let note = $state('');
	let dialog: HTMLElement | undefined = $state();
	let lastFocus: Element | null = null;

	// Origem girada (sem recorte) para o ajuste dos cantos.
	$effect(() => {
		const rot = draft.rotation;
		const p = untrack(() => page);
		if (!p) return;
		let alive = true;
		scan.render(p.id, p.src, { quad: null, rotation: rot, filter: 'original', threshold: 50 }, 1600, 0.85).then((r) => {
			if (!alive) return;
			if (srcPreview) URL.revokeObjectURL(srcPreview.url);
			srcPreview = { url: URL.createObjectURL(r.blob), w: r.width, h: r.height };
		});
		return () => (alive = false);
	});

	// Resultado (recorte + filtro) na aba Filtro, com pequeno atraso enquanto o usuário mexe.
	$effect(() => {
		if (tab !== 'filter') return;
		const params = $state.snapshot(draft) as PageParams;
		const p = untrack(() => page);
		if (!p) return;
		let alive = true;
		busy = true;
		const timer = setTimeout(() => {
			scan
				.render(p.id, p.src, params, 1400, 0.85)
				.then((r) => {
					if (!alive) return;
					if (result) URL.revokeObjectURL(result.url);
					result = { url: URL.createObjectURL(r.blob), w: r.width, h: r.height };
				})
				.finally(() => alive && (busy = false));
		}, 120);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	});

	const shownQuad = $derived(rotateQuad(draft.quad ?? FULL_QUAD, draft.rotation));

	function setQuad(q: Quad) {
		const back = unrotateQuad(q, draft.rotation);
		draft.quad = isFullQuad(back) ? null : back;
		note = '';
	}

	function rotate(dir: 1 | -1) {
		draft.rotation = ((((draft.rotation + dir * 90) % 360) + 360) % 360) as Rotation;
	}

	function autoDetect() {
		if (page?.detected) {
			draft.quad = page.detected.map((p) => ({ ...p })) as Quad;
			note = '';
		} else note = t('pdf.editor.noDetect');
	}

	async function download() {
		if (saving) return;
		saving = true;
		note = '';
		try {
			const r = await pdf.exportImage(id, $state.snapshot(draft) as PageParams);
			await saveBlob(r.blob, r.name);
		} catch (e) {
			note = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	function apply() {
		pdf.setParams(id, $state.snapshot(draft) as PageParams);
		onclose();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		} else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) apply();
		else if (e.key === 'Tab' && dialog) {
			// mantém o foco dentro do diálogo
			const f = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')];
			if (!f.length) return;
			const first = f[0], last = f[f.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	}

	onMount(() => {
		lastFocus = document.activeElement;
		dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
	});

	onDestroy(() => {
		if (srcPreview) URL.revokeObjectURL(srcPreview.url);
		if (result) URL.revokeObjectURL(result.url);
		(lastFocus as HTMLElement | null)?.focus?.();
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="backdrop" use:portal role="presentation" onkeydown={onKey}>
	<div class="dialog" bind:this={dialog} role="dialog" aria-modal="true" aria-labelledby="pe-title">
		<header class="top">
			<h2 id="pe-title">{t('pdf.editor.title', { n: index + 1 })}</h2>
			<div class="seg tabs" role="tablist">
				<button role="tab" aria-selected={tab === 'filter'} onclick={() => (tab = 'filter')} data-autofocus><Eye size={15} /> {t('pdf.editor.result')}</button>
				<button role="tab" aria-selected={tab === 'crop'} onclick={() => (tab = 'crop')}><Crop size={15} /> {t('pdf.editor.crop')}</button>
			</div>
			<button class="btn ghost icon" onclick={onclose} aria-label={t('pdf.editor.cancel')}><X size={18} /></button>
		</header>

		<div class="view">
			{#if tab === 'crop'}
				{#if srcPreview}
					<QuadEditor src={srcPreview.url} width={srcPreview.w} height={srcPreview.h} quad={shownQuad} onchange={setQuad} />
				{:else}
					<div class="loading"><LoaderCircle class="spin" size={22} /> {t('pdf.editor.loading')}</div>
				{/if}
			{:else if result}
				<div class="result" class:dim={busy}>
					<img src={result.url} alt={t('pdf.page.label', { n: index + 1 })} style:aspect-ratio="{result.w} / {result.h}" />
				</div>
			{:else}
				<div class="loading"><LoaderCircle class="spin" size={22} /> {t('pdf.editor.loading')}</div>
			{/if}
		</div>

		<div class="tools">
			{#if tab === 'crop'}
				<p class="hint">{note || t('pdf.editor.hint')}</p>
				<div class="row">
					<button class="btn" onclick={autoDetect}><WandSparkles size={16} /> {t('pdf.editor.auto')}</button>
					<button class="btn" onclick={() => (draft.quad = null)} disabled={!draft.quad}><Maximize size={16} /> {t('pdf.editor.full')}</button>
					<span class="grow"></span>
					<button class="btn icon" onclick={() => rotate(-1)} aria-label={t('pdf.page.rotateL')} title={t('pdf.page.rotateL')}><RotateCcw size={17} /></button>
					<button class="btn icon" onclick={() => rotate(1)} aria-label={t('pdf.page.rotateR')} title={t('pdf.page.rotateR')}><RotateCw size={17} /></button>
				</div>
			{:else}
				<div class="filters" role="radiogroup" aria-label={t('pdf.editor.filter')}>
					{#each SCAN_FILTERS as f (f)}
						<button class="chip" role="radio" aria-checked={draft.filter === f} onclick={() => (draft.filter = f as ScanFilter)}>
							<span class="sw {f}" aria-hidden="true"></span>{t(`pdf.filters.${f}`)}
						</button>
					{/each}
				</div>
				<p class="hint">{note || t(`pdf.filterHints.${draft.filter}`)}</p>
				{#if draft.filter === 'bw'}
					<label class="thr">
						<span class="label">{t('pdf.editor.threshold')}</span>
						<span class="hint">{t('pdf.editor.lighter')}</span>
						<input type="range" min="0" max="100" step="1" bind:value={draft.threshold} />
						<span class="hint">{t('pdf.editor.darker')}</span>
					</label>
				{/if}
				<div class="row">
					<span class="grow"></span>
					<button class="btn icon" onclick={() => rotate(-1)} aria-label={t('pdf.page.rotateL')} title={t('pdf.page.rotateL')}><RotateCcw size={17} /></button>
					<button class="btn icon" onclick={() => rotate(1)} aria-label={t('pdf.page.rotateR')} title={t('pdf.page.rotateR')}><RotateCw size={17} /></button>
				</div>
			{/if}
		</div>

		<footer class="foot">
			<button class="btn" onclick={download} disabled={saving} title={t('pdf.page.download')} aria-label={t('pdf.page.download')}>
				{#if saving}<LoaderCircle class="spin" size={16} />{:else}<Download size={16} />{/if}
				<span class="dl-label">{t('pdf.editor.download')}</span>
			</button>
			<span class="grow"></span>
			<button class="btn ghost" onclick={onclose}>{t('pdf.editor.cancel')}</button>
			<button class="btn primary" onclick={apply}><Check size={16} /> {t('pdf.editor.apply')}</button>
		</footer>
	</div>
</div>

<style>
	.backdrop {
		position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 16px;
		background: rgb(4 5 9 / 0.72); backdrop-filter: blur(6px); animation: fade 0.2s var(--ease);
	}
	.dialog {
		width: min(980px, 100%); height: min(860px, 100%); display: grid; grid-template-rows: auto 1fr auto auto;
		background: var(--surface-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-dock); overflow: hidden;
		animation: pop 0.25s var(--ease);
	}
	.top { display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 18px; border-bottom: 1px solid var(--border); }
	.top h2 { font-size: 1rem; font-weight: 650; margin-right: auto; }
	.tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; }
	.tabs button[aria-selected='true'] { background: var(--surface-3); color: var(--text); box-shadow: inset 0 0 0 1px var(--border); }
	.view { position: relative; min-height: 0; background: repeating-conic-gradient(#14161d 0% 25%, #191c24 0% 50%) 0 0 / 20px 20px; }
	.result { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; transition: opacity 0.2s; }
	.result.dim { opacity: 0.6; }
	.result img { display: block; max-width: 100%; max-height: 100%; min-width: 0; min-height: 0; object-fit: contain; background: #fff; box-shadow: 0 6px 30px rgb(0 0 0 / 0.5); }
	.loading { position: absolute; inset: 0; display: grid; place-content: center; grid-auto-flow: column; gap: 8px; align-items: center; color: var(--text-2); }
	.tools { display: grid; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border); }
	.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
	.grow { flex: 1; }
	.filters { display: flex; gap: 8px; flex-wrap: wrap; }
	.chip {
		display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 14px 0 8px; border-radius: 99px;
		border: 1px solid var(--border); background: var(--surface-2); color: var(--text-2); font-size: 0.88rem;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}
	.chip:hover { color: var(--text); background: var(--surface-3); }
	.chip[aria-checked='true'] { color: var(--text); border-color: var(--accent); background: var(--accent-soft); }
	.sw { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.25); }
	.sw.original { background: linear-gradient(135deg, #c9a27a, #6d7f95); }
	.sw.enhance { background: linear-gradient(135deg, #fff 55%, #2f6fdd 55% 70%, #e3355f 70%); }
	.sw.gray { background: linear-gradient(135deg, #fff, #555); }
	.sw.bw { background: linear-gradient(135deg, #fff 50%, #000 50%); }
	.thr { display: grid; grid-template-columns: auto auto 1fr auto; gap: 10px; align-items: center; }
	.thr input { accent-color: var(--accent); width: 100%; min-height: 32px; }
	.foot { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); }
	.foot .btn { min-height: 40px; padding: 0 18px; }
	:global(.spin) { animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes fade { from { opacity: 0; } }
	@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
	@media (max-width: 720px) {
		.backdrop { padding: 0; }
		.dialog { width: 100%; height: 100%; border-radius: 0; border: 0; }
		.top { flex-wrap: wrap; padding-top: calc(10px + env(safe-area-inset-top)); }
		.tabs { order: 3; width: 100%; }
		.tabs button { flex: 1; justify-content: center; }
		.thr { grid-template-columns: 1fr; }
		.thr .hint { display: none; }
	}
	@media (max-width: 420px) {
		.dl-label { display: none; }
	}
</style>
