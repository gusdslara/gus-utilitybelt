<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';
	import { clipboard } from '#lib/clipboard/history.svelte.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	let { text, label }: { text: string; label?: string } = $props();
	let done = $state(false);
	async function copy() {
		if (!text) return;
		try {
			clipboard.add(text); // registra antes: o histórico nunca perde a cópia
			await navigator.clipboard.writeText(text);
			done = true;
			setTimeout(() => (done = false), 1400);
		} catch {
			/* sem permissão de clipboard */
		}
	}
</script>

<button class="btn" onclick={copy} disabled={!text} aria-live="polite" aria-label={label === '' ? t('common.copy') : undefined}>
	{#if done}<Check size={15} /> {t('common.copied')}{:else}<Copy size={15} /> {label ?? t('common.copy')}{/if}
</button>
