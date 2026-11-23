<script lang="ts">
	import { onMount } from 'svelte';
	import { clipboard, clipTypes, typeLabel, sourceLabel, type Clip, type ClipType } from '#lib/clipboard/history.svelte.ts';
	import { t, i18n } from '#lib/i18n/index.svelte.ts';
	import { Search, Copy, Check, Pin, PinOff, Trash2, Download, ExternalLink, ClipboardList, ChevronDown, ChevronUp } from '@lucide/svelte';

	const PAGE = 60;
	let query = $state('');
	let filter = $state<ClipType | 'all' | 'pinned'>('all');
	let shown = $state(PAGE);
	let copiedId = $state<string | null>(null);
	let expanded = $state(new Set<string>());
	let sentinel: HTMLElement | undefined = $state();
	let searchEl: HTMLInputElement | undefined = $state();

	onMount(() => {
		clipboard.load();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
				e.preventDefault();
				searchEl?.focus();
			}
		};
		addEventListener('keydown', onKey);
		return () => removeEventListener('keydown', onKey);
	});

	// Renderização incremental: carrega mais itens ao chegar no fim da lista.
	$effect(() => {
		if (!sentinel) return;
		const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) shown += PAGE; }, { rootMargin: '400px' });
		io.observe(sentinel);
		return () => io.disconnect();
	});

	// Volta ao início da paginação quando a busca/filtro muda.
	$effect(() => { void query; void filter; shown = PAGE; });

	const counts = $derived.by(() => {
		const c: Partial<Record<ClipType, number>> = {};
		for (const it of clipboard.items) c[it.type] = (c[it.type] ?? 0) + 1;
		return c;
	});
	const pinnedCount = $derived(clipboard.items.filter((c) => c.pinned).length);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return clipboard.sorted.filter((c) => {
			if (filter === 'pinned' && !c.pinned) return false;
			if (filter !== 'all' && filter !== 'pinned' && c.type !== filter) return false;
			return !q || c.text.toLowerCase().includes(q) || c.source.toLowerCase().includes(q) || sourceLabel(c.source).toLowerCase().includes(q);
		});
	});

	const visible = $derived(filtered.slice(0, shown));

	// Agrupamento por período
	function group(c: Clip): string {
		if (c.pinned) return t('clipboard.groups.pinned');
		const d = new Date(c.last), now = new Date();
		const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
		const diff = (day(now) - day(d)) / 86_400_000;
		if (diff === 0) return t('clipboard.groups.today');
		if (diff === 1) return t('clipboard.groups.yesterday');
		if (diff < 7) return t('clipboard.groups.thisWeek');
		return t('clipboard.groups.older');
	}

	const groups = $derived.by(() => {
		const out: { name: string; items: Clip[] }[] = [];
		for (const c of visible) {
			const g = group(c);
			const last = out[out.length - 1];
			if (last?.name === g) last.items.push(c);
			else out.push({ name: g, items: [c] });
		}
		return out;
	});

	const rtf = $derived(new Intl.RelativeTimeFormat(i18n.tag, { numeric: 'auto' }));
	function ago(ts: number) {
		const s = Math.round((ts - Date.now()) / 1000);
		if (Math.abs(s) < 60) return t('clipboard.now');
		if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute');
		if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour');
		return new Intl.DateTimeFormat(i18n.tag, { dateStyle: 'short', timeStyle: 'short' }).format(ts);
	}

	function pretty(c: Clip) {
		if (c.type === 'json') {
			try { return JSON.stringify(JSON.parse(c.text), null, 2); } catch { return c.text; }
		}
		return c.text;
	}

	async function copy(c: Clip) {
		await clipboard.copy(c);
		copiedId = c.id;
		setTimeout(() => (copiedId === c.id ? (copiedId = null) : null), 1200);
	}

	function toggleExpand(id: string) {
		const s = new Set(expanded);
		s.has(id) ? s.delete(id) : s.add(id);
		expanded = s;
	}

	function clearAll() {
		if (confirm(t('clipboard.clearConfirm'))) clipboard.clearUnpinned();
	}

	const filters = $derived([
		{ id: 'all' as const, label: t('clipboard.all'), n: clipboard.count },
		{ id: 'pinned' as const, label: t('clipboard.groups.pinned'), n: pinnedCount },
		...clipTypes.filter((ty) => counts[ty]).map((ty) => ({ id: ty, label: typeLabel(ty), n: counts[ty]! }))
	]);
</script>

<div class="clip">
	<header class="titlebar">
		<h1 class="title">{t('clipboard.title')}</h1>
		<span class="sub">{t(clipboard.count === 1 ? 'clipboard.itemOne' : 'clipboard.itemMany', { count: clipboard.count })} · {t('clipboard.savedInBrowser')}</span>
		<span class="grow"></span>
		<label class="search">
			<Search size={15} />
			<input bind:this={searchEl} type="search" placeholder={t('clipboard.searchPlaceholder')} bind:value={query} aria-label={t('clipboard.searchLabel')} />
		</label>
		<button class="tbtn" title={t('clipboard.exportTitle')} aria-label={t('clipboard.exportLabel')} disabled={!clipboard.count} onclick={() => clipboard.exportJson()}><Download size={17} /></button>
		<button class="tbtn danger" title={t('clipboard.clearTitle')} aria-label={t('clipboard.clearLabel')} disabled={clipboard.count === pinnedCount} onclick={clearAll}><Trash2 size={17} /></button>
	</header>

	<div class="chips" role="group" aria-label={t('clipboard.filterLabel')}>
		{#each filters as f (f.id)}
			<button class="chip" aria-pressed={filter === f.id} onclick={() => (filter = f.id)}>{f.label} <span class="n">{f.n}</span></button>
		{/each}
	</div>

	<div class="list" aria-live="polite">
		{#if !clipboard.ready}
			{#each [1, 2, 3] as i (i)}<div class="skeleton"></div>{/each}
		{:else if clipboard.count === 0}
			<div class="empty">
				<ClipboardList size={36} strokeWidth={1.5} />
				<p class="panel-title">{t('clipboard.emptyTitle')}</p>
				<p class="muted">{t('clipboard.emptyText')}</p>
			</div>
		{:else if filtered.length === 0}
			<div class="empty"><p class="muted">{t('clipboard.noResults', { query })}</p></div>
		{:else}
			{#each groups as g (g.name)}
				<h2 class="group">{g.name}</h2>
				{#each g.items as c (c.id)}
					{@const long = c.text.length > 280 || c.text.split('\n').length > 6}
					{@const open = expanded.has(c.id)}
					<article class="card" class:pinned={c.pinned}>
						<div class="kind k-{c.type}">{typeLabel(c.type)}</div>
						<div class="content">
							{#if c.type === 'color'}
								<div class="color"><span class="swatch" style:background={c.text.trim()}></span><code>{c.text}</code></div>
							{:else if c.type === 'url'}
								<a class="url" href={c.text.trim()} target="_blank" rel="noopener noreferrer">{c.text} <ExternalLink size={13} /></a>
							{:else}
								<pre class="text" class:clamp={long && !open} class:mono={c.type !== 'text'}>{pretty(c)}</pre>
								{#if long}
									<button class="more" onclick={() => toggleExpand(c.id)}>
										{#if open}<ChevronUp size={14} /> {t('clipboard.collapse')}{:else}<ChevronDown size={14} /> {t('clipboard.showAll', { count: c.text.length })}{/if}
									</button>
								{/if}
							{/if}
							<div class="meta">
								<span>{sourceLabel(c.source)}</span>·<span title={new Date(c.last).toLocaleString(i18n.tag)}>{ago(c.last)}</span>
								{#if c.count > 1}·<span>{t('clipboard.copiedTimes', { count: c.count })}</span>{/if}
							</div>
						</div>
						<div class="acts">
							<button class="tbtn" title={t('clipboard.copyAgain')} aria-label={t('clipboard.copyAgain')} onclick={() => copy(c)}>
								{#if copiedId === c.id}<Check size={16} />{:else}<Copy size={16} />{/if}
							</button>
							<button class="tbtn" title={t(c.pinned ? 'clipboard.unpin' : 'clipboard.pin')} aria-label={t(c.pinned ? 'clipboard.unpin' : 'clipboard.pin')} aria-pressed={c.pinned} onclick={() => clipboard.togglePin(c)}>
								{#if c.pinned}<PinOff size={16} />{:else}<Pin size={16} />{/if}
							</button>
							<button class="tbtn danger" title={t('clipboard.delete')} aria-label={t('clipboard.deleteLabel')} onclick={() => clipboard.remove(c)}><Trash2 size={16} /></button>
						</div>
					</article>
				{/each}
			{/each}
			{#if shown < filtered.length}<div bind:this={sentinel} class="sentinel">{t('clipboard.loadingMore')}</div>{/if}
		{/if}
	</div>
</div>

<style>
	.clip { display: flex; flex-direction: column; height: 100%; min-height: 0; }
	.titlebar { display: flex; align-items: center; gap: 12px; padding: 8px 10px 8px 18px; border-bottom: 1px solid var(--border); background: rgb(255 255 255 / 0.02); flex-wrap: wrap; }
	.title { font-size: 1.05rem; font-weight: 650; letter-spacing: -0.01em; }
	.sub { color: var(--text-3); font-size: 0.82rem; }
	.grow { flex: 1; }
	.search { display: flex; align-items: center; gap: 8px; background: var(--surface-solid); border: 1px solid var(--border); border-radius: 10px; padding: 0 10px; color: var(--text-3); width: min(340px, 100%); }
	.search:focus-within { border-color: var(--accent); }
	.search input { flex: 1; border: 0; background: transparent; padding: 8px 0; outline: none; min-width: 0; }
	.tbtn { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--text-2); transition: background 0.15s var(--ease), color 0.15s, transform 0.1s; flex-shrink: 0; }
	.tbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
	.tbtn:active:not(:disabled) { transform: scale(0.94); }
	.tbtn:disabled { opacity: 0.35; cursor: not-allowed; }
	.tbtn.danger:hover:not(:disabled) { color: var(--danger); }
	.tbtn[aria-pressed='true'] { color: var(--accent); }

	.chips { display: flex; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
	.chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 99px; border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 0.82rem; white-space: nowrap; transition: background 0.15s, color 0.15s, border-color 0.15s; }
	.chip:hover { color: var(--text); background: var(--surface-2); }
	.chip[aria-pressed='true'] { background: var(--accent-soft); border-color: rgb(221 32 107 / 0.5); color: var(--text); }
	.n { font-size: 0.72rem; color: var(--text-3); font-variant-numeric: tabular-nums; }

	.list { flex: 1; overflow: auto; padding: 6px 14px 20px; display: flex; flex-direction: column; gap: 8px; max-width: 1100px; width: 100%; margin: 0 auto; }
	.group { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 12px 4px 2px; font-weight: 600; }
	.card {
		display: grid; grid-template-columns: 78px minmax(0, 1fr) auto; gap: 12px; align-items: start;
		padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: rgb(0 0 0 / 0.16);
		content-visibility: auto; contain-intrinsic-size: auto 92px;
		transition: border-color 0.15s, background 0.15s;
	}
	.card:hover { border-color: rgb(255 255 255 / 0.16); background: rgb(0 0 0 / 0.24); }
	.card.pinned { border-color: rgb(221 32 107 / 0.35); }
	.kind { font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-align: center; background: var(--surface-3); color: var(--text-2); }
	.k-url { color: #7cc4ff; } .k-color { color: #ffb547; } .k-uuid, .k-doc { color: #b49cff; }
	.k-json, .k-code { color: #3ddc97; } .k-email { color: #ff8fb8; } .k-number { color: #ffd36b; }
	.content { min-width: 0; display: grid; gap: 6px; }
	.text { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: var(--font); font-size: 0.92rem; line-height: 1.5; }
	.text.mono { font-family: var(--mono); font-size: 0.85rem; }
	.text.clamp { display: -webkit-box; -webkit-line-clamp: 6; line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
	.more { justify-self: start; display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; color: var(--accent); font-size: 0.8rem; padding: 0; }
	.color { display: flex; align-items: center; gap: 10px; }
	.swatch { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.2); }
	.url { color: #7cc4ff; word-break: break-all; display: inline-flex; gap: 6px; align-items: center; }
	code { font-family: var(--mono); }
	.meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.75rem; color: var(--text-3); }
	.acts { display: flex; gap: 2px; }
	.empty { margin: auto; display: grid; justify-items: center; gap: 8px; text-align: center; color: var(--text-3); padding: 48px 16px; max-width: 380px; }
	.skeleton { height: 82px; border-radius: var(--radius); background: linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2)); background-size: 200% 100%; animation: sh 1.2s infinite linear; }
	@keyframes sh { to { background-position: -200% 0; } }
	.sentinel { text-align: center; color: var(--text-3); font-size: 0.8rem; padding: 12px; }

	@media (max-width: 720px) {
		.titlebar { padding: 8px 10px; }
		.search { order: 3; width: 100%; }
		.card { grid-template-columns: minmax(0, 1fr); gap: 8px; }
		.kind { justify-self: start; }
		.acts { justify-self: end; margin-top: -4px; }
	}
</style>
