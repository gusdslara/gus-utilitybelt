<script lang="ts">
	import { computeDiff, collapse, type Row, type Cell } from '#lib/editor/diff.ts';
	import { Columns2, Rows2, ChevronsUpDown } from '@lucide/svelte';
	import { t } from '#lib/i18n/index.svelte.ts';

	let {
		left,
		right,
		leftLabel,
		rightLabel
	}: { left: string; right: string; leftLabel: string; rightLabel: string } = $props();

	let mode = $state<'split' | 'unified'>(typeof window !== 'undefined' && window.innerWidth < 820 ? 'unified' : 'split');
	let ignoreWs = $state(false);
	let expanded = $state(new Set<number>());

	const result = $derived(computeDiff(left, right, ignoreWs));
	const items = $derived(collapse(result.rows));

	type Gap = { kind: 'gap'; count: number; from: number };
	function rowsOf(item: Row | Gap): Row[] {
		if (item.kind !== 'gap') return [item];
		return expanded.has(item.from) ? result.rows.slice(item.from, item.from + item.count) : [];
	}
	function expand(from: number) {
		expanded = new Set(expanded).add(from);
	}
	const isGap = (x: Row | Gap): x is Gap => x.kind === 'gap';
</script>

{#snippet cell(c: Cell, side: 'l' | 'r', kind: Row['kind'])}
	<span class="ln">{c?.n ?? ''}</span>
	<span class="code {c ? (side === 'l' && (kind === 'del' || kind === 'mod') ? 'del' : side === 'r' && (kind === 'add' || kind === 'mod') ? 'add' : '') : 'empty'}">{#if c}{#each c.segs as s}{#if s.changed}<mark class={side === 'l' ? 'm-del' : 'm-add'}>{s.text}</mark>{:else}{s.text}{/if}{/each}{/if}</span>
{/snippet}

<div class="diff">
	<div class="bar">
		<span class="stat"><b class="plus">+{result.added}</b> <b class="minus">−{result.removed}</b></span>
		<span class="labels" title={`${leftLabel} → ${rightLabel}`}>{leftLabel} → {rightLabel}</span>
		<span class="grow"></span>
		<label class="check small"><input type="checkbox" bind:checked={ignoreWs} /> {t('editor.diff.ignoreWs')}</label>
		<div class="seg" role="group" aria-label={t('editor.diff.mode')}>
			<button aria-pressed={mode === 'split'} onclick={() => (mode = 'split')} title={t('editor.diff.split')}><Columns2 size={14} /> <span class="hide-sm">{t('editor.diff.split')}</span></button>
			<button aria-pressed={mode === 'unified'} onclick={() => (mode = 'unified')} title={t('editor.diff.unified')}><Rows2 size={14} /> <span class="hide-sm">{t('editor.diff.unified')}</span></button>
		</div>
	</div>

	{#if result.equal}
		<div class="nodiff">
			<p class="panel-title">{t('editor.diff.noDiff')}</p>
			<p class="muted">{t(ignoreWs ? 'editor.diff.equalIgnoringWs' : 'editor.diff.equal', { left: leftLabel, right: rightLabel })}</p>
		</div>
	{:else}
		<div class="scroll" role="table" aria-label={t('editor.diff.label')}>
			{#each items as item, i (i)}
				{#if isGap(item) && !expanded.has(item.from)}
					<button class="gap" onclick={() => expand(item.from)}><ChevronsUpDown size={13} /> {t('editor.diff.sameLines', { count: item.count })}</button>
				{:else}
					{#each rowsOf(item) as r}
						{#if mode === 'split'}
							<div class="drow split {r.kind}" role="row">
								{@render cell(r.left, 'l', r.kind)}
								{@render cell(r.right, 'r', r.kind)}
							</div>
						{:else if r.kind === 'same'}
							<div class="drow uni" role="row"><span class="ln">{r.left?.n}</span><span class="ln">{r.right?.n}</span><span class="sign"> </span><span class="code">{r.left?.segs[0].text}</span></div>
						{:else}
							{#if r.left}
								<div class="drow uni" role="row"><span class="ln">{r.left.n}</span><span class="ln"></span><span class="sign del">−</span><span class="code del">{#each r.left.segs as s}{#if s.changed}<mark class="m-del">{s.text}</mark>{:else}{s.text}{/if}{/each}</span></div>
							{/if}
							{#if r.right}
								<div class="drow uni" role="row"><span class="ln"></span><span class="ln">{r.right.n}</span><span class="sign add">+</span><span class="code add">{#each r.right.segs as s}{#if s.changed}<mark class="m-add">{s.text}</mark>{:else}{s.text}{/if}{/each}</span></div>
							{/if}
						{/if}
					{/each}
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.diff { display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; }
	.bar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-bottom: 1px solid var(--border); flex-wrap: wrap; font-size: 0.82rem; }
	.stat { font-family: var(--mono); }
	.plus { color: var(--ok); font-weight: 600; }
	.minus { color: var(--danger); font-weight: 600; }
	.labels { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 0 1 auto; }
	.grow { flex: 1; }
	.small { font-size: 0.8rem; }
	.seg button { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; }
	.scroll { flex: 1; overflow: auto; font-family: var(--mono); font-size: 0.85rem; line-height: 1.55; min-height: 0; }
	.drow { display: grid; min-width: max-content; }
	.drow.split { grid-template-columns: 3.2em minmax(0, 1fr) 3.2em minmax(0, 1fr); min-width: 100%; }
	.drow.uni { grid-template-columns: 3.2em 3.2em 1.4em 1fr; }
	.ln { color: var(--text-3); text-align: right; padding: 0 8px 0 4px; user-select: none; background: rgb(0 0 0 / 0.15); border-right: 1px solid var(--border); }
	.code { white-space: pre; padding: 0 12px; overflow: hidden; text-overflow: clip; }
	.drow.split .code { overflow-x: auto; scrollbar-width: none; }
	.code.del { background: rgb(255 92 108 / 0.12); }
	.code.add { background: rgb(61 220 151 / 0.11); }
	.code.empty { background: repeating-linear-gradient(135deg, transparent 0 6px, rgb(255 255 255 / 0.025) 6px 12px); }
	.sign { user-select: none; text-align: center; color: var(--text-3); }
	.sign.del { color: var(--danger); background: rgb(255 92 108 / 0.12); }
	.sign.add { color: var(--ok); background: rgb(61 220 151 / 0.11); }
	mark { color: inherit; border-radius: 3px; }
	.m-del { background: rgb(255 92 108 / 0.38); }
	.m-add { background: rgb(61 220 151 / 0.34); }
	.gap { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; border-block: 1px solid var(--border); background: var(--surface-2); color: var(--text-2); font-size: 0.78rem; padding: 4px 12px; min-height: 28px; }
	.gap:hover { color: var(--text); background: var(--surface-3); }
	.nodiff { margin: auto; text-align: center; padding: 24px; display: grid; gap: 6px; }
	@media (max-width: 820px) { .hide-sm { display: none; } }
</style>
