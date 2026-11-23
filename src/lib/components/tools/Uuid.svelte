<script lang="ts">
	import { uuidV4, uuidV7 } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { RefreshCw } from '@lucide/svelte';

	let version = $state<'v4' | 'v7'>('v4');
	let count = $state(5);
	let upper = $state(false);
	let noHyphens = $state(false);
	let list = $state<string[]>([]);

	function format(u: string) {
		let s = upper ? u.toUpperCase() : u;
		if (noHyphens) s = s.replace(/-/g, '');
		return s;
	}

	function generate() {
		const n = Math.max(1, Math.min(Math.floor(count) || 1, 1000));
		list = Array.from({ length: n }, () => format(version === 'v4' ? uuidV4() : uuidV7()));
	}

	$effect(() => {
		void [version, count, upper, noHyphens];
		generate();
	});

	const text = $derived(list.join('\n'));
</script>

<div class="stack">
	<div class="row">
		<div class="seg" role="group" aria-label={t('tools.uuid.version')}>
			<button aria-pressed={version === 'v4'} onclick={() => (version = 'v4')}>{t('tools.uuid.v4')}</button>
			<button aria-pressed={version === 'v7'} onclick={() => (version = 'v7')}>{t('tools.uuid.v7')}</button>
		</div>
	</div>
	<div class="row">
		<label class="field" style="width: 140px"><span class="label">{t('common.quantity')}</span><input class="input" type="number" min="1" max="1000" bind:value={count} /></label>
		<label class="check"><input type="checkbox" bind:checked={upper} /> {t('common.uppercase')}</label>
		<label class="check"><input type="checkbox" bind:checked={noHyphens} /> {t('tools.uuid.noHyphens')}</label>
	</div>
	<div class="out list" aria-live="polite">{text}</div>
	<div class="row">
		<button class="btn" onclick={generate}><RefreshCw size={15} /> {t('common.regenerate')}</button>
		<CopyButton text={text} label={t('common.copyAll')} />
	</div>
	<p class="hint">{t('tools.uuid.hint')}</p>
</div>

<style>
	.list { max-height: 320px; overflow: auto; }
</style>
