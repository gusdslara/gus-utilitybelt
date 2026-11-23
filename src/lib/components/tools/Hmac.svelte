<script lang="ts">
	import { hmac, toHex, toBase64, timingSafeEqual } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';

	type Algo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
	let mode = $state<'gerar' | 'validar'>('gerar');
	let algo = $state<Algo>('SHA-256');
	let encoding = $state<'hex' | 'base64'>('hex');
	let key = $state('');
	let message = $state('');
	let expected = $state('');
	let output = $state('');
	let error = $state<string | null>(null);
	let verdict = $state<null | boolean>(null);

	function normalize(s: string) {
		const t = s.trim();
		return encoding === 'hex' ? t.toLowerCase().replace(/\s/g, '') : t;
	}

	async function run() {
		error = null; verdict = null;
		if (!key) { output = ''; return; }
		try {
			const buf = await hmac(algo, key, message);
			output = encoding === 'hex' ? toHex(buf) : toBase64(buf);
			if (mode === 'validar') {
				if (!expected.trim()) { verdict = null; return; }
				verdict = timingSafeEqual(normalize(expected), output);
			}
		} catch (e) {
			error = t('tools.hmac.error', { msg: (e as Error).message });
		}
	}

	$effect(() => { void [mode, algo, encoding, key, message, expected]; run(); });
</script>

<div class="stack">
	<div class="row between">
		<div class="seg" role="group" aria-label={t('common.mode')}>
			<button aria-pressed={mode === 'gerar'} onclick={() => (mode = 'gerar')}>{t('common.generate')}</button>
			<button aria-pressed={mode === 'validar'} onclick={() => (mode = 'validar')}>{t('common.validate')}</button>
		</div>
		<div class="seg" role="group" aria-label={t('tools.hmac.algorithm')}>
			{#each ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as a (a)}
				<button aria-pressed={algo === a} onclick={() => (algo = a as Algo)}>{a}</button>
			{/each}
		</div>
		<div class="seg" role="group" aria-label={t('tools.hmac.encoding')}>
			<button aria-pressed={encoding === 'hex'} onclick={() => (encoding = 'hex')}>Hex</button>
			<button aria-pressed={encoding === 'base64'} onclick={() => (encoding = 'base64')}>Base64</button>
		</div>
	</div>

	<div class="grid-2">
		<label class="field"><span class="label">{t('tools.hmac.key')}</span><input class="input mono" type="password" autocomplete="off" bind:value={key} placeholder={t('tools.hmac.keyPlaceholder')} /></label>
		<label class="field"><span class="label">{t('tools.hmac.message')}</span><textarea class="textarea" bind:value={message} placeholder={t('tools.hmac.messagePlaceholder')}></textarea></label>
	</div>

	{#if mode === 'validar'}
		<label class="field"><span class="label">{t('tools.hmac.expected')}</span><input class="input mono" bind:value={expected} placeholder={`${t('tools.hmac.examplePrefix')} ${encoding === 'hex' ? 'a1b2…' : 'abC1…=='}`} /></label>
	{/if}

	{#if error}<p class="error">{error}</p>{/if}

	<div class="field">
		<span class="label">{t('tools.hmac.result', { algo, encoding })}</span>
		<div class="out" aria-live="polite">{output || '—'}</div>
		<div class="row">
			<CopyButton text={output} />
			{#if verdict !== null}
				{#if verdict}<span class="ok">✔ {t('tools.hmac.validSig')}</span>{:else}<span class="error">✖ {t('tools.hmac.invalidSig')}</span>{/if}
			{/if}
		</div>
	</div>
	<p class="hint">{t('tools.hmac.hintBefore')}<code>crypto.subtle</code>{t('tools.hmac.hintAfter')}</p>
</div>

<style>
	.between { justify-content: space-between; }
	code { font-family: var(--mono); }
</style>
