<script lang="ts">
	// Controle numérico compacto: rótulo + faixa + campo (aceita digitar o valor exato).
	let {
		label,
		value,
		min = 0,
		max = 100,
		step = 1,
		unit = '',
		scale = 1,
		onchange,
		compact = false
	}: {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		/** Mostra o valor multiplicado (ex.: 0..1 exibido como 0..100%). */
		scale?: number;
		onchange: (v: number) => void;
		compact?: boolean;
	} = $props();

	const id = `sl-${Math.random().toString(36).slice(2, 8)}`;
	const shown = $derived(+(value * scale).toFixed(step * scale < 1 ? 2 : 0));
	const pct = $derived(((value - min) / (max - min || 1)) * 100);

	function set(v: number) {
		if (Number.isNaN(v)) return;
		onchange(Math.min(max, Math.max(min, v)));
	}
</script>

<div class="slider" class:compact>
	<label for={id}>{label}</label>
	<input
		{id}
		type="range"
		{min}
		{max}
		{step}
		{value}
		style:--pct="{pct}%"
		oninput={(e) => set(+(e.target as HTMLInputElement).value)}
	/>
	<span class="num">
		<input
			type="number"
			aria-label={label}
			value={shown}
			min={min * scale}
			max={max * scale}
			step={step * scale}
			onchange={(e) => set(+(e.target as HTMLInputElement).value / scale)}
			onkeydown={(e) => e.stopPropagation()}
		/>{#if unit}<small>{unit}</small>{/if}
	</span>
</div>

<style>
	.slider { display: grid; grid-template-columns: auto minmax(70px, 1fr) auto; align-items: center; gap: 8px; min-width: 0; }
	.slider.compact { grid-template-columns: auto minmax(60px, 130px) auto; }
	label { font-size: 0.76rem; color: var(--text-2); white-space: nowrap; }
	input[type='range'] {
		appearance: none; -webkit-appearance: none; width: 100%; height: 22px; background: transparent; margin: 0;
	}
	input[type='range']::-webkit-slider-runnable-track {
		height: 4px; border-radius: 99px;
		background: linear-gradient(to right, var(--accent) var(--pct), var(--surface-3) var(--pct));
	}
	input[type='range']::-moz-range-track { height: 4px; border-radius: 99px; background: var(--surface-3); }
	input[type='range']::-moz-range-progress { height: 4px; border-radius: 99px; background: var(--accent); }
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%;
		background: #fff; border: 2px solid var(--accent); box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
	}
	input[type='range']::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); }
	input[type='range']:focus-visible { outline: none; }
	input[type='range']:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--accent-soft); }
	.num { display: inline-flex; align-items: center; gap: 2px; }
	.num input {
		width: 54px; padding: 3px 5px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-solid);
		font-size: 0.78rem; font-variant-numeric: tabular-nums; text-align: right;
		-moz-appearance: textfield; appearance: textfield;
	}
	.num input::-webkit-inner-spin-button { display: none; }
	.num input:focus { outline: none; border-color: var(--accent); }
	small { color: var(--text-3); font-size: 0.7rem; }
	@media (pointer: coarse) {
		input[type='range'] { height: 32px; }
		input[type='range']::-webkit-slider-thumb { width: 22px; height: 22px; margin-top: -9px; }
	}
</style>
