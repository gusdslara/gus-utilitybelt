<script lang="ts">
	// App PDF: junta imagens num PDF (tamanho, orientação, encaixe, margem, qualidade) e escaneia documentos
	// pela câmera. Páginas reordenáveis (arrastar/teclado), editor de recorte e filtro por página. Tudo local.
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { pdf, type Page } from '#lib/pdf/store.svelte.ts';
	import { layoutPage, PAGE_SIZE_IDS, MARGINS, QUALITY_IDS, type FitMode, type Orientation } from '#lib/pdf/layout.ts';
	import { SCAN_FILTERS, type ScanFilter } from '#lib/scan/enhance.ts';
	import { formatBytes } from '#lib/image/convert-pure.ts';
	import { saveBlob } from '#lib/image/io.ts';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import PageEditor from './PageEditor.svelte';
	import Scanner from './Scanner.svelte';
	import {
		ScanText, ImagePlus, Camera, RotateCcw, RotateCw, Crop, Trash2, GripVertical, LoaderCircle, FileDown, ExternalLink, Share2,
		Images, ArrowDownAZ, ArrowUpDown, WandSparkles, CircleStop, CircleAlert, X, FileText, ShieldCheck
	} from '@lucide/svelte';

	let fileInput: HTMLInputElement | undefined = $state();
	let editing = $state<string | null>(null);
	let scanning = $state(false);
	let dragOver = $state(false);
	let dragId = $state<string | null>(null);
	let gridEl: HTMLElement | undefined = $state();
	let note = $state('');
	let failure = $state('');
	let dragDepth = 0;

	const ORIENTATIONS: Orientation[] = ['auto', 'portrait', 'landscape'];
	const FITS: FitMode[] = ['contain', 'cover', 'stretch'];
	const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
	const commonFilter = $derived(pdf.pages.length && pdf.pages.every((p) => p.params.filter === pdf.pages[0].params.filter) ? pdf.pages[0].params.filter : null);
	const anyDetected = $derived(pdf.pages.some((p) => p.detected && !p.params.quad));

	function openScanner() {
		scanning = true;
		ui.pdfScan = true;
	}
	function closeScanner() {
		scanning = false;
		ui.pdfScan = false;
	}

	/** Miniatura no formato da página: papel + posição da imagem conforme os ajustes. */
	function paper(p: Page) {
		const l = layoutPage(p.previewW || 3, p.previewH || 4, pdf.settings);
		const pct = (v: number, of: number) => `${(v / of) * 100}%`;
		const box = l.clip ?? { x: 0, y: 0, w: l.width, h: l.height };
		return {
			ratio: `${l.width} / ${l.height}`,
			wcap: `min(100%, calc(var(--slot) * ${l.width / l.height}))`,
			area: { left: pct(box.x, l.width), top: pct(l.height - box.y - box.h, l.height), width: pct(box.w, l.width), height: pct(box.h, l.height) },
			img: {
				left: pct(l.rect.x - box.x, box.w),
				top: pct(box.y + box.h - (l.rect.y + l.rect.h), box.h),
				width: pct(l.rect.w, box.w),
				height: pct(l.rect.h, box.h)
			}
		};
	}

	function addFiles(list: FileList | File[] | null | undefined) {
		const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|avif|jxl|svg|bmp|ico|tiff?)$/i.test(f.name));
		if (files.length) pdf.addFiles(files);
	}

	function onPaste(e: ClipboardEvent) {
		if (editing || scanning) return;
		const el = e.target as HTMLElement | null;
		if (el?.closest('input, textarea, [contenteditable]')) return;
		const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
		if (!files.length) return;
		e.preventDefault();
		pdf.addFiles(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `colado-${Date.now()}-${i + 1}.${f.type.split('/')[1] || 'png'}`, { type: f.type }))));
	}

	const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
	function onDragEnter(e: DragEvent) {
		if (!hasFiles(e)) return;
		e.preventDefault();
		dragDepth++;
		dragOver = true;
	}
	function onDragLeave(e: DragEvent) {
		if (!hasFiles(e)) return;
		if (--dragDepth <= 0) { dragDepth = 0; dragOver = false; }
	}
	function onDrop(e: DragEvent) {
		if (!hasFiles(e)) return;
		e.preventDefault();
		dragDepth = 0;
		dragOver = false;
		addFiles(e.dataTransfer?.files);
	}

	// Reordenar: arrastar pela alça (mouse e toque) ou setas do teclado com a alça focada.
	function gripDown(e: PointerEvent, id: string) {
		if (e.button > 0) return;
		e.preventDefault();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		dragId = id;
	}
	function gripMove(e: PointerEvent) {
		if (!dragId) return;
		const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-page]');
		if (el && el.dataset.page !== dragId) {
			const from = pdf.pages.findIndex((p) => p.id === dragId);
			const to = pdf.pages.findIndex((p) => p.id === el.dataset.page);
			pdf.move(from, to);
		}
		// rolagem automática perto das bordas da área de rolagem
		const sc = [gridEl?.closest<HTMLElement>('.scroll'), gridEl?.closest<HTMLElement>('.body')].find((el) => el && el.scrollHeight > el.clientHeight);
		if (sc) {
			const r = sc.getBoundingClientRect();
			if (e.clientY < r.top + 50) sc.scrollBy(0, -14);
			else if (e.clientY > r.bottom - 50) sc.scrollBy(0, 14);
		}
	}
	function gripUp() {
		dragId = null;
	}
	function gripKey(e: KeyboardEvent, i: number) {
		const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
		if (!d) return;
		e.preventDefault();
		const to = Math.max(0, Math.min(pdf.pages.length - 1, i + d));
		pdf.move(i, to);
		requestAnimationFrame(() => gridEl?.querySelectorAll<HTMLElement>('.grip')[to]?.focus());
	}

	async function build() {
		failure = '';
		note = '';
		try {
			await pdf.exportPdf();
		} catch (e) {
			failure = t('pdf.export.failed', { msg: e instanceof Error ? e.message : String(e) });
		}
	}

	let exportEl: HTMLElement | undefined = $state();
	async function quickBuild() {
		exportEl?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' });
		if (!pdf.result) await build();
	}

	async function download() {
		if (!pdf.result) return;
		const r = await saveBlob(pdf.result.blob, pdf.result.name);
		if (r === 'saved') note = t('pdf.export.saved');
	}

	async function share() {
		if (!pdf.result) return;
		const file = new File([pdf.result.blob], pdf.result.name, { type: 'application/pdf' });
		if (!navigator.canShare?.({ files: [file] })) return download();
		try {
			await navigator.share({ files: [file], title: pdf.result.name });
		} catch {
			/* cancelado */
		}
	}

	async function images() {
		failure = '';
		try {
			const r = await pdf.exportImages();
			if (r) await saveBlob(r.blob, r.name);
		} catch (e) {
			failure = t('pdf.export.failed', { msg: e instanceof Error ? e.message : String(e) });
		}
	}

	function beforeUnload(e: BeforeUnloadEvent) {
		if (pdf.pages.length && !pdf.result) e.preventDefault();
	}

	onMount(() => {
		if (ui.pdfScan) scanning = true;
	});
	onDestroy(() => {
		ui.pdfScan = false;
	});
</script>

<svelte:window onpaste={onPaste} onbeforeunload={beforeUnload} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="studio" class:over={dragOver} ondragenter={onDragEnter} ondragover={(e) => hasFiles(e) && e.preventDefault()} ondragleave={onDragLeave} ondrop={onDrop}>
	<header class="bar">
		<button class="btn primary" onclick={openScanner} data-ub="pdf-scan"><Camera size={17} /> {t('pdf.actions.scan')}</button>
		<button class="btn" onclick={() => fileInput?.click()} data-ub="pdf-add"><ImagePlus size={17} /> <span class="lbl">{t('pdf.actions.add')}</span></button>
		{#if pdf.count}
			<span class="count">{t('pdf.pagesCount', { count: pdf.count })}</span>
			<span class="grow"></span>
			{#if anyDetected}
				<button class="btn ghost icon" onclick={() => pdf.autoCropAll()} title={t('pdf.actions.autoCropAll')} aria-label={t('pdf.actions.autoCropAll')}><WandSparkles size={17} /></button>
			{/if}
			<button class="btn ghost icon" onclick={() => pdf.sortByName()} title={t('pdf.actions.sortName')} aria-label={t('pdf.actions.sortName')}><ArrowDownAZ size={17} /></button>
			<button class="btn ghost icon" onclick={() => pdf.reverse()} title={t('pdf.actions.reverse')} aria-label={t('pdf.actions.reverse')}><ArrowUpDown size={17} /></button>
			<button class="btn ghost icon danger" onclick={() => pdf.clear()} title={t('pdf.actions.clear')} aria-label={t('pdf.actions.clear')}><Trash2 size={17} /></button>
			<!-- Telas estreitas: os ajustes ficam abaixo das páginas; atalho para gerar e ir ao resultado. -->
			<button class="btn quick" onclick={quickBuild} disabled={pdf.exporting} title={t('pdf.export.build')} aria-label={t('pdf.export.build')}><FileDown size={17} /></button>
		{/if}
	</header>

	<div class="body" class:empty={!pdf.count}>
		<section class="scroll" aria-label={t('pdf.title')}>
			{#if pdf.importing}
				<div class="banner" role="status"><LoaderCircle class="spin" size={16} /> {t('pdf.importing', { count: pdf.importing })}</div>
			{/if}
			{#if pdf.importErrors.length}
				<div class="banner err" role="alert">
					<CircleAlert size={16} />
					<div><strong>{t('pdf.importErrors')}</strong> {pdf.importErrors.join(' · ')}</div>
					<button class="btn ghost icon" onclick={() => (pdf.importErrors = [])} aria-label={t('pdf.dismiss')}><X size={15} /></button>
				</div>
			{/if}

			{#if !pdf.count}
				<div class="hero">
					<div class="glyph" aria-hidden="true"><ScanText size={40} strokeWidth={1.4} /></div>
					<h2>{t('pdf.empty.title')}</h2>
					<p>{t('pdf.empty.body')}</p>
					<div class="cta">
						<button class="btn primary big" onclick={openScanner}><Camera size={19} /> {t('pdf.actions.scan')}</button>
						<button class="btn big" onclick={() => fileInput?.click()}><Images size={19} /> {t('pdf.actions.add')}</button>
					</div>
					<p class="hint"><ShieldCheck size={14} /> {t('pdf.empty.formats')}</p>
				</div>
			{:else}
				<ol class="grid" bind:this={gridEl} class:dragging={!!dragId}>
					{#each pdf.pages as p, i (p.id)}
						{@const pp = paper(p)}
						<li class="card" class:lifted={dragId === p.id} data-page={p.id} animate:flip={{ duration: 220 }}>
							<div class="slot">
								<button class="paper" style:aspect-ratio={pp.ratio} style:width={pp.wcap} onclick={() => (editing = p.id)} aria-label="{t('pdf.page.label', { n: i + 1 })} · {t('pdf.page.edit')}">
									<span class="area" style:left={pp.area.left} style:top={pp.area.top} style:width={pp.area.width} style:height={pp.area.height}>
										{#if p.preview}
											<img src={p.preview} alt="" style:left={pp.img.left} style:top={pp.img.top} style:width={pp.img.width} style:height={pp.img.height} draggable="false" />
										{/if}
									</span>
									{#if p.busy}<span class="busy"><LoaderCircle class="spin" size={20} /></span>{/if}
									{#if p.error}<span class="busy err" title={p.error}><CircleAlert size={20} /></span>{/if}
								</button>
								<span class="num">{i + 1}</span>
								{#if p.params.filter !== 'original' || p.params.quad}
									<span class="tag">{p.params.quad ? t('pdf.page.cropped') : ''}{p.params.quad && p.params.filter !== 'original' ? ' · ' : ''}{p.params.filter !== 'original' ? t(`pdf.filters.${p.params.filter}`) : ''}</span>
								{/if}
							</div>
							<div class="meta">
								<button
									class="grip" aria-label="{t('pdf.page.drag')} — {t('pdf.page.label', { n: i + 1 })}" title={t('pdf.page.drag')}
									onpointerdown={(e) => gripDown(e, p.id)} onpointermove={gripMove} onpointerup={gripUp} onpointercancel={gripUp} onkeydown={(e) => gripKey(e, i)}
								><GripVertical size={16} /></button>
								<span class="name" title={p.name}>{p.name}</span>
							</div>
							<div class="acts">
								<button class="btn ghost icon" onclick={() => pdf.rotate(p.id, -1)} aria-label={t('pdf.page.rotateL')} title={t('pdf.page.rotateL')}><RotateCcw size={16} /></button>
								<button class="btn ghost icon" onclick={() => pdf.rotate(p.id, 1)} aria-label={t('pdf.page.rotateR')} title={t('pdf.page.rotateR')}><RotateCw size={16} /></button>
								<button class="btn ghost icon" onclick={() => (editing = p.id)} aria-label={t('pdf.page.edit')} title={t('pdf.page.edit')}><Crop size={16} /></button>
								<button class="btn ghost icon danger" onclick={() => pdf.remove(p.id)} aria-label={t('pdf.page.remove')} title={t('pdf.page.remove')}><Trash2 size={16} /></button>
							</div>
						</li>
					{/each}
					<li class="add">
						<button onclick={() => fileInput?.click()} aria-label={t('pdf.actions.add')}><ImagePlus size={26} strokeWidth={1.5} /><span>{t('pdf.actions.add')}</span></button>
					</li>
				</ol>
			{/if}
		</section>

		{#if pdf.count}
			<aside class="side" aria-label={t('pdf.settings.title')}>
				<h2 class="panel-title">{t('pdf.settings.title')}</h2>

				<label class="field">
					<span class="label">{t('pdf.settings.filename')}</span>
					<div class="fname"><input class="input" bind:value={pdf.filename} spellcheck="false" /><span>.pdf</span></div>
				</label>

				<div class="field">
					<span class="label">{t('pdf.settings.size')}</span>
					<div class="seg" role="radiogroup" aria-label={t('pdf.settings.size')}>
						{#each PAGE_SIZE_IDS as s (s)}<button role="radio" aria-checked={pdf.settings.size === s} onclick={() => ((pdf.settings.size = s), pdf.clearResult())}>{t(`pdf.settings.sizes.${s}`)}</button>{/each}
					</div>
				</div>

				{#if pdf.settings.size !== 'fit'}
					<div class="field">
						<span class="label">{t('pdf.settings.orientation')}</span>
						<div class="seg" role="radiogroup" aria-label={t('pdf.settings.orientation')}>
							{#each ORIENTATIONS as o (o)}<button role="radio" aria-checked={pdf.settings.orientation === o} onclick={() => ((pdf.settings.orientation = o), pdf.clearResult())}>{t(`pdf.settings.orientations.${o}`)}</button>{/each}
						</div>
					</div>
					<div class="field">
						<span class="label">{t('pdf.settings.fit')}</span>
						<div class="seg" role="radiogroup" aria-label={t('pdf.settings.fit')}>
							{#each FITS as f (f)}<button role="radio" aria-checked={pdf.settings.fit === f} onclick={() => ((pdf.settings.fit = f), pdf.clearResult())}>{t(`pdf.settings.fits.${f}`)}</button>{/each}
						</div>
					</div>
				{/if}

				<div class="field">
					<span class="label">{t('pdf.settings.margin')}</span>
					<div class="seg" role="radiogroup" aria-label={t('pdf.settings.margin')}>
						{#each MARGINS as m (m)}<button role="radio" aria-checked={pdf.settings.margin === m} onclick={() => ((pdf.settings.margin = m), pdf.clearResult())}>{m ? `${m} mm` : t('pdf.settings.none')}</button>{/each}
					</div>
				</div>

				<div class="field">
					<span class="label">{t('pdf.settings.quality')}</span>
					<div class="seg" role="radiogroup" aria-label={t('pdf.settings.quality')}>
						{#each QUALITY_IDS as q (q)}<button role="radio" aria-checked={pdf.settings.quality === q} onclick={() => ((pdf.settings.quality = q), pdf.clearResult())}>{t(`pdf.settings.qualities.${q}`)}</button>{/each}
					</div>
					<p class="hint">{t(`pdf.settings.qualityHints.${pdf.settings.quality}`)}</p>
				</div>

				<div class="field">
					<span class="label">{t('pdf.actions.filterAll')}</span>
					<div class="seg" role="radiogroup" aria-label={t('pdf.actions.filterAll')}>
						{#each SCAN_FILTERS as f (f)}<button role="radio" aria-checked={commonFilter === f} onclick={() => pdf.applyFilterAll(f as ScanFilter)}>{t(`pdf.filters.${f}`)}</button>{/each}
					</div>
				</div>

				<label class="check"><input type="checkbox" bind:checked={pdf.autoCropImports} /> {t('pdf.settings.autoCrop')}</label>

				<div class="export" bind:this={exportEl}>
					{#if pdf.exporting}
						<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pdf.exportProgress * 100)}>
							<span style:transform="scaleX({pdf.exportProgress})"></span>
						</div>
						<div class="row">
							<span class="muted">{t('pdf.export.building', { pct: Math.round(pdf.exportProgress * 100) })}</span>
							<span class="grow"></span>
							<button class="btn" onclick={() => pdf.stopExport()}><CircleStop size={16} /> {t('pdf.export.stop')}</button>
						</div>
					{:else if pdf.result}
						<div class="done" role="status">
							<FileText size={30} strokeWidth={1.5} />
							<div>
								<strong>{t('pdf.export.ready')}</strong>
								<span class="muted">{t('pdf.export.info', { pages: pdf.result.pages, size: formatBytes(pdf.result.blob.size), secs: (pdf.result.ms / 1000).toFixed(1) })}{pdf.result.passthrough ? ` · ${t('pdf.export.passthrough', { count: pdf.result.passthrough })}` : ''}</span>
							</div>
						</div>
						<button class="btn primary big" onclick={download} data-ub="pdf-download"><FileDown size={18} /> {t('pdf.export.download')}</button>
						<div class="row">
							<a class="btn" href={pdf.result.url} target="_blank" rel="noopener"><ExternalLink size={16} /> {t('pdf.export.open')}</a>
							{#if canShare}<button class="btn" onclick={share}><Share2 size={16} /> {t('pdf.export.share')}</button>{/if}
						</div>
					{:else}
						<button class="btn primary big" onclick={build} disabled={pdf.importing > 0 || pdf.pages.some((p) => p.busy && !p.preview)} data-ub="pdf-build"><FileDown size={18} /> {t('pdf.export.build')}</button>
					{/if}
					{#if !pdf.exporting}
						<button class="btn ghost" onclick={images}><Images size={16} /> {t('pdf.export.images')}</button>
					{/if}
					{#if note}<p class="ok">{note}</p>{/if}
					{#if failure}<p class="error">{failure}</p>{/if}
				</div>
			</aside>
		{/if}
	</div>

	{#if dragOver}
		<div class="dropzone" aria-hidden="true"><ImagePlus size={36} strokeWidth={1.5} /><span>{t('pdf.drop')}</span></div>
	{/if}
</div>

<input bind:this={fileInput} type="file" accept="image/*,.heic,.heif,.avif,.svg" multiple hidden onchange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }} />

{#if editing && pdf.byId(editing)}
	<PageEditor id={editing} onclose={() => (editing = null)} />
{/if}
{#if scanning}
	<Scanner onclose={closeScanner} />
{/if}

<style>
	.studio { position: relative; height: 100%; display: grid; grid-template-rows: auto 1fr; min-height: 0; }
	.bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
	.bar .btn { min-height: 38px; }
	.count { color: var(--text-3); font-size: 0.84rem; margin-left: 6px; font-variant-numeric: tabular-nums; }
	.grow { flex: 1; }
	.btn.danger:hover:not(:disabled) { color: var(--danger); }
	.btn.big { min-height: 46px; padding: 0 20px; font-size: 0.95rem; }

	.body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; min-height: 0; }
	.body.empty { grid-template-columns: 1fr; }
	.scroll { overflow: auto; min-height: 0; padding: 16px; }
	.side { overflow: auto; border-left: 1px solid var(--border); padding: 16px; display: grid; gap: 16px; align-content: start; background: rgb(0 0 0 / 0.12); }

	.banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 12px; border-radius: var(--radius-sm); background: var(--surface-2); font-size: 0.86rem; color: var(--text-2); }
	.banner.err { color: var(--danger); align-items: flex-start; }
	.banner.err div { flex: 1; word-break: break-word; }

	.hero { max-width: 560px; margin: min(9vh, 72px) auto 24px; display: grid; justify-items: center; text-align: center; gap: 14px; }
	.glyph { width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; color: #fff; background: linear-gradient(160deg, var(--accent), #a3154f); box-shadow: 0 14px 40px rgb(221 32 107 / 0.3); }
	.hero h2 { font-size: 1.35rem; letter-spacing: -0.02em; line-height: 1.25; text-wrap: balance; }
	.hero p { color: var(--text-2); line-height: 1.55; text-wrap: pretty; }
	.cta { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
	.hero .hint { display: inline-flex; gap: 6px; align-items: center; }

	.grid { --slot: 200px; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 14px; }
	.card { display: grid; gap: 6px; padding: 10px; border-radius: var(--radius); border: 1px solid var(--border); background: rgb(0 0 0 / 0.16); transition: border-color 0.15s, box-shadow 0.2s, transform 0.2s var(--ease); }
	.card:hover { border-color: rgb(255 255 255 / 0.16); }
	.card.lifted { border-color: var(--accent); box-shadow: 0 12px 30px rgb(0 0 0 / 0.45); transform: scale(1.02); z-index: 2; position: relative; }
	.grid.dragging .card:not(.lifted) { opacity: 0.85; }
	.slot { position: relative; height: var(--slot); display: grid; place-items: center; }
	.paper {
		position: relative; display: block; padding: 0; border: 0; background: #fff; border-radius: 2px; overflow: hidden;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 6px 18px rgb(0 0 0 / 0.35); transition: transform 0.2s var(--ease), box-shadow 0.2s;
	}
	.paper:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgb(0 0 0 / 0.4), 0 10px 26px rgb(0 0 0 / 0.45); }
	.area { position: absolute; overflow: hidden; }
	.area img { position: absolute; display: block; max-width: none; }
	.busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgb(255 255 255 / 0.55); color: #333; }
	.busy.err { color: var(--danger); }
	.num { position: absolute; top: 4px; left: 4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 99px; background: rgb(10 11 16 / 0.8); color: #fff; font-size: 0.72rem; font-weight: 650; display: grid; place-items: center; font-variant-numeric: tabular-nums; pointer-events: none; }
	.tag { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); max-width: 92%; padding: 2px 8px; border-radius: 99px; background: rgb(10 11 16 / 0.78); color: #e7e9f0; font-size: 0.68rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
	.meta { display: flex; align-items: center; gap: 4px; min-width: 0; }
	.grip { width: 32px; height: 32px; flex-shrink: 0; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; color: var(--text-3); cursor: grab; touch-action: none; }
	.grip:hover { color: var(--text); background: var(--surface-3); }
	.grip:active { cursor: grabbing; }
	.name { font-size: 0.8rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.acts { display: flex; justify-content: space-between; }
	.acts .btn { padding: 0; width: 36px; height: 36px; }
	.add button {
		width: 100%; height: 100%; min-height: 160px; display: grid; place-content: center; justify-items: center; gap: 8px;
		border: 1.5px dashed rgb(255 255 255 / 0.16); border-radius: var(--radius); background: none; color: var(--text-3); font-size: 0.85rem;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}
	.add button:hover { border-color: var(--accent); color: var(--text); background: var(--accent-soft); }

	.fname { display: flex; align-items: center; gap: 6px; }
	.fname span { color: var(--text-3); font-size: 0.88rem; }
	.side .seg { display: flex; }
	.side .seg button { flex: 1 1 auto; min-height: 32px; }
	.export { display: grid; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border); }
	.export .row { display: flex; gap: 8px; align-items: center; }
	.export .row .btn { flex: 1; }
	.progress { height: 6px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
	.progress span { display: block; height: 100%; background: var(--accent); transform-origin: left; transition: transform 0.2s var(--ease); }
	.done { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: var(--radius); background: rgb(61 220 151 / 0.08); border: 1px solid rgb(61 220 151 / 0.25); color: var(--ok); }
	.done div { display: grid; gap: 2px; }
	.done strong { color: var(--text); }
	.done .muted { font-size: 0.8rem; }
	a.btn { text-decoration: none; }

	.studio.over .scroll { filter: blur(1px); }
	.dropzone {
		position: absolute; inset: 10px; z-index: 5; border: 2px dashed var(--accent); border-radius: var(--radius-lg); background: rgb(221 32 107 / 0.1);
		display: grid; place-content: center; justify-items: center; gap: 10px; font-weight: 600; pointer-events: none; animation: fade 0.15s var(--ease);
	}
	@keyframes fade { from { opacity: 0; } }
	:global(.spin) { animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.quick { display: none; }
	@media (max-width: 900px) {
		.body { grid-template-columns: 1fr; grid-auto-rows: max-content; align-content: start; overflow: auto; }
		.scroll { overflow: visible; min-height: auto; }
		.side { overflow: visible; border-left: 0; border-top: 1px solid var(--border); padding-bottom: 24px; }
		.quick { display: inline-flex; }
	}
	@media (max-width: 520px) {
		.count { display: none; }
		.bar { gap: 4px; padding: 8px 10px; }
		.bar .btn:not(.primary) { padding-inline: 8px; }
		.grid { --slot: 150px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
		.card { padding: 8px; }
		.bar .lbl { display: none; }
		.acts .btn { width: 32px; height: 32px; }
	}
	@media (prefers-reduced-motion: reduce) { .card, .paper { transition: none; } }
</style>
