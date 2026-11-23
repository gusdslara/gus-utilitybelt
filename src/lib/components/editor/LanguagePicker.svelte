<script lang="ts" module>
	import { LANGUAGES as ALL_LANGUAGES, type Language as Lang } from '#lib/editor/languages.ts';
	import { t } from '#lib/i18n/index.svelte.ts';

	// Nomes traduzíveis (languages.ts roda também no Bun e não importa o i18n): o resto são nomes próprios.
	const TRANSLATED = { plaintext: 'editor.langs.plaintext', jsonc: 'editor.langs.jsonc' } as const;

	/** Nome da linguagem no idioma atual (cai no `name` original). */
	export function langName(l: Lang): string {
		const key = TRANSLATED[l.id as keyof typeof TRANSLATED];
		return key ? t(key) : l.name;
	}

	/** Linguagens cujo nome traduzido casa com a busca (complementa searchLanguages, que olha o nome original). */
	export function searchTranslated(q: string): Lang[] {
		const query = q.trim().toLowerCase();
		if (!query) return [];
		return ALL_LANGUAGES.filter((l) => l.id in TRANSLATED && langName(l).toLowerCase().includes(query));
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { searchLanguages, canPrettyFormat, type Language } from '#lib/editor/languages.ts';
	import { Search, WandSparkles, Sparkles, Check } from '@lucide/svelte';

	let {
		title = t('editor.picker.defaultTitle'),
		hint = '',
		current = null,
		suggestions = [],
		onpick,
		onclose
	}: {
		title?: string;
		hint?: string;
		current?: string | null;
		/** ids detectados, em ordem de confiança */
		suggestions?: { id: string; confidence: number }[];
		onpick: (l: Language) => void;
		onclose: () => void;
	} = $props();

	let query = $state('');
	let index = $state(0);
	let input: HTMLInputElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();

	const suggestedIds = $derived(suggestions.map((s) => s.id));
	const results = $derived.by(() => {
		const base = searchLanguages(query, current ? [...suggestedIds, current] : suggestedIds);
		const extra = searchTranslated(query).filter((l) => !base.includes(l));
		return [...base, ...extra];
	});
	const confidenceOf = (id: string) => suggestions.find((s) => s.id === id)?.confidence;

	$effect(() => {
		void query;
		index = 0;
	});

	$effect(() => {
		tick().then(() => input?.focus());
	});

	function scrollIntoView() {
		tick().then(() => list?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' }));
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			index = Math.min(results.length - 1, index + 1);
			scrollIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			index = Math.max(0, index - 1);
			scrollIntoView();
		} else if (e.key === 'PageDown') {
			e.preventDefault();
			index = Math.min(results.length - 1, index + 8);
			scrollIntoView();
		} else if (e.key === 'PageUp') {
			e.preventDefault();
			index = Math.max(0, index - 8);
			scrollIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const l = results[index];
			if (l) onpick(l);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onclose();
		}
	}
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="picker" role="dialog" aria-modal="true" aria-label={title}>
	<div class="head">
		<p class="t">{title}</p>
		{#if hint}<p class="hint">{hint}</p>{/if}
	</div>
	<div class="search">
		<Search size={15} />
		<input
			bind:this={input}
			bind:value={query}
			onkeydown={onKey}
			placeholder={t('editor.picker.searchPlaceholder')}
			aria-label={t('editor.picker.searchAria')}
			role="combobox"
			aria-expanded="true"
			aria-controls="lang-list"
			aria-activedescendant={results[index] ? `lang-${results[index].id}` : undefined}
			autocomplete="off"
			spellcheck="false"
		/>
		<kbd>Esc</kbd>
	</div>
	<ul id="lang-list" class="list" role="listbox" bind:this={list}>
		{#each results as l, i (l.id)}
			{@const conf = confidenceOf(l.id)}
			<li
				id={`lang-${l.id}`}
				data-i={i}
				role="option"
				aria-selected={i === index}
				class:on={i === index}
				onmousemove={() => (index = i)}
				onclick={() => onpick(l)}
				onkeydown={() => {}}
			>
				<span class="name">{langName(l)}</span>
				{#if conf !== undefined && !query}
					<span class="badge auto" title={t('editor.picker.detectedBadge')}><Sparkles size={11} /> {Math.round(conf * 100)}%</span>
				{/if}
				{#if current === l.id}<span class="badge cur"><Check size={11} /> {t('editor.picker.current')}</span>{/if}
				<span class="grow"></span>
				{#if canPrettyFormat(l)}<span class="fmt" title={t('editor.picker.hasFormatter')}><WandSparkles size={12} /></span>{/if}
				<span class="ext">{l.ext.slice(0, 4).map((e) => '.' + e).join(' ')}</span>
			</li>
		{:else}
			<li class="empty">{t('editor.picker.notFoundBefore', { query })} <b>{t('editor.langs.plaintext')}</b> {t('editor.picker.notFoundAfter')}</li>
		{/each}
	</ul>
	<div class="foot">
		<span><kbd>↑</kbd><kbd>↓</kbd> {t('editor.picker.navigate')}</span>
		<span><kbd>Enter</kbd> {t('editor.picker.choose')}</span>
		<span class="grow"></span>
		<span><WandSparkles size={11} /> {t('editor.picker.realFormat')}</span>
	</div>
</div>

<style>
	.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); z-index: 50; }
	.picker {
		position: fixed; z-index: 51; top: 12vh; left: 50%; transform: translateX(-50%);
		width: min(560px, calc(100vw - 32px)); max-height: min(560px, 76vh);
		display: flex; flex-direction: column;
		background: var(--surface-solid); border: 1px solid var(--border); border-radius: var(--radius);
		box-shadow: 0 24px 60px rgb(0 0 0 / 0.5);
		animation: pop 0.16s var(--ease);
	}
	@keyframes pop { from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.98); } }
	.head { padding: 12px 14px 4px; display: grid; gap: 2px; }
	.t { font-weight: 600; font-size: 0.92rem; }
	.search { display: flex; align-items: center; gap: 8px; margin: 8px 10px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-3); }
	.search:focus-within { border-color: var(--accent); }
	.search input { flex: 1; border: 0; outline: none; background: transparent; padding: 10px 0; min-width: 0; }
	.search input:focus-visible { outline: none; }
	kbd { font-family: var(--mono); font-size: 0.7rem; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-2); }
	.list { list-style: none; margin: 0; padding: 4px 6px 8px; overflow: auto; flex: 1; min-height: 0; }
	.list li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; min-height: 40px; border-radius: 7px; cursor: pointer; font-size: 0.88rem; color: var(--text-2); }
	.list li.on { background: var(--accent-soft); color: var(--text); }
	.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.grow { flex: 1; }
	.ext { font-family: var(--mono); font-size: 0.74rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%; }
	.fmt { color: var(--accent); display: inline-flex; }
	.badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; padding: 1px 6px; border-radius: 99px; white-space: nowrap; }
	.badge.auto { background: rgb(124 92 255 / 0.18); color: #c3b5ff; }
	.badge.cur { background: var(--surface-3); color: var(--text-2); }
	.empty { color: var(--text-3); cursor: default !important; }
	.foot { display: flex; gap: 12px; align-items: center; padding: 8px 14px; border-top: 1px solid var(--border); font-size: 0.72rem; color: var(--text-3); flex-wrap: wrap; }
	.foot span { display: inline-flex; align-items: center; gap: 4px; }
	@media (max-width: 560px) { .foot { display: none; } .picker { top: 8vh; } }
</style>
