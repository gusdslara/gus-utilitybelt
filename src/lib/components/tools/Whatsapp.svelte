<script lang="ts">
	import { whatsappLink } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { ExternalLink } from '@lucide/svelte';

	let phone = $state('');
	let message = $state(t('tools.whatsappLink.defaultMessage'));
	const result = $derived(whatsappLink(phone, message));
</script>

<div class="stack">
	<div class="grid-2">
		<label class="field">
			<span class="label">{t('tools.whatsappLink.phone')}</span>
			<input class="input mono" inputmode="tel" placeholder="+55 (11) 99999-8888" bind:value={phone} aria-invalid={!!result.error && phone.length > 0} />
			<span class="hint">{t('tools.whatsappLink.phoneHint')}</span>
		</label>
		<label class="field"><span class="label">{t('tools.whatsappLink.message')}</span><textarea class="textarea" bind:value={message}></textarea></label>
	</div>
	{#if phone && result.error}<p class="error">{t('tools.whatsappLink.phoneError')}</p>{/if}
	<div class="field">
		<span class="label">{t('tools.whatsappLink.link')}</span>
		<div class="out">{result.url || '—'}</div>
	</div>
	<div class="row">
		<CopyButton text={result.url} label={t('tools.whatsappLink.copy')} />
		<a class="btn primary" class:disabled={!result.url} href={result.url || undefined} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> {t('common.open')}</a>
	</div>
</div>

<style>
	.disabled { pointer-events: none; opacity: 0.45; }
</style>
