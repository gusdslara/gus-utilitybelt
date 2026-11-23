<script lang="ts">
	// Exportar animação: Lottie JSON, .lottie, GIF, MP4, WebM, sequência PNG (ZIP), quadro PNG/SVG.
	// Gera tudo no navegador, com progresso e "Parar".
	import { onMount, untrack } from 'svelte';
	import { exportAnimation, exportSupport } from '#lib/motion/export.ts';
	import type { LottieJSON } from '#lib/motion/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from '../image/Slider.svelte';
	import { X, Download, CircleStop, Copy } from '@lucide/svelte';

	type Fmt = 'json' | 'lottie' | 'gif' | 'mp4' | 'webm' | 'png-sequence' | 'png' | 'svg';
	let { json, name, initial = null, onclose }: { json: LottieJSON; name: string; initial?: string | null; onclose: () => void } = $props();

	const FORMATS: { id: Fmt; ext: string; video?: boolean }[] = [
		{ id: 'json', ext: 'json' }, { id: 'lottie', ext: 'lottie' }, { id: 'gif', ext: 'gif', video: true }, { id: 'mp4', ext: 'mp4', video: true },
		{ id: 'webm', ext: 'webm', video: true }, { id: 'png-sequence', ext: 'zip', video: true }, { id: 'png', ext: 'png' }, { id: 'svg', ext: 'svg' }
	];

	let dlg: HTMLDialogElement;
	// O diálogo é montado de novo a cada abertura: os valores iniciais são lidos uma vez.
	const init = untrack(() => ({ initial, fr: json.fr || 30, mid: Math.round(((json.ip ?? 0) + (json.op ?? 1)) / 2) }));
	let fmt = $state<Fmt>((FORMATS.some((f) => f.id === init.initial) ? init.initial : 'json') as Fmt);
	let scale = $state(1);
	let fps = $state(Math.min(30, init.fr));
	let bg = $state<string | null>(null);
	let quality = $state(0.85);
	let frame = $state(init.mid);
	let support = $state<Record<string, boolean>>({});
	let progress = $state<number | null>(null);
	let error = $state('');
	let ctrl = $state<AbortController | null>(null);

	const info = $derived(FORMATS.find((f) => f.id === fmt)!);
	const needsBg = $derived(fmt === 'mp4');
	const W = $derived(Math.round(json.w * scale)), H = $derived(Math.round(json.h * scale));

	onMount(() => {
		dlg.showModal();
		exportSupport().then((s) => (support = s as Record<string, boolean>));
	});

	async function run() {
		error = '';
		progress = 0;
		ctrl = new AbortController();
		try {
			const blob = await exportAnimation(json, fmt, { scale, fps, background: needsBg ? (bg ?? '#ffffff') : bg, quality, frame, loop: true }, (v: number) => (progress = v), ctrl.signal);
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `${name || 'animation'}.${info.ext}`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 4000);
			onclose();
		} catch (e) {
			if (!(e instanceof Error && e.name === 'AbortError')) error = e instanceof Error ? e.message : String(e);
		} finally {
			progress = null;
			ctrl = null;
		}
	}

	async function copyJson() {
		await navigator.clipboard.writeText(JSON.stringify(json));
		error = '';
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}
	let copied = $state(false);
</script>

<dialog bind:this={dlg} class="dlg" onclose={onclose} oncancel={(e) => { e.preventDefault(); if (!ctrl) onclose(); }} onkeydown={(e) => e.stopPropagation()}>
	<header>
		<h2>{t('motion.exportTitle')}</h2>
		<button class="btn icon ghost" aria-label={t('common.close')} disabled={!!ctrl} onclick={onclose}><X size={18} /></button>
	</header>
	<div class="body">
		<div class="formats" role="radiogroup" aria-label={t('image.dlg.format')}>
			{#each FORMATS as f (f.id)}
				{@const ok = support[f.id] !== false}
				<button role="radio" aria-checked={fmt === f.id} disabled={!ok} title={ok ? '' : t('image.dlg.unsupported')} onclick={() => (fmt = f.id)}>
					<strong>{t(`motion.formats.${f.id}` as Parameters<typeof t>[0])}</strong>
				</button>
			{/each}
		</div>
		<p class="hint">{t(`motion.formatHints.${fmt}` as Parameters<typeof t>[0])}</p>
		{#if fmt !== 'json' && fmt !== 'lottie'}
			<Slider label={t('image.dlg.scale')} value={scale} min={0.1} max={4} step={0.05} scale={100} unit="%" onchange={(v) => (scale = v)} />
			<p class="hint">{W}×{H}px</p>
		{/if}
		{#if info.video && fmt !== 'png-sequence'}
			<div class="field"><span class="label">FPS</span>
				<div class="seg">{#each [12, 15, 24, 30, 60] as r (r)}<button aria-pressed={fps === r} disabled={r > (json.fr || 30)} onclick={() => (fps = r)}>{r}</button>{/each}</div>
			</div>
		{/if}
		{#if fmt === 'mp4' || fmt === 'webm'}
			<Slider label={t('image.dlg.quality.label')} value={quality} min={0.2} max={1} step={0.05} scale={100} unit="%" onchange={(v) => (quality = v)} />
		{/if}
		{#if fmt === 'png' || fmt === 'svg'}
			<Slider label={t('motion.frame')} value={frame} min={json.ip ?? 0} max={(json.op ?? 1) - 1} onchange={(v) => (frame = v)} />
		{/if}
		{#if fmt !== 'json' && fmt !== 'lottie' && fmt !== 'svg'}
			<div class="row">
				<label class="check"><input type="checkbox" checked={bg !== null || needsBg} disabled={needsBg} onchange={(e) => (bg = (e.target as HTMLInputElement).checked ? '#ffffff' : null)} />{t('motion.background')}</label>
				{#if bg !== null || needsBg}<input type="color" value={bg ?? '#ffffff'} oninput={(e) => (bg = (e.target as HTMLInputElement).value)} />{/if}
				{#if fmt === 'gif' && bg === null}<span class="hint">{t('motion.gifTransparent')}</span>{/if}
			</div>
		{/if}
		{#if progress !== null}
			<div class="pbar"><span style:width="{Math.round(progress * 100)}%"></span></div>
		{/if}
		{#if error}<p class="error">{error}</p>{/if}
	</div>
	<footer>
		{#if fmt === 'json'}<button class="btn ghost" onclick={copyJson}><Copy size={15} />{copied ? t('common.copied') : t('common.copy')}</button>{/if}
		<span class="sp"></span>
		{#if ctrl}
			<button class="btn stop" onclick={() => ctrl?.abort()}><CircleStop size={16} />{t('imageAi.stop')}</button>
		{:else}
			<button class="btn ghost" onclick={onclose}>{t('common.cancel')}</button>
			<button class="btn primary" onclick={run}><Download size={16} />{t('image.dlg.save')}</button>
		{/if}
	</footer>
</dialog>

<style>
	.dlg { width: min(520px, calc(100vw - 24px)); padding: 0; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface-solid); color: var(--text); box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); }
	.dlg[open] { display: flex; flex-direction: column; }
	.dlg::backdrop { background: rgb(4 6 10 / 0.6); backdrop-filter: blur(3px); }
	header { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--border); }
	h2 { font-size: 1rem; font-weight: 650; }
	.body { padding: 16px 18px; display: grid; gap: 12px; }
	footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--border); }
	footer .btn { min-height: 40px; }
	.sp { flex: 1; }
	.formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 6px; }
	.formats button { padding: 10px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-2); font-size: 0.8rem; }
	.formats button[aria-checked='true'] { border-color: var(--accent); background: var(--accent-soft); }
	.formats button:disabled { opacity: 0.4; }
	.seg button[aria-pressed='true'] { background: var(--surface-3); color: var(--text); }
	.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
	input[type='color'] { width: 40px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
	.pbar { height: 6px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
	.pbar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); transition: width 0.15s; }
	.stop { background: var(--danger); border-color: transparent; color: #fff; }
	@media (max-width: 560px) { .dlg { width: 100vw; max-width: 100vw; margin: auto 0 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; } }
</style>
