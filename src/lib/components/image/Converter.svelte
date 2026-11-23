<script lang="ts">
	// Conversor de imagens em lote (modo fácil do app Imagem): soltar/colar/escolher arquivos, escolher o
	// formato final e converter em paralelo (pool de Web Workers). Nada sai do navegador.
	import { onDestroy, onMount, untrack, type Snippet } from 'svelte';
	import {
		ConvertQueue, CONVERT_ACCEPT, OUT_FORMATS, defaultConvertOptions, sniffKind, outName, buildPdf, zipFiles, nativeEncodeSupport, formatBytes,
		type ConvertOptions, type ConvertResult, type InKind, type OutFormat
	} from '#lib/image/convert.ts';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import {
		Upload, FolderOpen, ClipboardPaste, Download, FileArchive, FolderDown, Trash, X, CircleStop, Check, CircleAlert, LoaderCircle,
		Image as ImageIcon, Pencil, ShieldCheck, Layers, Zap, RefreshCw, FileText
	} from '@lucide/svelte';

	let { preset, onEdit, after }: { preset?: 'compress' | 'resize'; onEdit?: (blob: Blob, name: string) => void; after?: Snippet } = $props();

	type Item = {
		id: string; file: File; kind: InKind; url: string | null;
		status: 'queued' | 'working' | 'done' | 'error'; progress: number;
		result?: ConvertResult; error?: string; outUrl?: string;
	};

	const PREVIEWABLE: InKind[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'ico', 'svg'];
	let items = $state<Item[]>([]);
	let opts = $state<ConvertOptions>(defaultConvertOptions());
	let useMaxKB = $state(false);
	let maxKB = $state(200);
	let pdfMerge = $state(true);
	let running = $state(false);
	let dragOver = $state(false);
	let support = $state<{ webp: boolean; avif: boolean } | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let dirInput: HTMLInputElement | undefined = $state();
	let queue: ConvertQueue | null = null;
	let lastSig = $state('');
	let zipping = $state(0);
	let seq = 0;

	// Formato inicial: ?to= ou rota de SEO; presets ajustam as opções.
	untrack(() => {
		const to = ui.convertTo === 'jpg' ? 'jpeg' : ui.convertTo === 'tif' ? 'tiff' : ui.convertTo;
		if (to && (to === 'same' || OUT_FORMATS.some((f) => f.id === to))) opts.format = to as OutFormat;
		if (preset === 'compress') {
			if (!to) opts.format = 'same';
			useMaxKB = true;
		}
		if (preset === 'resize') opts.resize = { mode: 'fit', width: 1920, height: 1920, upscale: false };
		// Página aberta direto no conversor: o formato inicial não precisa aparecer na URL.
		if (ui.defaults.imageMode === 'convert' && !ui.defaults.convertTo) ui.defaults.convertTo = opts.format === 'jpeg' ? 'jpg' : opts.format;
	});

	$effect(() => {
		// Mantém ?to= em sincronia (link compartilhável).
		ui.convertTo = opts.format === 'jpeg' ? 'jpg' : opts.format;
	});

	onMount(() => {
		nativeEncodeSupport().then((s) => (support = s));
	});

	onDestroy(() => {
		queue?.stop();
		for (const it of items) revoke(it);
	});

	const fmt = $derived(OUT_FORMATS.find((f) => f.id === opts.format));
	const lossy = $derived(opts.format === 'same' || !!fmt?.lossy);
	const needsBg = $derived(!!fmt && !fmt.alpha);
	const done = $derived(items.filter((i) => i.status === 'done'));
	const failed = $derived(items.filter((i) => i.status === 'error'));
	const pending = $derived(items.filter((i) => i.status === 'queued' || i.status === 'working'));
	const totalIn = $derived(done.reduce((s, i) => s + i.file.size, 0));
	const totalOut = $derived(done.reduce((s, i) => s + (i.result?.blob.size ?? 0), 0));
	const overall = $derived(items.length ? items.reduce((s, i) => s + (i.status === 'done' || i.status === 'error' ? 1 : i.status === 'working' ? i.progress : 0), 0) / items.length : 0);
	const sig = $derived(JSON.stringify({ o: $state.snapshot(opts), useMaxKB, maxKB }));
	const stale = $derived(done.length > 0 && sig !== lastSig);
	const canDirSave = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

	function revoke(it: Item) {
		if (it.url) URL.revokeObjectURL(it.url);
		if (it.outUrl) URL.revokeObjectURL(it.outUrl);
	}

	async function add(files: Iterable<File>) {
		const list = [...files].filter((f) => f.size > 0);
		for (const file of list) {
			const kind = await sniffKind(file, file.name);
			if (kind === 'unknown' && !file.type.startsWith('image/')) continue;
			items.push({ id: `f${++seq}`, file, kind, url: PREVIEWABLE.includes(kind) ? URL.createObjectURL(file) : null, status: 'queued', progress: 0 });
		}
	}

	function remove(it: Item) {
		revoke(it);
		items = items.filter((x) => x !== it);
	}

	function clear() {
		queue?.stop();
		for (const it of items) revoke(it);
		items = [];
		running = false;
	}

	async function pasteFromClipboard() {
		try {
			const clip = await navigator.clipboard.read();
			const files: File[] = [];
			for (const c of clip) {
				const type = c.types.find((ty) => ty.startsWith('image/'));
				if (type) files.push(new File([await c.getType(type)], `${t('imageConv.pasted')}-${files.length + 1}.${type.split('/')[1]}`, { type }));
			}
			if (files.length) add(files);
		} catch {
			/* sem permissão: Ctrl+V continua funcionando pelo evento paste */
		}
	}

	function onPaste(e: ClipboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea')) return;
		const files = [...(e.clipboardData?.files ?? [])];
		if (files.length) {
			e.preventDefault();
			add(files);
		}
	}

	function currentOpts(): ConvertOptions {
		const o = $state.snapshot(opts) as ConvertOptions;
		o.maxKB = useMaxKB && lossy ? maxKB : null;
		return o;
	}

	async function convert(onlyPending = false) {
		if (!items.length || running) return;
		const targets = items.filter((i) => !onlyPending || i.status !== 'done');
		for (const it of targets) {
			if (it.outUrl) URL.revokeObjectURL(it.outUrl);
			it.status = 'queued';
			it.progress = 0;
			it.result = undefined;
			it.outUrl = undefined;
			it.error = undefined;
		}
		running = true;
		lastSig = sig;
		const taken = new Set<string>();
		queue = new ConvertQueue();
		const byId = new Map(items.map((i) => [i.id, i]));
		await queue.run(
			targets.map((i) => ({ id: i.id, file: i.file })),
			currentOpts(),
			{
				onStart: (id) => {
					const it = byId.get(id);
					if (it) it.status = 'working';
				},
				onProgress: (id, v) => {
					const it = byId.get(id);
					if (it) it.progress = v;
				},
				onDone: (id, r) => {
					const it = byId.get(id);
					if (!it) return;
					r.name = outName(it.file.name, opts.format, it.kind, taken);
					it.result = r;
					it.outUrl = URL.createObjectURL(r.blob);
					it.status = 'done';
					it.progress = 1;
				},
				onError: (id, msg) => {
					const it = byId.get(id);
					if (!it) return;
					it.status = 'error';
					it.error = msg === 'aborted' ? t('imageConv.stopped') : msg;
				}
			}
		);
		running = false;
		queue = null;
		// Um arquivo só: baixa direto (menos cliques).
		if (items.length === 1 && done.length === 1 && opts.format !== 'pdf') download(done[0]);
	}

	function stop() {
		queue?.stop();
		running = false;
	}

	function save(blob: Blob, name: string) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(a.href), 4000);
	}

	function download(it: Item) {
		if (it.result) save(it.result.blob, it.result.name);
	}

	async function downloadZip() {
		zipping = 0.01;
		try {
			const zip = await zipFiles(done.map((i) => ({ name: i.result!.name, blob: i.result!.blob })), (v) => (zipping = Math.max(0.01, v)));
			save(zip, `${t('imageConv.zipName')}-${opts.format === 'jpeg' ? 'jpg' : opts.format}.zip`);
		} finally {
			zipping = 0;
		}
	}

	function downloadPdf() {
		const pages = done.map((i) => i.result?.pdfPage).filter((p): p is NonNullable<typeof p> => !!p);
		if (pages.length) save(buildPdf(pages, opts.pdfPage), `${t('imageConv.pdfName')}.pdf`);
	}

	async function saveToFolder() {
		try {
			// @ts-expect-error File System Access API (Chrome/Edge)
			const dir: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
			for (const it of done) {
				const fh = await dir.getFileHandle(it.result!.name, { create: true });
				const w = await fh.createWritable();
				await w.write(it.result!.blob);
				await w.close();
			}
		} catch {
			/* cancelado */
		}
	}

	const label = (f: OutFormat) => (f === 'same' ? t('imageConv.same') : (OUT_FORMATS.find((x) => x.id === f)?.ext ?? f).replace('.', '').toUpperCase());
	const kindLabel = (k: InKind) => (k === 'jpeg' ? 'JPG' : k === 'unknown' ? '?' : k.toUpperCase());
	const saving = (i: Item) => (i.result ? Math.round((1 - i.result.blob.size / i.file.size) * 100) : 0);
	const usesWasm = (f: OutFormat) => !!support && ((f === 'avif' && !support.avif) || (f === 'webp' && !support.webp));
</script>

<svelte:window onpaste={onPaste} />

<input bind:this={fileInput} type="file" accept={CONVERT_ACCEPT} multiple hidden onchange={(e) => { add((e.target as HTMLInputElement).files ?? []); (e.target as HTMLInputElement).value = ''; }} />
<input bind:this={dirInput} type="file" multiple hidden webkitdirectory onchange={(e) => { add((e.target as HTMLInputElement).files ?? []); (e.target as HTMLInputElement).value = ''; }} />

<div class="conv">
	<section
		class="drop"
		class:over={dragOver}
		class:compact={items.length > 0}
		aria-label={t('imageConv.dropLabel')}
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={(e) => { if (e.currentTarget === e.target) dragOver = false; }}
		ondrop={(e) => { e.preventDefault(); dragOver = false; add(e.dataTransfer?.files ?? []); }}
	>
		<Upload size={items.length ? 20 : 32} strokeWidth={1.6} />
		<div class="dtext">
			<strong>{items.length ? t('imageConv.addMore') : t('imageConv.dropTitle')}</strong>
			{#if !items.length}<span>{t('imageConv.dropHint')}</span>{/if}
		</div>
		<div class="dact">
			<button class="btn primary" onclick={() => fileInput?.click()}><ImageIcon size={16} />{t('imageConv.pick')}</button>
			<button class="btn" onclick={() => dirInput?.click()}><FolderOpen size={16} />{t('imageConv.pickFolder')}</button>
			<button class="btn ghost" onclick={pasteFromClipboard}><ClipboardPaste size={16} />{t('imageConv.paste')}</button>
		</div>
		{#if !items.length}
			<ul class="trust">
				<li><ShieldCheck size={14} />{t('imageConv.trustPrivate')}</li>
				<li><Layers size={14} />{t('imageConv.trustBatch')}</li>
				<li><Zap size={14} />{t('imageConv.trustFast')}</li>
			</ul>
		{/if}
	</section>

	<section class="settings" aria-label={t('imageConv.settings')}>
		<div class="field">
			<span class="label">{t('imageConv.to')}</span>
			<div class="formats" role="radiogroup" aria-label={t('imageConv.to')}>
				{#each ['same', ...OUT_FORMATS.map((f) => f.id)] as OutFormat[] as f (f)}
					<button role="radio" aria-checked={opts.format === f} onclick={() => (opts.format = f)}>
						{label(f)}
						{#if usesWasm(f)}<small>wasm</small>{/if}
					</button>
				{/each}
			</div>
			<p class="hint">{t(`imageConv.hints.${opts.format}` as Parameters<typeof t>[0])}</p>
		</div>

		<div class="grid">
			{#if lossy}
				<Slider label={t('imageConv.quality')} value={opts.quality} min={0.05} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (opts.quality = v)} />
				<div class="row">
					<label class="check"><input type="checkbox" bind:checked={useMaxKB} />{t('imageConv.maxKB')}</label>
					{#if useMaxKB}<input class="input num" type="number" min="5" max="100000" bind:value={maxKB} aria-label={t('imageConv.maxKB')} /><span class="unit">KB</span>{/if}
				</div>
			{/if}

			<div class="field">
				<span class="label">{t('imageConv.resize')}</span>
				<div class="seg" role="radiogroup">
					{#each ['none', 'percent', 'fit', 'exact'] as const as m (m)}
						<button role="radio" aria-checked={opts.resize.mode === m} onclick={() => {
							opts.resize = m === 'none' ? { mode: 'none' } : m === 'percent' ? { mode: 'percent', value: 50 } : m === 'fit' ? { mode: 'fit', width: 1920, height: 1920, upscale: false } : { mode: 'exact', width: 1080, height: 1080 };
						}}>{t(`imageConv.resizeModes.${m}`)}</button>
					{/each}
				</div>
				{#if opts.resize.mode === 'percent'}
					{@const r = opts.resize}
					<Slider label="%" value={r.value} min={1} max={400} unit="%" onchange={(v) => (r.value = v)} />
				{:else if opts.resize.mode === 'fit' || opts.resize.mode === 'exact'}
					{@const r = opts.resize}
					<div class="row">
						<label class="mini">{t('image.dlg.width')}<input class="input num" type="number" min="1" max="16384" bind:value={r.width} /></label>
						<span class="x">×</span>
						<label class="mini">{t('image.dlg.height')}<input class="input num" type="number" min="1" max="16384" bind:value={r.height} /></label>
						{#if r.mode === 'fit'}<label class="check"><input type="checkbox" bind:checked={r.upscale} />{t('imageConv.upscale')}</label>{/if}
					</div>
				{/if}
			</div>

			{#if needsBg}
				<label class="crow"><span>{t('imageConv.background')}</span><input type="color" bind:value={opts.background} /></label>
			{/if}
			{#if opts.format === 'svg'}
				<Slider label={t('imageConv.svgColors')} value={opts.svgColors} min={2} max={64} onchange={(v) => (opts.svgColors = v)} />
			{/if}
			{#if opts.format === 'ico'}
				<div class="field">
					<span class="label">{t('image.dlg.icoSizes')}</span>
					<div class="row">
						{#each [16, 24, 32, 48, 64, 128, 256] as s (s)}
							<label class="check"><input type="checkbox" checked={opts.icoSizes.includes(s)} onchange={(e) => (opts.icoSizes = (e.target as HTMLInputElement).checked ? [...opts.icoSizes, s].sort((a, b) => a - b) : opts.icoSizes.filter((x) => x !== s))} />{s}</label>
						{/each}
					</div>
				</div>
			{/if}
			{#if opts.format === 'pdf'}
				<div class="row">
					<label class="check"><input type="checkbox" bind:checked={pdfMerge} />{t('imageConv.pdfMerge')}</label>
					<select class="input sel" bind:value={opts.pdfPage} aria-label={t('imageConv.pdfPage')}>
						{#each ['image', 'a4', 'letter'] as const as p (p)}<option value={p}>{t(`imageConv.pdfPages.${p}`)}</option>{/each}
					</select>
				</div>
			{/if}
		</div>
		<p class="hint">{t('imageConv.privacyNote')}</p>
	</section>

	{#if items.length}
		<section class="files" aria-label={t('imageConv.files')}>
			<header class="fhead">
				<strong>{t('imageConv.count', { count: items.length })}</strong>
				{#if done.length}<span class="saved">{formatBytes(totalIn)} → {formatBytes(totalOut)}{#if totalIn}<b class:up={totalOut > totalIn}>{totalOut > totalIn ? '+' : '−'}{Math.abs(Math.round((1 - totalOut / totalIn) * 100))}%</b>{/if}</span>{/if}
				<span class="sp"></span>
				<button class="btn ghost sm" onclick={clear} disabled={running}><Trash size={15} />{t('imageConv.clear')}</button>
			</header>
			<ul class="list">
				{#each items as it (it.id)}
					<li class="item" class:err={it.status === 'error'}>
						<span class="thumb">
							{#if it.outUrl && opts.format !== 'pdf' && opts.format !== 'psd' && opts.format !== 'tiff'}<img src={it.outUrl} alt="" loading="lazy" decoding="async" />
							{:else if it.url}<img src={it.url} alt="" loading="lazy" decoding="async" />
							{:else}<FileText size={20} />{/if}
						</span>
						<span class="meta">
							<span class="name" title={it.file.name}>{it.result?.name ?? it.file.name}</span>
							<span class="sub">
								<span class="tag">{kindLabel(it.kind)}</span>→<span class="tag to">{label(opts.format === 'same' ? 'same' : opts.format)}</span>
								{formatBytes(it.file.size)}
								{#if it.result} → {formatBytes(it.result.blob.size)} · {it.result.width}×{it.result.height}
									<b class="pct" class:up={saving(it) < 0}>{saving(it) >= 0 ? '−' : '+'}{Math.abs(saving(it))}%</b>
								{/if}
								{#if it.error}<span class="emsg">{it.error}</span>{/if}
							</span>
							{#if it.status === 'working'}<span class="pbar"><span style:width="{Math.round(it.progress * 100)}%"></span></span>{/if}
						</span>
						<span class="st" aria-live="polite">
							{#if it.status === 'working'}<LoaderCircle size={18} class="spin" />
							{:else if it.status === 'done'}<Check size={18} />
							{:else if it.status === 'error'}<CircleAlert size={18} />{/if}
						</span>
						<span class="acts">
							{#if it.result}
								<button class="btn icon ghost" title={t('common.download')} aria-label={`${t('common.download')} ${it.result.name}`} onclick={() => download(it)}><Download size={17} /></button>
							{/if}
							{#if onEdit && (it.result || PREVIEWABLE.includes(it.kind) || it.kind === 'psd')}
								<button class="btn icon ghost" title={t('imageConv.openEditor')} aria-label={t('imageConv.openEditor')} onclick={() => {
									const r = it.result;
									if (r && !['pdf', 'tiff', 'psd', 'ico'].includes(opts.format)) onEdit(r.blob, r.name);
									else onEdit(it.file, it.file.name);
								}}><Pencil size={16} /></button>
							{/if}
							<button class="btn icon ghost" title={t('imageConv.remove')} aria-label={t('imageConv.remove')} disabled={it.status === 'working'} onclick={() => remove(it)}><X size={17} /></button>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{@render after?.()}
</div>

{#if items.length}
	<div class="bar" role="toolbar" aria-label={t('imageConv.actions')}>
		{#if running}
			<div class="ov">
				<span>{t('imageConv.progress', { done: done.length + failed.length, total: items.length })}</span>
				<span class="pbar big"><span style:width="{Math.round(overall * 100)}%"></span></span>
			</div>
			<button class="btn stop" onclick={stop}><CircleStop size={16} />{t('imageAi.stop')}</button>
		{:else}
			{#if done.length && !stale}
				{#if opts.format === 'pdf' && pdfMerge && done.length > 1}
					<button class="btn primary" onclick={downloadPdf}><FileText size={16} />{t('imageConv.downloadPdf', { count: done.length })}</button>
				{/if}
				{#if done.length > 1}
					<button class="btn" class:primary={!(opts.format === 'pdf' && pdfMerge)} onclick={downloadZip} disabled={zipping > 0}><FileArchive size={16} />{zipping ? `${Math.round(zipping * 100)}%` : t('imageConv.downloadZip', { count: done.length })}</button>
					{#if canDirSave}<button class="btn" onclick={saveToFolder}><FolderDown size={16} />{t('imageConv.saveFolder')}</button>{/if}
				{:else}
					<button class="btn primary" onclick={() => download(done[0])}><Download size={16} />{t('common.download')}</button>
				{/if}
				{#if pending.length}<button class="btn" onclick={() => convert(true)}><RefreshCw size={16} />{t('imageConv.convertRest', { count: pending.length })}</button>{/if}
			{:else}
				<button class="btn primary go" onclick={() => convert()} disabled={!items.length}>
					{#if stale}<RefreshCw size={16} />{t('imageConv.reconvert', { count: items.length })}{:else}<Zap size={16} />{t('imageConv.convert', { count: items.length, format: label(opts.format) })}{/if}
				</button>
			{/if}
			{#if failed.length}<span class="ferr"><CircleAlert size={15} />{t('imageConv.failed', { count: failed.length })}</span>{/if}
		{/if}
	</div>
{/if}

<style>
	.conv { width: 100%; max-width: 1040px; margin: 0 auto; padding: 16px 16px 96px; display: grid; gap: 14px; }
	.drop {
		display: grid; justify-items: center; gap: 12px; text-align: center; padding: 28px 16px;
		border: 2px dashed rgb(255 255 255 / 0.16); border-radius: var(--radius-lg); background: rgb(0 0 0 / 0.16);
		transition: border-color 0.15s, background 0.15s;
	}
	.drop > :global(svg) { color: var(--accent); }
	.drop.over { border-color: var(--accent); background: var(--accent-soft); }
	.drop.compact { grid-template-columns: auto 1fr auto; text-align: left; padding: 12px 14px; justify-items: start; align-items: center; }
	.dtext { display: grid; gap: 4px; }
	.dtext strong { font-size: 1.05rem; }
	.compact .dtext strong { font-size: 0.92rem; }
	.dtext span { color: var(--text-2); font-size: 0.88rem; }
	.dact { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
	.dact .btn { min-height: 42px; }
	.trust { list-style: none; padding: 0; margin: 4px 0 0; display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; font-size: 0.78rem; color: var(--text-3); }
	.trust li { display: inline-flex; align-items: center; gap: 5px; }
	.trust :global(svg) { color: var(--ok); }

	.settings { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: rgb(0 0 0 / 0.12); }
	.formats { display: flex; flex-wrap: wrap; gap: 6px; }
	.formats button {
		min-width: 64px; min-height: 40px; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2);
		font-weight: 650; font-size: 0.86rem; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: border-color 0.12s, background 0.12s;
	}
	.formats button:hover { border-color: rgb(255 255 255 / 0.25); }
	.formats button[aria-checked='true'] { background: var(--accent); border-color: var(--accent); color: #fff; }
	.formats small { font-size: 0.6rem; font-weight: 500; opacity: 0.75; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px 22px; align-items: start; }
	.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
	.num { width: 96px; padding: 6px 8px; }
	.unit, .x { color: var(--text-3); font-size: 0.84rem; }
	.mini { display: grid; gap: 3px; font-size: 0.72rem; color: var(--text-3); }
	.sel { width: auto; padding: 6px 8px; }
	.crow { display: inline-flex; align-items: center; gap: 10px; font-size: 0.84rem; color: var(--text-2); }
	input[type='color'] { width: 44px; height: 32px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
	.seg { margin-bottom: 4px; }

	.files { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
	.fhead { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); background: rgb(255 255 255 / 0.02); flex-wrap: wrap; }
	.saved { font-size: 0.84rem; color: var(--text-2); font-variant-numeric: tabular-nums; display: inline-flex; gap: 8px; align-items: center; }
	.saved b, .pct { color: var(--ok); font-weight: 650; }
	.saved b.up, .pct.up { color: var(--warn); }
	.sp { flex: 1; }
	.btn.sm { padding: 5px 10px; font-size: 0.8rem; }
	.list { list-style: none; margin: 0; padding: 0; max-height: none; }
	.item { display: grid; grid-template-columns: 52px 1fr 24px auto; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border); content-visibility: auto; contain-intrinsic-size: 0 68px; }
	.item:last-child { border-bottom: 0; }
	.item.err { background: rgb(255 92 108 / 0.06); }
	.thumb { width: 52px; height: 52px; border-radius: 8px; overflow: hidden; display: grid; place-items: center; color: var(--text-3); background: repeating-conic-gradient(#2a2e3a 0 25%, #1f222c 0 50%) 0 0 / 12px 12px; }
	.thumb img { width: 100%; height: 100%; object-fit: cover; }
	.meta { display: grid; gap: 3px; min-width: 0; }
	.name { font-size: 0.88rem; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
	.tag { padding: 1px 6px; border-radius: 5px; background: var(--surface-3); color: var(--text-2); font-weight: 650; font-size: 0.68rem; }
	.tag.to { background: var(--accent-soft); color: var(--text); }
	.emsg { color: var(--danger); }
	.st { display: grid; place-items: center; color: var(--ok); }
	.err .st { color: var(--danger); }
	.st :global(.spin) { color: var(--accent); animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.acts { display: flex; gap: 2px; }
	.pbar { display: block; height: 4px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
	.pbar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); transition: width 0.2s; }
	.pbar.big { height: 6px; width: 100%; }

	.bar {
		position: sticky; bottom: 12px; z-index: 5; margin: -84px auto 12px; width: min(1008px, calc(100% - 24px));
		display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; border-radius: 16px;
		background: rgb(18 20 28 / 0.94); border: 1px solid var(--border); box-shadow: var(--shadow-dock); backdrop-filter: blur(10px);
	}
	.bar .btn { min-height: 44px; }
	.go { flex: 1; font-size: 0.95rem; }
	.ov { flex: 1; display: grid; gap: 6px; font-size: 0.82rem; color: var(--text-2); min-width: 160px; }
	.stop { background: var(--danger); border-color: transparent; color: #fff; font-weight: 650; }
	.ferr { display: inline-flex; align-items: center; gap: 6px; color: var(--danger); font-size: 0.82rem; }
	@media (max-width: 640px) {
		.conv { padding: 10px 10px 100px; }
		.drop.compact { grid-template-columns: auto 1fr; }
		.drop.compact .dact { grid-column: 1 / -1; justify-content: flex-start; }
		.item { grid-template-columns: 44px 1fr auto; gap: 10px; }
		.thumb { width: 44px; height: 44px; }
		.st { display: none; }
		.bar .btn { flex: 1; }
	}
	@media (prefers-reduced-motion: reduce) { .st :global(.spin) { animation: none; } }
</style>
