<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { workspace, type Node } from '#lib/fs/workspace.svelte.ts';
	import { previewKind, renderMarkdown, openPreviewTab } from '#lib/fs/preview.ts';
	import { detectLanguage, languageFromName, getLanguage, canPrettyFormat, CONFIDENT, type Language } from '#lib/editor/languages.ts';
	import { formatCode } from '#lib/editor/format.ts';
	import DiffView from './editor/DiffView.svelte';
	import LanguagePicker, { langName } from './editor/LanguagePicker.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import {
		FilePlus, FolderPlus, FolderOpen, Save, SaveAll, Download, ChevronRight, ChevronDown,
		FileText, Folder, Trash2, HardDrive, X, Columns2, ExternalLink, Undo2, PanelLeft,
		WandSparkles, GitCompareArrows, FilePen, Braces, LoaderCircle, Sparkles, CircleAlert, CircleCheck
	} from '@lucide/svelte';

	let collapsed = $state(new Set<string>());
	let newName = $state('');
	let newKind = $state<'file' | 'dir'>('file');
	let createError = $state<string | null>(null);
	let parentDir = $state('');
	let textarea: HTMLTextAreaElement | undefined = $state();
	let cursor = $state({ line: 1, col: 1 });
	let showPreview = $state(false);
	let showTree = $state(true);
	let mobilePane = $state<'code' | 'preview'>('code');

	// ----- Linguagem, formatação, diff -----
	let showDiff = $state(false);
	let diffSource = $state<string>('saved'); // 'saved' | 'paste' | caminho de outro arquivo/rascunho
	let diffPasted = $state('');
	let formatting = $state(false);
	let picker = $state<null | { title: string; hint: string; suggestions: { id: string; confidence: number }[]; then?: 'format' }>(null);
	let toast = $state<null | { kind: 'ok' | 'info' | 'error'; text: string; action?: { label: string; run: () => void } }>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	let saveDlg = $state<null | { path: string; name: string; dir: string; error: string | null }>(null);
	let saveInput: HTMLInputElement | undefined = $state();

	function notify(kind: 'ok' | 'info' | 'error', text: string, action?: { label: string; run: () => void }, ms = 4200) {
		clearTimeout(toastTimer);
		toast = { kind, text, action };
		toastTimer = setTimeout(() => (toast = null), action ? ms + 2500 : ms);
	}

	/** Linguagem efetiva: escolhida > pela extensão > detectada (rascunhos/sem extensão) > texto puro. */
	function resolveLang(n: Node | null): { lang: Language; source: 'user' | 'ext' | 'auto' | 'none' } {
		if (!n) return { lang: getLanguage('plaintext'), source: 'none' };
		if (n.lang && !n.langAuto) return { lang: getLanguage(n.lang), source: 'user' };
		if (!n.scratch) {
			const byName = languageFromName(n.name);
			if (byName) return { lang: byName, source: 'ext' };
		}
		if (n.lang) return { lang: getLanguage(n.lang), source: 'auto' };
		return { lang: getLanguage('plaintext'), source: 'none' };
	}

	const current = $derived(resolveLang(workspace.active));

	/** Detecta e grava como "auto" quando tem confiança suficiente. Retorna a detecção. */
	function autoDetect(n: Node) {
		const det = detectLanguage(n.content);
		const top = det[0];
		if (top && top.confidence >= CONFIDENT) workspace.setLang(n.path, top.id, true);
		else if (!det.length && n.langAuto) workspace.setLang(n.path, undefined, true);
		return det;
	}

	function needsDetection(n: Node) {
		const r = resolveLang(n);
		return r.source === 'none' || r.source === 'auto';
	}

	/** Substitui todo o texto preservando o Ctrl+Z do navegador quando possível. */
	function replaceAll(text: string) {
		const ta = textarea;
		if (ta && document.activeElement !== ta) ta.focus();
		if (ta) {
			const top = ta.scrollTop;
			ta.select();
			const ok = document.execCommand?.('insertText', false, text);
			if (!ok || ta.value !== text) {
				ta.value = text;
				workspace.update(text);
			}
			ta.setSelectionRange(0, 0);
			ta.scrollTop = top;
			updateCursor();
		} else workspace.update(text);
	}

	async function format(lang?: Language) {
		const n = workspace.active;
		if (!n || formatting) return;
		if (!n.content.trim()) {
			notify('info', t('editor.toast.nothingToFormat'));
			return;
		}
		if (!lang) {
			if (needsDetection(n)) {
				const det = autoDetect(n);
				const top = det[0];
				if (!top || top.confidence < CONFIDENT) {
					picker = {
						title: t('editor.picker.whichLang'),
						hint: top ? t('editor.picker.unsure') : t('editor.picker.unknown'),
						suggestions: det,
						then: 'format'
					};
					return;
				}
			}
			lang = resolveLang(workspace.active).lang;
		}
		formatting = true;
		const res = await formatCode(n.content, lang, { tabWidth: lang.id === 'python' ? 4 : 2 });
		formatting = false;
		if (workspace.active?.path !== n.path) return;
		if (!res.ok) {
			notify('error', t('editor.toast.formatFailed', { lang: langName(lang), error: res.error }), { label: t('editor.toast.changeLang'), run: () => openPicker('format') }, 7000);
			return;
		}
		if (res.text === n.content) {
			notify('ok', t('editor.toast.alreadyFormatted', { lang: langName(lang) }));
			return;
		}
		replaceAll(res.text);
		if (res.basic) notify('info', t('editor.toast.basic', { lang: langName(lang) }));
		else notify('ok', t('editor.toast.formatted', { lang: langName(lang) }), undefined, 2200);
	}

	function openPicker(then?: 'format') {
		const n = workspace.active;
		if (!n) return;
		picker = {
			title: then ? t('editor.picker.formatAs') : t('editor.picker.fileLang'),
			hint: n.scratch ? t('editor.picker.draftHint') : t('editor.picker.fileHint'),
			suggestions: detectLanguage(n.content),
			then
		};
	}

	function onPick(l: Language) {
		const n = workspace.active;
		const then = picker?.then;
		picker = null;
		if (!n) return;
		workspace.setLang(n.path, l.id, false);
		textarea?.focus();
		if (then === 'format') format(l);
		else notify('ok', t('editor.toast.langSet', { lang: langName(l) }) + (canPrettyFormat(l) ? t('editor.toast.langSetFmt') : ''), undefined, 2400);
	}

	function onPaste() {
		const n = workspace.active;
		if (!n || !needsDetection(n)) return;
		// Espera o texto colado entrar no estado
		setTimeout(() => {
			const cur = workspace.active;
			if (!cur || cur.path !== n.path) return;
			const before = cur.lang;
			autoDetect(cur);
			if (cur.lang && cur.lang !== before) {
				const l = getLanguage(cur.lang);
				notify('info', t('editor.toast.detected', { lang: langName(l) }), canPrettyFormat(l) ? { label: t('editor.status.format'), run: () => format() } : undefined);
			}
		}, 0);
	}

	// ----- Diff -----
	const diffOptions = $derived.by(() => {
		const a = workspace.active;
		const opts: { value: string; label: string }[] = [];
		if (a && !a.scratch) opts.push({ value: 'saved', label: t('editor.diff.savedVersion') });
		opts.push({ value: 'paste', label: t('editor.diff.pastedOption') });
		for (const s of workspace.scratches) if (s.path !== a?.path) opts.push({ value: s.path, label: t('editor.diff.draftOption', { name: s.name }) });
		for (const f of workspace.sorted) if (f.kind === 'file' && f.path !== a?.path) opts.push({ value: f.path, label: f.path });
		return opts;
	});

	// Ao trocar de arquivo, volta para a fonte padrão (versão salva, ou texto colado em rascunhos).
	let diffFor = '';
	$effect(() => {
		const path = workspace.activePath ?? '';
		if (path !== diffFor) {
			diffFor = path;
			diffSource = diffOptions[0]?.value ?? 'paste';
		} else if (!diffOptions.some((o) => o.value === diffSource)) diffSource = diffOptions[0]?.value ?? 'paste';
	});

	const diffLeft = $derived.by(() => {
		const a = workspace.active;
		if (!a) return { text: '', label: '' };
		if (diffSource === 'saved') return { text: a.saved, label: t('editor.diff.savedLabel', { name: a.name }) };
		if (diffSource === 'paste') return { text: diffPasted, label: t('editor.diff.pasted') };
		const o = workspace.scratches.find((x) => x.path === diffSource) ?? workspace.nodes.find((x) => x.path === diffSource);
		return { text: o?.content ?? '', label: o?.name ?? diffSource };
	});

	function toggleDiff() {
		showDiff = !showDiff;
		if (showDiff && workspace.active?.scratch && diffSource === 'saved') diffSource = 'paste';
	}

	// ----- Salvar rascunho -----
	function suggestedFileName(n: Node) {
		let lang = resolveLang(n).lang;
		if (lang.id === 'plaintext') {
			const top = detectLanguage(n.content)[0];
			if (top && top.confidence >= CONFIDENT) lang = getLanguage(top.id);
		}
		const base = n.name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
		return `${base}.${lang.ext[0]}`;
	}

	function openSaveDialog() {
		const n = workspace.active;
		if (!n?.scratch) return;
		saveDlg = { path: n.path, name: suggestedFileName(n), dir: parentDir, error: null };
		tick().then(() => {
			const el = saveInput;
			if (!el) return;
			el.focus();
			const dot = el.value.lastIndexOf('.');
			el.setSelectionRange(0, dot > 0 ? dot : el.value.length);
		});
	}

	async function confirmSave(e?: Event) {
		e?.preventDefault();
		if (!saveDlg) return;
		const name = saveDlg.name.trim();
		if (!name) {
			saveDlg.error = t('editor.saveDialog.nameRequired');
			return;
		}
		const target = saveDlg.dir ? `${saveDlg.dir}/${name}` : name;
		const err = await workspace.saveScratchAs(saveDlg.path, target);
		if (err) {
			saveDlg.error = err;
			return;
		}
		saveDlg = null;
		notify('ok', t('editor.toast.savedTo', { path: target }), undefined, 2400);
	}

	function doSave() {
		if (workspace.active?.scratch) openSaveDialog();
		else workspace.save();
	}

	function doSaveAs() {
		const n = workspace.active;
		if (!n) return;
		workspace.saveAs(n.path, n.scratch ? suggestedFileName(n) : undefined);
	}

	function closeScratch(n: Node) {
		if (n.content && !confirm(t('editor.confirm.discardDraft', { name: n.name }))) return;
		workspace.closeScratch(n.path);
	}

	const dirs = $derived(workspace.sorted.filter((n) => n.kind === 'dir').map((n) => n.path));

	onMount(() => {
		if (!workspace.ready) workspace.init();
	});

	const visible = $derived(
		workspace.sorted.filter((n) => {
			const parts = n.path.split('/');
			for (let i = 1; i < parts.length; i++) {
				if (collapsed.has(parts.slice(0, i).join('/'))) return false;
			}
			return true;
		})
	);

	const kind = $derived.by(() => {
		const a = workspace.active;
		if (!a) return null;
		const id = resolveLang(a).lang.id;
		if (id === 'markdown' || id === 'mdx') return 'markdown' as const;
		if (id === 'html') return 'html' as const;
		return a.scratch ? null : previewKind(a.name);
	});
	const mdHtml = $derived(kind === 'markdown' && workspace.active ? renderMarkdown(workspace.active.content) : '');

	function toggle(path: string) {
		const s = new Set(collapsed);
		s.has(path) ? s.delete(path) : s.add(path);
		collapsed = s;
	}

	function onNodeClick(n: { path: string; kind: 'file' | 'dir' }) {
		if (n.kind === 'dir') {
			parentDir = n.path;
			toggle(n.path);
		} else {
			parentDir = n.path.includes('/') ? n.path.slice(0, n.path.lastIndexOf('/')) : '';
			workspace.select(n.path);
		}
	}

	function onScratchClick(n: Node) {
		workspace.select(n.path);
	}

	async function create(e?: Event) {
		e?.preventDefault();
		const name = newName.trim();
		if (!name) return;
		const full = parentDir ? `${parentDir}/${name}` : name;
		createError = await workspace.create(full, newKind);
		if (!createError) {
			newName = '';
			if (newKind === 'dir') parentDir = full;
		}
	}

	async function remove(path: string) {
		if (!confirm(t('editor.confirm.delete', { path }))) return;
		await workspace.remove(path);
	}

	function onKey(e: KeyboardEvent) {
		if (picker || saveDlg) return;
		const mod = e.ctrlKey || e.metaKey;
		if (mod && !e.altKey && e.code === 'KeyS') {
			e.preventDefault();
			if (e.shiftKey) doSaveAs();
			else doSave();
		} else if ((e.shiftKey && e.altKey && !mod && e.code === 'KeyF') || (mod && e.altKey && e.code === 'KeyL')) {
			// Shift+Alt+F (VS Code) ou Ctrl+Alt+L (JetBrains)
			e.preventDefault();
			format();
		} else if (e.shiftKey && e.altKey && !mod && e.code === 'KeyD') {
			e.preventDefault();
			if (workspace.active) toggleDiff();
		} else if (e.shiftKey && e.altKey && !mod && e.code === 'KeyL') {
			e.preventDefault();
			openPicker();
		} else if (e.altKey && !e.shiftKey && !mod && e.code === 'KeyN') {
			e.preventDefault();
			workspace.newScratch();
			showDiff = false;
			tick().then(() => textarea?.focus());
		}
	}

	function updateCursor() {
		if (!textarea) return;
		const before = textarea.value.slice(0, textarea.selectionStart);
		const lines = before.split('\n');
		cursor = { line: lines.length, col: lines[lines.length - 1].length + 1 };
	}

	function onInput(e: Event) {
		workspace.update((e.currentTarget as HTMLTextAreaElement).value);
		updateCursor();
	}

	function focusNew(k: 'file' | 'dir') {
		newKind = k;
		document.getElementById('new-name')?.focus();
	}

	const lineCount = $derived(workspace.active ? workspace.active.content.split('\n').length : 1);
	const lineNumbers = $derived(Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'));
</script>

<svelte:window onkeydown={onKey} />

<div class="editor" class:no-tree={!showTree} class:split={showPreview && kind && !showDiff} data-pane={mobilePane}>

	<div class="main">
		<!-- Barra de título da janela com as ações do app atual -->
		<header class="titlebar">
			<h1 class="title">{t('app.dock.editor')}</h1>
			<span class="where"><HardDrive size={13} /> {workspace.backend === 'local' ? t('editor.toolbar.localPrefix') : ''}{workspace.rootName}</span>
			{#if workspace.active}<span class="crumb">/ {workspace.active.scratch ? workspace.active.name : workspace.active.path}{workspace.active.dirty ? ' •' : ''}</span>{/if}
			<span class="grow"></span>
			<div class="actions" role="toolbar" aria-label={t('editor.toolbar.label')}>
				<button class="tbtn" title={t('editor.toolbar.toggleTreeTitle')} aria-label={t('editor.toolbar.toggleTree')} aria-pressed={showTree} onclick={() => (showTree = !showTree)}><PanelLeft size={17} /></button>
				<span class="tsep"></span>
				<button class="tbtn" title={t('editor.toolbar.newDraftTitle')} aria-label={t('editor.toolbar.newDraft')} onclick={() => { workspace.newScratch(); showDiff = false; tick().then(() => textarea?.focus()); }}><FilePen size={17} /></button>
				<button class="tbtn" title={t('editor.toolbar.newFile')} aria-label={t('editor.toolbar.newFile')} onclick={() => focusNew('file')}><FilePlus size={17} /></button>
				<button class="tbtn" title={t('editor.toolbar.newFolder')} aria-label={t('editor.toolbar.newFolder')} onclick={() => focusNew('dir')}><FolderPlus size={17} /></button>
				{#if workspace.canLocal}
					<button class="tbtn" title={t('editor.toolbar.openLocal')} aria-label={t('editor.toolbar.openLocal')} onclick={() => workspace.openLocal()}><FolderOpen size={17} /></button>
				{/if}
				{#if workspace.backend === 'local'}
					<button class="tbtn" title={t('editor.toolbar.useVirtual')} aria-label={t('editor.toolbar.useVirtual')} onclick={() => workspace.useVirtual()}><Undo2 size={17} /></button>
				{/if}
				<span class="tsep"></span>
				<button class="tbtn" title={t('editor.toolbar.saveTitle')} aria-label={t('common.save')} disabled={!workspace.active} onclick={doSave}><Save size={17} /></button>
				<button class="tbtn" title={t('editor.toolbar.saveAsTitle')} aria-label={t('editor.toolbar.saveAs')} disabled={!workspace.active} onclick={doSaveAs}><Download size={17} /></button>
				{#if workspace.dirtyCount > 0}
					<button class="tbtn" title={t('editor.toolbar.saveAll')} aria-label={t('editor.toolbar.saveAll')} onclick={() => workspace.nodes.filter((n) => n.dirty).forEach((n) => workspace.save(n.path))}><SaveAll size={17} /></button>
				{/if}
				<span class="tsep"></span>
				<button class="tbtn" title={t('editor.toolbar.formatTitle')} aria-label={t('editor.toolbar.format')} disabled={!workspace.active || formatting || showDiff} onclick={() => format()}>
					{#if formatting}<span class="spin"><LoaderCircle size={17} /></span>{:else}<WandSparkles size={17} />{/if}
				</button>
				<button class="tbtn" title={t('editor.toolbar.langTitle')} aria-label={t('editor.toolbar.chooseLang')} disabled={!workspace.active} onclick={() => openPicker()}><Braces size={17} /></button>
				<button class="tbtn" title={t('editor.toolbar.diffTitle')} aria-label={t('editor.toolbar.diff')} aria-pressed={showDiff} disabled={!workspace.active} onclick={toggleDiff}><GitCompareArrows size={17} /></button>
				{#if kind && !showDiff}
					<span class="tsep"></span>
					<button class="tbtn" title={t('editor.toolbar.previewSide')} aria-label={t('editor.toolbar.previewSide')} aria-pressed={showPreview} onclick={() => (showPreview = !showPreview)}><Columns2 size={17} /></button>
					<button class="tbtn" title={t('editor.toolbar.previewTab')} aria-label={t('editor.toolbar.previewTab')} onclick={() => workspace.active && openPreviewTab(kind === 'markdown' ? 'preview.md' : 'preview.html', workspace.active.content)}><ExternalLink size={17} /></button>
				{/if}
			</div>
		</header>
		{#if kind && showPreview && !showDiff}
			<div class="mobile-only switch">
				<div class="seg" role="group" aria-label={t('editor.pane.label')}>
					<button aria-pressed={mobilePane === 'code'} onclick={() => (mobilePane = 'code')}>{t('editor.pane.code')}</button>
					<button aria-pressed={mobilePane === 'preview'} onclick={() => (mobilePane = 'preview')}>{t('editor.pane.preview')}</button>
				</div>
			</div>
		{/if}

		{#if workspace.error}
			<div class="banner" role="alert">
				<span>{workspace.error}</span>
				<button class="btn ghost icon" aria-label={t('editor.pane.closeNotice')} onclick={() => (workspace.error = null)}><X size={14} /></button>
			</div>
		{/if}

		<div class="body">
			{#if showTree}
				<aside class="tree" aria-label={t('editor.tree.label')}>
					<form class="create" onsubmit={create}>
						<div class="kind" role="radiogroup" aria-label={t('editor.tree.kind')}>
							<button type="button" role="radio" aria-checked={newKind === 'file'} class:on={newKind === 'file'} onclick={() => (newKind = 'file')} aria-label={t('editor.tree.file')}><FileText size={13} /></button>
							<button type="button" role="radio" aria-checked={newKind === 'dir'} class:on={newKind === 'dir'} onclick={() => (newKind = 'dir')} aria-label={t('editor.tree.folder')}><Folder size={13} /></button>
						</div>
						<input id="new-name" class="input" placeholder={parentDir ? t('editor.tree.placeholderIn', { dir: parentDir }) : t('editor.tree.placeholder')} bind:value={newName} aria-label={t('editor.tree.newName')} />
						<button class="btn icon primary" type="submit" aria-label={t('editor.tree.create')}>+</button>
					</form>
					{#if createError}<p class="error small">{createError}</p>{/if}

					<ul class="list" role="tree">
						{#if workspace.scratches.length}
							<li role="none" class="section">
								<span>{t('editor.tree.drafts')}</span>
								<button class="add" title={t('editor.tree.newDraftTitle')} aria-label={t('editor.tree.newDraft')} onclick={() => workspace.newScratch()}>+</button>
							</li>
							{#each workspace.scratches as n (n.path)}
								{@const sl = resolveLang(n)}
								<li role="none">
									<div
										class="row scratch"
										class:active={workspace.activePath === n.path}
										role="treeitem"
										aria-selected={workspace.activePath === n.path}
										tabindex="0"
										onclick={() => onScratchClick(n)}
										onkeydown={(e) => e.key === 'Enter' && onScratchClick(n)}
									>
										<span class="spacer"></span>
										<FilePen size={14} />
										<span class="name"><i>{n.name}</i>{n.dirty ? ' •' : ''}</span>
										{#if sl.source !== 'none'}<span class="tag">{sl.lang.ext[0]}</span>{/if}
										<button class="del" aria-label={t('editor.tree.closeItem', { name: n.name })} title={t('editor.tree.closeDraft')} onclick={(e) => { e.stopPropagation(); closeScratch(n); }}><X size={13} /></button>
									</div>
								</li>
							{/each}
							<li role="none" class="section"><span>{workspace.rootName}</span></li>
						{/if}
						{#each visible as n (n.path)}
							{@const depth = n.path.split('/').length - 1}
							<li role="none">
								<div
									class="row"
									class:active={workspace.activePath === n.path}
									class:dir={n.kind === 'dir'}
									style:padding-left="{8 + depth * 14}px"
									role="treeitem"
									aria-selected={workspace.activePath === n.path}
									aria-expanded={n.kind === 'dir' ? !collapsed.has(n.path) : undefined}
									tabindex="0"
									onclick={() => onNodeClick(n)}
									onkeydown={(e) => e.key === 'Enter' && onNodeClick(n)}
								>
									{#if n.kind === 'dir'}
										{#if collapsed.has(n.path)}<ChevronRight size={14} />{:else}<ChevronDown size={14} />{/if}
										<Folder size={14} />
									{:else}
										<span class="spacer"></span>
										<FileText size={14} />
									{/if}
									<span class="name">{n.name}{n.dirty ? ' •' : ''}</span>
									<button class="del" aria-label={t('editor.tree.deleteItem', { name: n.name })} onclick={(e) => { e.stopPropagation(); remove(n.path); }}><Trash2 size={13} /></button>
								</div>
							</li>
						{:else}
							<li class="empty">{t('editor.tree.empty')}</li>
						{/each}
					</ul>
				</aside>
			{/if}

			<div class="panes">
				{#if workspace.active && showDiff}
					<section class="pane diffpane" aria-label={t('editor.diff.label')}>
						<div class="diffsrc">
							<label for="diff-src">{t('editor.diff.compare')}</label>
							<select id="diff-src" class="input" bind:value={diffSource}>
								{#each diffOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
							</select>
							<span class="muted">{t('editor.diff.with')} <b>{workspace.active.name}</b> {t('editor.diff.currentSuffix')}</span>
							<span class="grow"></span>
							<button class="btn ghost" onclick={() => (showDiff = false)}><X size={14} /> {t('editor.diff.close')}</button>
						</div>
						{#if diffSource === 'paste'}
							<textarea class="textarea paste" bind:value={diffPasted} placeholder={t('editor.diff.pastePlaceholder')} aria-label={t('editor.diff.pasteAria')} spellcheck="false"></textarea>
						{/if}
						<DiffView left={diffLeft.text} right={workspace.active.content} leftLabel={diffLeft.label} rightLabel={workspace.active.name} />
					</section>
				{:else if workspace.active}
					<section class="pane code" aria-label={t('editor.code.label')}>
						<div class="code-wrap">
							<pre class="gutter" aria-hidden="true">{lineNumbers}</pre>
							<textarea
								bind:this={textarea}
								spellcheck="false"
								wrap="off"
								aria-label={t('editor.code.edit', { path: workspace.active.path })}
								value={workspace.active.content}
								oninput={onInput}
								onpaste={onPaste}
								placeholder={workspace.active.scratch && !workspace.active.content ? t('editor.code.placeholder') : undefined}
								onkeyup={updateCursor}
								onclick={updateCursor}
								onscroll={(e) => {
									const g = (e.currentTarget as HTMLTextAreaElement).previousElementSibling as HTMLElement;
									if (g) g.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop;
								}}
							></textarea>
						</div>
					</section>

					{#if showPreview && kind && !showDiff}
						<section class="pane preview" aria-label={t('editor.preview.label')}>
							{#if kind === 'markdown'}
								<article class="md">{@html mdHtml}</article>
							{:else}
								<iframe title={t('editor.preview.iframe')} sandbox="allow-scripts allow-forms" srcdoc={workspace.active.content}></iframe>
							{/if}
						</section>
					{/if}
				{:else}
					<div class="placeholder">
						<p class="panel-title">{t('editor.empty.title')}</p>
						<p class="muted">{t('editor.empty.hint')}</p>
					</div>
				{/if}
			</div>
		</div>

		<footer class="status">
			<span>{workspace.active ? t('editor.status.position', { line: cursor.line, col: cursor.col }) : t('editor.status.ready')}</span>
			<span class="grow"></span>
			{#if workspace.active}
				<button class="lang" onclick={() => openPicker()} title={t('editor.status.langTitle')}>
					{#if current.source === 'auto'}<Sparkles size={11} />{/if}
					{current.source === 'none' ? t('editor.status.detect') : langName(current.lang)}
					{#if current.source === 'auto'}<span class="dim">{t('editor.status.auto')}</span>{/if}
				</button>
				{#if canPrettyFormat(current.lang) || current.source === 'none'}
					<button class="lang" onclick={() => format()} title={t('editor.status.formatTitle')}><WandSparkles size={11} /> {t('editor.status.format')}</button>
				{/if}
			{/if}
			<span>{workspace.active ? t('editor.status.chars', { count: workspace.active.content.length }) : ''}</span>
			<span>{workspace.active?.scratch ? t('editor.status.draft') : workspace.backend === 'local' ? t('editor.status.savedDisk') : t('editor.status.savedBrowser')}</span>
		</footer>
	</div>
</div>

{#if toast}
	<div class="toast {toast.kind}" role="status" aria-live="polite">
		{#if toast.kind === 'error'}<CircleAlert size={16} />{:else if toast.kind === 'ok'}<CircleCheck size={16} />{:else}<Sparkles size={16} />{/if}
		<span>{toast.text}</span>
		{#if toast.action}
			{@const act = toast.action}
			<button class="btn" onclick={() => { toast = null; act.run(); }}>{act.label}</button>
		{/if}
		<button class="btn ghost icon" aria-label={t('common.close')} onclick={() => (toast = null)}><X size={14} /></button>
	</div>
{/if}

{#if picker}
	<LanguagePicker
		title={picker.title}
		hint={picker.hint}
		current={workspace.active?.lang && !workspace.active.langAuto ? workspace.active.lang : null}
		suggestions={picker.suggestions}
		onpick={onPick}
		onclose={() => { picker = null; textarea?.focus(); }}
	/>
{/if}

{#if saveDlg}
	<div class="backdrop" role="presentation" onclick={() => (saveDlg = null)}></div>
	<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (saveDlg = null)}>
	<form class="dlg-form" onsubmit={confirmSave}>
		<p id="save-title" class="panel-title">{t('editor.saveDialog.title')}</p>
		<div class="field">
			<label class="label" for="save-name">{t('editor.saveDialog.fileName')}</label>
			<input id="save-name" class="input mono" bind:this={saveInput} bind:value={saveDlg.name} autocomplete="off" spellcheck="false" />
			<p class="hint">{t('editor.saveDialog.extHint', { lang: langName(resolveLang(workspace.scratches.find((x) => x.path === saveDlg?.path) ?? null).lang) })}</p>
		</div>
		<div class="field">
			<label class="label" for="save-dir">{t('editor.saveDialog.folder')}</label>
			<select id="save-dir" class="input" bind:value={saveDlg.dir}>
				<option value="">{t('editor.saveDialog.root', { name: workspace.rootName })}</option>
				{#each dirs as d (d)}<option value={d}>{d}</option>{/each}
			</select>
		</div>
		{#if saveDlg.error}<p class="error">{saveDlg.error}</p>{/if}
		<div class="dlg-actions">
			<button type="button" class="btn ghost" onclick={() => { const n = workspace.active; saveDlg = null; if (n) workspace.saveAs(n.path, suggestedFileName(n)); }}><Download size={15} /> {t('common.download')}</button>
			<span class="grow"></span>
			<button type="button" class="btn" onclick={() => (saveDlg = null)}>{t('common.cancel')}</button>
			<button type="submit" class="btn primary"><Save size={15} /> {t('common.save')}</button>
		</div>
	</form>
	</div>
{/if}

<style>
	.editor { display: flex; height: 100%; min-height: 0; min-width: 0; }
	.grow { flex: 1; }
	.titlebar { display: flex; align-items: center; gap: 12px; padding: 8px 10px 8px 18px; border-bottom: 1px solid var(--border); background: rgb(255 255 255 / 0.02); min-width: 0; }
	.title { font-size: 1.05rem; font-weight: 650; letter-spacing: -0.01em; }
	.actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
	.tbtn { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--text-2); transition: background 0.15s var(--ease), color 0.15s, transform 0.1s var(--ease); }
	.tbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
	.tbtn:active:not(:disabled) { transform: scale(0.94); }
	.tbtn:disabled { opacity: 0.35; cursor: not-allowed; }
	.tbtn[aria-pressed='true'] { background: var(--accent-soft); color: var(--text); }
	.tsep { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
	.switch { padding: 6px 10px; border-bottom: 1px solid var(--border); }
	.main { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
	.where { display: inline-flex; align-items: center; gap: 6px; color: var(--text-2); font-size: 0.8rem; white-space: nowrap; }
	.crumb { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
	.banner { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 12px; background: rgb(255 92 108 / 0.12); color: var(--danger); font-size: 0.85rem; }

	.body { display: grid; grid-template-columns: minmax(170px, 230px) minmax(0, 1fr); flex: 1; min-height: 0; min-width: 0; }
	.editor.no-tree .body { grid-template-columns: 1fr; }
	.tree { border-right: 1px solid var(--border); display: flex; flex-direction: column; min-height: 0; background: rgb(0 0 0 / 0.12); }
	.create { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; padding: 8px; align-items: center; }
	.kind { display: inline-flex; background: var(--surface-solid); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
	.kind button { background: transparent; border: 0; padding: 4px 6px; border-radius: 6px; color: var(--text-2); }
	.kind button.on { background: var(--surface-3); color: var(--text); }
	.create .input { padding: 6px 8px; font-size: 0.85rem; }
	.create .btn { padding: 4px 9px; font-size: 1rem; line-height: 1; }
	.list { list-style: none; margin: 0; padding: 4px 4px 12px; overflow: auto; flex: 1; }
	.row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 6px; font-size: 0.88rem; color: var(--text-2); cursor: pointer; user-select: none; }
	.row:hover { background: var(--surface-2); color: var(--text); }
	.row.active { background: var(--accent-soft); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
	.row.dir { color: var(--text); font-weight: 500; }
	.row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.row .del { opacity: 0; background: none; border: 0; color: var(--text-3); padding: 2px; border-radius: 4px; }
	.row:hover .del, .row:focus-within .del { opacity: 1; }
	.row .del:hover { color: var(--danger); }
	.spacer { width: 14px; }
	.empty { padding: 12px; color: var(--text-3); font-size: 0.85rem; }
	.small { font-size: 0.8rem; padding: 0 8px; }

	.panes { display: flex; min-width: 0; min-height: 0; flex: 1; }
	.pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; flex: 1; }
	.pane.preview { border-left: 1px solid var(--border); background: #0f1117; }
	.code-wrap { display: grid; grid-template-columns: auto minmax(0, 1fr); flex: 1; min-height: 0; overflow: hidden; font-family: var(--mono); font-size: 0.92rem; line-height: 1.6; }
	.gutter { margin: 0; padding: 14px 12px 14px 14px; color: var(--text-3); text-align: right; background: rgb(0 0 0 / 0.15); border-right: 1px solid var(--border); overflow: hidden; user-select: none; font: inherit; }
	textarea { border: 0; resize: none; padding: 14px 18px; background: transparent; outline: none; font-family: var(--mono); font-size: 0.92rem; line-height: 1.6; tab-size: 2; white-space: pre; overflow: auto; min-height: 0; }
	textarea:focus-visible { outline: none; }
	iframe { flex: 1; width: 100%; border: 0; background: #fff; }
	.md { padding: 24px 32px; overflow: auto; line-height: 1.7; color: var(--text); max-width: 860px; }
	.md :global(h1), .md :global(h2), .md :global(h3) { line-height: 1.25; margin: 1.2em 0 .5em; }
	.md :global(h1) { font-size: 1.8rem; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
	.md :global(a) { color: var(--accent); }
	.md :global(code) { font-family: var(--mono); background: var(--surface-2); padding: .1em .35em; border-radius: 5px; font-size: .9em; }
	.md :global(pre) { background: var(--surface-solid); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; overflow: auto; }
	.md :global(pre code) { background: none; padding: 0; }
	.md :global(blockquote) { margin: 0; padding-left: 14px; border-left: 3px solid var(--accent); color: var(--text-2); }
	.md :global(table) { border-collapse: collapse; }
	.md :global(th), .md :global(td) { border: 1px solid var(--border); padding: 6px 10px; }
	.md :global(img) { max-width: 100%; }
	.placeholder { margin: auto; text-align: center; padding: 24px; }
	.status { display: flex; gap: 14px; padding: 5px 12px; font-size: 0.75rem; color: var(--text-3); border-top: 1px solid var(--border); background: rgb(0 0 0 / 0.2); flex-wrap: wrap; }
	.mobile-only { display: none; }

	/* Rascunhos na árvore */
	.section { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 4px 10px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); font-weight: 600; }
	.section .add { background: none; border: 0; color: var(--text-3); font-size: 1rem; line-height: 1; padding: 0 4px; border-radius: 4px; }
	.section .add:hover { color: var(--text); background: var(--surface-3); }
	.row.scratch .name i { font-style: italic; }
	.tag { font-family: var(--mono); font-size: 0.66rem; padding: 0 5px; border-radius: 4px; background: var(--surface-3); color: var(--text-2); }

	/* Status bar: linguagem e formatar */
	.lang { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; color: var(--text-2); font-size: 0.75rem; padding: 1px 6px; border-radius: 5px; }
	.lang:hover { background: var(--surface-3); color: var(--text); }
	.lang .dim { color: var(--text-3); }
	.spin { display: inline-flex; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	textarea::placeholder { color: var(--text-3); }

	/* Diff */
	.diffpane { overflow: hidden; }
	.diffsrc { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border); flex-wrap: wrap; font-size: 0.85rem; }
	.diffsrc label { color: var(--text-2); }
	.diffsrc select { width: auto; max-width: 280px; padding: 6px 8px; }
	.paste { margin: 8px 10px 0; width: auto; min-height: 90px; max-height: 30vh; }

	/* Toast */
	.toast { position: fixed; z-index: 60; left: 50%; bottom: 104px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; max-width: min(640px, calc(100vw - 32px)); padding: 8px 8px 8px 14px; border-radius: var(--radius); background: var(--surface-solid); border: 1px solid var(--border); box-shadow: 0 16px 40px rgb(0 0 0 / 0.45); font-size: 0.86rem; animation: rise 0.2s var(--ease); }
	.toast.ok :global(svg:first-child) { color: var(--ok); }
	.toast.error { border-color: rgb(255 92 108 / 0.4); }
	.toast.error :global(svg:first-child) { color: var(--danger); }
	.toast.info :global(svg:first-child) { color: #c3b5ff; }
	.toast .btn { padding: 5px 10px; font-size: 0.8rem; }
	@keyframes rise { from { opacity: 0; transform: translate(-50%, 8px); } }

	/* Diálogo de salvar */
	.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); z-index: 50; }
	.dlg-form { display: grid; gap: 14px; }
	.dialog { position: fixed; z-index: 51; top: 16vh; left: 50%; transform: translateX(-50%); width: min(440px, calc(100vw - 32px)); padding: 18px; background: var(--surface-solid); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 24px 60px rgb(0 0 0 / 0.5); }
	.dlg-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

	/* Responsivo: celular/tablet estreito */
	@media (max-width: 820px) {
		.titlebar { flex-wrap: wrap; gap: 6px 10px; padding: 8px 10px; }
		.where, .crumb { display: none; }
		.actions { width: 100%; overflow-x: auto; order: 3; }
		.tbtn { width: 40px; height: 40px; flex-shrink: 0; }
		.body { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(110px, 30%) minmax(0, 1fr); }
		.editor.no-tree .body { grid-template-rows: minmax(0, 1fr); }
		.tree { border-right: 0; border-bottom: 1px solid var(--border); }
		.panes { flex-direction: column; }
		.code-wrap { font-size: 0.85rem; }
		.pane.preview { border-left: 0; }
		.mobile-only { display: block; }
		.editor[data-pane='code'] .pane.preview { display: none; }
		.editor[data-pane='preview'] .pane.code { display: none; }
		.md { padding: 16px; }
	}
</style>
