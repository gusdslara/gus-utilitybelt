<script lang="ts">
	import JsBarcode from 'jsbarcode';
	import CopyButton from './CopyButton.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { Download } from '@lucide/svelte';

	type Fmt = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'MSI' | 'pharmacode';
	const formats: { id: Fmt; label: string }[] = [
		{ id: 'CODE128', label: 'CODE128' },
		{ id: 'CODE39', label: 'CODE39' },
		{ id: 'EAN13', label: 'EAN-13' },
		{ id: 'EAN8', label: 'EAN-8' },
		{ id: 'UPC', label: 'UPC-A' },
		{ id: 'ITF14', label: 'ITF-14' },
		{ id: 'MSI', label: 'MSI' },
		{ id: 'pharmacode', label: 'Pharmacode' }
	];

	let value = $state('7891234567895');
	let format = $state<Fmt>('EAN13');
	let width = $state(2);
	let height = $state(90);
	let showText = $state(true);
	let svgEl: SVGSVGElement | undefined = $state();
	let error = $state<string | null>(null);
	let svgText = $state('');

	$effect(() => {
		const opts = { format, width, height, displayValue: showText, margin: 10, background: '#ffffff', lineColor: '#0b0d12', fontSize: 16 };
		if (!svgEl) return;
		try {
			JsBarcode(svgEl, value || ' ', opts);
			error = null;
			svgText = new XMLSerializer().serializeToString(svgEl);
		} catch (e) {
			error = (e as Error).message;
			svgText = '';
		}
	});

	function download() {
		const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: `barcode-${format}.svg` });
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 500);
	}
</script>

<div class="stack">
	<div class="row">
		<div class="seg" role="radiogroup" aria-label={t('tools.barcode.format')}>
			{#each formats as f (f.id)}
				<button role="radio" aria-checked={format === f.id} onclick={() => (format = f.id)}>{f.label}</button>
			{/each}
		</div>
	</div>
	<p class="hint">{t(`tools.barcode.hints.${format}`)}</p>

	<div class="grid-2">
		<label class="field"><span class="label">{t('tools.barcode.value')}</span><input class="input mono" bind:value={value} spellcheck="false" /></label>
		<div class="row">
			<label class="field" style="width: 120px"><span class="label">{t('tools.barcode.width')}</span><input class="input" type="number" min="1" max="6" step="0.5" bind:value={width} /></label>
			<label class="field" style="width: 120px"><span class="label">{t('tools.barcode.height')}</span><input class="input" type="number" min="20" max="300" bind:value={height} /></label>
			<label class="check"><input type="checkbox" bind:checked={showText} /> {t('tools.barcode.showText')}</label>
		</div>
	</div>

	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<div class="preview" class:invalid={!!error}><svg bind:this={svgEl}></svg></div>
	<div class="row">
		<button class="btn primary" onclick={download} disabled={!svgText}><Download size={15} /> {t('tools.barcode.download')}</button>
		<CopyButton text={svgText} label={t('tools.barcode.copy')} />
	</div>
</div>

<style>
	.preview { background: #fff; border-radius: var(--radius); padding: 16px; overflow: auto; display: flex; justify-content: center; min-height: 140px; }
	.preview.invalid { opacity: 0.4; }
	.preview :global(svg) { max-width: 100%; height: auto; }
</style>
