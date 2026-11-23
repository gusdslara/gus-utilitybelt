<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { doc } from '#lib/image/doc.svelte.ts';
	import { colors, toHex } from '#lib/image/colors.svelte.ts';
	import { EXPORT_FORMATS, defaultExportOptions, exportSupport, exportDoc, suggestName, saveBlob, OPEN_ACCEPT, openImageFile, type ExportFormat } from '#lib/image/io.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import FilterDialog from './FilterDialog.svelte';
	import { X, Link, Unlink, Sparkles, TriangleAlert, Cpu, Download, ClipboardPaste, FolderOpen, ImageDown } from '@lucide/svelte';

	let dlg: HTMLDialogElement | undefined = $state();
	const d = $derived(editor.dialog);

	$effect(() => {
		if (d && dlg && !dlg.open) dlg.showModal();
		if (!d && dlg?.open) dlg.close();
	});

	function close() {
		if (d?.kind === 'ai') d.resolve(false);
		else editor.dialog = null;
	}

	// ----- Nova imagem -----
	const PRESETS = [
		{ id: 'hd', w: 1920, h: 1080 }, { id: 'square', w: 1080, h: 1080 }, { id: 'story', w: 1080, h: 1920 },
		{ id: 'post45', w: 1080, h: 1350 }, { id: 'og', w: 1200, h: 630 }, { id: 'a4', w: 2480, h: 3508 },
		{ id: 'icon', w: 512, h: 512 }, { id: 'banner', w: 1500, h: 500 }
	] as const;
	let nw = $state(1920), nh = $state(1080), nbg = $state<'white' | 'transparent' | 'primary' | 'secondary'>('white');

	// Atalho do diálogo "Nova imagem": quem já tirou um print só cola/arrasta e começa a editar.
	let newFileInput: HTMLInputElement | undefined = $state();
	let newDragOver = $state(false);
	let newBusy = $state(false);

	async function openAsNewImage(file: Blob, name: string) {
		newBusy = true;
		try {
			const opened = await openImageFile(file, name);
			editor.commitFloating();
			doc.load(opened);
			editor.dialog = null;
			editor.fit();
			editor.invalidate();
		} catch (err) {
			editor.notify('error', t('image.toast.openFailed', { message: err instanceof Error ? err.message : String(err) }));
		} finally {
			newBusy = false;
			newDragOver = false;
		}
	}

	async function pasteAsNewImage() {
		editor.dialog = null;
		await editor.paste('newImage');
	}

	function onDialogPaste(e: ClipboardEvent) {
		if (d?.kind !== 'new') return;
		const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
		if (!file) return; // texto colado nos campos de largura/altura segue normal
		e.preventDefault();
		openAsNewImage(file, file.name && file.name !== 'image.png' ? file.name : t('image.untitled'));
	}

	const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
	function onDialogDragOver(e: DragEvent) {
		if (d?.kind !== 'new' || !hasFiles(e)) return;
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		newDragOver = true;
	}
	function onDialogDrop(e: DragEvent) {
		if (d?.kind !== 'new' || !hasFiles(e)) return;
		e.preventDefault();
		e.stopPropagation();
		newDragOver = false;
		const f = e.dataTransfer?.files?.[0];
		if (f) openAsNewImage(f, f.name);
	}

	// ----- Redimensionar / tela -----
	let rw = $state(0), rh = $state(0), rlock = $state(true), rpct = $state(100), runit = $state<'px' | '%'>('px');
	let rq = $state<'high' | 'medium' | 'low' | 'pixel'>('high');
	let anchor = $state([0.5, 0.5]);
	let cbg = $state<'transparent' | 'secondary'>('transparent');

	$effect(() => {
		if (d?.kind === 'resize' || d?.kind === 'canvas') {
			untrack(() => {
				rw = doc.width;
				rh = doc.height;
				rpct = 100;
			});
		}
	});

	const ratio = $derived(doc.width / Math.max(1, doc.height));
	function setW(v: number) {
		rw = Math.max(1, Math.round(v));
		if (rlock) rh = Math.max(1, Math.round(rw / ratio));
	}
	function setH(v: number) {
		rh = Math.max(1, Math.round(v));
		if (rlock) rw = Math.max(1, Math.round(rh * ratio));
	}
	function setPct(v: number) {
		rpct = v;
		rw = Math.max(1, Math.round((doc.width * v) / 100));
		rh = Math.max(1, Math.round((doc.height * v) / 100));
	}
	const mp = (w: number, h: number) => ((w * h) / 1e6).toFixed(1);

	// ----- Exportar -----
	let fmt = $state<ExportFormat>('png');
	let eopts = $state(defaultExportOptions());
	let support = $state<Record<ExportFormat, boolean> | null>(null);
	let exporting = $state(false);
	let estimate = $state<string>('');
	const fmtInfo = $derived(EXPORT_FORMATS.find((f) => f.id === fmt)!);
	onMount(() => {
		exportSupport().then((s) => (support = s));
	});

	async function doExport() {
		exporting = true;
		try {
			editor.commitFloating();
			const blob = await exportDoc(doc, fmt, $state.snapshot(eopts));
			const name = suggestName(doc.name || t('image.untitled'), fmt);
			const r = await saveBlob(blob, name);
			if (r !== 'cancelled') {
				editor.notify('ok', t('image.toast.exported', { name, size: fmtSize(blob.size) }));
				doc.dirty = false;
				editor.dialog = null;
			}
		} catch (err) {
			editor.notify('error', t('image.toast.exportFailed', { message: err instanceof Error ? err.message : String(err) }));
		} finally {
			exporting = false;
		}
	}

	// Estimativa de tamanho (debounce) para formatos com qualidade.
	let estTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		if (d?.kind !== 'export') return;
		const f = fmt, o = $state.snapshot(eopts);
		void doc.rev;
		clearTimeout(estTimer);
		estimate = '';
		if (doc.width * doc.height * o.scale * o.scale > 16e6 || f === 'psd' || f === 'svg') return;
		estTimer = setTimeout(async () => {
			try {
				const b = await exportDoc(doc, f, o);
				estimate = fmtSize(b.size);
			} catch {
				estimate = '';
			}
		}, 350);
	});

	function fmtSize(n: number) {
		return n > 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
	}

	// ----- IA -----
	let aiEnv = $state<{ webgpu: boolean; lowEnd: boolean; cores: number; memoryGB?: number } | null>(null);
	let aiCached = $state<boolean | null>(null);
	let aiRemember = $state(false);
	let aiMeta = $state<{ mb: number; commercial: boolean } | null>(null);
	$effect(() => {
		if (d?.kind !== 'ai') return;
		const model = d.model;
		import('#lib/image/ml.ts').then(async (ml) => {
			aiMeta = { mb: ml.ML_MODELS[model].approxMB, commercial: ml.ML_MODELS[model].commercial };
			aiEnv = await ml.mlEnvironment();
			aiCached = await ml.mlCached(model);
		});
	});

	const SHORTCUTS: [string, string][] = [
		['Ctrl+Z / Ctrl+Y', 'image.cmd.undo'], ['Ctrl+A / Ctrl+D', 'image.cmd.selectAll'], ['Ctrl+Shift+I', 'image.cmd.invertSelection'],
		['Ctrl+C / X / V', 'image.cmd.copy'], ['Ctrl+Shift+C', 'image.cmd.copyMerged'], ['Ctrl+Shift+V', 'image.cmd.pasteNewImage'],
		['Ctrl+Shift+X', 'image.cmd.cropToSelection'], ['Ctrl+R / Ctrl+Shift+R', 'image.cmd.resize'], ['Ctrl+S', 'image.cmd.export'],
		['Ctrl+Shift+N / Ctrl+J / Ctrl+E', 'image.cmd.addLayer'], ['Ctrl+F', 'image.cmd.repeatFilter'], ['Ctrl+0 / Ctrl+1', 'image.cmd.fit'],
		['Ctrl + roda / pinça', 'image.cmd.zoomIn'], ['Espaço + arrastar', 'image.tools.hand'], ['[ / ]', 'image.opt.size'],
		['X / D', 'image.color.swap'], ['Shift / Alt', 'image.selMode.add'], ['Enter / Esc', 'image.opt.commit'], ['Delete / Backspace', 'image.cmd.delete']
	];
</script>

<svelte:window onpaste={onDialogPaste} />

<dialog bind:this={dlg} class="dlg" class:wide={d?.kind === 'export'} class:side={d?.kind === 'filter'} onclose={() => editor.dialog && close()} oncancel={(e) => { e.preventDefault(); close(); }} onkeydown={(e) => e.stopPropagation()} 
	ondragover={onDialogDragOver} ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) newDragOver = false; }} ondrop={onDialogDrop}>
	{#if d}
		{#if d.kind === 'filter'}
			<FilterDialog id={d.id} />
		{:else}
			<header>
				<h2>
					{#if d.kind === 'new'}{t('image.cmd.new')}
					{:else if d.kind === 'resize'}{t('image.cmd.resize')}
					{:else if d.kind === 'canvas'}{t('image.cmd.canvasSize')}
					{:else if d.kind === 'export'}{t('image.cmd.export')}
					{:else if d.kind === 'number'}{d.title}
					{:else if d.kind === 'ai'}<Sparkles size={18} />{t('imageAi.warnTitle')}
					{:else}{t('image.cmd.shortcuts')}{/if}
				</h2>
				<button class="btn icon ghost" aria-label={t('common.close')} onclick={close}><X size={18} /></button>
			</header>

			<div class="body">
				{#if d.kind === 'new'}
					<div class="from-image" class:over={newDragOver} aria-busy={newBusy}>
						<ImageDown size={20} strokeWidth={1.75} />
						<p>{newDragOver ? t('image.dlg.fromImageDrop') : t('image.dlg.fromImage')}</p>
						<div class="row">
							<button class="btn" disabled={newBusy} onclick={pasteAsNewImage}><ClipboardPaste size={16} />{t('image.dlg.pasteClip')}</button>
							<button class="btn ghost" disabled={newBusy} onclick={() => newFileInput?.click()}><FolderOpen size={16} />{t('image.dlg.openFile')}</button>
						</div>
						<input bind:this={newFileInput} type="file" accept={OPEN_ACCEPT} hidden onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) openAsNewImage(f, f.name); (e.target as HTMLInputElement).value = ''; }} />
					</div>
					<div class="presets">
						{#each PRESETS as p (p.id)}
							<button class="preset" aria-pressed={nw === p.w && nh === p.h} onclick={() => { nw = p.w; nh = p.h; }}>
								<span class="pv" style:aspect-ratio="{p.w} / {p.h}"></span>
								<strong>{t(`image.newPresets.${p.id}`)}</strong><small>{p.w}×{p.h}</small>
							</button>
						{/each}
					</div>
					<div class="grid2">
						<label class="field"><span class="label">{t('image.dlg.width')}</span><input class="input" type="number" min="1" max="16384" bind:value={nw} /></label>
						<label class="field"><span class="label">{t('image.dlg.height')}</span><input class="input" type="number" min="1" max="16384" bind:value={nh} /></label>
					</div>
					<div class="field">
						<span class="label">{t('image.dlg.background')}</span>
						<div class="seg" role="radiogroup">
							{#each ['white', 'transparent', 'primary', 'secondary'] as const as b (b)}
								<button role="radio" aria-checked={nbg === b} onclick={() => (nbg = b)}>{t(`image.dlg.bg.${b}`)}</button>
							{/each}
						</div>
					</div>
					<p class="hint">{mp(nw, nh)} MP · {t('image.dlg.memory', { mb: Math.round((nw * nh * 4) / 1e6) })}</p>
				{:else if d.kind === 'resize' || d.kind === 'canvas'}
					{#if d.kind === 'resize'}
						<div class="seg" role="radiogroup">
							<button role="radio" aria-checked={runit === 'px'} onclick={() => (runit = 'px')}>{t('image.dlg.byPixels')}</button>
							<button role="radio" aria-checked={runit === '%'} onclick={() => (runit = '%')}>{t('image.dlg.byPercent')}</button>
						</div>
					{/if}
					{#if runit === '%' && d.kind === 'resize'}
						<Slider label={t('image.dlg.percent')} value={rpct} min={1} max={800} unit="%" onchange={setPct} />
					{/if}
					<div class="sizes">
						<label class="field"><span class="label">{t('image.dlg.width')}</span><input class="input" type="number" min="1" max="16384" value={rw} onchange={(e) => setW(+(e.target as HTMLInputElement).value)} /></label>
						<button class="btn icon lock" class:on={rlock} aria-pressed={rlock} title={t('image.dlg.keepAspect')} aria-label={t('image.dlg.keepAspect')} onclick={() => (rlock = !rlock)}>
							{#if rlock}<Link size={16} />{:else}<Unlink size={16} />{/if}
						</button>
						<label class="field"><span class="label">{t('image.dlg.height')}</span><input class="input" type="number" min="1" max="16384" value={rh} onchange={(e) => setH(+(e.target as HTMLInputElement).value)} /></label>
					</div>
					{#if d.kind === 'resize'}
						<label class="field"><span class="label">{t('image.dlg.resample')}</span>
							<select class="input" bind:value={rq}>
								{#each ['high', 'medium', 'low', 'pixel'] as const as q (q)}<option value={q}>{t(`image.dlg.quality.${q}`)}</option>{/each}
							</select>
						</label>
					{:else}
						<div class="field">
							<span class="label">{t('image.dlg.anchor')}</span>
							<div class="anchor" role="radiogroup" aria-label={t('image.dlg.anchor')}>
								{#each [0, 0.5, 1] as ay (ay)}
									{#each [0, 0.5, 1] as ax (ax)}
										<button role="radio" aria-checked={anchor[0] === ax && anchor[1] === ay} aria-label={`${ax},${ay}`} onclick={() => (anchor = [ax, ay])}></button>
									{/each}
								{/each}
							</div>
						</div>
						<div class="field">
							<span class="label">{t('image.dlg.background')}</span>
							<div class="seg" role="radiogroup">
								<button role="radio" aria-checked={cbg === 'transparent'} onclick={() => (cbg = 'transparent')}>{t('image.dlg.bg.transparent')}</button>
								<button role="radio" aria-checked={cbg === 'secondary'} onclick={() => (cbg = 'secondary')}>{t('image.dlg.bg.secondary')}</button>
							</div>
						</div>
					{/if}
					<p class="hint">{doc.width}×{doc.height} → {rw}×{rh} · {mp(rw, rh)} MP</p>
				{:else if d.kind === 'export'}
					<div class="formats" role="radiogroup" aria-label={t('image.dlg.format')}>
						{#each EXPORT_FORMATS as f (f.id)}
							{@const ok = !support || support[f.id]}
							<button role="radio" aria-checked={fmt === f.id} disabled={!ok} title={ok ? '' : t('image.dlg.unsupported')} onclick={() => (fmt = f.id)}>
								<strong>{f.ext.toUpperCase().replace('.', '')}</strong>
								<small>{f.layered ? t('image.dlg.layers') : f.vector ? t('image.dlg.vector') : f.lossy ? t('image.dlg.lossy') : t('image.dlg.lossless')}</small>
							</button>
						{/each}
					</div>
					<p class="hint">{t(`image.formatHints.${fmt}`)}</p>
					{#if fmtInfo.lossy}
						<Slider label={t('image.dlg.quality.label')} value={eopts.quality} min={0.05} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (eopts.quality = v)} />
					{/if}
					{#if !fmtInfo.alpha}
						<label class="crow"><span>{t('image.dlg.background')}</span><input type="color" bind:value={eopts.background} /></label>
					{/if}
					{#if fmt === 'ico'}
						<div class="field">
							<span class="label">{t('image.dlg.icoSizes')}</span>
							<div class="row">
								{#each [16, 24, 32, 48, 64, 128, 256] as s (s)}
									<label class="check"><input type="checkbox" checked={eopts.icoSizes.includes(s)} onchange={(e) => (eopts.icoSizes = (e.target as HTMLInputElement).checked ? [...eopts.icoSizes, s].sort((a, b) => a - b) : eopts.icoSizes.filter((x) => x !== s))} />{s}</label>
								{/each}
							</div>
						</div>
					{:else}
						<Slider label={t('image.dlg.scale')} value={eopts.scale} min={0.1} max={4} step={0.05} scale={100} unit="%" onchange={(v) => (eopts.scale = v)} />
					{/if}
					{#if fmt === 'svg'}
						<label class="check"><input type="checkbox" bind:checked={eopts.svgEmbedRaster} />{t('image.dlg.svgEmbed')}</label>
					{/if}
					<p class="hint">{Math.round(doc.width * eopts.scale)}×{Math.round(doc.height * eopts.scale)}{#if estimate} · ≈ {estimate}{/if}</p>
				{:else if d.kind === 'number'}
					{@const nd = d}
					<Slider label={nd.label} value={nd.value} min={nd.min} max={nd.max} unit={nd.unit ?? 'px'} onchange={(v) => (nd.value = v)} />
				{:else if d.kind === 'ai'}
					<p>{t('imageAi.warnBody', { mb: aiMeta?.mb ?? '…' })}</p>
					<div class="ai-info">
						<span><Cpu size={14} />{aiEnv ? [aiEnv.webgpu ? 'WebGPU' : 'WebAssembly (CPU)', `${aiEnv.cores} ${t('image.dlg.cores')}`, aiEnv.memoryGB ? `${aiEnv.memoryGB} GB` : ''].filter(Boolean).join(' · ') : '…'}</span>
						<span><Download size={14} />{aiCached === null ? '…' : aiCached ? t('imageAi.cached') : t('imageAi.notCached')}</span>
					</div>
					{#if aiEnv?.lowEnd}<p class="warn"><TriangleAlert size={16} />{t('imageAi.warnLowEnd')}</p>{/if}
					{#if aiMeta && !aiMeta.commercial}<p class="warn"><TriangleAlert size={16} />{t('imageAi.warnLicense', { model: t(`imageAi.models.${d.model}.title`) })}</p>{/if}
					<p class="hint">{t('imageAi.stopHint')}</p>
					<label class="check"><input type="checkbox" bind:checked={aiRemember} />{t('imageAi.dontAsk')}</label>
				{:else}
					<dl class="keys">
						{#each SHORTCUTS as [k, label] (k)}
							<dt><kbd>{k}</kbd></dt>
							<dd>{t(label as Parameters<typeof t>[0])}</dd>
						{/each}
					</dl>
				{/if}
			</div>

			<footer>
				{#if d.kind === 'ai'}
					{@const ai = d}
					<button class="btn ghost" onclick={() => ai.resolve(false)}>{t('imageAi.cancel')}</button>
					<button class="btn primary" onclick={() => { editor.acceptAi(aiRemember); ai.resolve(true); }}><Sparkles size={16} />{t('imageAi.proceed')}</button>
				{:else if d.kind === 'shortcuts'}
					<button class="btn primary" onclick={close}>{t('common.close')}</button>
				{:else}
					<button class="btn ghost" onclick={close}>{t('common.cancel')}</button>
					{#if d.kind === 'new'}
						<button class="btn primary" onclick={() => {
							const bg = nbg === 'white' ? '#ffffff' : nbg === 'transparent' ? null : toHex(colors[nbg]);
							editor.commitFloating();
							doc.create(Math.min(16384, Math.max(1, nw)), Math.min(16384, Math.max(1, nh)), bg, t('image.untitled'));
							editor.dialog = null;
							editor.fit();
							editor.invalidate();
						}}>{t('image.dlg.create')}</button>
					{:else if d.kind === 'resize'}
						<button class="btn primary" disabled={rw === doc.width && rh === doc.height} onclick={() => { editor.commitFloating(); doc.resize(rw, rh, rq); editor.dialog = null; editor.fit(); editor.invalidate(); }}>{t('image.dlg.apply')}</button>
					{:else if d.kind === 'canvas'}
						<button class="btn primary" onclick={() => { editor.commitFloating(); doc.canvasSize(rw, rh, anchor[0], anchor[1], cbg === 'secondary' ? toHex(colors.secondary) : null); editor.dialog = null; editor.fit(); editor.invalidate(); }}>{t('image.dlg.apply')}</button>
					{:else if d.kind === 'export'}
						<button class="btn primary" disabled={exporting} onclick={doExport}><Download size={16} />{exporting ? t('common.loading') : t('image.dlg.save')}</button>
					{:else if d.kind === 'number'}
						{@const nd = d}
						<button class="btn primary" onclick={() => { editor.dialog = null; nd.run(nd.value); }}>{t('image.dlg.apply')}</button>
					{/if}
				{/if}
			</footer>
		{/if}
	{/if}
</dialog>

<style>
	.dlg {
		width: min(480px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); padding: 0; border: 1px solid var(--border); border-radius: var(--radius-lg);
		background: var(--surface-solid); color: var(--text); box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); overflow: hidden;
	}
	.dlg[open] { display: flex; flex-direction: column; animation: pop 0.2s var(--ease); }
	.dlg.wide { width: min(620px, calc(100vw - 24px)); }
	/* Filtro: painel lateral sem escurecer o fundo, para ver a prévia no canvas. */
	.dlg.side { width: min(380px, calc(100vw - 24px)); margin: 72px 16px auto auto; max-height: calc(100dvh - 120px); }
	.dlg.side::backdrop { background: transparent; backdrop-filter: none; }
	.dlg::backdrop { background: rgb(4 6 10 / 0.6); backdrop-filter: blur(3px); }
	@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
	header { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--border); }
	h2 { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 650; }
	.body { padding: 16px 18px; display: grid; gap: 14px; overflow: auto; }
	footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--border); }
	footer .btn { min-height: 40px; }
	.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.from-image {
		display: grid; justify-items: center; gap: 8px; padding: 14px 12px; text-align: center;
		border: 1.5px dashed var(--border); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-2);
		transition: border-color 0.15s var(--ease), background-color 0.15s var(--ease);
	}
	.from-image p { margin: 0; font-size: 0.86rem; }
	.from-image .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
	.from-image .btn { min-height: 40px; }
	.from-image.over { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
	.from-image[aria-busy='true'] { opacity: 0.6; }
	@media (prefers-reduced-motion: reduce) { .from-image { transition: none; } }
	.presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
	.preset { display: grid; gap: 4px; justify-items: center; padding: 10px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-2); font-size: 0.78rem; }
	.preset[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); }
	.preset small { color: var(--text-3); font-variant-numeric: tabular-nums; }
	.pv { height: 28px; max-width: 48px; border: 1.5px solid var(--text-2); border-radius: 3px; }
	.sizes { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 8px; }
	.lock { margin-bottom: 2px; }
	.lock.on { color: var(--accent); }
	.anchor { display: grid; grid-template-columns: repeat(3, 36px); gap: 4px; }
	.anchor button { width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); }
	.anchor button[aria-checked='true'] { background: var(--accent); border-color: var(--accent); }
	.formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
	.formats button { display: grid; gap: 2px; padding: 10px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-2); }
	.formats button[aria-checked='true'] { border-color: var(--accent); background: var(--accent-soft); }
	.formats button:disabled { opacity: 0.4; cursor: not-allowed; }
	.formats small { font-size: 0.68rem; color: var(--text-3); }
	.crow { display: inline-flex; align-items: center; gap: 10px; font-size: 0.84rem; color: var(--text-2); }
	input[type='color'] { width: 44px; height: 32px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
	.ai-info { display: flex; flex-wrap: wrap; gap: 8px; }
	.ai-info span { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; background: var(--surface-2); font-size: 0.8rem; color: var(--text-2); }
	.warn { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: var(--radius-sm); background: rgb(255 181 71 / 0.1); border: 1px solid rgb(255 181 71 / 0.35); color: #ffd79a; font-size: 0.86rem; }
	.warn :global(svg) { flex-shrink: 0; margin-top: 2px; }
	.keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; font-size: 0.86rem; }
	.keys dd { margin: 0; color: var(--text-2); }
	kbd { font-family: var(--mono); font-size: 0.74rem; padding: 2px 6px; border-radius: 5px; border: 1px solid var(--border); background: var(--surface-2); }
	@media (max-width: 560px) {
		.dlg { width: 100vw; max-width: 100vw; max-height: 92dvh; margin: auto 0 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
		.grid2 { grid-template-columns: 1fr; }
		.dlg.side { margin: auto 0 0; width: 100vw; max-height: 48dvh; }
	}
</style>
