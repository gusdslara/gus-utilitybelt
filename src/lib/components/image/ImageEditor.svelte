<script lang="ts">
	// Editor de imagens (app "Imagem"): inspirado no Paint.NET — menus, paleta de ferramentas, camadas,
	// cores, histórico; responsivo com barra inferior e painéis em "sheet" no celular. Tudo local.
	import { onMount, type Snippet } from 'svelte';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import Converter from './Converter.svelte';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { doc } from '#lib/image/doc.svelte.ts';
	import { colors } from '#lib/image/colors.svelte.ts';
	import { job } from '#lib/image/jobs.svelte.ts';
	import { FILTERS, FILTER_GROUPS } from '#lib/image/filters.ts';
	import { OPEN_ACCEPT, openImageFile } from '#lib/image/io.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Viewport from './Viewport.svelte';
	import ToolOptions from './ToolOptions.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import ColorPanel from './ColorPanel.svelte';
	import PropsPanel from './PropsPanel.svelte';
	import Dialogs from './Dialogs.svelte';
	import Menu, { type MenuDef } from './Menu.svelte';
	import { TOOLS } from './tools-meta.ts';
	import {
		Undo2, Redo2, Menu as MenuIcon, Download, FolderOpen, FilePlus, ClipboardPaste, Layers, Palette, SlidersHorizontal, ClockFading,
		X, Copy, Scissors, Pencil, RefreshCw, Crop, SquareDashed, Trash, ArrowLeftRight, CircleStop, ImagePlus, Maximize, ZoomIn, ZoomOut, Sparkles, PaintBucket
	} from '@lucide/svelte';

	// Rotas de SEO: `seo` é o conteúdo indexável (renderizado no servidor), `preset` ajusta o conversor
	// e `aiHint` mostra o atalho de remover fundo na tela inicial do editor.
	let { seo, preset, aiHint = false }: { seo?: Snippet; preset?: 'compress' | 'resize'; aiHint?: boolean } = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let openAsLayer = false;
	let dragOver = $state(false);
	let topTab = $state<'colors' | 'history'>('colors');
	let bottomTab = $state<'layers' | 'props'>('layers');
	let elapsed = $state(0);

	const mod = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform) ? '⌘' : 'Ctrl+';
	const hasDoc = $derived(doc.width > 0);
	const sel = $derived((void doc.selRev, doc.selection.bounds));

	onMount(() => {
		colors.load();
		// Depuração em dev: inspecionar o estado pelo console.
		if (import.meta.env.DEV) Object.assign(window, { __ubImage: { editor, doc } });
		const tick = setInterval(() => {
			if (job.visible) elapsed = Math.round((performance.now() - job.startedAt) / 100) / 10;
		}, 100);
		return () => clearInterval(tick);
	});

	// Aviso ao sair com alterações não exportadas.
	$effect(() => {
		const onBefore = (e: BeforeUnloadEvent) => {
			if (doc.dirty) e.preventDefault();
		};
		addEventListener('beforeunload', onBefore);
		return () => removeEventListener('beforeunload', onBefore);
	});

	// ----- Arquivos -----

	/** Abre no editor um arquivo vindo do conversor. */
	async function openInEditor(blob: Blob, name: string) {
		if (!confirmDiscard()) return;
		try {
			const opened = await openImageFile(blob, name);
			editor.commitFloating();
			doc.load(opened);
			ui.imageMode = 'edit';
			requestAnimationFrame(() => {
				editor.fit();
				editor.invalidate();
			});
		} catch (err) {
			editor.notify('error', t('image.toast.openFailed', { message: err instanceof Error ? err.message : String(err) }));
		}
	}

	function confirmDiscard() {
		return !doc.dirty || confirm(t('image.confirmDiscard'));
	}

	function pickFile(asLayer: boolean) {
		openAsLayer = asLayer;
		fileInput?.click();
	}

	async function openFiles(files: FileList | File[] | null, asLayer = openAsLayer) {
		const list = [...(files ?? [])];
		if (!list.length) return;
		try {
			for (const [i, f] of list.entries()) {
				const opened = await openImageFile(f, f.name);
				if ((asLayer || i > 0) && hasDoc) editor.addLayersFrom(opened);
				else {
					editor.commitFloating();
					doc.load(opened);
					editor.fit();
				}
			}
			editor.invalidate();
		} catch (err) {
			editor.notify('error', t('image.toast.openFailed', { message: err instanceof Error ? err.message : String(err) }));
		}
	}

	// ----- Comandos -----

	const ask = (title: string, label: string, value: number, min: number, max: number, run: (v: number) => void) => (editor.dialog = { kind: 'number', title, label, value, min, max, run });

	function run(cmd: string) {
		if (cmd.startsWith('filter:')) {
			if (!hasDoc) return;
			editor.sheet = null;
			editor.dialog = { kind: 'filter', id: cmd.slice(7) };
			return;
		}
		if (!hasDoc && !['new', 'open', 'paste', 'pasteNewImage', 'shortcuts', 'clearAiCache'].includes(cmd)) return;
		editor.sheet = null;
		const S = doc.selection;
		switch (cmd) {
			case 'new': if (confirmDiscard()) editor.dialog = { kind: 'new' }; break;
			case 'open': if (confirmDiscard()) pickFile(false); break;
			case 'openLayer': pickFile(true); break;
			case 'export': editor.commitFloating(); editor.finishText(); editor.dialog = { kind: 'export' }; break;
			case 'undo': editor.undo(); break;
			case 'redo': editor.redo(); break;
			case 'cut': editor.cut(); break;
			case 'copy': editor.copy(false); break;
			case 'copyMerged': editor.copy(true); break;
			case 'paste': editor.paste(hasDoc ? 'newLayer' : 'newImage'); break;
			case 'pasteNewLayer': editor.paste('newLayer'); break;
			case 'pasteNewImage': if (confirmDiscard()) editor.paste('newImage'); break;
			case 'delete': editor.eraseSelection(); break;
			case 'fillSelection': editor.fillSelection(); break;
			case 'selectAll': editor.selectAll(); break;
			case 'deselect': editor.deselect(); break;
			case 'invert': editor.invertSelection(); break;
			case 'selectAlpha': editor.selectLayerAlpha(); break;
			case 'feather': if (S.active) ask(t('image.cmd.feather'), t('image.opt.feather'), 8, 1, 200, (v) => editor.selectionEdit(() => S.feather(v))); break;
			case 'grow': if (S.active) ask(t('image.cmd.grow'), t('image.dlg.amount'), 4, 1, 200, (v) => editor.selectionEdit(() => S.grow(v))); break;
			case 'shrink': if (S.active) ask(t('image.cmd.shrink'), t('image.dlg.amount'), 4, 1, 200, (v) => editor.selectionEdit(() => S.grow(-v))); break;
			case 'harden': editor.selectionEdit(() => S.harden()); break;
			case 'selectByColor': editor.setTool('wand'); editor.wandEngine = 'classic'; editor.wand.algo = 'global'; break;
			case 'selectSubject': editor.selectSubject('replace'); break;
			case 'aiSelect': editor.setTool('wand'); editor.wandEngine = 'sam'; editor.notify('info', t('imageAi.samHint')); break;
			case 'removeBg': editor.removeBackground(); break;
			case 'clearAiCache': import('#lib/image/ml.ts').then(async (ml) => { await ml.mlClearCache(); editor.notify('ok', t('imageAi.cacheCleared')); }); break;
			case 'cropToSelection': editor.cropToSelection(); break;
			case 'autoCrop': editor.commitFloating(); doc.autoCrop(); editor.fit(); break;
			case 'resize': editor.commitFloating(); editor.dialog = { kind: 'resize' }; break;
			case 'canvasSize': editor.commitFloating(); editor.dialog = { kind: 'canvas' }; break;
			case 'rotCw': case 'rotCcw': case 'rot180': case 'flipH': case 'flipV':
				editor.commitFloating();
				doc.transform(({ rotCw: 'cw', rotCcw: 'ccw', rot180: '180', flipH: 'flipH', flipV: 'flipV' } as const)[cmd]);
				editor.fit();
				break;
			case 'layerFlipH': case 'layerFlipV': case 'layerRot180': {
				const l = editor.editableLayer() ?? (doc.active?.vector && !doc.active.locked ? doc.active : null);
				if (l) {
					editor.commitFloating();
					doc.transform(({ layerFlipH: 'flipH', layerFlipV: 'flipV', layerRot180: '180' } as const)[cmd], l);
				}
				break;
			}
			case 'flatten': editor.commitFloating(); doc.flatten(); break;
			case 'addLayer': editor.addLayer(); break;
			case 'duplicateLayer': editor.commitFloating(); doc.duplicateLayer(); break;
			case 'deleteLayer': editor.commitFloating(); doc.removeLayer(); break;
			case 'mergeDown': editor.commitFloating(); doc.mergeDown(); break;
			case 'layerUp': case 'layerDown': {
				const l = doc.active;
				if (l) { editor.commitFloating(); doc.moveLayer(l.id, doc.layers.indexOf(l) + (cmd === 'layerUp' ? 1 : -1)); }
				break;
			}
			case 'layerFromSelection': editor.layerFromSelection(false); break;
			case 'layerViaCut': editor.layerFromSelection(true); break;
			case 'rasterize': editor.rasterizeActive(); break;
			case 'bakeEffects': editor.bakeEffects(); break;
			case 'zoomIn': editor.zoomStep(1); break;
			case 'zoomOut': editor.zoomStep(-1); break;
			case 'fit': editor.fit(); break;
			case 'actualSize': editor.actualSize(); break;
			case 'pixelGrid': editor.pixelGrid = !editor.pixelGrid; editor.invalidate(); break;
			case 'repeatFilter': if (editor.lastFilter) editor.dialog = { kind: 'filter', id: editor.lastFilter.id }; break;
			case 'shortcuts': editor.dialog = { kind: 'shortcuts' }; break;
		}
		editor.invalidate();
	}

	const fxLabel = (id: string) => t(`imageFx.filters.${id}.title` as Parameters<typeof t>[0]);

	const menus = $derived.by<MenuDef[]>(() => {
		void doc.selRev;
		const S = doc.selection.active;
		const vec = !!doc.active?.vector;
		const c = (cmd: string, key?: string, disabled = false, checked?: boolean) => ({ cmd, label: t(`image.cmd.${cmd}` as Parameters<typeof t>[0]), key, disabled: disabled || (!hasDoc && !['new', 'open', 'paste', 'pasteNewImage', 'shortcuts', 'clearAiCache'].includes(cmd)), checked });
		const sep = { sep: true as const };
		return [
			{ id: 'file', label: t('image.menu.file'), items: [c('new', `${mod}N`), c('open', `${mod}O`), c('openLayer'), sep, c('export', `${mod}S`)] },
			{ id: 'edit', label: t('image.menu.edit'), items: [c('undo', `${mod}Z`, !doc.canUndo), c('redo', `${mod}Y`, !doc.canRedo), sep, c('cut', `${mod}X`), c('copy', `${mod}C`), c('copyMerged', `${mod}⇧C`), c('paste', `${mod}V`), c('pasteNewLayer'), c('pasteNewImage', `${mod}⇧V`), sep, c('delete', 'Del'), c('fillSelection', '⌫'), sep, c('shortcuts')] },
			{ id: 'select', label: t('image.menu.select'), items: [c('selectAll', `${mod}A`), c('deselect', `${mod}D`, !S), c('invert', `${mod}⇧I`), sep, c('selectAlpha'), c('selectByColor'), sep, c('feather', '', !S), c('grow', '', !S), c('shrink', '', !S), c('harden', '', !S)] },
			{ id: 'image', label: t('image.menu.image'), items: [c('cropToSelection', `${mod}⇧X`, !S), c('autoCrop', `${mod}B`), c('resize', `${mod}R`), c('canvasSize', `${mod}⇧R`), sep, c('rotCw'), c('rotCcw'), c('rot180'), c('flipH'), c('flipV'), sep, c('flatten')] },
			{ id: 'layers', label: t('image.menu.layers'), items: [c('addLayer', `${mod}⇧N`), c('duplicateLayer', `${mod}J`), c('deleteLayer', '', doc.layers.length < 2), c('mergeDown', `${mod}E`), sep, c('layerFromSelection', '', !S), c('layerViaCut', '', !S), sep, c('layerFlipH'), c('layerFlipV'), c('layerRot180'), c('layerUp'), c('layerDown'), sep, c('rasterize', '', !vec), c('bakeEffects')] },
			{ id: 'adjust', label: t('image.menu.adjust'), items: FILTERS.filter((f) => f.group === 'adjust').map((f) => ({ cmd: `filter:${f.id}`, label: fxLabel(f.id), disabled: !hasDoc })) },
			{
				id: 'effects',
				label: t('image.menu.effects'),
				items: [
					...(editor.lastFilter ? [{ cmd: 'repeatFilter', label: `${t('image.cmd.repeatFilter')}: ${fxLabel(editor.lastFilter.id)}`, key: `${mod}F` }, sep] : []),
					...FILTER_GROUPS.filter((g) => g !== 'adjust').flatMap((g) => [{ header: t(`imageFx.groups.${g}`) }, ...FILTERS.filter((f) => f.group === g).map((f) => ({ cmd: `filter:${f.id}`, label: fxLabel(f.id), disabled: !hasDoc }))])
				]
			},
			{ id: 'ai', label: t('image.menu.ai'), items: [c('aiSelect'), c('selectSubject'), c('removeBg'), sep, c('clearAiCache')] },
			{ id: 'view', label: t('image.menu.view'), items: [c('zoomIn', `${mod}+`), c('zoomOut', `${mod}-`), c('fit', `${mod}0`), c('actualSize', `${mod}1`), sep, c('pixelGrid', '', false, editor.pixelGrid)] }
		];
	});

	// ----- Teclado, colar, soltar -----

	function onKey(e: KeyboardEvent) {
		if (editor.dialog || ui.imageMode === 'convert') return;
		if (editor.key(e, run)) e.preventDefault();
	}

	function onPaste(e: ClipboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea, [contenteditable="true"]') || editor.dialog || ui.imageMode === 'convert') return;
		const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
		if (file) {
			e.preventDefault();
			editor.paste(hasDoc ? 'newLayer' : 'newImage', file);
		} else if (hasDoc) {
			e.preventDefault();
			editor.paste('newLayer');
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		openFiles(e.dataTransfer?.files ?? null, hasDoc);
	}

	const zoomPct = $derived(Math.round(editor.zoom * 1000) / 10);
	const toolLabel = (id: string) => t(`image.tools.${id}` as Parameters<typeof t>[0]);
</script>

<svelte:window onkeydown={onKey} onkeyup={(e) => editor.keyUp(e)} onpaste={onPaste} />

<input bind:this={fileInput} type="file" accept={OPEN_ACCEPT} multiple hidden onchange={(e) => { openFiles((e.target as HTMLInputElement).files); (e.target as HTMLInputElement).value = ''; }} />

<div
	class="img-editor"
	role="region"
	aria-label={t('image.title')}
	ondragover={(e) => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); dragOver = true; } }}
	ondragleave={(e) => { if (e.currentTarget === e.target) dragOver = false; }}
	ondrop={onDrop}
>
	<!-- Barra superior -->
	<header class="top">
		<div class="modes" role="tablist" aria-label={t('imageConv.modeLabel')}>
			<button role="tab" aria-selected={ui.imageMode === 'edit'} onclick={() => (ui.imageMode = 'edit')}><Pencil size={15} /><span>{t('imageConv.modeEdit')}</span></button>
			<button role="tab" aria-selected={ui.imageMode === 'convert'} onclick={() => { editor.commitFloating(); ui.imageMode = 'convert'; }}><RefreshCw size={15} /><span>{t('imageConv.modeConvert')}</span></button>
		</div>
		{#if ui.imageMode === 'edit'}
		<button class="btn icon ghost only-mobile" aria-label={t('image.mobile.menu')} onclick={() => (editor.sheet = 'menu')}><MenuIcon size={20} /></button>
		<div class="only-desktop"><Menu {menus} {run} /></div>
		<span class="doc-name" title={hasDoc ? `${doc.name} — ${doc.width}×${doc.height}` : ''}>{#if hasDoc}{doc.name || t('image.untitled')}{#if doc.dirty}<i aria-label={t('image.unsaved')}>•</i>{/if}{/if}</span>
		<span class="sp"></span>
		<button class="btn icon ghost" aria-label={t('image.cmd.undo')} title={`${t('image.cmd.undo')} (${mod}Z)`} disabled={!doc.canUndo && !editor.hasFloating} onclick={() => run('undo')}><Undo2 size={18} /></button>
		<button class="btn icon ghost" aria-label={t('image.cmd.redo')} title={`${t('image.cmd.redo')} (${mod}Y)`} disabled={!doc.canRedo} onclick={() => run('redo')}><Redo2 size={18} /></button>
		<button class="btn icon ghost only-mobile" aria-label={t('image.panels.layers')} disabled={!hasDoc} onclick={() => (editor.sheet = 'layers')}><Layers size={18} /></button>
		<button class="btn icon ghost only-mobile" aria-label={t('image.panels.properties')} disabled={!hasDoc} onclick={() => (editor.sheet = 'props')}><SlidersHorizontal size={18} /></button>
		<button class="btn primary export" disabled={!hasDoc} onclick={() => run('export')}><Download size={16} /><span class="only-desktop">{t('image.cmd.export')}</span></button>
		{/if}
	</header>

	{#if ui.imageMode === 'convert'}
		<div class="convert-scroll">
			<Converter {preset} onEdit={openInEditor} after={seo} />
		</div>
	{:else}

	{#if hasDoc}<div class="optbar"><ToolOptions /></div>{/if}

	<div class="main">
		<!-- Paleta de ferramentas (desktop) -->
		<aside class="toolbox only-desktop" aria-label={t('image.panels.tools')}>
			{#each TOOLS as tl, i (tl.id)}
				{#if i && TOOLS[i - 1].group !== tl.group}<span class="tsep"></span>{/if}
				<button class="tool" class:on={editor.tool === tl.id} aria-pressed={editor.tool === tl.id} aria-label={toolLabel(tl.id)} title={`${toolLabel(tl.id)} (${tl.key})`} disabled={!hasDoc} onclick={() => editor.setTool(tl.id)}>
					<tl.icon size={19} strokeWidth={1.75} />
				</button>
			{/each}
			<span class="tsep"></span>
			<button class="cpair" aria-label={t('image.panels.colors')} onclick={() => (topTab = 'colors')}>
				<span class="c2" style:--c={colors.secondaryCss}></span>
				<span class="c1" style:--c={colors.primaryCss}></span>
			</button>
		</aside>

		<div class="stage">
			<Viewport />
			{#if !hasDoc}
				<div class="welcome">
					<div class="card">
						<ImagePlus size={36} strokeWidth={1.5} />
						<h2>{t('image.empty.title')}</h2>
						<p>{t('image.empty.text')}</p>
						<div class="actions">
							<button class="btn primary" onclick={() => run('new')}><FilePlus size={16} />{t('image.cmd.new')}</button>
							<button class="btn" onclick={() => run('open')}><FolderOpen size={16} />{t('image.cmd.open')}</button>
							<button class="btn" onclick={() => run('paste')}><ClipboardPaste size={16} />{t('image.cmd.paste')}</button>
						</div>
						{#if aiHint}<p class="ai-hint"><Sparkles size={15} />{t('imageConv.aiHint')}</p>{/if}
						<button class="btn ghost" onclick={() => (ui.imageMode = 'convert')}><RefreshCw size={16} />{t('imageConv.tryConverter')}</button>
						<p class="hint">{t('image.empty.formats')}</p>
						<p class="hint">{t('common.localOnly')}</p>
					</div>
					{@render seo?.()}
				</div>
			{/if}
			{#if dragOver}<div class="drop-hint">{hasDoc ? t('image.empty.dropLayer') : t('image.empty.drop')}</div>{/if}

			<!-- Ações rápidas de seleção (úteis no toque) -->
			{#if hasDoc && sel && !editor.hasFloating && !editor.dialog}
				<div class="quick" role="toolbar" aria-label={t('image.quick.label')}>
					<span class="qsize">{sel.w}×{sel.h}</span>
					<button onclick={() => run('copy')} title={t('image.cmd.copy')}><Copy size={16} /><span>{t('image.quick.copy')}</span></button>
					<button onclick={() => run('cut')} title={t('image.cmd.cut')}><Scissors size={16} /><span>{t('image.quick.cut')}</span></button>
					<button onclick={() => { editor.setTool('move'); }} title={t('image.tools.move')}><SquareDashed size={16} /><span>{t('image.quick.move')}</span></button>
					<button onclick={() => run('cropToSelection')} title={t('image.cmd.cropToSelection')}><Crop size={16} /><span>{t('image.quick.crop')}</span></button>
					<button onclick={() => run('fillSelection')} title={t('image.cmd.fillSelection')}><PaintBucket size={16} /><span>{t('image.quick.fill')}</span></button>
					<button onclick={() => run('delete')} title={t('image.cmd.delete')}><Trash size={16} /><span>{t('image.quick.delete')}</span></button>
					<button onclick={() => run('invert')} title={t('image.cmd.invert')}><ArrowLeftRight size={16} /><span>{t('image.quick.invert')}</span></button>
					<button onclick={() => run('deselect')} title={t('image.cmd.deselect')}><X size={16} /></button>
				</div>
			{/if}
			{#if editor.hasFloating}
				<div class="quick">
					<button class="ok" onclick={() => editor.commitFloating()}>{t('image.opt.commit')}</button>
					<button onclick={() => editor.cancelFloating()}>{t('common.cancel')}</button>
				</div>
			{/if}

			{#if job.visible}
				<div class="job" role="status" aria-live="polite">
					<div class="jrow">
						<strong>{job.label}</strong>
						<span class="jt">{elapsed.toFixed(1)} s</span>
					</div>
					{#if job.detail}<span class="jd">{job.detail}</span>{/if}
					<div class="pbar" class:indet={job.progress === null}><span style:width="{Math.round((job.progress ?? 0.3) * 100)}%"></span></div>
					<button class="btn stop" onclick={() => job.stop()}><CircleStop size={16} />{t('imageAi.stop')}</button>
					<span class="jh">{t('imageAi.stopHint')}</span>
				</div>
			{/if}
		</div>

		<!-- Painéis (desktop) -->
		<aside class="panels only-desktop" aria-label={t('image.panels.label')}>
			<section class="pane">
				<div class="tabs" role="tablist">
					<button role="tab" aria-selected={topTab === 'colors'} onclick={() => (topTab = 'colors')}><Palette size={14} />{t('image.panels.colors')}</button>
					<button role="tab" aria-selected={topTab === 'history'} onclick={() => (topTab = 'history')}><ClockFading size={14} />{t('image.panels.history')}</button>
				</div>
				<div class="pane-body">
					{#if topTab === 'colors'}<ColorPanel compact />{:else}{@render history()}{/if}
				</div>
			</section>
			{#if hasDoc}
				<section class="pane grow">
					<div class="tabs" role="tablist">
						<button role="tab" aria-selected={bottomTab === 'layers'} onclick={() => (bottomTab = 'layers')}><Layers size={14} />{t('image.panels.layers')}</button>
						<button role="tab" aria-selected={bottomTab === 'props'} onclick={() => (bottomTab = 'props')}><Sparkles size={14} />{t('image.panels.properties')}</button>
					</div>
					<div class="pane-body">
						{#if bottomTab === 'layers'}<LayersPanel />{:else}<PropsPanel />{/if}
					</div>
				</section>
			{/if}
		</aside>
	</div>

	<!-- Barra de status (desktop) -->
	{#if hasDoc}
		<footer class="status only-desktop">
			<span>{doc.width} × {doc.height} px</span>
			{#if editor.cursor}<span>{Math.floor(editor.cursor.x)}, {Math.floor(editor.cursor.y)}</span>{/if}
			{#if sel}<span>{t('image.status.selection')}: {sel.w} × {sel.h}</span>{/if}
			<span>{t('image.status.layers', { count: doc.layers.length })}</span>
			<span class="sp"></span>
			<span class="hint">{t('image.status.hint')}</span>
			<button class="btn icon ghost sm" aria-label={t('image.cmd.zoomOut')} onclick={() => run('zoomOut')}><ZoomOut size={15} /></button>
			<input class="zr" type="range" min="-4" max="4" step="0.01" value={Math.log2(editor.zoom)} aria-label={t('image.status.zoom')} oninput={(e) => editor.zoomAt(editor.viewW / 2, editor.viewH / 2, 2 ** +(e.target as HTMLInputElement).value)} />
			<button class="btn icon ghost sm" aria-label={t('image.cmd.zoomIn')} onclick={() => run('zoomIn')}><ZoomIn size={15} /></button>
			<button class="zoomv" title={t('image.cmd.fit')} onclick={() => run('fit')}>{zoomPct}%</button>
		</footer>
	{/if}

	<!-- Barra de ferramentas inferior (celular) -->
	{#if hasDoc}
		<nav class="mbar only-mobile" aria-label={t('image.panels.tools')}>
			<button class="cpair m" aria-label={t('image.panels.colors')} onclick={() => (editor.sheet = 'colors')}>
				<span class="c2" style:--c={colors.secondaryCss}></span>
				<span class="c1" style:--c={colors.primaryCss}></span>
			</button>
			<div class="mtools">
				{#each TOOLS as tl (tl.id)}
					<button class="tool" class:on={editor.tool === tl.id} aria-pressed={editor.tool === tl.id} aria-label={toolLabel(tl.id)} onclick={() => editor.setTool(tl.id)}>
						<tl.icon size={20} strokeWidth={1.75} />
						<span>{toolLabel(tl.id)}</span>
					</button>
				{/each}
			</div>
			<button class="tool fitb" aria-label={t('image.cmd.fit')} onclick={() => run('fit')}><Maximize size={18} /><span>{zoomPct}%</span></button>
		</nav>
	{/if}

	{/if}

	<!-- Sheets (celular) -->
	{#if editor.sheet}
		<div class="sheet-back" role="presentation" onclick={() => (editor.sheet = null)}></div>
		<div class="sheet" role="dialog" aria-modal="true" aria-label={editor.sheet}>
			<div class="sheet-head">
				<span class="grip" aria-hidden="true"></span>
				<strong>
					{#if editor.sheet === 'menu'}{t('image.mobile.menu')}{:else if editor.sheet === 'layers'}{t('image.panels.layers')}{:else if editor.sheet === 'colors'}{t('image.panels.colors')}{:else if editor.sheet === 'props'}{t('image.panels.properties')}{:else}{t('image.panels.history')}{/if}
				</strong>
				<button class="btn icon ghost" aria-label={t('common.close')} onclick={() => (editor.sheet = null)}><X size={20} /></button>
			</div>
			<div class="sheet-body">
				{#if editor.sheet === 'menu'}
					<Menu {menus} {run} mode="list" />
					<button class="btn hist-btn" onclick={() => (editor.sheet = 'history')}><ClockFading size={16} />{t('image.panels.history')}</button>
				{:else if editor.sheet === 'layers'}<LayersPanel />
				{:else if editor.sheet === 'colors'}<ColorPanel />
				{:else if editor.sheet === 'props'}<PropsPanel />
				{:else}{@render history()}{/if}
			</div>
		</div>
	{/if}

	{#if editor.toast}
		<div class="toast {editor.toast.kind}" role="status">
			<span>{editor.toast.text}</span>
			{#if editor.toast.action}
				{@const a = editor.toast.action}
				<button class="btn sm" onclick={() => { editor.toast = null; a.run(); }}>{a.label}</button>
			{/if}
		</div>
	{/if}

	<Dialogs />
</div>

{#snippet history()}
	<ol class="history">
		<li class="h-item" class:cur={!doc.undoLabels.length}>{t('image.hist.open')}</li>
		{#each doc.undoLabels as lb, i (i)}
			<li><button class="h-item" class:cur={i === doc.undoLabels.length - 1} onclick={() => { for (let k = doc.undoLabels.length - 1; k > i; k--) editor.undo(); }}>{lb}</button></li>
		{/each}
		{#each doc.redoLabels as lb, i (i)}
			<li><button class="h-item redo" onclick={() => { for (let k = 0; k <= i; k++) editor.redo(); }}>{lb}</button></li>
		{/each}
	</ol>
{/snippet}

<style>
	.img-editor {
		--img-workspace: #101219;
		position: relative; height: 100%; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
	}
	.top { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-bottom: 1px solid var(--border); background: rgb(255 255 255 / 0.02); min-height: 48px; }
	.doc-name { font-size: 0.82rem; color: var(--text-2); margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 30vw; }
	.doc-name i { color: var(--accent); font-style: normal; margin-left: 4px; }
	.sp { flex: 1; }
	.export { margin-left: 6px; }
	.optbar { border-bottom: 1px solid var(--border); background: rgb(0 0 0 / 0.12); }
	.main { flex: 1; display: flex; min-height: 0; }
	.stage { position: relative; flex: 1; min-width: 0; display: flex; }

	.toolbox { width: 56px; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; gap: 3px; border-right: 1px solid var(--border); overflow-y: auto; scrollbar-width: none; }
	.tool { position: relative; width: 40px; height: 38px; display: grid; place-items: center; border-radius: 9px; border: 0; background: transparent; color: var(--text-2); transition: background 0.12s, color 0.12s, transform 0.1s var(--ease); }
	.tool:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
	.tool:active:not(:disabled) { transform: scale(0.94); }
	.tool.on { background: var(--accent); color: #fff; }
	.tool:disabled { opacity: 0.35; }
	.tsep { width: 26px; height: 1px; background: var(--border); margin: 4px 0; flex-shrink: 0; }
	.cpair { position: relative; width: 40px; height: 40px; border: 0; background: none; padding: 0; flex-shrink: 0; }
	.cpair span { position: absolute; width: 24px; height: 24px; border-radius: 6px; border: 2px solid var(--surface-solid); box-shadow: 0 0 0 1px var(--border); background: linear-gradient(var(--c), var(--c)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
	.cpair .c1 { left: 2px; top: 2px; z-index: 1; }
	.cpair .c2 { right: 2px; bottom: 2px; }

	.panels { width: 300px; display: flex; flex-direction: column; border-left: 1px solid var(--border); min-height: 0; }
	.pane { display: flex; flex-direction: column; min-height: 0; border-bottom: 1px solid var(--border); max-height: 55%; }
	.pane.grow { flex: 1; max-height: none; border-bottom: 0; }
	.tabs { display: flex; gap: 2px; padding: 6px 8px 0; }
	.tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 0; border-radius: 8px 8px 0 0; background: transparent; color: var(--text-3); font-size: 0.8rem; font-weight: 550; }
	.tabs button[aria-selected='true'] { background: rgb(255 255 255 / 0.05); color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }
	.pane-body { padding: 10px 12px; overflow: auto; min-height: 0; flex: 1; display: flex; flex-direction: column; }

	.status { display: flex; align-items: center; gap: 14px; padding: 3px 10px; border-top: 1px solid var(--border); font-size: 0.74rem; color: var(--text-2); font-variant-numeric: tabular-nums; min-height: 32px; }
	.status .hint { color: var(--text-3); }
	.btn.sm { padding: 4px; }
	.zr { width: 110px; accent-color: var(--accent); }
	.zoomv { min-width: 56px; padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-solid); font-size: 0.74rem; }

	.welcome { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 16px; overflow: auto; }
	.welcome > .card { margin-top: clamp(8px, 10vh, 120px); flex-shrink: 0; }
	.ai-hint { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); background: rgb(124 92 255 / 0.15); color: #d6ccff; font-size: 0.86rem; }
	.modes { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--surface-solid); border: 1px solid var(--border); margin-right: 6px; }
	.modes button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--text-2); font-size: 0.82rem; font-weight: 600; min-height: 34px; }
	.modes button[aria-selected='true'] { background: var(--accent); color: #fff; }
	.convert-scroll { flex: 1; min-height: 0; overflow: auto; }
	.card { max-width: 460px; text-align: center; display: grid; gap: 12px; justify-items: center; padding: 28px 24px; border-radius: var(--radius-lg); background: rgb(24 27 36 / 0.85); border: 1px solid var(--border); color: var(--text-2); }
	.card h2 { color: var(--text); font-size: 1.2rem; font-weight: 650; }
	.card > :global(svg) { color: var(--accent); }
	.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
	.actions .btn { min-height: 44px; }
	.drop-hint { position: absolute; inset: 12px; display: grid; place-items: center; border: 2px dashed var(--accent); border-radius: var(--radius-lg); background: rgb(221 32 107 / 0.1); font-weight: 650; pointer-events: none; z-index: 5; }

	.quick {
		position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; gap: 2px;
		padding: 4px; border-radius: 14px; background: rgb(18 20 28 / 0.92); border: 1px solid var(--border); box-shadow: var(--shadow-dock);
		max-width: calc(100% - 16px); overflow-x: auto; scrollbar-width: none; animation: up 0.18s var(--ease);
	}
	@keyframes up { from { opacity: 0; transform: translate(-50%, 6px); } }
	.quick button { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px; border: 0; border-radius: 10px; background: transparent; color: var(--text); font-size: 0.8rem; white-space: nowrap; }
	.quick button:hover { background: var(--surface-3); }
	.quick button.ok { background: var(--accent); color: #fff; font-weight: 600; }
	.qsize { font-size: 0.72rem; color: var(--text-3); padding: 0 8px; font-variant-numeric: tabular-nums; white-space: nowrap; }

	.job {
		position: absolute; left: 50%; top: 16px; transform: translateX(-50%); z-index: 6; width: min(380px, calc(100% - 24px));
		display: grid; gap: 8px; padding: 14px 16px; border-radius: var(--radius); background: var(--surface-solid);
		border: 1px solid rgb(124 92 255 / 0.45); box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
	}
	.jrow { display: flex; justify-content: space-between; gap: 8px; }
	.jt, .jd, .jh { font-size: 0.76rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
	.pbar { height: 6px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
	.pbar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); transition: width 0.15s; }
	.pbar.indet span { width: 35% !important; animation: indet 1.1s ease-in-out infinite; }
	@keyframes indet { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
	.stop { min-height: 44px; background: var(--danger); border-color: transparent; color: #fff; font-weight: 650; }
	.stop:hover:not(:disabled) { background: #ff7480; }

	.toast {
		position: absolute; left: 50%; bottom: 64px; transform: translateX(-50%); z-index: 50; display: flex; align-items: center; gap: 10px;
		max-width: calc(100% - 24px); padding: 10px 14px; border-radius: var(--radius); background: var(--surface-solid); border: 1px solid var(--border);
		box-shadow: var(--shadow-dock); font-size: 0.86rem; animation: up 0.2s var(--ease);
	}
	.toast.ok { border-color: rgb(61 220 151 / 0.45); }
	.toast.error { border-color: rgb(255 92 108 / 0.55); }

	.history { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
	.h-item { width: 100%; text-align: left; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; font-size: 0.82rem; color: var(--text-2); display: block; }
	button.h-item:hover { background: var(--surface-3); color: var(--text); }
	.h-item.cur { background: var(--accent-soft); color: var(--text); }
	.h-item.redo { opacity: 0.45; }

	.mbar { display: none; }
	.sheet-back { position: absolute; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 30; animation: fade 0.2s; }
	@keyframes fade { from { opacity: 0; } }
	.sheet {
		position: absolute; left: 0; right: 0; bottom: 0; z-index: 31; max-height: 78%; display: flex; flex-direction: column;
		background: var(--surface-solid); border-top: 1px solid var(--border); border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: 0 -20px 60px rgb(0 0 0 / 0.5); animation: sheet 0.25s var(--ease);
	}
	@keyframes sheet { from { transform: translateY(30%); opacity: 0; } }
	.sheet-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 14px 10px 8px 16px; }
	.grip { position: absolute; left: 50%; top: 6px; width: 40px; height: 4px; border-radius: 99px; background: var(--surface-3); transform: translateX(-50%); }
	.sheet-body { padding: 4px 16px 18px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
	.hist-btn { min-height: 44px; }

	.only-mobile { display: none; }
	@media (max-width: 520px) { .modes span { display: none; } .modes button { padding: 6px 10px; } }
	@media (max-width: 900px) {
		.only-desktop { display: none !important; }
		.only-mobile { display: inline-flex; }
		.top { padding: 4px; gap: 2px; }
		.top .btn.icon { width: 42px; height: 42px; }
		.doc-name { max-width: 36vw; margin-left: 2px; }
		.mbar { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-top: 1px solid var(--border); background: rgb(0 0 0 / 0.2); }
		.mtools { flex: 1; display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; }
		.mbar .tool { width: auto; min-width: 54px; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 0 6px; flex-shrink: 0; scroll-snap-align: start; }
		.mbar .tool span { font-size: 0.6rem; max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.cpair.m { width: 44px; height: 44px; flex-shrink: 0; }
		.fitb { flex-shrink: 0; }
		.quick { bottom: 8px; }
		.toast { bottom: 76px; }
	}
	@media (prefers-reduced-motion: reduce) { .quick, .toast, .sheet, .job { animation: none; } }
</style>
