<script lang="ts">
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';

	let pattern = $state('(?<ano>\\d{4})-(?<mes>\\d{2})-(?<dia>\\d{2})');
	let flags = $state({ g: true, i: false, m: false, s: false, u: true });
	let text = $state(t('tools.regex.sampleText'));
	let replacement = $state('$<dia>/$<mes>/$<ano>');

	const flagStr = $derived(Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(''));

	const result = $derived.by(() => {
		try {
			const re = new RegExp(pattern, flagStr + (flagStr.includes('g') ? '' : 'g'));
			const matches = [...text.matchAll(re)].map((m) => ({
				value: m[0],
				index: m.index ?? 0,
				groups: m.slice(1),
				named: m.groups ? Object.entries(m.groups) : []
			}));
			const replaced = text.replace(new RegExp(pattern, re.flags), replacement);
			return { ok: true as const, matches, replaced, error: '' };
		} catch (e) {
			return { ok: false as const, matches: [], replaced: '', error: (e as Error).message };
		}
	});

	/** Destaque: texto com <mark> nos matches. */
	const highlighted = $derived.by(() => {
		if (!result.ok) return escape(text);
		let out = '';
		let last = 0;
		for (const m of result.matches) {
			out += escape(text.slice(last, m.index)) + `<mark>${escape(m.value)}</mark>`;
			last = m.index + m.value.length;
		}
		return out + escape(text.slice(last));
	});

	function escape(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	const presets = $derived([
		{ label: t('tools.regex.email'), p: '[\\w.+-]+@[\\w-]+\\.[\\w.-]+' },
		{ label: 'CPF', p: '\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}' },
		{ label: 'URL', p: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*' },
		{ label: t('tools.regex.isoDate'), p: '\\d{4}-\\d{2}-\\d{2}' },
		{ label: t('tools.regex.hexColor'), p: '#(?:[0-9a-fA-F]{3}){1,2}\\b' }
	]);
</script>

<div class="stack">
	<div class="row">
		<span class="label">{t('tools.regex.templates')}</span>
		{#each presets as p (p.p)}
			<button class="btn" onclick={() => (pattern = p.p)}>{p.label}</button>
		{/each}
	</div>

	<div class="row flagrow" role="group" aria-label="Flags">
		<span class="label">Flags:</span>
		{#each (['g', 'i', 'm', 's', 'u'] as const).map((k) => [k, t(`tools.regex.flags.${k}`)]) as [k, l] (k)}
			<label class="check"><input type="checkbox" bind:checked={flags[k as keyof typeof flags]} /> {k} <span class="hint">{l}</span></label>
		{/each}
	</div>

	<label class="field">
		<span class="label">{t('tools.regex.pattern')}</span>
		<input class="input mono" bind:value={pattern} aria-invalid={!result.ok} spellcheck="false" />
		{#if !result.ok}<span class="error">{result.error}</span>{:else}<span class="hint">{t('tools.regex.matches', { count: result.matches.length })}</span>{/if}
	</label>

	<div class="grid-2">
		<label class="field"><span class="label">{t('tools.regex.testText')}</span><textarea class="textarea" bind:value={text}></textarea></label>
		<div class="field">
			<span class="label">{t('tools.regex.highlight')}</span>
			<div class="out hl">{@html highlighted}</div>
		</div>
	</div>

	{#if result.ok && result.matches.length}
		<div class="field">
			<span class="label">{t('tools.regex.groups')}</span>
			<ul class="matches">
				{#each result.matches as m, i (i)}
					<li><code>{m.value}</code> <span class="hint">@{m.index}</span>
						{#if m.named.length}<span class="hint">{m.named.map(([k, v]) => `${k}=${v}`).join(', ')}</span>{:else if m.groups.length}<span class="hint">[{m.groups.join(', ')}]</span>{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<label class="field">
		<span class="label">{t('tools.regex.replacement')}</span>
		<input class="input mono" bind:value={replacement} />
	</label>
	<div class="field"><span class="label">{t('common.result')}</span><div class="out">{result.replaced}</div></div>
	<div class="row"><CopyButton text={`/${pattern}/${flagStr}`} label={t('tools.regex.copy')} /></div>
</div>

<style>
	.flagrow { gap: var(--space-4); }
	.hl :global(mark) { background: var(--accent-soft); color: var(--text); border-radius: 3px; box-shadow: 0 0 0 1px rgb(221 32 107 / 0.5); }
	.matches { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.9rem; }
	code { font-family: var(--mono); }
</style>
