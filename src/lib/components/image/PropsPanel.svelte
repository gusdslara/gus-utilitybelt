<script lang="ts">
	// Propriedades da camada ativa: forma/texto (vetor editável) e efeitos de camada (sombra, brilho, contorno, 3D).
	import { doc } from '#lib/image/doc.svelte.ts';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { SHAPES, defaultEffects, type Effects, type Paint } from '#lib/image/types.ts';
	import { colors, toHex } from '#lib/image/colors.svelte.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import { FONTS, fontLabel } from './tools-meta.ts';
	import { Italic, TextAlignStart, TextAlignCenter, TextAlignEnd, Box, Sparkles } from '@lucide/svelte';

	const l = $derived(doc.active);
	const v = $derived(l?.vector ?? null);

	function edit(label: string, fn: () => void) {
		editor.propsHistory(label);
		fn();
		doc.changed();
	}

	const color = (p: Paint) => (p.kind === 'solid' ? p.color : p.kind === 'none' ? '#000000' : p.stops[0]?.color ?? '#000000');
	const hex7 = (c: string) => (/^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : '#000000');

	function setFillKind(kind: Paint['kind']) {
		if (!v) return;
		edit(t('image.hist.fill'), () => {
			const base = color(v.fill);
			if (kind === 'none') v.fill = { kind: 'none' };
			else if (kind === 'solid') v.fill = { kind: 'solid', color: base };
			else v.fill = { kind, angle: v.fill.kind === 'linear' || v.fill.kind === 'radial' ? v.fill.angle : 90, stops: v.fill.kind === 'linear' || v.fill.kind === 'radial' ? v.fill.stops : [{ offset: 0, color: base }, { offset: 1, color: colors.secondaryCss.startsWith('#') ? colors.secondaryCss : toHex(colors.secondary) }] };
		});
	}

	type FxKey = keyof Effects;
	function fx<K extends FxKey>(k: K, patch: Partial<Effects[K]>) {
		if (!l) return;
		edit(t('image.hist.effects'), () => Object.assign(l.effects[k], patch));
	}

	// Estilos rápidos (texto/forma 3D, neon, contorno, sombra longa, retrô).
	const PRESETS: { id: 'none' | 'classic3d' | 'neon' | 'outline' | 'longShadow' | 'retro' | 'soft'; make: () => Effects; fill?: Paint }[] = [
		{ id: 'none', make: defaultEffects },
		{ id: 'classic3d', make: () => ({ ...defaultEffects(), extrude: { on: true, depth: 14, angle: 50, color: '#8a1446', shade: 0.55 }, shadow: { on: true, color: '#000000', blur: 18, x: 10, y: 16, opacity: 0.55 } }) },
		{ id: 'neon', make: () => ({ ...defaultEffects(), glow: { on: true, color: '#ff2bd6', blur: 22, strength: 3 }, outline: { on: true, color: '#ffffff', width: 2 } }), fill: { kind: 'solid', color: '#ffe6fb' } },
		{ id: 'outline', make: () => ({ ...defaultEffects(), outline: { on: true, color: '#111111', width: 6 } }) },
		{ id: 'longShadow', make: () => ({ ...defaultEffects(), extrude: { on: true, depth: 60, angle: 45, color: '#2a0f22', shade: 0.1 } }) },
		{ id: 'retro', make: () => ({ ...defaultEffects(), outline: { on: true, color: '#1b1038', width: 5 }, extrude: { on: true, depth: 10, angle: 35, color: '#ff6a00', shade: 0.35 } }), fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffd800' }, { offset: 1, color: '#ff006e' }] } },
		{ id: 'soft', make: () => ({ ...defaultEffects(), shadow: { on: true, color: '#000000', blur: 24, x: 0, y: 12, opacity: 0.4 } }) }
	];

	function applyPreset(p: (typeof PRESETS)[number]) {
		if (!l) return;
		doc.history(t('image.hist.effects'), { layers: [] });
		l.effects = p.make();
		if (p.fill && l.vector) l.vector.fill = structuredClone(p.fill);
		doc.changed();
	}
</script>

{#if l}
	<section class="props" aria-label={t('image.panels.properties')}>
		{#if v?.type === 'text'}
			<h3>{t('image.props.text')}</h3>
			<textarea class="textarea" rows="3" value={v.text} onkeydown={(e) => e.stopPropagation()} oninput={(e) => edit(t('image.hist.editText'), () => (v.text = (e.target as HTMLTextAreaElement).value))}></textarea>
			<div class="row2">
				<select class="input" aria-label={t('image.opt.font')} value={v.font} onchange={(e) => edit(t('image.hist.font'), () => (v.font = (e.target as HTMLSelectElement).value))}>
					{#each FONTS as f (f)}<option value={f}>{fontLabel(f)}</option>{/each}
					{#if !FONTS.includes(v.font)}<option value={v.font}>{fontLabel(v.font)}</option>{/if}
				</select>
				<select class="input" aria-label={t('image.opt.weight')} value={v.weight} onchange={(e) => edit(t('image.hist.font'), () => (v.weight = +(e.target as HTMLSelectElement).value))}>
					{#each [300, 400, 500, 600, 700, 800, 900] as w (w)}<option value={w}>{w}</option>{/each}
				</select>
			</div>
			<Slider label={t('image.opt.fontSize')} value={v.size} min={4} max={800} unit="px" onchange={(n) => edit(t('image.hist.font'), () => (v.size = n))} />
			<Slider label={t('image.props.lineHeight')} value={v.lineHeight} min={0.6} max={3} step={0.05} onchange={(n) => edit(t('image.hist.font'), () => (v.lineHeight = n))} />
			<Slider label={t('image.props.letterSpacing')} value={v.letterSpacing} min={-20} max={80} unit="px" onchange={(n) => edit(t('image.hist.font'), () => (v.letterSpacing = n))} />
			<div class="row">
				<button class="btn icon" class:on={v.italic} aria-pressed={v.italic} aria-label={t('image.opt.italic')} title={t('image.opt.italic')} onclick={() => edit(t('image.hist.font'), () => (v.italic = !v.italic))}><Italic size={15} /></button>
				<div class="seg" role="radiogroup" aria-label={t('image.opt.align')}>
					{#each [['left', TextAlignStart], ['center', TextAlignCenter], ['right', TextAlignEnd]] as const as [a, Icon] (a)}
						<button role="radio" aria-checked={v.align === a} aria-label={t(`image.align.${a}`)} onclick={() => edit(t('image.hist.font'), () => (v.align = a))}><Icon size={15} /></button>
					{/each}
				</div>
			</div>
		{:else if v?.type === 'shape'}
			<h3>{t('image.props.shape')}</h3>
			<select class="input" aria-label={t('image.opt.shape')} value={v.shape} onchange={(e) => edit(t('image.hist.shape'), () => (v.shape = (e.target as HTMLSelectElement).value as typeof v.shape))}>
				{#each SHAPES as s (s)}<option value={s}>{t(`image.shapes.${s}`)}</option>{/each}
			</select>
			{#if v.shape === 'roundrect' || v.shape === 'speech'}
				<Slider label={t('image.opt.radius')} value={v.radius} min={0} max={400} unit="px" onchange={(n) => edit(t('image.hist.shape'), () => (v.radius = n))} />
			{/if}
			{#if v.shape === 'polygon' || v.shape === 'star'}
				<Slider label={t('image.opt.sides')} value={v.sides} min={3} max={24} onchange={(n) => edit(t('image.hist.shape'), () => (v.sides = n))} />
			{/if}
			{#if v.shape === 'star'}
				<Slider label={t('image.opt.inner')} value={v.inner} min={0.1} max={0.95} step={0.01} scale={100} unit="%" onchange={(n) => edit(t('image.hist.shape'), () => (v.inner = n))} />
			{/if}
		{/if}

		{#if v}
			<h3>{t('image.props.fill')}</h3>
			<div class="seg" role="radiogroup" aria-label={t('image.props.fill')}>
				{#each ['none', 'solid', 'linear', 'radial'] as const as k (k)}
					<button role="radio" aria-checked={v.fill.kind === k} onclick={() => setFillKind(k)}>{t(`image.paint.${k}`)}</button>
				{/each}
			</div>
			{#if v.fill.kind === 'solid'}
				{@const f = v.fill}
				<label class="crow"><span>{t('image.props.color')}</span><input type="color" value={hex7(f.color)} oninput={(e) => edit(t('image.hist.fill'), () => (f.color = (e.target as HTMLInputElement).value))} /></label>
			{:else if v.fill.kind === 'linear' || v.fill.kind === 'radial'}
				{@const f = v.fill}
				<div class="row">
					{#each f.stops as s, i (i)}
						<label class="crow"><span>{i === 0 ? t('image.props.from') : t('image.props.to')}</span><input type="color" value={hex7(s.color)} oninput={(e) => edit(t('image.hist.fill'), () => (s.color = (e.target as HTMLInputElement).value))} /></label>
					{/each}
				</div>
				{#if f.kind === 'linear'}
					<Slider label={t('image.props.angle')} value={f.angle} min={0} max={360} unit="°" onchange={(n) => edit(t('image.hist.fill'), () => (f.angle = n))} />
				{/if}
			{/if}
			<h3>{t('image.props.stroke')}</h3>
			<div class="row">
				<label class="check"><input type="checkbox" checked={!!v.stroke && v.strokeWidth > 0} onchange={(e) => edit(t('image.hist.stroke'), () => { const on = (e.target as HTMLInputElement).checked; v.stroke = on ? v.stroke || '#000000' : ''; if (on && !v.strokeWidth) v.strokeWidth = 4; })} />{t('image.props.enabled')}</label>
				{#if v.stroke}<input type="color" aria-label={t('image.props.color')} value={hex7(v.stroke)} oninput={(e) => edit(t('image.hist.stroke'), () => (v.stroke = (e.target as HTMLInputElement).value))} />{/if}
			</div>
			{#if v.stroke}
				<Slider label={t('image.opt.strokeWidth')} value={v.strokeWidth} min={0} max={100} unit="px" onchange={(n) => edit(t('image.hist.stroke'), () => (v.strokeWidth = n))} />
			{/if}
			<Slider label={t('image.props.rotation')} value={v.rotation} min={-180} max={180} unit="°" onchange={(n) => edit(t('image.hist.transform'), () => (v.rotation = n))} />
			<div class="row">
				<button class="btn" onclick={() => editor.rasterizeActive()}>{t('image.cmd.rasterize')}</button>
			</div>
		{/if}

		<h3><Sparkles size={14} />{t('image.props.quickStyles')}</h3>
		<div class="presets">
			{#each PRESETS as p (p.id)}
				<button class="preset" onclick={() => applyPreset(p)}>{t(`image.presets.${p.id}`)}</button>
			{/each}
		</div>

		<h3><Box size={14} />{t('image.props.effects')}</h3>
		<div class="fxbox" class:on={l.effects.extrude.on}>
			<label class="check fxhead"><input type="checkbox" checked={l.effects.extrude.on} onchange={(e) => fx('extrude', { on: (e.target as HTMLInputElement).checked })} />{t('image.fx.extrude')}</label>
			{#if l.effects.extrude.on}
			<Slider label={t('image.fx.depth')} value={l.effects.extrude.depth} min={1} max={200} unit="px" onchange={(n) => fx('extrude', { depth: n, on: true })} />
			<Slider label={t('image.props.angle')} value={l.effects.extrude.angle} min={0} max={360} unit="°" onchange={(n) => fx('extrude', { angle: n, on: true })} />
			<Slider label={t('image.fx.shade')} value={l.effects.extrude.shade} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(n) => fx('extrude', { shade: n, on: true })} />
			<label class="crow"><span>{t('image.props.color')}</span><input type="color" value={hex7(l.effects.extrude.color)} oninput={(e) => fx('extrude', { color: (e.target as HTMLInputElement).value, on: true })} /></label>
			{/if}
		</div>
		<div class="fxbox" class:on={l.effects.shadow.on}>
			<label class="check fxhead"><input type="checkbox" checked={l.effects.shadow.on} onchange={(e) => fx('shadow', { on: (e.target as HTMLInputElement).checked })} />{t('image.fx.shadow')}</label>
			{#if l.effects.shadow.on}
			<Slider label="X" value={l.effects.shadow.x} min={-200} max={200} unit="px" onchange={(n) => fx('shadow', { x: n, on: true })} />
			<Slider label="Y" value={l.effects.shadow.y} min={-200} max={200} unit="px" onchange={(n) => fx('shadow', { y: n, on: true })} />
			<Slider label={t('image.fx.blur')} value={l.effects.shadow.blur} min={0} max={100} unit="px" onchange={(n) => fx('shadow', { blur: n, on: true })} />
			<Slider label={t('image.opt.opacity')} value={l.effects.shadow.opacity} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(n) => fx('shadow', { opacity: n, on: true })} />
			<label class="crow"><span>{t('image.props.color')}</span><input type="color" value={hex7(l.effects.shadow.color)} oninput={(e) => fx('shadow', { color: (e.target as HTMLInputElement).value, on: true })} /></label>
			{/if}
		</div>
		<div class="fxbox" class:on={l.effects.glow.on}>
			<label class="check fxhead"><input type="checkbox" checked={l.effects.glow.on} onchange={(e) => fx('glow', { on: (e.target as HTMLInputElement).checked })} />{t('image.fx.glow')}</label>
			{#if l.effects.glow.on}
			<Slider label={t('image.fx.blur')} value={l.effects.glow.blur} min={1} max={100} unit="px" onchange={(n) => fx('glow', { blur: n, on: true })} />
			<Slider label={t('image.fx.strength')} value={l.effects.glow.strength} min={1} max={6} onchange={(n) => fx('glow', { strength: n, on: true })} />
			<label class="crow"><span>{t('image.props.color')}</span><input type="color" value={hex7(l.effects.glow.color)} oninput={(e) => fx('glow', { color: (e.target as HTMLInputElement).value, on: true })} /></label>
			{/if}
		</div>
		<div class="fxbox" class:on={l.effects.outline.on}>
			<label class="check fxhead"><input type="checkbox" checked={l.effects.outline.on} onchange={(e) => fx('outline', { on: (e.target as HTMLInputElement).checked })} />{t('image.fx.outline')}</label>
			{#if l.effects.outline.on}
			<Slider label={t('image.opt.strokeWidth')} value={l.effects.outline.width} min={1} max={60} unit="px" onchange={(n) => fx('outline', { width: n, on: true })} />
			<label class="crow"><span>{t('image.props.color')}</span><input type="color" value={hex7(l.effects.outline.color)} oninput={(e) => fx('outline', { color: (e.target as HTMLInputElement).value, on: true })} /></label>
			{/if}
		</div>
		{#if l.effects.shadow.on || l.effects.glow.on || l.effects.outline.on || l.effects.extrude.on}
			<button class="btn" onclick={() => editor.bakeEffects()}>{t('image.cmd.bakeEffects')}</button>
		{/if}
	</section>
{/if}

<style>
	.props { display: grid; gap: 10px; }
	h3 { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); margin-top: 4px; }
	.row, .row2 { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
	.row2 { display: grid; grid-template-columns: 1fr 80px; }
	.input { padding: 6px 8px; font-size: 0.84rem; }
	.textarea { min-height: 64px; font-family: var(--font); font-size: 0.9rem; }
	.crow { display: inline-flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--text-2); }
	input[type='color'] { width: 40px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer; }
	.btn.on { background: var(--accent-soft); border-color: rgb(221 32 107 / 0.5); }
	.seg button { display: inline-flex; align-items: center; }
	.fxbox { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; display: grid; gap: 8px; }
	.fxbox.on { background: rgb(0 0 0 / 0.12); border-color: rgb(221 32 107 / 0.35); }
	.fxhead { font-size: 0.86rem; color: var(--text); min-height: 28px; }
	.presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; }
	.preset { padding: 8px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-solid); font-size: 0.78rem; font-weight: 600; transition: border-color 0.15s, transform 0.1s; }
	.preset:hover { border-color: var(--accent); }
	.preset:active { transform: scale(0.97); }
</style>
