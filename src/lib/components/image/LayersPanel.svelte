<script lang="ts">
	import { doc, type Layer } from '#lib/image/doc.svelte.ts';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { BLEND_MODES } from '#lib/image/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import Slider from './Slider.svelte';
	import { Eye, EyeOff, Lock, LockOpen, LayersPlus, CopyPlus, Trash, ArrowUp, ArrowDown, Merge, Type, Shapes, Sparkles } from '@lucide/svelte';

	// Lista do topo para a base (como em todo editor).
	const list = $derived([...doc.layers].reverse());
	const active = $derived(doc.active);
	let renaming = $state<string | null>(null);

	function thumb(node: HTMLCanvasElement, l: Layer) {
		const draw = () => {
			const src = l.output();
			const s = 44;
			const k = Math.min(s / src.width, s / src.height);
			node.width = Math.max(1, Math.round(src.width * k));
			node.height = Math.max(1, Math.round(src.height * k));
			const c = node.getContext('2d')!;
			c.clearRect(0, 0, node.width, node.height);
			c.imageSmoothingQuality = 'high';
			c.drawImage(src, 0, 0, node.width, node.height);
		};
		$effect(() => {
			void l.rev;
			JSON.stringify(l.vector);
			JSON.stringify(l.effects);
			void doc.width;
			void doc.height;
			const id = requestAnimationFrame(draw);
			return () => cancelAnimationFrame(id);
		});
	}

	function select(l: Layer) {
		if (l.id === doc.activeId) return;
		editor.commitFloating();
		editor.finishText();
		doc.activeId = l.id;
	}

	function toggle(l: Layer, key: 'visible' | 'locked') {
		doc.history(t(key === 'visible' ? 'image.hist.visibility' : 'image.hist.lock'), { layers: [] });
		l[key] = !l[key];
		doc.changed();
	}

	function rename(l: Layer, name: string) {
		renaming = null;
		const n = name.trim();
		if (!n || n === l.name) return;
		doc.history(t('image.hist.rename'), { layers: [] });
		l.name = n;
	}

	const move = (dir: 1 | -1) => {
		const l = active;
		if (!l) return;
		editor.commitFloating();
		doc.moveLayer(l.id, doc.layers.indexOf(l) + dir);
	};
</script>

<section class="layers" aria-label={t('image.panels.layers')}>
	{#if active}
		<div class="props">
			<Slider label={t('image.opt.opacity')} value={active.opacity} min={0} max={1} step={0.01} scale={100} unit="%" onchange={(v) => { editor.propsHistory(t('image.hist.opacity')); active.opacity = v; doc.changed(); }} />
			<label class="blend">
				<span>{t('image.layer.blend')}</span>
				<select class="input" value={active.blend} onchange={(e) => { doc.history(t('image.hist.blend'), { layers: [] }); active.blend = (e.target as HTMLSelectElement).value as typeof active.blend; doc.changed(); }}>
					{#each BLEND_MODES as b (b)}<option value={b}>{t(`image.blends.${b}`)}</option>{/each}
				</select>
			</label>
		</div>
	{/if}

	<ul class="list" role="listbox" aria-label={t('image.panels.layers')}>
		{#each list as l (l.id)}
			<li
				class="layer"
				class:active={l.id === doc.activeId}
				class:hidden={!l.visible}
				role="option"
				aria-selected={l.id === doc.activeId}
				tabindex="0"
				onclick={() => select(l)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(l))}
				ondblclick={() => (renaming = l.id)}
			>
				<button class="ic" aria-label={l.visible ? t('image.layer.hide') : t('image.layer.show')} title={l.visible ? t('image.layer.hide') : t('image.layer.show')} onclick={(e) => { e.stopPropagation(); toggle(l, 'visible'); }}>
					{#if l.visible}<Eye size={16} />{:else}<EyeOff size={16} />{/if}
				</button>
				<span class="thumb"><canvas use:thumb={l}></canvas></span>
				<span class="name">
					{#if renaming === l.id}
						<!-- svelte-ignore a11y_autofocus -->
						<input class="input rename" value={l.name} autofocus onclick={(e) => e.stopPropagation()} onblur={(e) => rename(l, (e.target as HTMLInputElement).value)} onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') rename(l, (e.target as HTMLInputElement).value); if (e.key === 'Escape') renaming = null; }} />
					{:else}
						<span class="label">{l.name}</span>
						<span class="meta">
							{#if l.vector?.type === 'text'}<Type size={11} />{:else if l.vector}<Shapes size={11} />{/if}
							{#if l.effects.shadow.on || l.effects.glow.on || l.effects.outline.on || l.effects.extrude.on}<Sparkles size={11} />{/if}
							{#if l.opacity < 1}{Math.round(l.opacity * 100)}%{/if}
							{#if l.blend !== 'source-over'}{t(`image.blends.${l.blend}`)}{/if}
						</span>
					{/if}
				</span>
				<button class="ic" class:on={l.locked} aria-label={l.locked ? t('image.layer.unlock') : t('image.layer.lock')} title={l.locked ? t('image.layer.unlock') : t('image.layer.lock')} onclick={(e) => { e.stopPropagation(); toggle(l, 'locked'); }}>
					{#if l.locked}<Lock size={14} />{:else}<LockOpen size={14} />{/if}
				</button>
			</li>
		{/each}
	</ul>

	<div class="bar">
		<button class="btn icon ghost" title={t('image.cmd.addLayer')} aria-label={t('image.cmd.addLayer')} onclick={() => editor.addLayer()}><LayersPlus size={17} /></button>
		<button class="btn icon ghost" title={t('image.cmd.duplicateLayer')} aria-label={t('image.cmd.duplicateLayer')} onclick={() => { editor.commitFloating(); doc.duplicateLayer(); }}><CopyPlus size={17} /></button>
		<button class="btn icon ghost" title={t('image.cmd.deleteLayer')} aria-label={t('image.cmd.deleteLayer')} disabled={doc.layers.length < 2} onclick={() => { editor.commitFloating(); doc.removeLayer(); }}><Trash size={17} /></button>
		<button class="btn icon ghost" title={t('image.cmd.mergeDown')} aria-label={t('image.cmd.mergeDown')} disabled={!active || doc.layers.indexOf(active) < 1} onclick={() => { editor.commitFloating(); doc.mergeDown(); }}><Merge size={17} /></button>
		<span class="sp"></span>
		<button class="btn icon ghost" title={t('image.cmd.layerUp')} aria-label={t('image.cmd.layerUp')} disabled={!active || doc.layers.indexOf(active) >= doc.layers.length - 1} onclick={() => move(1)}><ArrowUp size={17} /></button>
		<button class="btn icon ghost" title={t('image.cmd.layerDown')} aria-label={t('image.cmd.layerDown')} disabled={!active || doc.layers.indexOf(active) < 1} onclick={() => move(-1)}><ArrowDown size={17} /></button>
	</div>
</section>

<style>
	.layers { display: flex; flex-direction: column; min-height: 0; gap: 8px; }
	.props { display: grid; gap: 8px; }
	.blend { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; font-size: 0.76rem; color: var(--text-2); }
	.blend .input { padding: 5px 8px; font-size: 0.82rem; }
	.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; overflow: auto; min-height: 60px; flex: 1; align-content: start; }
	.layer {
		display: grid; grid-template-columns: 30px 48px 1fr 30px; align-items: center; gap: 6px; padding: 4px;
		border-radius: var(--radius-sm); border: 1px solid transparent; cursor: pointer; transition: background 0.12s, border-color 0.12s;
	}
	.layer:hover { background: rgb(255 255 255 / 0.04); }
	.layer.active { background: var(--accent-soft); border-color: rgb(221 32 107 / 0.45); }
	.layer.hidden .thumb, .layer.hidden .name { opacity: 0.45; }
	.ic { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--text-2); }
	.ic:hover { background: var(--surface-3); color: var(--text); }
	.ic.on { color: var(--warn); }
	.thumb {
		width: 48px; height: 48px; display: grid; place-items: center; border-radius: 6px; overflow: hidden;
		background: repeating-conic-gradient(#cfd3da 0 25%, #fff 0 50%) 0 0 / 10px 10px; box-shadow: inset 0 0 0 1px var(--border);
	}
	.thumb canvas { max-width: 44px; max-height: 44px; display: block; }
	.name { display: grid; min-width: 0; }
	.label { font-size: 0.84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.meta { display: flex; gap: 4px; align-items: center; font-size: 0.68rem; color: var(--text-3); min-height: 12px; }
	.rename { padding: 3px 6px; font-size: 0.82rem; }
	.bar { display: flex; gap: 2px; border-top: 1px solid var(--border); padding-top: 6px; }
	.sp { flex: 1; }
	@media (pointer: coarse) { .ic { width: 40px; height: 40px; } .layer { grid-template-columns: 40px 48px 1fr 40px; } .bar .btn { min-width: 44px; min-height: 44px; } }
</style>
