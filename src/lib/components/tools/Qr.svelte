<script lang="ts">
	import QRCode from 'qrcode';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { Download } from '@lucide/svelte';

	let value = $state('https://github.com/gusdslara');
	let size = $state(256);
	let ecl = $state<'L' | 'M' | 'Q' | 'H'>('M');
	let dark = $state('#0b0d12');
	let light = $state('#ffffff');
	let png = $state('');
	let svg = $state('');
	let error = $state<string | null>(null);

	$effect(() => {
		const opts = { errorCorrectionLevel: ecl, margin: 2, width: size, color: { dark, light } };
		const v = value;
		if (!v) { png = ''; svg = ''; error = null; return; }
		Promise.all([QRCode.toDataURL(v, opts), QRCode.toString(v, { ...opts, type: 'svg' })])
			.then(([p, s]) => { png = p; svg = s; error = null; })
			.catch((e) => { png = ''; svg = ''; error = t('tools.qr.error', { msg: (e as Error).message }); });
	});

	function downloadSvg() {
		const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'qrcode.svg' });
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 500);
	}
</script>

<div class="grid-2 qr">
	<div class="stack">
		<label class="field"><span class="label">{t('tools.qr.content')}</span><textarea class="textarea" bind:value={value}></textarea></label>
		<div class="row">
			<label class="field" style="width: 160px"><span class="label">{t('tools.qr.size')}</span><input class="input" type="number" min="64" max="2048" step="32" bind:value={size} /></label>
			<div class="field"><span class="label">{t('tools.qr.ecl')}</span>
				<div class="seg" role="radiogroup" aria-label={t('tools.qr.ecl')}>
					{#each ['L', 'M', 'Q', 'H'] as l (l)}
						<button role="radio" aria-checked={ecl === l} onclick={() => (ecl = l as typeof ecl)}>{l}</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="row">
			<label class="check">{t('tools.qr.color')} <input type="color" bind:value={dark} aria-label={t('tools.qr.colorAria')} /></label>
			<label class="check">{t('tools.qr.background')} <input type="color" bind:value={light} aria-label={t('tools.qr.backgroundAria')} /></label>
		</div>
		{#if error}<p class="error">{error}</p>{/if}
		<div class="row">
			<a class="btn primary" href={png} download="qrcode.png" aria-disabled={!png} class:disabled={!png}><Download size={15} /> PNG</a>
			<button class="btn" onclick={downloadSvg} disabled={!svg}><Download size={15} /> SVG</button>
			<CopyButton text={value} label={t('tools.qr.copyText')} />
		</div>
	</div>
	<div class="preview" aria-label={t('tools.qr.preview')}>
		{#if png}<img src={png} alt={t('tools.qr.alt')} width={Math.min(size, 280)} height={Math.min(size, 280)} />{:else}<span class="muted">{t('tools.qr.empty')}</span>{/if}
	</div>
</div>

<style>
	.preview { display: grid; place-items: center; min-height: 280px; border-radius: var(--radius); background: #fff; border: 1px solid var(--border); padding: 16px; }
	.preview img { max-width: 100%; height: auto; image-rendering: pixelated; }
	.disabled { pointer-events: none; opacity: 0.45; }
	.qr { align-items: start; }
</style>
