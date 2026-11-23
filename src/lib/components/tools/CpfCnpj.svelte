<script lang="ts">
	import { cpfDigits, cnpjCheck, validateCpf, validateCnpj, randomCpfBase, randomCnpjBase, maskCpf, maskCnpj } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { RefreshCw, CircleCheck, CircleX } from '@lucide/svelte';

	let mode = $state<'gerar' | 'validar'>('gerar');
	let doc = $state<'cpf' | 'cnpj'>('cpf');
	let masked = $state(true);
	let alnum = $state(false);
	let quantity = $state(5);
	let list = $state<string[]>([]);

	let input = $state('');
	const digitsOnly = $derived(input.replace(/[.\-/\s]/g, '').toUpperCase());
	const verdict = $derived.by(() => {
		if (!input.trim()) return null;
		if (doc === 'cpf') return validateCpf(input);
		return validateCnpj(input);
	});
	const computedDv = $derived.by(() => {
		// Mostra o dígito verificador esperado quando a entrada tem a base completa
		if (doc === 'cpf' && digitsOnly.length >= 9 && /^\d+$/.test(digitsOnly.slice(0, 9)))
			return cpfDigits(digitsOnly.slice(0, 9).split('').map(Number)).slice(9);
		if (doc === 'cnpj' && digitsOnly.length >= 12)
			return cnpjCheck(digitsOnly.slice(0, 12).split('')).slice(12);
		return '';
	});

	function fmt(s: string) {
		return masked ? (doc === 'cpf' ? maskCpf(s) : maskCnpj(s)) : s;
	}

	function generate() {
		const n = Math.max(1, Math.min(Math.floor(quantity) || 1, 100));
		list = Array.from({ length: n }, () => {
			if (doc === 'cpf') return fmt(cpfDigits(randomCpfBase()));
			return fmt(cnpjCheck(randomCnpjBase(alnum)));
		});
	}

	$effect(() => {
		void [doc, masked, alnum, quantity];
		generate();
	});

	const text = $derived(list.join('\n'));
</script>

<div class="stack">
	<div class="row">
		<div class="seg" role="group" aria-label={t('common.mode')}>
			<button aria-pressed={mode === 'gerar'} onclick={() => (mode = 'gerar')}>{t('common.generate')}</button>
			<button aria-pressed={mode === 'validar'} onclick={() => (mode = 'validar')}>{t('common.validate')}</button>
		</div>
		<div class="seg" role="group" aria-label={t('tools.cpfCnpj.document')}>
			<button aria-pressed={doc === 'cpf'} onclick={() => (doc = 'cpf')}>CPF</button>
			<button aria-pressed={doc === 'cnpj'} onclick={() => (doc = 'cnpj')}>CNPJ</button>
		</div>
		<label class="check"><input type="checkbox" bind:checked={masked} /> {t('tools.cpfCnpj.masked')}</label>
		{#if doc === 'cnpj' && mode === 'gerar'}
			<label class="check"><input type="checkbox" bind:checked={alnum} /> {t('tools.cpfCnpj.alnum')}</label>
		{/if}
	</div>

	{#if mode === 'gerar'}
		<div class="row">
			<label class="field" style="width: 140px"><span class="label">{t('common.quantity')}</span><input class="input" type="number" min="1" max="100" bind:value={quantity} /></label>
			<button class="btn" onclick={generate}><RefreshCw size={15} /> {t('common.generate')}</button>
			<CopyButton text={text} label={t('common.copyAll')} />
		</div>
		<div class="out list" aria-live="polite">{text}</div>
		<p class="hint">{t('tools.cpfCnpj.genHint')}</p>
	{:else}
		<label class="field">
			<span class="label">{doc === 'cpf' ? t('tools.cpfCnpj.cpfInput') : t('tools.cpfCnpj.cnpjInput')}</span>
			<input class="input mono" bind:value={input} placeholder={doc === 'cpf' ? '123.456.789-09' : '11.222.333/0001-81'} spellcheck="false" aria-invalid={verdict === false} />
		</label>
		{#if verdict !== null}
			<div class="verdict" class:ok={verdict} class:bad={!verdict} role="status">
				{#if verdict}<CircleCheck size={18} /> {t('tools.cpfCnpj.valid')}{:else}<CircleX size={18} /> {t('tools.cpfCnpj.invalid')}{/if}
			</div>
		{/if}
		{#if computedDv && !verdict}<p class="hint">{t('tools.cpfCnpj.expectedDv')} <code>{computedDv}</code></p>{/if}
	{/if}
</div>

<style>
	.list { max-height: 320px; overflow: auto; }
	.verdict { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); font-weight: 550; width: fit-content; }
	.verdict.ok { background: rgb(61 220 151 / 0.14); color: var(--ok); }
	.verdict.bad { background: rgb(255 92 108 / 0.14); color: var(--danger); }
	code { font-family: var(--mono); }
</style>
