<script lang="ts">
	import { generateLorem, type LoremKind, type LoremLang } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { RefreshCw } from '@lucide/svelte';

	let kind = $state<LoremKind>('paragraphs');
	let lang = $state<LoremLang>('lorem');
	let count = $state(3);
	let text = $state('');

	const units = $derived<Record<LoremKind, string>>({ paragraphs: t('tools.lorem.units.paragraphs'), sentences: t('tools.lorem.units.sentences'), words: t('tools.lorem.units.words') });
	const sizes: Record<LoremKind, number[]> = { paragraphs: [1, 3, 5, 10], sentences: [3, 5, 10, 20], words: [10, 25, 50, 100] };

	function generate() {
		text = generateLorem(kind, count, lang);
	}

	$effect(() => {
		void [kind, lang, count];
		generate();
	});
</script>

<div class="stack">
	<div class="grid-2">
		<div class="field">
			<span class="label">{t('common.language')}</span>
			<div class="seg" role="radiogroup" aria-label={t('common.language')}>
				<button role="radio" aria-checked={lang === 'lorem'} onclick={() => (lang = 'lorem')}>Lorem Ipsum</button>
				<button role="radio" aria-checked={lang === 'mussum'} onclick={() => (lang = 'mussum')}>Mussum Ipsum</button>
			</div>
		</div>
		<div class="field">
			<span class="label">{t('tools.lorem.unit')}</span>
			<div class="seg" role="radiogroup" aria-label={t('tools.lorem.unit')}>
				{#each ['paragraphs', 'sentences', 'words'] as k (k)}
					<button role="radio" aria-checked={kind === k} onclick={() => { kind = k as LoremKind; count = sizes[kind][1]; }}>{units[k as LoremKind]}</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="row">
		<span class="label">{t('tools.lorem.size')}:</span>
		<div class="seg" role="radiogroup" aria-label={t('tools.lorem.size')}>
			{#each sizes[kind] as s (s)}
				<button role="radio" aria-checked={count === s} onclick={() => (count = s)}>{s} {units[kind]}</button>
			{/each}
		</div>
		<label class="check">{t('tools.lorem.custom')} <input class="input" style="width: 90px; padding: 6px 8px" type="number" min="1" max="500" bind:value={count} /></label>
	</div>

	<div class="out body" aria-live="polite">{text}</div>
	<div class="row">
		<button class="btn" onclick={generate}><RefreshCw size={15} /> {t('common.generate')}</button>
		<CopyButton text={text} />
		<span class="hint">{t('tools.lorem.stats', { words: text.split(/\s+/).filter(Boolean).length, chars: text.length })}</span>
	</div>
</div>

<style>
	.body { max-height: 340px; overflow: auto; font-family: var(--font); font-size: 0.95rem; line-height: 1.6; color: var(--text-2); }
</style>
