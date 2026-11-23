<script lang="ts">
	// Diálogo genérico de filtro/ajuste: controles gerados dos metadados, prévia ao vivo no canvas
	// (reduzida em imagens grandes), comparar com o original, aplicar em resolução total com "Parar".
	import { onMount, onDestroy, untrack } from 'svelte';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { doc, type Layer } from '#lib/image/doc.svelte.ts';
	import { filterById, defaultParams } from '#lib/image/filters.ts';
	import { runFilter, withJob, isAbort, stopOps } from '#lib/image/jobs.svelte.ts';
	import { makeCanvas, ctx2d, readPixels, intersect, canvasFromImageData } from '#lib/image/render.ts';
	import type { Rect } from '#lib/image/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import { X, Eye, RotateCcw, TriangleAlert, LoaderCircle } from '@lucide/svelte';

	let props: { id: string } = $props();
	const id = untrack(() => props.id);
	const def = filterById(id);
	const PREVIEW_MAX = 1.6e6;

	let params = $state<Record<string, number | string | boolean>>(def ? (editor.lastFilter?.id === id ? { ...editor.lastFilter.params } : defaultParams(def)) : {});
	let busy = $state(false);
	let error = $state('');
	let comparing = $state(false);
	let layer: Layer | null = null as Layer | null;
	let region = $state<Rect | null>(null);
	let src: ImageData | null = null; // prévia (possivelmente reduzida)
	let mask: Uint8ClampedArray | null = null;
	let scale = $state(1);
	let preview: HTMLCanvasElement | null = null;
	let dirty = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const big = $derived(region ? region.w * region.h : 0);
	let ready = $state(false);

	const label = (k: string) => t(`imageFx.params.${k}` as Parameters<typeof t>[0]);
	const fxTitle = def ? t(`imageFx.filters.${id}.title` as Parameters<typeof t>[0]) : id;

	onMount(() => {
		editor.commitFloating();
		const l = editor.editableLayer();
		if (!l || !def) {
			editor.dialog = null;
			return;
		}
		layer = l;
		const sel = doc.selection;
		region = sel.active ? intersect(sel.bounds!, doc.rect) : doc.rect;
		if (!region) {
			editor.dialog = null;
			return;
		}
		const full = readPixels(l.canvas, region);
		const fullMask = sel.active ? sel.alpha(region) : null;
		scale = Math.min(1, Math.sqrt(PREVIEW_MAX / (region.w * region.h)));
		if (scale < 1) {
			const w = Math.max(1, Math.round(region.w * scale)), h = Math.max(1, Math.round(region.h * scale));
			const c = makeCanvas(w, h);
			const cc = ctx2d(c, true);
			cc.imageSmoothingQuality = 'high';
			cc.drawImage(canvasFromImageData(full), 0, 0, w, h);
			src = cc.getImageData(0, 0, w, h);
			if (fullMask) {
				const m = makeCanvas(region.w, region.h);
				const img = new ImageData(region.w, region.h);
				for (let i = 0; i < fullMask.length; i++) img.data[i * 4 + 3] = fullMask[i];
				ctx2d(m).putImageData(img, 0, 0);
				const sm = makeCanvas(w, h);
				const smc = ctx2d(sm, true);
				smc.drawImage(m, 0, 0, w, h);
				const d = smc.getImageData(0, 0, w, h).data;
				mask = new Uint8ClampedArray(w * h);
				for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3];
			}
		} else {
			src = full;
			mask = fullMask;
		}
		ready = true;
		schedule(0);
	});

	onDestroy(() => {
		clearTimeout(timer);
		editor.filterPreview = null;
		editor.invalidate();
	});

	function schedule(ms = 140) {
		clearTimeout(timer);
		timer = setTimeout(runPreview, ms);
	}

	async function runPreview() {
		if (!src || !layer || !region) return;
		if (busy) {
			dirty = true;
			return;
		}
		busy = true;
		error = '';
		try {
			const img = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
			const m = mask ? new Uint8ClampedArray(mask) : null;
			const out = await runFilter(id, $state.snapshot(params), img, m, { scale });
			const r = region;
			if (!preview || preview.width !== doc.width || preview.height !== doc.height) preview = makeCanvas(doc.width, doc.height);
			const pc = ctx2d(preview);
			pc.globalCompositeOperation = 'copy';
			pc.drawImage(layer.canvas, 0, 0);
			pc.globalCompositeOperation = 'source-over';
			pc.clearRect(r.x, r.y, r.w, r.h);
			pc.imageSmoothingQuality = 'high';
			pc.drawImage(canvasFromImageData(out), r.x, r.y, r.w, r.h);
			if (!comparing) editor.filterPreview = { layer, canvas: preview };
			editor.invalidate();
		} catch (err) {
			if (!isAbort(err)) error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
			if (dirty) {
				dirty = false;
				schedule(0);
			}
		}
	}

	function set(k: string, v: number | string | boolean) {
		params[k] = v;
		schedule();
	}

	function compare(on: boolean) {
		comparing = on;
		editor.filterPreview = on || !preview || !layer ? null : { layer, canvas: preview };
		editor.invalidate();
	}

	function reset() {
		if (def) params = defaultParams(def);
		schedule(0);
	}

	async function apply() {
		if (!layer || !region) return;
		clearTimeout(timer);
		const l = layer, r = region;
		const p = $state.snapshot(params);
		try {
			if (busy) stopOps();
			const img = readPixels(l.canvas, r);
			const m = doc.selection.active ? doc.selection.alpha(r) : null;
			const out = await withJob(fxTitle, (prog) => runFilter(id, p, img, m, { onProgress: (v) => prog(v) }), stopOps, 150);
			doc.history(fxTitle, { layers: [l], region: r });
			ctx2d(l.canvas).putImageData(out, r.x, r.y);
			l.touch();
			doc.changed();
			editor.lastFilter = { id, params: p };
			editor.dialog = null;
		} catch (err) {
			if (isAbort(err)) editor.notify('info', t('imageAi.stopped'));
			else error = err instanceof Error ? err.message : String(err);
		}
	}

	function cancel() {
		if (busy) stopOps();
		editor.dialog = null;
	}
</script>

<header>
	<h2>{fxTitle}</h2>
	<button class="btn icon ghost" aria-label={t('common.close')} onclick={cancel}><X size={18} /></button>
</header>

<div class="body">
	{#if def}
		<p class="hint">{t(`imageFx.filters.${id}.description` as Parameters<typeof t>[0])}</p>
		{#if def.heavy && big > 3e6}
			<p class="warn"><TriangleAlert size={16} />{t('image.dlg.heavyFilter', { mp: (big / 1e6).toFixed(1) })}</p>
		{/if}
		{#each def.params as p (p.key)}
			{#if p.type === 'range'}
				<Slider label={label(p.key)} value={params[p.key] as number} min={p.min} max={p.max} step={p.step} unit={p.unit ?? ''} onchange={(v) => set(p.key, v)} />
			{:else if p.type === 'select'}
				<label class="row-l"><span>{label(p.key)}</span>
					<select class="input" value={params[p.key]} onchange={(e) => set(p.key, (e.target as HTMLSelectElement).value)}>
						{#each p.options as o (o)}<option value={o}>{t(`imageFx.options.${o}` as Parameters<typeof t>[0])}</option>{/each}
					</select>
				</label>
			{:else if p.type === 'color'}
				<label class="row-l"><span>{label(p.key)}</span><input type="color" value={params[p.key]} oninput={(e) => set(p.key, (e.target as HTMLInputElement).value)} /></label>
			{:else}
				<label class="check"><input type="checkbox" checked={params[p.key] as boolean} onchange={(e) => set(p.key, (e.target as HTMLInputElement).checked)} />{label(p.key)}</label>
			{/if}
		{/each}
		{#if !def.params.length}<p class="hint">{t('image.dlg.noParams')}</p>{/if}
		{#if error}<p class="error">{error}</p>{/if}
		<p class="status">
			{#if busy}<LoaderCircle size={14} class="spin" />{t('image.dlg.previewing')}{:else if ready && scale < 1}{t('image.dlg.previewScaled', { pct: Math.round(scale * 100) })}{/if}
		</p>
	{/if}
</div>

<footer>
	<button class="btn ghost" onclick={reset} title={t('image.dlg.reset')}><RotateCcw size={15} />{t('image.dlg.reset')}</button>
	<button class="btn ghost" aria-pressed={comparing} onpointerdown={() => compare(true)} onpointerup={() => compare(false)} onpointerleave={() => comparing && compare(false)} onkeydown={(e) => e.key === ' ' && compare(true)} onkeyup={() => compare(false)} title={t('image.dlg.compareHint')}><Eye size={15} />{t('image.dlg.compare')}</button>
	<span class="sp"></span>
	<button class="btn ghost" onclick={cancel}>{t('common.cancel')}</button>
	<button class="btn primary" onclick={apply} disabled={!ready}>{t('image.dlg.apply')}</button>
</footer>

<style>
	header { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--border); }
	h2 { font-size: 1rem; font-weight: 650; }
	.body { padding: 14px 18px; display: grid; gap: 12px; overflow: auto; }
	footer { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--border); flex-wrap: wrap; }
	footer .btn { min-height: 40px; }
	.sp { flex: 1; }
	.row-l { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; font-size: 0.78rem; color: var(--text-2); }
	.row-l .input { padding: 6px 8px; }
	input[type='color'] { width: 44px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
	.warn { display: flex; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm); background: rgb(255 181 71 / 0.1); border: 1px solid rgb(255 181 71 / 0.35); color: #ffd79a; font-size: 0.82rem; }
	.status { min-height: 18px; display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text-3); }
	.status :global(.spin) { animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
