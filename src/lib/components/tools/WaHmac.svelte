<script lang="ts">
	// Assinatura do webhook da WhatsApp Cloud API (X-Hub-Signature-256 = HMAC-SHA256 do corpo bruto com o App Secret).
	import { signWebhook, verifyWebhook, sampleWebhookBody } from '#lib/tools/whatsapp.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import CopyButton from './CopyButton.svelte';
	import { CircleCheck, CircleX, FileJson } from '@lucide/svelte';

	let mode = $state<'sign' | 'verify'>('sign');
	let secret = $state('');
	let body = $state('');
	let header = $state('');
	let url = $state('');
	let out = $state<{ header: string; valid?: boolean; expected?: string; hasPrefix?: boolean } | null>(null);

	$effect(() => {
		const [m, s, b, h] = [mode, secret, body, header];
		if (!s) { out = null; return; }
		let alive = true;
		(async () => {
			const signed = await signWebhook(s, b);
			const v = m === 'verify' && h.trim() ? await verifyWebhook(s, b, h) : null;
			if (alive) out = { header: signed.header, ...(v ? { valid: v.valid, expected: v.expected, hasPrefix: v.hasPrefix } : {}) };
		})();
		return () => (alive = false);
	});

	const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
	const curl = $derived(out && url.trim()
		? `curl -X POST ${shq(url.trim())} \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-Hub-Signature-256: ${out.header}' \\\n  --data-binary ${shq(body)}`
		: '');
</script>

<div class="stack">
	<div class="seg" role="group" aria-label={t('common.mode')}>
		<button aria-pressed={mode === 'sign'} onclick={() => (mode = 'sign')}>{t('whatsapp.hmac.sign')}</button>
		<button aria-pressed={mode === 'verify'} onclick={() => (mode = 'verify')}>{t('whatsapp.hmac.verify')}</button>
	</div>

	<label class="field">
		<span class="label">{t('whatsapp.hmac.secret')}</span>
		<input class="input mono" type="password" autocomplete="off" spellcheck="false" bind:value={secret} placeholder={t('whatsapp.hmac.secretPlaceholder')} />
		<span class="hint">{t('whatsapp.hmac.secretHint')}</span>
	</label>

	<div class="field">
		<div class="row between">
			<label class="label" for="wa-body">{t('whatsapp.hmac.body')}</label>
			<button class="btn ghost" type="button" onclick={() => (body = sampleWebhookBody())}><FileJson size={15} /> {t('whatsapp.hmac.sample')}</button>
		</div>
		<textarea id="wa-body" class="textarea" bind:value={body} spellcheck="false"></textarea>
		<span class="hint">{t('whatsapp.hmac.bodyHint')}</span>
	</div>

	{#if mode === 'verify'}
		<label class="field">
			<span class="label">{t('whatsapp.hmac.header')}</span>
			<input class="input mono" bind:value={header} placeholder={t('whatsapp.hmac.headerPlaceholder')} spellcheck="false" aria-invalid={out?.valid === false} />
		</label>
	{/if}

	{#if !secret}
		<p class="hint">{t('whatsapp.hmac.needSecret')}</p>
	{:else if out}
		{#if mode === 'verify' && out.valid !== undefined}
			<div class="verdict" class:ok={out.valid} class:bad={!out.valid} role="status">
				{#if out.valid}<CircleCheck size={18} /> {t('whatsapp.hmac.valid')}{:else}<CircleX size={18} /> {t('whatsapp.hmac.invalid')}{/if}
			</div>
			{#if !out.valid}
				<p class="hint">{t('whatsapp.hmac.expected', { value: out.expected ?? '' })}</p>
				<p class="hint">{t('whatsapp.hmac.invalidHints')}</p>
			{/if}
			{#if !out.hasPrefix}<p class="hint">{t('whatsapp.hmac.noPrefix')}</p>{/if}
		{:else}
			<div class="field">
				<span class="label">{t('whatsapp.hmac.output')}</span>
				<div class="out" aria-live="polite">X-Hub-Signature-256: {out.header}</div>
				<div class="row"><CopyButton text={out.header} label={t('whatsapp.hmac.copyHeader')} /></div>
			</div>
			<div class="field">
				<span class="label">{t('whatsapp.hmac.testTitle')}</span>
				<input class="input mono" bind:value={url} placeholder={t('whatsapp.hmac.urlPlaceholder')} aria-label={t('whatsapp.hmac.url')} spellcheck="false" />
				{#if curl}
					<pre class="out curl">{curl}</pre>
					<div class="row"><CopyButton text={curl} label={t('whatsapp.hmac.copyCurl')} /></div>
				{/if}
				<span class="hint">{t('whatsapp.hmac.curlHint')}</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.between { justify-content: space-between; }
	.curl { margin: 0; word-break: normal; overflow-wrap: anywhere; }
	.verdict { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius); font-weight: 600; font-size: 0.92rem; }
	.verdict.ok { color: var(--ok); background: rgb(61 220 151 / 0.1); border: 1px solid rgb(61 220 151 / 0.3); }
	.verdict.bad { color: var(--danger); background: rgb(255 92 108 / 0.1); border: 1px solid rgb(255 92 108 / 0.3); }
</style>
