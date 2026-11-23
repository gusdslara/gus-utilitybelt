<script lang="ts">
	// Console das ações (mesmo catálogo usado por MCP, WebMCP, CLI e window.utilitybelt).
	// Formulário gerado pelo JSON Schema; em /run?action=… preenche pela URL e executa sozinho,
	// para IAs de navegador que só conseguem abrir links e ler a página.
	import { onMount, tick } from 'svelte';
	import { listActions, callAction, getAction } from '#lib/ai/actions.ts';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.ts';
	import type { Action, JsonSchema } from '#lib/ai/schema.ts';
	import { ensureAppActions } from '#lib/ai/bridge.ts';
	import { ui } from '#lib/ai/ui.svelte.ts';
	import { replaceState } from '$app/navigation';
	import CopyButton from './tools/CopyButton.svelte';
	import { Play, Search, LoaderCircle, CircleCheck, CircleAlert, Terminal, Braces, Link2, Plug } from '@lucide/svelte';

	let { standalone = false }: { standalone?: boolean } = $props();

	const LONG = new Set(['code', 'text', 'content', 'original', 'modified', 'message', 'token']);

	let all = $state<Action[]>([]);
	let query = $state('');
	let selected = $state<string>('uuid_generate');
	let values = $state<Record<string, string | boolean>>({});
	let running = $state(false);
	let result = $state<Awaited<ReturnType<typeof callAction>> | null>(null);
	let snippet = $state<'url' | 'js' | 'cli' | 'mcp'>('url');
	let origin = $state('https://gus-utilitybelt');

	const action = $derived(all.find((a) => a.name === selected) ?? null);
	/** Título traduzido da ação (o nome técnico e a descrição para IAs ficam iguais em todos os idiomas). */
	const titleOf = (a: Action) => { const k = `api.actions.${a.name}` as MessageKey; const v = t(k); return v === k ? a.title : v; };
	const groups = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = all.filter((a) => !q || a.name.includes(q) || a.title.toLowerCase().includes(q) || titleOf(a).toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
		const map = new Map<string, Action[]>();
		for (const a of list) map.set(a.category, [...(map.get(a.category) ?? []), a]);
		return [...map.entries()];
	});

	function defaults(a: Action) {
		const v: Record<string, string | boolean> = {};
		for (const [k, p] of Object.entries(a.input.properties)) v[k] = p.type === 'boolean' ? Boolean(p.default) : p.default !== undefined ? String(p.default) : '';
		return v;
	}

	function choose(name: string) {
		const a = all.find((x) => x.name === name);
		if (!a) return;
		selected = name;
		values = defaults(a);
		result = null;
	}

	/** Só o que difere do padrão (deixa URL/CLI curtos). */
	const input = $derived.by(() => {
		if (!action) return {};
		const out: Record<string, unknown> = {};
		for (const [k, p] of Object.entries(action.input.properties)) {
			const v = values[k];
			if (p.type === 'boolean') {
				if (v !== Boolean(p.default)) out[k] = v;
			} else if (v !== '' && v !== undefined && v !== String(p.default ?? '')) {
				out[k] = p.type === 'number' || p.type === 'integer' ? Number(v) : v;
			}
		}
		return out;
	});

	const missing = $derived(action ? (action.input.required ?? []).filter((k) => values[k] === '' || values[k] === undefined) : []);

	async function run() {
		if (!action || running) return;
		running = true;
		result = await callAction(action.name, input);
		running = false;
		if (standalone) syncUrl();
	}

	function syncUrl() {
		const p = new URLSearchParams({ action: selected });
		for (const [k, v] of Object.entries(input)) p.set(k, String(v));
		replaceState(`${location.pathname}?${p}`, {});
	}

	const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
	const code = $derived.by(() => {
		const json = JSON.stringify(input);
		const params = new URLSearchParams({ action: selected });
		for (const [k, v] of Object.entries(input)) params.set(k, String(v));
		if (snippet === 'url') return `${origin}/run?${params}`;
		if (snippet === 'js') return `await utilitybelt.call('${selected}', ${JSON.stringify(input, null, 2)})`;
		if (snippet === 'cli') return `bun run ub ${selected}${Object.entries(input).map(([k, v]) => ` --${k} ${shellQuote(String(v))}`).join('')}`;
		return JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: selected, arguments: JSON.parse(json) } }, null, 2);
	});

	const resultText = $derived(result ? JSON.stringify(result.ok ? result.result : result.error, null, 2) : '');
	const image = $derived.by(() => {
		const r = result?.ok ? (result.result as { svg?: string; dataUrl?: string }) : null;
		if (r?.dataUrl) return r.dataUrl;
		if (r?.svg) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}`;
		return null;
	});

	function kind(p: JsonSchema, k: string) {
		if (p.enum) return 'enum';
		if (p.type === 'boolean') return 'bool';
		if (p.type === 'number' || p.type === 'integer') return 'num';
		return LONG.has(k) ? 'long' : 'text';
	}

	onMount(async () => {
		origin = location.origin;
		ensureAppActions(); // o onMount do layout roda depois deste
		all = listActions();
		const url = new URL(location.href);
		const name = url.searchParams.get('action');
		if (name && getAction(name)) {
			choose(name);
			const raw = url.searchParams.get('input');
			const fromJson = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
			for (const k of Object.keys(values)) {
				const v = fromJson[k] ?? url.searchParams.get(k);
				if (v === null || v === undefined) continue;
				values[k] = typeof values[k] === 'boolean' ? /^(true|1|yes|sim|on)$/i.test(String(v)) || v === true : String(v);
			}
			await tick();
			await run();
		} else choose(selected);
	});
</script>

{#snippet resultBlock()}
	{#if result}
		<div class="field">
			<span class="label row-gap">
				{#if result.ok}<CircleCheck size={15} class="okc" /> {t('common.result')}{:else}<CircleAlert size={15} class="errc" /> {t('api.error', { code: result.error.code })}{/if}
			</span>
			{#if image}<div class="img"><img src={image} alt={t('api.image')} /></div>{/if}
			<pre class="out res" id="ub-result" data-action={result.action} data-status={result.ok ? 'ok' : 'error'}>{resultText}</pre>
			<div class="row"><CopyButton text={resultText} label={t('api.copyJson')} /></div>
		</div>
	{/if}
{/snippet}

<div class="console" class:standalone>

	<section class="main" aria-live="polite">
		{#if !standalone && !ui.automation}
			<div class="intro">
				<Plug size={18} aria-hidden="true" />
				<div class="intro-txt">
					<p>{t('api.intro')}</p>
					<ul>
						<li><strong>{t('api.introBrowser')}</strong> — WebMCP, <code>window.utilitybelt</code>, <code>/run?action=…</code></li>
						<li><strong>{t('api.introPc')}</strong> — MCP (Claude, Copilot, Cursor, Gemini CLI): <code>bun run mcp</code></li>
						<li><strong>{t('api.introTerminal')}</strong> — <code>bun run ub</code></li>
					</ul>
					<p>{t('api.guide')}: <a href="/llms.txt">/llms.txt</a> · {t('api.catalog')}: <a href="/tools.json">/tools.json</a></p>
				</div>
			</div>
		{/if}

		{#if action}
			<header class="head">
				<h2 class="panel-title">{titleOf(action)} <code class="tag">{action.name}</code></h2>
				<p class="muted desc" lang="en">{action.description}</p>
				{#if t('api.descriptionNote')}<p class="hint">{t('api.descriptionNote')}</p>{/if}
				<div class="badges">
					<span class="badge" class:warn={!action.readOnly}>{action.readOnly ? t('api.readOnly') : t('api.writes')}</span>
					{#if action.browserOnly}<span class="badge">{t('api.browserOnly')}</span>{/if}
				</div>
			</header>

			{#if standalone}{@render resultBlock()}{/if}

			<form class="stack" onsubmit={(e) => { e.preventDefault(); run(); }}>
				<div class="fields">
					{#each Object.entries(action.input.properties) as [k, p] (selected + k)}
						{@const fk = kind(p, k)}
						{@const req = action.input.required?.includes(k)}
						{#if fk === 'bool'}
							<label class="check"><input type="checkbox" bind:checked={values[k] as boolean} name={k} /> <code>{k}</code> {#if p.description}<span class="hint">{p.description}</span>{/if}</label>
						{:else}
							<label class="field" class:wide={fk === 'long'}>
								<span class="label"><code>{k}</code>{#if req}<span class="req" aria-label={t('api.required')}>*</span>{/if}{#if p.description}<span class="hint"> — {p.description}</span>{/if}</span>
								{#if fk === 'enum'}
									<select class="input" bind:value={values[k]} name={k}>
										{#if !req && p.default === undefined}<option value="">{t('common.none')}</option>{/if}
										{#each p.enum ?? [] as o (o)}<option value={String(o)}>{o}</option>{/each}
									</select>
								{:else if fk === 'long'}
									<textarea class="textarea" bind:value={values[k] as string} name={k} spellcheck="false" required={req}></textarea>
								{:else}
									<input class="input mono" type={fk === 'num' ? 'number' : 'text'} min={p.minimum} max={p.maximum} step={p.type === 'number' ? 'any' : 1} bind:value={values[k]} name={k} required={req} autocomplete="off" spellcheck="false" />
								{/if}
							</label>
						{/if}
					{/each}
					{#if Object.keys(action.input.properties).length === 0}<p class="hint">{t('api.noParams')}</p>{/if}
				</div>
				<div class="row">
					<button class="btn primary" type="submit" disabled={running || missing.length > 0} id="ub-run">
						{#if running}<LoaderCircle size={15} class="spin" />{:else}<Play size={15} />{/if} {t('api.run')}
					</button>
					{#if missing.length}<span class="hint">{t('api.fill', { fields: missing.join(', ') })}</span>{/if}
				</div>
			</form>

			{#if !standalone}{@render resultBlock()}{/if}

			<div class="field">
				<span class="label">{t('api.howToCall')}</span>
				<div class="seg" role="radiogroup" aria-label={t('api.snippetFormat')}>
					<button role="radio" aria-checked={snippet === 'url'} onclick={() => (snippet = 'url')}><Link2 size={14} /> {t('api.link')}</button>
					<button role="radio" aria-checked={snippet === 'js'} onclick={() => (snippet = 'js')}><Braces size={14} /> JavaScript</button>
					<button role="radio" aria-checked={snippet === 'cli'} onclick={() => (snippet = 'cli')}><Terminal size={14} /> CLI</button>
					<button role="radio" aria-checked={snippet === 'mcp'} onclick={() => (snippet = 'mcp')}><Plug size={14} /> MCP</button>
				</div>
				<pre class="out snip">{code}</pre>
				<div class="row"><CopyButton text={code} label={t('api.copyExample')} /></div>
				{#if snippet !== 'url' && snippet !== 'js' && action.browserOnly}<p class="hint">{t('api.browserOnlyHint')}</p>{/if}
			</div>
		{/if}
	</section>

	<aside class="list" aria-label={t('api.actionsList')}>
		<label class="search">
			<Search size={15} aria-hidden="true" />
			<input class="input" placeholder={t('api.searchPlaceholder')} bind:value={query} aria-label={t('api.searchPlaceholder')} />
		</label>
		<nav>
			{#each groups as [cat, items] (cat)}
				<h3 class="group">{t(`api.categories.${cat as Action['category']}`)}</h3>
				<ul>
					{#each items as a (a.name)}
						<li>
							<button class="act" class:on={a.name === selected} aria-current={a.name === selected ? 'true' : undefined} onclick={() => choose(a.name)} data-action={a.name}>
								<span class="name">{titleOf(a)}</span>
								<code>{a.name}</code>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="hint pad">{t('api.noResults')}</p>
			{/each}
		</nav>
	</aside>
</div>

<style>
	.console { display: grid; grid-template-columns: 260px minmax(0, 1fr); height: 100%; min-height: 0; }
	.console.standalone { min-height: 100dvh; }
	.list { grid-column: 1; grid-row: 1; border-right: 1px solid var(--border); overflow: auto; padding: var(--space-3); display: grid; align-content: start; gap: var(--space-2); background: rgb(0 0 0 / 0.12); }
	.search { position: relative; display: block; }
	.search :global(svg) { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3); }
	.search .input { padding-left: 32px; width: 100%; }
	.group { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); margin: var(--space-3) 0 var(--space-1) var(--space-2); font-weight: 600; }
	ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
	.act { width: 100%; display: grid; gap: 1px; text-align: left; background: none; border: 0; border-radius: var(--radius-sm); padding: 7px 10px; color: var(--text-2); min-height: 44px; transition: background 0.15s, color 0.15s; }
	.act:hover { background: rgb(255 255 255 / 0.05); color: var(--text); }
	.act.on { background: var(--accent-soft); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
	.act .name { font-size: 0.88rem; font-weight: 550; }
	.act code { font-size: 0.72rem; color: var(--text-3); font-family: var(--mono); }
	.pad { padding: var(--space-2); }

	.main { grid-column: 2; grid-row: 1; overflow: auto; padding: var(--space-4) var(--space-6) var(--space-8); display: grid; gap: var(--space-4); align-content: start; max-width: 980px; }
	.intro { display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius); background: rgb(255 255 255 / 0.025); color: var(--text-2); font-size: 0.86rem; line-height: 1.5; }
	.intro :global(svg) { flex-shrink: 0; margin-top: 2px; color: var(--accent); }
	.intro-txt { display: grid; gap: 6px; }
	.intro p { margin: 0; }
	.intro ul { margin: 0; padding-left: 18px; display: grid; gap: 2px; }
	.intro code { font-family: var(--mono); font-size: 0.8rem; color: var(--text); }
	.intro a { color: var(--text); }
	.head { display: grid; gap: var(--space-2); }
	.head h2 { margin: 0; display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
	.tag { font-family: var(--mono); font-size: 0.78rem; font-weight: 500; color: var(--text-2); background: var(--surface-solid); border: 1px solid var(--border); padding: 2px 8px; border-radius: 6px; }
	.desc { margin: 0; font-size: 0.9rem; line-height: 1.55; }
	.badges { display: flex; gap: var(--space-2); }
	.badge { font-size: 0.72rem; padding: 2px 8px; border-radius: 99px; border: 1px solid var(--border); color: var(--text-2); }
	.badge.warn { color: var(--warn); border-color: rgb(255 181 71 / 0.35); }
	.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3) var(--space-4); align-items: end; }
	.fields .wide { grid-column: 1 / -1; }
	.fields .check { min-height: 44px; flex-wrap: wrap; }
	.label code, .check code { font-family: var(--mono); color: var(--text); }
	.req { color: var(--accent); margin-left: 2px; }
	select.input { appearance: auto; }
	.row-gap { display: inline-flex; align-items: center; gap: 6px; }
	.label :global(.okc) { color: var(--ok); }
	.label :global(.errc) { color: var(--danger); }
	.res { max-height: 420px; overflow: auto; word-break: normal; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
	.res[data-status='error'] { border-color: rgb(255 92 108 / 0.4); }
	.snip { margin: 0; overflow-wrap: anywhere; word-break: normal; }
	.img { background: #fff; border-radius: var(--radius); padding: var(--space-3); display: flex; justify-content: center; }
	.img img { max-width: 100%; max-height: 280px; height: auto; image-rendering: pixelated; }
	.seg button { display: inline-flex; align-items: center; gap: 6px; }
	:global(.spin) { animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { :global(.spin) { animation: none; } }

	@media (max-width: 860px) {
		.console { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
		.list { grid-column: 1; grid-row: 1; border-right: 0; border-bottom: 1px solid var(--border); max-height: 34vh; }
		.main { grid-column: 1; grid-row: 2; padding: var(--space-4); }
		.fields { grid-template-columns: 1fr; }
	}
</style>
