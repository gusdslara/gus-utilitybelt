<script lang="ts">
	import { generatePassword, entropyBits, strengthLabel, type PasswordOpts } from '#lib/tools/gen.ts';
	import CopyButton from './CopyButton.svelte';
	import { RefreshCw } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { t } from '#lib/i18n/index.svelte.ts';

	let opts = $state<PasswordOpts>({ length: 20, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: false, noRepeat: false });
	let password = $state('');
	let history = $state<string[]>([]);
	let preset = $state<'pin' | 'forte' | 'extremo' | 'custom'>('forte');

	const bits = $derived(entropyBits(opts));
	const strength = $derived(strengthLabel(bits));
	const STRENGTH = { 0: 'tools.senhas.weak', 1: 'tools.senhas.weak', 2: 'tools.senhas.fair', 3: 'tools.senhas.strong', 4: 'tools.senhas.veryStrong' } as const;
	const strengthText = $derived(t(STRENGTH[strength.level]));
	const noSet = $derived(!opts.lower && !opts.upper && !opts.digits && !opts.symbols);
	const noSetOf = (o: PasswordOpts) => !o.lower && !o.upper && !o.digits && !o.symbols;

	function applyPreset(p: typeof preset) {
		preset = p;
		if (p === 'pin') opts = { ...opts, length: 6, lower: false, upper: false, digits: true, symbols: false };
		if (p === 'forte') opts = { ...opts, length: 20, lower: true, upper: true, digits: true, symbols: true };
		if (p === 'extremo') opts = { ...opts, length: 48, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true };
	}

	function generate() {
		if (noSet) return;
		password = generatePassword(opts);
		history = [password, ...history].slice(0, 8);
	}

	// Regenera ao mudar qualquer opção, sem poluir o histórico.
	$effect(() => {
		const o = { ...opts };
		untrack(() => {
			if (!noSetOf(o)) password = generatePassword(o);
		});
	});
</script>

<div class="stack">
	<div class="out pw" aria-live="polite" aria-label={t('tools.senhas.output')}>{password || '—'}</div>

	<div class="row between">
		<div class="meter" aria-label={t('tools.senhas.strength', { label: strengthText })}>
			{#each [1, 2, 3, 4] as i (i)}
				<span class:on={strength.level >= i} class="bar lv{strength.level}"></span>
			{/each}
			<span class="lbl">{strengthText} · {bits.toFixed(0)} bits</span>
		</div>
		<div class="row">
			<button class="btn" onclick={generate} disabled={noSet}><RefreshCw size={15} /> {t('common.generate')}</button>
			<CopyButton text={password} />
		</div>
	</div>

	<div class="row">
		<span class="label">{t('tools.senhas.profile')}:</span>
		<div class="seg" role="group" aria-label={t('tools.senhas.profile')}>
			<button aria-pressed={preset === 'pin'} onclick={() => { applyPreset('pin'); generate(); }}>PIN</button>
			<button aria-pressed={preset === 'forte'} onclick={() => { applyPreset('forte'); generate(); }}>{t('tools.senhas.presetStrong')}</button>
			<button aria-pressed={preset === 'extremo'} onclick={() => { applyPreset('extremo'); generate(); }}>{t('tools.senhas.presetExtreme')}</button>
		</div>
	</div>

	<div class="field">
		<div class="row between"><span class="label">{t('tools.senhas.length')}</span><strong>{opts.length}</strong></div>
		<input type="range" min="4" max="128" bind:value={opts.length} onchange={() => (preset = 'custom')} aria-label={t('tools.senhas.lengthAria')} />
	</div>

	<div class="grid-2">
		<label class="check"><input type="checkbox" bind:checked={opts.lower} /> {t('tools.senhas.lower')}</label>
		<label class="check"><input type="checkbox" bind:checked={opts.upper} /> {t('tools.senhas.upper')}</label>
		<label class="check"><input type="checkbox" bind:checked={opts.digits} /> {t('tools.senhas.digits')}</label>
		<label class="check"><input type="checkbox" bind:checked={opts.symbols} /> {t('tools.senhas.symbols')}</label>
		<label class="check"><input type="checkbox" bind:checked={opts.noAmbiguous} /> {t('tools.senhas.noAmbiguous')}</label>
		<label class="check"><input type="checkbox" bind:checked={opts.noRepeat} /> {t('tools.senhas.noRepeat')}</label>
	</div>
	{#if noSet}<p class="error">{t('tools.senhas.noSet')}</p>{/if}

	{#if history.length > 1}
		<div class="field">
			<span class="label">{t('tools.senhas.history')}</span>
			<ul class="hist">
				{#each history.slice(1) as h (h)}
					<li><code>{h}</code> <CopyButton text={h} label="" /></li>
				{/each}
			</ul>
		</div>
	{/if}
	<p class="hint">{t('tools.senhas.hintBefore')} <code>crypto.getRandomValues</code>{t('tools.senhas.hintAfter')}</p>
</div>

<style>
	.between { justify-content: space-between; }
	.pw { font-size: 1.15rem; letter-spacing: 0.04em; min-height: 56px; display: flex; align-items: center; }
	.meter { display: flex; align-items: center; gap: 4px; }
	.bar { width: 26px; height: 6px; border-radius: 99px; background: var(--surface-3); transition: background 0.25s var(--ease); }
	.bar.on.lv1 { background: var(--danger); }
	.bar.on.lv2 { background: var(--warn); }
	.bar.on.lv3 { background: #7cd66b; }
	.bar.on.lv4 { background: var(--ok); }
	.lbl { margin-left: 10px; font-size: 0.85rem; color: var(--text-2); }
	input[type='range'] { width: 100%; accent-color: var(--accent); }
	.hist { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
	.hist li { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.85rem; color: var(--text-2); }
	.hist code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	code { font-family: var(--mono); }
</style>
