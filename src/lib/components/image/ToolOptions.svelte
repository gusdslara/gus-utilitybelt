<script lang="ts">
	import { editor } from '#lib/image/editor.svelte.ts';
	import { SHAPES, type SelectMode, type WandAlgo, type WandMetric } from '#lib/image/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import { FONTS, fontLabel } from './tools-meta.ts';
	import { Check, X, RotateCcw, Crosshair, Italic, TextAlignStart, TextAlignCenter, TextAlignEnd, Sparkles, Square, Combine, SquareMinus, SquaresIntersect } from '@lucide/svelte';

	const MODES: { id: SelectMode; icon: typeof Square }[] = [
		{ id: 'replace', icon: Square },
		{ id: 'add', icon: Combine },
		{ id: 'subtract', icon: SquareMinus },
		{ id: 'intersect', icon: SquaresIntersect }
	];
	const ALGOS: WandAlgo[] = ['flood', 'flood8', 'global', 'edge', 'cluster'];
	const METRICS: WandMetric[] = ['rgb', 'rgba', 'lab', 'hue', 'luma', 'max'];
	const ASPECTS = ['free', 'original', '1:1', '4:3', '3:2', '16:9', '9:16', '4:5'] as const;

	const isSelect = $derived(['select-rect', 'select-ellipse', 'select-lasso', 'wand'].includes(editor.tool));
</script>

{#snippet seg<T extends string>(items: readonly T[], value: T, set: (v: T) => void, label: (v: T) => string, aria: string)}
	<div class="seg" role="radiogroup" aria-label={aria}>
		{#each items as it (it)}
			<button type="button" role="radio" aria-checked={value === it} onclick={() => set(it)}>{label(it)}</button>
		{/each}
	</div>
{/snippet}

<div class="opts" aria-label={t('image.panels.options')}>
	<span class="tool-name">{t(`image.tools.${editor.tool}`)}</span>

	{#if isSelect}
		<div class="seg icons" role="radiogroup" aria-label={t('image.opt.selectMode')}>
			{#each MODES as m (m.id)}
				<button type="button" role="radio" aria-checked={editor.selectMode === m.id} title={t(`image.selMode.${m.id}`)} aria-label={t(`image.selMode.${m.id}`)} onclick={() => (editor.selectMode = m.id)}>
					<m.icon size={16} />
				</button>
			{/each}
		</div>
	{/if}

	{#if editor.tool === 'select-rect' || editor.tool === 'select-ellipse' || editor.tool === 'select-lasso'}
		<Slider compact label={t('image.opt.feather')} value={editor.selectFeather} min={0} max={100} unit="px" onchange={(v) => (editor.selectFeather = v)} />
		<label class="check"><input type="checkbox" bind:checked={editor.selectAntialias} />{t('image.opt.antialias')}</label>
	{:else if editor.tool === 'wand'}
		{@render seg(['classic', 'sam', 'subject'] as const, editor.wandEngine, (v) => { editor.wandEngine = v; editor.resetSam(); }, (v) => t(`image.wandEngine.${v}`), t('image.opt.engine'))}
		{#if editor.wandEngine === 'classic'}
			<label class="field-inline">{t('image.opt.algorithm')}
				<select class="input sm" bind:value={editor.wand.algo}>
					{#each ALGOS as a (a)}<option value={a}>{t(`image.wandAlgo.${a}`)}</option>{/each}
				</select>
			</label>
			{#if editor.wand.algo !== 'cluster'}
				<label class="field-inline">{t('image.opt.metric')}
					<select class="input sm" bind:value={editor.wand.metric}>
						{#each METRICS as m (m)}<option value={m}>{t(`image.wandMetric.${m}`)}</option>{/each}
					</select>
				</label>
				<Slider compact label={t('image.opt.tolerance')} value={editor.wand.tolerance} min={0} max={100} unit="%" onchange={(v) => (editor.wand.tolerance = v)} />
			{:else}
				<Slider compact label={t('image.opt.clusters')} value={editor.wand.clusters} min={2} max={16} onchange={(v) => (editor.wand.clusters = v)} />
				<label class="check"><input type="checkbox" bind:checked={editor.wand.contiguous} />{t('image.opt.contiguous')}</label>
			{/if}
			{#if editor.wand.algo === 'edge'}
				<Slider compact label={t('image.opt.edge')} value={editor.wand.edge} min={0} max={100} onchange={(v) => (editor.wand.edge = v)} />
			{/if}
			<label class="field-inline">{t('image.opt.sample')}
				<select class="input sm" bind:value={editor.wandSample}>
					<option value="layer">{t('image.opt.sampleLayer')}</option>
					<option value="image">{t('image.opt.sampleImage')}</option>
				</select>
			</label>
			<label class="check"><input type="checkbox" bind:checked={editor.wand.antialias} />{t('image.opt.antialias')}</label>
		{:else}
			<span class="ai-badge"><Sparkles size={14} />{t('image.opt.aiLocal')}</span>
			{#if editor.wandEngine === 'subject'}
				<label class="field-inline">{t('image.opt.model')}
					<select class="input sm" bind:value={editor.aiMatteModel}>
						<option value="modnet">{t('imageAi.models.modnet.title')}</option>
						<option value="rmbg">{t('imageAi.models.rmbg.title')}</option>
					</select>
				</label>
			{:else}
				<span class="hint">{t('imageAi.samHint')}</span>
				{#if editor.samPoints.length}
					<button class="btn sm" onclick={() => editor.resetSam()}><RotateCcw size={14} />{t('imageAi.resetPoints')}</button>
				{/if}
			{/if}
			<label class="field-inline">{t('imageAi.deviceLabel')}
				<select class="input sm" bind:value={editor.aiDevice}>
					{#each ['auto', 'webgpu', 'wasm'] as const as d (d)}<option value={d}>{t(`imageAi.devices.${d}`)}</option>{/each}
				</select>
			</label>
		{/if}
	{:else if editor.tool === 'brush'}
		<Slider compact label={t('image.opt.size')} value={editor.brush.size} min={1} max={500} unit="px" onchange={(v) => (editor.brush.size = v)} />
		<Slider compact label={t('image.opt.hardness')} value={editor.brush.hardness} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.brush.hardness = v)} />
		<Slider compact label={t('image.opt.opacity')} value={editor.brush.opacity} min={0.01} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.brush.opacity = v)} />
		<Slider compact label={t('image.opt.flow')} value={editor.brush.flow} min={0.01} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.brush.flow = v)} />
		<Slider compact label={t('image.opt.smoothing')} value={editor.brush.smoothing} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.brush.smoothing = v)} />
		<label class="check"><input type="checkbox" bind:checked={editor.brush.pressure} />{t('image.opt.pressure')}</label>
	{:else if editor.tool === 'eraser'}
		<Slider compact label={t('image.opt.size')} value={editor.eraser.size} min={1} max={500} unit="px" onchange={(v) => (editor.eraser.size = v)} />
		<Slider compact label={t('image.opt.hardness')} value={editor.eraser.hardness} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.eraser.hardness = v)} />
		<Slider compact label={t('image.opt.opacity')} value={editor.eraser.opacity} min={0.01} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.eraser.opacity = v)} />
	{:else if editor.tool === 'clone'}
		<button class="btn sm" class:primary={editor.cloneSetting} aria-pressed={editor.cloneSetting} onclick={() => (editor.cloneSetting = !editor.cloneSetting)}><Crosshair size={14} />{t('image.opt.setSource')}</button>
		<Slider compact label={t('image.opt.size')} value={editor.cloneOpts.size} min={1} max={500} unit="px" onchange={(v) => (editor.cloneOpts.size = v)} />
		<Slider compact label={t('image.opt.hardness')} value={editor.cloneOpts.hardness} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.cloneOpts.hardness = v)} />
		<Slider compact label={t('image.opt.opacity')} value={editor.cloneOpts.opacity} min={0.01} max={1} step={0.01} scale={100} unit="%" onchange={(v) => (editor.cloneOpts.opacity = v)} />
		<label class="check"><input type="checkbox" bind:checked={editor.cloneOpts.sampleAll} />{t('image.opt.sampleImage')}</label>
	{:else if editor.tool === 'fill'}
		<Slider compact label={t('image.opt.tolerance')} value={editor.fillOpts.tolerance} min={0} max={100} unit="%" onchange={(v) => (editor.fillOpts.tolerance = v)} />
		<label class="check"><input type="checkbox" bind:checked={editor.fillOpts.contiguous} />{t('image.opt.contiguous')}</label>
		<label class="check"><input type="checkbox" bind:checked={editor.fillOpts.sampleAll} />{t('image.opt.sampleImage')}</label>
		<label class="check"><input type="checkbox" bind:checked={editor.fillOpts.antialias} />{t('image.opt.antialias')}</label>
	{:else if editor.tool === 'gradient'}
		{@render seg(['linear', 'radial', 'conic', 'reflected'] as const, editor.gradient.type, (v) => (editor.gradient.type = v), (v) => t(`image.gradient.${v}`), t('image.opt.type'))}
		<label class="check"><input type="checkbox" bind:checked={editor.gradient.toTransparent} />{t('image.opt.toTransparent')}</label>
		<label class="check"><input type="checkbox" bind:checked={editor.gradient.reverse} />{t('image.opt.reverse')}</label>
	{:else if editor.tool === 'picker'}
		<label class="field-inline">{t('image.opt.sample')}
			<select class="input sm" bind:value={editor.pickerSample}>
				<option value="layer">{t('image.opt.sampleLayer')}</option>
				<option value="image">{t('image.opt.sampleImage')}</option>
			</select>
		</label>
		<label class="field-inline">{t('image.opt.sampleSize')}
			<select class="input sm" bind:value={editor.pickerSize}>
				{#each [1, 3, 5, 9, 15] as s (s)}<option value={s}>{s}×{s}</option>{/each}
			</select>
		</label>
	{:else if editor.tool === 'shape'}
		<label class="field-inline">{t('image.opt.shape')}
			<select class="input sm" bind:value={editor.shape.kind}>
				{#each SHAPES as s (s)}<option value={s}>{t(`image.shapes.${s}`)}</option>{/each}
			</select>
		</label>
		{#if editor.shape.kind !== 'line' && editor.shape.kind !== 'arrow'}
			{@render seg(['fill', 'stroke', 'both'] as const, editor.shape.mode, (v) => (editor.shape.mode = v), (v) => t(`image.shapeMode.${v}`), t('image.opt.style'))}
		{/if}
		<Slider compact label={t('image.opt.strokeWidth')} value={editor.shape.strokeWidth} min={1} max={100} unit="px" onchange={(v) => (editor.shape.strokeWidth = v)} />
		{#if editor.shape.kind === 'roundrect' || editor.shape.kind === 'speech'}
			<Slider compact label={t('image.opt.radius')} value={editor.shape.radius} min={0} max={300} unit="px" onchange={(v) => (editor.shape.radius = v)} />
		{/if}
		{#if editor.shape.kind === 'polygon' || editor.shape.kind === 'star'}
			<Slider compact label={t('image.opt.sides')} value={editor.shape.sides} min={3} max={24} onchange={(v) => (editor.shape.sides = v)} />
		{/if}
		{#if editor.shape.kind === 'star'}
			<Slider compact label={t('image.opt.inner')} value={editor.shape.inner} min={0.1} max={0.95} step={0.01} scale={100} unit="%" onchange={(v) => (editor.shape.inner = v)} />
		{/if}
		<label class="check"><input type="checkbox" bind:checked={editor.shape.dash} />{t('image.opt.dash')}</label>
	{:else if editor.tool === 'text'}
		<label class="field-inline">{t('image.opt.font')}
			<select class="input sm" bind:value={editor.text.font}>
				{#each FONTS as f (f)}<option value={f} style:font-family={f}>{fontLabel(f)}</option>{/each}
			</select>
		</label>
		<Slider compact label={t('image.opt.fontSize')} value={editor.text.size} min={6} max={600} unit="px" onchange={(v) => (editor.text.size = v)} />
		<label class="field-inline">{t('image.opt.weight')}
			<select class="input sm" bind:value={editor.text.weight}>
				{#each [300, 400, 500, 600, 700, 800, 900] as w (w)}<option value={w}>{w}</option>{/each}
			</select>
		</label>
		<button class="btn icon sm" aria-pressed={editor.text.italic} class:on={editor.text.italic} title={t('image.opt.italic')} aria-label={t('image.opt.italic')} onclick={() => (editor.text.italic = !editor.text.italic)}><Italic size={15} /></button>
		<div class="seg icons" role="radiogroup" aria-label={t('image.opt.align')}>
			{#each [['left', TextAlignStart], ['center', TextAlignCenter], ['right', TextAlignEnd]] as const as [a, Icon] (a)}
				<button type="button" role="radio" aria-checked={editor.text.align === a} aria-label={t(`image.align.${a}`)} title={t(`image.align.${a}`)} onclick={() => (editor.text.align = a)}><Icon size={15} /></button>
			{/each}
		</div>
		<span class="hint">{t('image.toolHints.text')}</span>
	{:else if editor.tool === 'crop'}
		{@render seg(ASPECTS, editor.cropAspect, (v) => (editor.cropAspect = v), (v) => (v === 'free' || v === 'original' ? t(`image.aspect.${v}`) : v), t('image.opt.aspect'))}
		<button class="btn sm primary" onclick={() => editor.applyCrop()}><Check size={14} />{t('image.opt.applyCrop')}</button>
		<button class="btn sm ghost" onclick={() => editor.setTool('move')}><X size={14} />{t('common.cancel')}</button>
	{:else if editor.tool === 'move'}
		{@render seg(['pixels', 'selection'] as const, editor.moveMode, (v) => (editor.moveMode = v), (v) => t(`image.moveMode.${v}`), t('image.opt.moveMode'))}
		<span class="hint">{t('image.toolHints.move')}</span>
	{:else}
		<span class="hint">{t(`image.toolHints.${editor.tool === 'hand' ? 'hand' : 'zoom'}`)}</span>
	{/if}

	{#if editor.hasFloating}
		<span class="spacer"></span>
		<button class="btn sm primary" onclick={() => editor.commitFloating()}><Check size={14} />{t('image.opt.commit')}</button>
		<button class="btn sm ghost" onclick={() => editor.cancelFloating()}><X size={14} />{t('common.cancel')}</button>
	{/if}
</div>

<style>
	.opts { display: flex; align-items: center; gap: 12px; padding: 6px 12px; min-height: 46px; overflow-x: auto; scrollbar-width: thin; white-space: nowrap; }
	.opts > :global(*) { flex-shrink: 0; }
	.tool-name { font-weight: 650; font-size: 0.82rem; color: var(--text); padding-right: 4px; border-right: 1px solid var(--border); margin-right: 2px; padding: 0 12px 0 0; }
	.seg.icons button { display: inline-grid; place-items: center; padding: 5px 7px; }
	.field-inline { display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text-2); }
	.input.sm { padding: 4px 8px; font-size: 0.8rem; width: auto; max-width: 180px; }
	.btn.sm { padding: 5px 10px; font-size: 0.8rem; }
	.btn.icon.sm { padding: 5px; }
	.btn.on { background: var(--accent-soft); color: var(--text); border-color: rgb(221 32 107 / 0.5); }
	.check { font-size: 0.8rem; }
	.hint { font-size: 0.76rem; color: var(--text-3); }
	.ai-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.74rem; padding: 3px 8px; border-radius: 99px; background: rgb(124 92 255 / 0.18); color: #c9bcff; border: 1px solid rgb(124 92 255 / 0.4); }
	.spacer { flex: 1; }
	@media (pointer: coarse) {
		.opts { gap: 14px; min-height: 52px; scrollbar-width: none; }
		.seg button { min-height: 36px; }
		.btn.sm { min-height: 38px; }
	}
</style>
