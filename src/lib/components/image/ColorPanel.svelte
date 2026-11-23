<script lang="ts">
	// Cores estilo Paint.NET: primária/secundária, seletor HSV (quadrado + matiz + alfa), HEX/RGB/HSL,
	// conta-gotas da tela (EyeDropper API), paleta salva e cores recentes.
	import { colors, parseColor, rgbToHsv, hsvToRgb, rgbToHsl, toHex, toCss, type RGBA } from '#lib/image/colors.svelte.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { ArrowLeftRight, RotateCcw, Pipette, Plus } from '@lucide/svelte';

	let { compact = false }: { compact?: boolean } = $props();

	const cur = $derived(colors[colors.editing]);
	// HSV local mantém o matiz quando a saturação/brilho vão a zero.
	let hsv = $state({ h: 0, s: 0, v: 0 });
	let lastHex = '';
	$effect(() => {
		const hx = toHex(cur, true);
		if (hx === lastHex) return;
		lastHex = hx;
		const n = rgbToHsv(cur);
		hsv = { h: n.s && n.v ? n.h : hsv.h, s: n.v ? n.s : hsv.s, v: n.v };
	});

	let hexInput = $state('');
	$effect(() => {
		hexInput = toHex(cur);
	});

	function setRgba(c: RGBA, keepHsv = false) {
		const v = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: Math.round(c.a * 1000) / 1000 };
		if (keepHsv) lastHex = toHex(v, true);
		colors.set(colors.editing, v);
		colors.save();
	}

	function setHsv(h: number, s: number, v: number) {
		hsv = { h, s, v };
		setRgba({ ...hsvToRgb(h, s, v), a: cur.a }, true);
	}

	function drag(node: HTMLElement, on: (x: number, y: number) => void) {
		const handle = (e: PointerEvent) => {
			const r = node.getBoundingClientRect();
			on(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
		};
		const down = (e: PointerEvent) => {
			node.setPointerCapture(e.pointerId);
			handle(e);
			node.addEventListener('pointermove', handle);
		};
		const up = () => node.removeEventListener('pointermove', handle);
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		return { destroy: () => node.removeEventListener('pointerdown', down) };
	}

	function keyNudge(e: KeyboardEvent, kind: 'sv' | 'hue' | 'alpha') {
		const step = e.shiftKey ? 0.1 : 0.01;
		const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
		const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
		if (!dx && !dy) return;
		e.preventDefault();
		e.stopPropagation();
		const cl = (v: number) => Math.min(1, Math.max(0, v));
		if (kind === 'sv') setHsv(hsv.h, cl(hsv.s + dx), cl(hsv.v - dy));
		else if (kind === 'hue') setHsv((hsv.h + (dx + dy) * 360 + 360) % 360, hsv.s, hsv.v);
		else setRgba({ ...cur, a: cl(cur.a + dx + dy) });
	}

	const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
	async function eyeDropper() {
		try {
			// @ts-expect-error EyeDropper ainda não está no lib.dom de todos os TS
			const r = await new window.EyeDropper().open();
			const c = parseColor(r.sRGBHex);
			if (c) setRgba({ ...c, a: 1 });
		} catch {
			/* cancelado */
		}
	}

	function commitHex() {
		const c = parseColor(hexInput);
		if (c) setRgba(c);
		else hexInput = toHex(cur);
	}

	const hsl = $derived(rgbToHsl(cur));
	const pick = (h: string, which: 'primary' | 'secondary' = colors.editing) => {
		const c = parseColor(h);
		if (c) {
			colors.set(which, c);
			colors.save();
		}
	};
</script>

<section class="colors" class:compact aria-label={t('image.panels.colors')}>
	<div class="top">
		<div class="pair">
			<button class="sw secondary" class:editing={colors.editing === 'secondary'} style:--c={colors.secondaryCss} aria-label={t('image.color.secondary')} title={t('image.color.secondary')} onclick={() => (colors.editing = 'secondary')}></button>
			<button class="sw primary" class:editing={colors.editing === 'primary'} style:--c={colors.primaryCss} aria-label={t('image.color.primary')} title={t('image.color.primary')} onclick={() => (colors.editing = 'primary')}></button>
			<button class="mini swap" aria-label={t('image.color.swap')} title={`${t('image.color.swap')} (X)`} onclick={() => colors.swap()}><ArrowLeftRight size={12} /></button>
			<button class="mini reset" aria-label={t('image.color.reset')} title={`${t('image.color.reset')} (D)`} onclick={() => colors.reset()}><RotateCcw size={12} /></button>
		</div>
		<div class="which">
			<div class="seg" role="radiogroup" aria-label={t('image.color.editing')}>
				<button role="radio" aria-checked={colors.editing === 'primary'} onclick={() => (colors.editing = 'primary')}>{t('image.color.primary')}</button>
				<button role="radio" aria-checked={colors.editing === 'secondary'} onclick={() => (colors.editing = 'secondary')}>{t('image.color.secondary')}</button>
			</div>
			<div class="hexrow">
				<input class="input hex" aria-label="HEX" bind:value={hexInput} onchange={commitHex} onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitHex(); }} spellcheck="false" />
				{#if supportsEyeDropper}
					<button class="btn icon" title={t('image.color.eyedropper')} aria-label={t('image.color.eyedropper')} onclick={eyeDropper}><Pipette size={16} /></button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Quadrado saturação × brilho -->
	<div
		class="sv"
		style:--hue="hsl({hsv.h} 100% 50%)"
		use:drag={(x, y) => setHsv(hsv.h, x, 1 - y)}
		role="slider"
		tabindex="0"
		aria-label={t('image.color.satValue')}
		aria-valuetext={`S ${Math.round(hsv.s * 100)}%, V ${Math.round(hsv.v * 100)}%`}
		aria-valuenow={Math.round(hsv.s * 100)}
		onkeydown={(e) => keyNudge(e, 'sv')}
	>
		<span class="dot" style:left="{hsv.s * 100}%" style:top="{(1 - hsv.v) * 100}%" style:--c={toCss({ ...cur, a: 1 })}></span>
	</div>
	<div class="bar hue" use:drag={(x) => setHsv(x * 360, hsv.s, hsv.v)} role="slider" tabindex="0" aria-label={t('image.color.hue')} aria-valuenow={Math.round(hsv.h)} aria-valuemin={0} aria-valuemax={360} onkeydown={(e) => keyNudge(e, 'hue')}>
		<span class="knob" style:left="{(hsv.h / 360) * 100}%"></span>
	</div>
	<div class="bar alpha" style:--solid={toCss({ ...cur, a: 1 })} use:drag={(x) => setRgba({ ...cur, a: x })} role="slider" tabindex="0" aria-label={t('image.color.alpha')} aria-valuenow={Math.round(cur.a * 100)} aria-valuemin={0} aria-valuemax={100} onkeydown={(e) => keyNudge(e, 'alpha')}>
		<span class="knob" style:left="{cur.a * 100}%"></span>
	</div>

	{#if !compact}
		<div class="nums">
			{#each [['R', 'r'], ['G', 'g'], ['B', 'b']] as const as [lab, k] (k)}
				<label><span>{lab}</span><input class="input" type="number" min="0" max="255" value={Math.round(cur[k])} onchange={(e) => setRgba({ ...cur, [k]: Math.min(255, Math.max(0, +(e.target as HTMLInputElement).value || 0)) })} onkeydown={(e) => e.stopPropagation()} /></label>
			{/each}
			<label><span>A</span><input class="input" type="number" min="0" max="100" value={Math.round(cur.a * 100)} onchange={(e) => setRgba({ ...cur, a: Math.min(100, Math.max(0, +(e.target as HTMLInputElement).value || 0)) / 100 })} onkeydown={(e) => e.stopPropagation()} /></label>
		</div>
		<p class="hslline">HSL {Math.round(hsl.h)}° {Math.round(hsl.s * 100)}% {Math.round(hsl.l * 100)}% · HSV {Math.round(hsv.h)}° {Math.round(hsv.s * 100)}% {Math.round(hsv.v * 100)}%</p>
	{/if}

	<div class="pal-head">
		<span>{t('image.color.palette')}</span>
		<button class="btn icon ghost sm" title={t('image.color.addSwatch')} aria-label={t('image.color.addSwatch')} onclick={() => colors.addToPalette(cur)}><Plus size={15} /></button>
		<button class="btn icon ghost sm" title={t('image.color.resetPalette')} aria-label={t('image.color.resetPalette')} onclick={() => colors.resetPalette()}><RotateCcw size={14} /></button>
	</div>
	<div class="swatches">
		{#each colors.palette as h (h)}
			<button
				class="chip"
				style:--c={h}
				title={`${h} — ${t('image.color.swatchHint')}`}
				aria-label={h}
				onclick={() => pick(h)}
				oncontextmenu={(e) => { e.preventDefault(); if (e.shiftKey) colors.removeFromPalette(h); else pick(h, colors.editing === 'primary' ? 'secondary' : 'primary'); }}
			></button>
		{/each}
	</div>
	{#if colors.recent.length}
		<div class="pal-head"><span>{t('image.color.recent')}</span></div>
		<div class="swatches">
			{#each colors.recent as h (h)}
				<button class="chip" style:--c={h} title={h} aria-label={h} onclick={() => pick(h)} oncontextmenu={(e) => { e.preventDefault(); pick(h, colors.editing === 'primary' ? 'secondary' : 'primary'); }}></button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.colors { display: grid; gap: 10px; }
	.top { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; }
	.pair { position: relative; width: 64px; height: 60px; }
	.sw {
		position: absolute; width: 38px; height: 38px; border-radius: 8px; border: 2px solid var(--surface-solid);
		background: linear-gradient(var(--c), var(--c)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 10px 10px;
		box-shadow: 0 0 0 1px var(--border); padding: 0;
	}
	.sw.primary { left: 0; top: 0; z-index: 1; }
	.sw.secondary { left: 22px; top: 20px; }
	.sw.editing { box-shadow: 0 0 0 2px var(--accent); }
	.mini { position: absolute; width: 20px; height: 20px; display: grid; place-items: center; padding: 0; border-radius: 5px; border: 0; background: var(--surface-3); color: var(--text-2); }
	.mini:hover { color: var(--text); }
	.swap { right: 0; top: 0; }
	.reset { left: 0; bottom: 0; }
	.which { display: grid; gap: 6px; min-width: 0; }
	.which .seg button { padding: 4px 8px; font-size: 0.76rem; }
	.hexrow { display: flex; gap: 6px; }
	.hex { font-family: var(--mono); font-size: 0.84rem; padding: 5px 8px; min-width: 0; }
	.sv {
		position: relative; height: 150px; border-radius: var(--radius-sm); cursor: crosshair; touch-action: none;
		background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, var(--hue));
		box-shadow: inset 0 0 0 1px var(--border);
	}
	.compact .sv { height: 120px; }
	.dot {
		position: absolute; width: 16px; height: 16px; border-radius: 50%; transform: translate(-50%, -50%);
		border: 2px solid #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5), 0 2px 6px rgb(0 0 0 / 0.4); background: var(--c); pointer-events: none;
	}
	.bar { position: relative; height: 16px; border-radius: 99px; cursor: pointer; touch-action: none; box-shadow: inset 0 0 0 1px var(--border); }
	.hue { background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
	.alpha { background: linear-gradient(to right, transparent, var(--solid)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
	.knob { position: absolute; top: 50%; width: 14px; height: 22px; border-radius: 5px; transform: translate(-50%, -50%); background: #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5), 0 2px 5px rgb(0 0 0 / 0.4); pointer-events: none; }
	.sv:focus-visible, .bar:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
	.nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
	.nums label { display: grid; gap: 2px; font-size: 0.7rem; color: var(--text-3); }
	.nums .input { padding: 4px 6px; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
	.hslline { font-size: 0.7rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
	.pal-head { display: flex; align-items: center; gap: 2px; font-size: 0.74rem; color: var(--text-2); font-weight: 600; }
	.pal-head span { flex: 1; }
	.btn.sm { padding: 4px; }
	.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(22px, 1fr)); gap: 4px; }
	.chip { aspect-ratio: 1; border-radius: 5px; border: 0; padding: 0; background: var(--c); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12); transition: transform 0.1s var(--ease); }
	.chip:hover { transform: scale(1.12); }
	@media (pointer: coarse) {
		.swatches { grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 6px; }
		.bar { height: 26px; }
		.mini { width: 26px; height: 26px; }
	}
</style>
