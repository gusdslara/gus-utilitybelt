<script lang="ts">
	// Modo Lottie do app Motion: abrir .json/.lottie, tocar e inspecionar, e editar arquivos prontos
	// (cores, textos, camadas, velocidade, recorte de frames, tamanho) com desfazer.
	import { onDestroy } from 'svelte';
	import { parseLottieFile, info, listLayers, setLayerHidden, removeLayer, extractColors, replaceColor, listTexts, setText, setSpeed, trim, resize } from '#lib/motion/lottie-tools.ts';
	import type { LottieJSON } from '#lib/motion/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import LottiePlayer from './LottiePlayer.svelte';
	import Slider from '../image/Slider.svelte';
	import { Upload, Play, Pause, Repeat, SkipBack, Undo2, Redo2, Download, Eye, EyeOff, Trash, Palette, Type, Layers, Info, Scissors, ClipboardPaste, X } from '@lucide/svelte';

	let { onexport }: { onexport: (json: LottieJSON, name: string) => void } = $props();

	let json = $state<LottieJSON | null>(null);
	let name = $state('');
	let error = $state('');
	let frame = $state(0);
	let playing = $state(false);
	let loop = $state(true);
	let speed = $state(1);
	let bg = $state<string | null>(null);
	let renderer = $state<'svg' | 'canvas'>('svg');
	let tab = $state<'info' | 'colors' | 'texts' | 'layers' | 'time'>('colors');
	let dragOver = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let undoStack: string[] = [];
	let redoStack: string[] = [];
	let canUndo = $state(false);
	let canRedo = $state(false);
	let rev = $state(0);
	let raf = 0;

	const meta = $derived.by(() => (void rev, json ? info(json) : null));
	const ip = $derived(json?.ip ?? 0);
	const op = $derived(json?.op ?? 1);

	// onDestroy também roda no pré-render (SSR), onde não existe cancelAnimationFrame.
	onDestroy(() => {
		if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
	});

	async function open(file: Blob, fname = 'animation.json') {
		error = '';
		try {
			const r = await parseLottieFile(file, fname);
			json = r.json;
			name = r.name;
			undoStack = [];
			redoStack = [];
			sync();
			frame = r.json.ip ?? 0;
			play();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function pasteJson() {
		try {
			const txt = await navigator.clipboard.readText();
			await open(new Blob([txt], { type: 'application/json' }), 'pasted.json');
		} catch {
			error = t('motion.pasteFailed');
		}
	}

	function sync() {
		canUndo = undoStack.length > 0;
		canRedo = redoStack.length > 0;
		rev++;
	}

	/** Aplica uma edição com histórico (o JSON é trocado por uma cópia nova: o player recarrega). */
	function edit(fn: (j: LottieJSON) => void) {
		if (!json) return;
		const snap = $state.snapshot(json) as LottieJSON;
		undoStack.push(JSON.stringify(snap));
		if (undoStack.length > 60) undoStack.shift();
		redoStack = [];
		const next = structuredClone(snap);
		fn(next);
		json = next;
		frame = Math.min(Math.max(frame, next.ip ?? 0), (next.op ?? 1) - 1);
		sync();
	}

	function undo() {
		const p = undoStack.pop();
		if (!p || !json) return;
		redoStack.push(JSON.stringify($state.snapshot(json)));
		json = JSON.parse(p);
		sync();
	}

	function redo() {
		const n = redoStack.pop();
		if (!n || !json) return;
		undoStack.push(JSON.stringify($state.snapshot(json)));
		json = JSON.parse(n);
		sync();
	}

	// ----- Reprodução (relógio próprio para o scrub ficar sincronizado) -----

	function play() {
		if (!json) return;
		playing = true;
		let last = performance.now();
		const fr = json.fr || 30;
		const tick = (now: number) => {
			if (!playing || !json) return;
			let f = frame + ((now - last) / 1000) * fr * speed;
			last = now;
			if (f >= op) {
				if (loop) f = ip + ((f - ip) % Math.max(1, op - ip));
				else {
					frame = op - 1;
					playing = false;
					return;
				}
			}
			frame = f;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
	}

	function pause() {
		playing = false;
		cancelAnimationFrame(raf);
	}

	function onKey(e: KeyboardEvent) {
		if (!json || (e.target as HTMLElement).closest('input, textarea, select')) return;
		const mod = e.ctrlKey || e.metaKey;
		if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
		else if (e.key === 'ArrowRight') { pause(); frame = Math.min(op - 1, Math.round(frame) + (e.shiftKey ? 10 : 1)); }
		else if (e.key === 'ArrowLeft') { pause(); frame = Math.max(ip, Math.round(frame) - (e.shiftKey ? 10 : 1)); }
		else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
		else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
	}

	const colors = $derived.by(() => (void rev, json ? extractColors(json) : []));
	const texts = $derived.by(() => (void rev, json ? listTexts(json) : []));
	const layers = $derived.by(() => (void rev, json ? listLayers(json) : []));

	let trimIn = $state(0), trimOut = $state(0), rw = $state(0), rh = $state(0);
	$effect(() => {
		void rev;
		if (json) {
			trimIn = json.ip ?? 0;
			trimOut = json.op ?? 1;
			rw = json.w;
			rh = json.h;
		}
	});

	const fmtSize = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
</script>

<svelte:window onkeydown={onKey} />
<input bind:this={fileInput} type="file" accept=".json,.lottie,application/json" hidden onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) open(f, f.name); (e.target as HTMLInputElement).value = ''; }} />

<div
	class="viewer"
	role="region"
	aria-label={t('motion.viewerLabel')}
	ondragover={(e) => { e.preventDefault(); dragOver = true; }}
	ondragleave={(e) => { if (e.currentTarget === e.target) dragOver = false; }}
	ondrop={(e) => { e.preventDefault(); dragOver = false; const f = e.dataTransfer?.files?.[0]; if (f) open(f, f.name); }}
>
	{#if !json}
		<div class="empty" class:over={dragOver}>
			<Upload size={34} strokeWidth={1.6} />
			<h2>{t('motion.dropTitle')}</h2>
			<p>{t('motion.dropHint')}</p>
			<div class="acts">
				<button class="btn primary" onclick={() => fileInput?.click()}><Upload size={16} />{t('motion.openFile')}</button>
				<button class="btn" onclick={pasteJson}><ClipboardPaste size={16} />{t('motion.pasteJson')}</button>
			</div>
			{#if error}<p class="error">{error}</p>{/if}
			<p class="hint">{t('common.localOnly')}</p>
		</div>
	{:else}
		<div class="top">
			<strong class="fname" title={name}>{name}</strong>
			{#if meta}<span class="badge">{meta.width}×{meta.height} · {meta.fps} fps · {meta.duration.toFixed(2)} s</span>{/if}
			<span class="sp"></span>
			<button class="btn icon ghost sm" aria-label={t('image.cmd.undo')} disabled={!canUndo} onclick={undo}><Undo2 size={16} /></button>
			<button class="btn icon ghost sm" aria-label={t('image.cmd.redo')} disabled={!canRedo} onclick={redo}><Redo2 size={16} /></button>
			<button class="btn sm" onclick={() => fileInput?.click()}><Upload size={15} /><span class="hide-sm">{t('motion.openOther')}</span></button>
			<button class="btn icon ghost sm" aria-label={t('common.close')} onclick={() => { pause(); json = null; }}><X size={16} /></button>
			<button class="btn primary sm" onclick={() => json && onexport($state.snapshot(json) as LottieJSON, name.replace(/\.(json|lottie)$/i, ''))}><Download size={15} />{t('motion.export')}</button>
		</div>
		<div class="body">
			<div class="stage" class:over={dragOver}>
				<LottiePlayer {json} frame={frame} background={bg} {renderer} onerror={(m) => (error = m)} />
			</div>
			<aside class="side">
				<div class="tabs" role="tablist">
					{#each [['colors', Palette], ['texts', Type], ['layers', Layers], ['time', Scissors], ['info', Info]] as const as [id, Icon] (id)}
						<button role="tab" aria-selected={tab === id} title={t(`motion.vtabs.${id}`)} onclick={() => (tab = id)}><Icon size={14} /><span>{t(`motion.vtabs.${id}`)}</span></button>
					{/each}
				</div>
				<div class="pane">
					{#if tab === 'colors'}
						<p class="hint">{t('motion.colorsHint', { count: colors.length })}</p>
						<div class="swatches">
							{#each colors as c (c.key)}
								<label class="sw" title={`${c.key} · ${c.count}×`}>
									<input type="color" value={c.key.slice(0, 7)} onchange={(e) => edit((j) => replaceColor(j, c.key, (e.target as HTMLInputElement).value))} />
									<span>{c.key.slice(0, 7)}</span><small>{c.count}×</small>
								</label>
							{/each}
						</div>
						{#if !colors.length}<p class="muted">{t('motion.noColors')}</p>{/if}
					{:else if tab === 'texts'}
						{#each texts as tx (tx.path)}
							<label class="field"><span class="label">{tx.layerName}</span>
								<input class="input" value={tx.text.replaceAll('\r', '\n')} onchange={(e) => edit((j) => setText(j, tx.path, (e.target as HTMLInputElement).value.replaceAll('\n', '\r')))} />
							</label>
						{:else}
							<p class="muted">{t('motion.noTexts')}</p>
						{/each}
						<p class="hint">{t('motion.fontsHint')}</p>
					{:else if tab === 'layers'}
						<ul class="layers">
							{#each layers as l (l.path)}
								<li style:padding-left="{8 + l.depth * 14}px" class:hidden={l.hidden}>
									<button class="ic" aria-label={l.hidden ? t('motion.show') : t('motion.hide')} onclick={() => edit((j) => setLayerHidden(j, l.path, !l.hidden))}>
										{#if l.hidden}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
									</button>
									<span class="ln">{l.name || `#${l.path}`}</span>
									<small>{t(`motion.ltypes.${l.type}` as Parameters<typeof t>[0])}</small>
									<button class="ic" aria-label={t('motion.delete')} onclick={() => edit((j) => removeLayer(j, l.path))}><Trash size={13} /></button>
								</li>
							{/each}
						</ul>
					{:else if tab === 'time'}
						<Slider label={t('motion.speed')} value={1} min={0.25} max={4} step={0.05} unit="×" onchange={(v) => edit((j) => setSpeed(j, v))} />
						<p class="hint">{t('motion.speedHint')}</p>
						<div class="row2">
							<label class="mini">{t('motion.in')}<input class="input" type="number" min="0" bind:value={trimIn} /></label>
							<label class="mini">{t('motion.out')}<input class="input" type="number" min="1" bind:value={trimOut} /></label>
							<button class="btn sm" onclick={() => edit((j) => trim(j, Math.max(0, trimIn), Math.max(trimIn + 1, trimOut)))}>{t('motion.applyTrim')}</button>
						</div>
						<div class="row2">
							<label class="mini">{t('image.dlg.width')}<input class="input" type="number" min="16" bind:value={rw} /></label>
							<label class="mini">{t('image.dlg.height')}<input class="input" type="number" min="16" bind:value={rh} /></label>
						</div>
						<div class="row2">
							<button class="btn sm" onclick={() => edit((j) => resize(j, rw, rh, 'scale'))}>{t('motion.resizeScale')}</button>
							<button class="btn sm" onclick={() => edit((j) => resize(j, rw, rh, 'canvas'))}>{t('motion.resizeCanvas')}</button>
						</div>
					{:else if meta}
						<dl class="info">
							<dt>{t('motion.size')}</dt><dd>{meta.width} × {meta.height}</dd>
							<dt>FPS</dt><dd>{meta.fps}</dd>
							<dt>{t('motion.frames')}</dt><dd>{meta.frames}</dd>
							<dt>{t('motion.duration')}</dt><dd>{meta.duration.toFixed(2)} s</dd>
							<dt>{t('motion.layersCount')}</dt><dd>{meta.layers}</dd>
							<dt>{t('motion.assets')}</dt><dd>{meta.assets} ({meta.images} img)</dd>
							<dt>{t('motion.textsCount')}</dt><dd>{meta.texts}</dd>
							<dt>Lottie</dt><dd>v{meta.version}</dd>
							<dt>{t('motion.fileSize')}</dt><dd>{fmtSize(meta.bytes)}</dd>
							{#if meta.hasExpressions}<dt>⚠</dt><dd>{t('motion.expressions')}</dd>{/if}
						</dl>
						<div class="field">
							<span class="label">{t('motion.renderer')}</span>
							<div class="seg"><button aria-pressed={renderer === 'svg'} onclick={() => (renderer = 'svg')}>SVG</button><button aria-pressed={renderer === 'canvas'} onclick={() => (renderer = 'canvas')}>Canvas</button></div>
						</div>
					{/if}
					{#if error}<p class="error">{error}</p>{/if}
				</div>
			</aside>
		</div>
		<div class="transport">
			<button class="btn icon ghost" aria-label={t('motion.toStart')} onclick={() => (frame = ip)}><SkipBack size={17} /></button>
			<button class="btn icon play" aria-label={playing ? t('motion.pause') : t('motion.play')} onclick={() => (playing ? pause() : play())}>
				{#if playing}<Pause size={18} />{:else}<Play size={18} />{/if}
			</button>
			<button class="btn icon ghost" class:on={loop} aria-pressed={loop} aria-label={t('motion.loop')} onclick={() => (loop = !loop)}><Repeat size={16} /></button>
			<input class="scrub" type="range" min={ip} max={op - 1} step="1" value={Math.round(frame)} aria-label={t('motion.playhead')} oninput={(e) => { pause(); frame = +(e.target as HTMLInputElement).value; }} />
			<span class="tc">{Math.round(frame)} / {op - 1}</span>
			<select class="input sm" bind:value={speed} aria-label={t('motion.speed')}>{#each [0.25, 0.5, 1, 1.5, 2] as s (s)}<option value={s}>{s}×</option>{/each}</select>
			<div class="bgs" role="radiogroup" aria-label={t('motion.background')}>
				<button role="radio" aria-checked={bg === null} class="bgc checker" aria-label={t('image.dlg.bg.transparent')} onclick={() => (bg = null)}></button>
				<button role="radio" aria-checked={bg === '#ffffff'} class="bgc" style:background="#fff" aria-label={t('image.dlg.bg.white')} onclick={() => (bg = '#ffffff')}></button>
				<button role="radio" aria-checked={bg === '#000000'} class="bgc" style:background="#000" aria-label="#000" onclick={() => (bg = '#000000')}></button>
				<input type="color" value={bg ?? '#12141b'} aria-label={t('motion.background')} oninput={(e) => (bg = (e.target as HTMLInputElement).value)} />
			</div>
		</div>
	{/if}
</div>

<style>
	.viewer { height: 100%; display: flex; flex-direction: column; min-height: 0; }
	.empty { margin: auto; max-width: 520px; text-align: center; display: grid; justify-items: center; gap: 12px; padding: 32px 20px; border: 2px dashed rgb(255 255 255 / 0.16); border-radius: var(--radius-lg); background: rgb(0 0 0 / 0.16); }
	.empty.over { border-color: var(--accent); background: var(--accent-soft); }
	.empty > :global(svg) { color: var(--accent); }
	.empty h2 { font-size: 1.15rem; }
	.empty p { color: var(--text-2); font-size: 0.9rem; }
	.acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
	.acts .btn { min-height: 44px; }
	.top { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--border); }
	.fname { font-size: 0.86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 30%; }
	.badge { font-size: 0.74rem; color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
	.sp { flex: 1; }
	.btn.sm { padding: 6px 10px; font-size: 0.8rem; min-height: 34px; }
	.btn.icon.sm { padding: 6px; }
	.body { flex: 1; display: grid; grid-template-columns: 1fr 320px; min-height: 0; }
	.stage { position: relative; min-height: 0; background: #101219; }
	.side { display: flex; flex-direction: column; min-height: 0; border-left: 1px solid var(--border); }
	.tabs { display: flex; gap: 2px; padding: 6px 6px 0; overflow-x: auto; scrollbar-width: none; }
	.tabs button { display: inline-flex; align-items: center; gap: 5px; padding: 7px 8px; border: 0; border-radius: 8px 8px 0 0; background: transparent; color: var(--text-3); font-size: 0.76rem; white-space: nowrap; }
	.tabs button[aria-selected='true'] { color: var(--text); background: rgb(255 255 255 / 0.05); box-shadow: inset 0 -2px 0 var(--accent); }
	.pane { padding: 12px; overflow: auto; display: grid; gap: 10px; align-content: start; }
	.muted { color: var(--text-2); font-size: 0.84rem; }
	.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; }
	.sw { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 8px; padding: 5px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); font-family: var(--mono); font-size: 0.74rem; cursor: pointer; }
	.sw small { color: var(--text-3); }
	input[type='color'] { width: 34px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer; }
	.layers { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
	.layers li { display: grid; grid-template-columns: 28px 1fr auto 28px; align-items: center; gap: 4px; padding-right: 4px; border-radius: 6px; font-size: 0.8rem; }
	.layers li:hover { background: rgb(255 255 255 / 0.04); }
	.layers li.hidden .ln { opacity: 0.45; }
	.layers small { color: var(--text-3); font-size: 0.68rem; }
	.ln { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ic { width: 28px; height: 28px; display: grid; place-items: center; border: 0; border-radius: 6px; background: none; color: var(--text-2); }
	.ic:hover { background: var(--surface-3); color: var(--text); }
	.row2 { display: flex; gap: 8px; align-items: end; }
	.row2 > * { flex: 1; min-width: 0; }
	.mini { display: grid; gap: 3px; font-size: 0.72rem; color: var(--text-3); }
	.mini .input { padding: 6px 8px; }
	.info { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; font-size: 0.84rem; }
	.info dt { color: var(--text-3); }
	.info dd { margin: 0; font-variant-numeric: tabular-nums; }
	.seg button[aria-pressed='true'] { background: var(--surface-3); color: var(--text); }
	.transport { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--border); flex-wrap: wrap; }
	.play { background: var(--accent); color: #fff; border-color: transparent; width: 40px; height: 40px; border-radius: 50%; }
	.btn.on { color: var(--accent); }
	.scrub { flex: 1; min-width: 140px; accent-color: var(--accent); }
	.tc { font-variant-numeric: tabular-nums; font-size: 0.8rem; color: var(--text-2); min-width: 72px; }
	.input.sm { width: auto; padding: 5px 8px; font-size: 0.8rem; }
	.bgs { display: flex; gap: 4px; align-items: center; }
	.bgc { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); padding: 0; }
	.bgc[aria-checked='true'] { box-shadow: 0 0 0 2px var(--accent); }
	.checker { background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
	@media (max-width: 900px) {
		.body { grid-template-columns: 1fr; grid-template-rows: minmax(220px, 1fr) auto; }
		.side { border-left: 0; border-top: 1px solid var(--border); max-height: 38dvh; }
		.hide-sm { display: none; }
		.tabs button span { display: none; }
	}
</style>
