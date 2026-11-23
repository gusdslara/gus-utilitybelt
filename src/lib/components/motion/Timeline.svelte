<script lang="ts">
	// Linha do tempo: régua com playhead, uma faixa por camada (barra de entrada/saída arrastável)
	// e faixas das propriedades animadas com keyframes (losangos) arrastáveis.
	import { studio, getAt, type KeyRef } from '#lib/motion/studio.svelte.ts';
	import { layerProps, isAnimated } from '#lib/motion/scene.ts';
	import type { MotionLayer, Prop } from '#lib/motion/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import { ChevronRight, Eye, EyeOff, Type, Shapes, Image as ImageIcon, ZoomIn, ZoomOut } from '@lucide/svelte';

	let scroller: HTMLDivElement | undefined = $state();
	let width = $state(600);
	let zoom = $state(1); // 1 = cabe na largura
	let expanded = $state<Record<string, boolean>>({});

	const frames = $derived(studio.scene.frames);
	const ppf = $derived(Math.max(2, ((width - 24) / Math.max(1, frames)) * zoom));
	const x = (f: number) => 12 + f * ppf;
	const fps = $derived(studio.scene.fps);

	// Marcas da régua: a cada 1 s (ou 0,5 s / 5 s conforme o zoom).
	const ticks = $derived.by(() => {
		const stepSec = ppf * fps > 160 ? 0.5 : ppf * fps < 30 ? 5 : ppf * fps < 60 ? 2 : 1;
		const out: { f: number; label: string }[] = [];
		for (let s = 0; s * fps <= frames; s += stepSec) out.push({ f: Math.round(s * fps), label: `${+s.toFixed(1)}s` });
		return out;
	});

	function frameAt(clientX: number) {
		const r = scroller!.getBoundingClientRect();
		return Math.round((clientX - r.left + scroller!.scrollLeft - 12) / ppf);
	}

	function drag(e: PointerEvent, onMove: (f: number, start: number) => void, onEnd?: () => void) {
		e.preventDefault();
		e.stopPropagation();
		const el = e.currentTarget as HTMLElement;
		el.setPointerCapture(e.pointerId);
		const start = frameAt(e.clientX);
		const move = (ev: PointerEvent) => onMove(frameAt(ev.clientX), start);
		const up = () => {
			el.removeEventListener('pointermove', move);
			el.removeEventListener('pointerup', up);
			el.removeEventListener('pointercancel', up);
			onEnd?.();
		};
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerup', up);
		el.addEventListener('pointercancel', up);
	}

	function scrub(e: PointerEvent) {
		studio.pause();
		studio.seek(frameAt(e.clientX));
		drag(e, (f) => studio.seek(f));
	}

	function keyDown(e: PointerEvent, ref: KeyRef) {
		studio.pause();
		studio.selectedId = ref.layerId;
		studio.selectedKey = ref;
		studio.seek(ref.t);
		let cur = ref;
		drag(e, (f) => {
			const to = Math.max(0, Math.min(frames - 1, f));
			if (to !== cur.t) {
				studio.moveKey(cur, to);
				cur = { ...cur, t: to };
				studio.seek(to);
			}
		});
	}

	function barDown(e: PointerEvent, l: MotionLayer, edge: 'start' | 'end' | 'move') {
		studio.selectedId = l.id;
		const s0 = l.start, e0 = l.end;
		drag(e, (f, start) => {
			const d = f - start;
			studio.edit('timing', (layer) => {
				if (edge === 'start') layer.start = Math.max(0, Math.min(e0 - 1, s0 + d));
				else if (edge === 'end') layer.end = Math.max(s0 + 1, Math.min(frames, e0 + d));
				else {
					const dd = Math.max(-s0, Math.min(frames - e0, d)) - (layer.start - s0);
					if (!dd) return;
					layer.start += dd;
					layer.end += dd;
					// Leva os keyframes junto.
					for (const p of layerProps(layer)) for (const k of p.prop.keys) k.t += dd;
				}
			}, l.id);
		});
	}

	const allKeys = (l: MotionLayer) => {
		const set = new Set<number>();
		for (const p of layerProps(l)) for (const k of p.prop.keys) set.add(k.t);
		return [...set].sort((a, b) => a - b);
	};

	// 'transform.position' → 'position', 'fill.color' → 'fillColor', 'trim.end' → 'trimEnd'.
	const propKey = (path: string) => {
		const [a, b] = path.split('.');
		const key = !b ? a : a === 'transform' ? b : a + b[0].toUpperCase() + b.slice(1);
		return t(`motion.props.${key}` as Parameters<typeof t>[0]);
	};
	const icon = (l: MotionLayer) => (l.kind === 'text' ? Type : l.kind === 'image' ? ImageIcon : Shapes);
	const isSelKey = (layerId: string, path: string, tt: number) => studio.selectedKey?.layerId === layerId && studio.selectedKey.path === path && studio.selectedKey.t === tt;
</script>

<section class="tl" aria-label={t('motion.timeline')}>
	<div class="names">
		<div class="corner">
			<button class="btn icon ghost sm" aria-label={t('motion.zoomOut')} onclick={() => (zoom = Math.max(1, zoom / 1.5))}><ZoomOut size={14} /></button>
			<button class="btn icon ghost sm" aria-label={t('motion.zoomIn')} onclick={() => (zoom = Math.min(20, zoom * 1.5))}><ZoomIn size={14} /></button>
		</div>
		{#each studio.scene.layers as l (l.id)}
			{@const Icon = icon(l)}
			<div class="name" class:sel={studio.selectedId === l.id}>
				<button class="exp" class:open={expanded[l.id]} aria-label={t('motion.expand')} aria-expanded={!!expanded[l.id]} onclick={() => (expanded[l.id] = !expanded[l.id])}><ChevronRight size={14} /></button>
				<button class="nm" onclick={() => (studio.selectedId = l.id)}><Icon size={13} /><span>{l.name}</span></button>
				<button class="eye" aria-label={l.visible ? t('motion.hide') : t('motion.show')} onclick={() => studio.edit('visible', (x) => (x.visible = !x.visible), l.id)}>
					{#if l.visible}<Eye size={13} />{:else}<EyeOff size={13} />{/if}
				</button>
			</div>
			{#if expanded[l.id]}
				{#each layerProps(l) as p (p.path)}
					{#if isAnimated(p.prop) || p.path.startsWith('transform.')}
						<div class="name prop"><span>{propKey(p.path)}</span></div>
					{/if}
				{/each}
			{/if}
		{/each}
	</div>

	<div class="tracks" bind:this={scroller} bind:clientWidth={width}>
		<div class="inner" style:width="{x(frames) + 12}px">
			<div class="ruler" role="slider" tabindex="0" aria-label={t('motion.playhead')} aria-valuenow={Math.round(studio.frame)} aria-valuemin={0} aria-valuemax={frames} onpointerdown={scrub}
				onkeydown={(e) => { if (e.key === 'ArrowRight') studio.seek(Math.round(studio.frame) + 1); if (e.key === 'ArrowLeft') studio.seek(Math.round(studio.frame) - 1); }}>
				{#each ticks as tk (tk.f)}
					<span class="tick" style:left="{x(tk.f)}px">{tk.label}</span>
				{/each}
			</div>
			{#each studio.scene.layers as l (l.id)}
				<div class="row" class:sel={studio.selectedId === l.id} class:hidden={!l.visible}>
					<div class="bar" style:left="{x(l.start)}px" style:width="{Math.max(4, (l.end - l.start) * ppf)}px" onpointerdown={(e) => barDown(e, l, 'move')} role="presentation">
						<span class="edge l" onpointerdown={(e) => barDown(e, l, 'start')} role="presentation"></span>
						<span class="edge r" onpointerdown={(e) => barDown(e, l, 'end')} role="presentation"></span>
					</div>
					{#each allKeys(l) as kt (kt)}
						<span class="dia ghost" style:left="{x(kt)}px"></span>
					{/each}
				</div>
				{#if expanded[l.id]}
					{#each layerProps(l) as p (p.path)}
						{#if isAnimated(p.prop) || p.path.startsWith('transform.')}
							<div class="row prop">
								{#each (getAt(l, p.path) as Prop<unknown>).keys as k (k.t)}
									<button
										class="dia"
										class:on={isSelKey(l.id, p.path, k.t)}
										style:left="{x(k.t)}px"
										aria-label={`${propKey(p.path)} @ ${k.t}`}
										onpointerdown={(e) => keyDown(e, { layerId: l.id, path: p.path, t: k.t })}
									></button>
								{/each}
							</div>
						{/if}
					{/each}
				{/if}
			{/each}
			<div class="head" style:left="{x(studio.frame)}px" aria-hidden="true"></div>
		</div>
	</div>
</section>

<style>
	.tl { display: grid; grid-template-columns: 190px 1fr; min-height: 0; height: 100%; font-size: 0.76rem; border-top: 1px solid var(--border); background: rgb(0 0 0 / 0.18); overflow: auto; }
	.names { border-right: 1px solid var(--border); }
	.corner { height: 28px; display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 0 4px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface-solid); z-index: 2; }
	.btn.sm { padding: 3px; }
	.name { height: 30px; display: flex; align-items: center; gap: 2px; padding: 0 4px; border-bottom: 1px solid rgb(255 255 255 / 0.04); }
	.name.sel { background: var(--accent-soft); }
	.name.prop { padding-left: 30px; color: var(--text-3); height: 24px; }
	.exp, .eye, .nm { border: 0; background: none; color: var(--text-2); display: inline-flex; align-items: center; padding: 4px; border-radius: 5px; }
	.exp :global(svg) { transition: transform 0.15s; }
	.exp.open :global(svg) { transform: rotate(90deg); }
	.nm { flex: 1; gap: 6px; min-width: 0; color: var(--text); text-align: left; }
	.nm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tracks { overflow-x: auto; overflow-y: visible; position: relative; }
	.inner { position: relative; min-height: 100%; }
	.ruler { position: sticky; top: 0; height: 28px; border-bottom: 1px solid var(--border); background: var(--surface-solid); cursor: ew-resize; z-index: 2; touch-action: none; }
	.tick { position: absolute; top: 0; height: 100%; padding-left: 4px; border-left: 1px solid var(--border); color: var(--text-3); font-size: 0.66rem; line-height: 28px; font-variant-numeric: tabular-nums; }
	.row { position: relative; height: 30px; border-bottom: 1px solid rgb(255 255 255 / 0.04); }
	.row.prop { height: 24px; }
	.row.sel { background: rgb(221 32 107 / 0.06); }
	.row.hidden .bar { opacity: 0.35; }
	.bar { position: absolute; top: 7px; height: 16px; border-radius: 6px; background: linear-gradient(180deg, rgb(124 92 255 / 0.55), rgb(124 92 255 / 0.35)); border: 1px solid rgb(124 92 255 / 0.8); cursor: grab; touch-action: none; }
	.row.sel .bar { background: linear-gradient(180deg, rgb(221 32 107 / 0.6), rgb(221 32 107 / 0.35)); border-color: var(--accent); }
	.edge { position: absolute; top: -2px; bottom: -2px; width: 10px; cursor: ew-resize; }
	.edge.l { left: -5px; }
	.edge.r { right: -5px; }
	.dia { position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; transform: rotate(45deg); border-radius: 2px; border: 1px solid #fff; background: var(--warn); padding: 0; cursor: grab; touch-action: none; }
	.dia.ghost { pointer-events: none; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; background: #fff; opacity: 0.75; border: 0; }
	.dia.on { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
	.head { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--accent); pointer-events: none; z-index: 3; }
	.head::before { content: ''; position: absolute; top: 0; left: -5px; border: 6px solid transparent; border-top-color: var(--accent); }
	@media (max-width: 720px) { .tl { grid-template-columns: 120px 1fr; } .name.prop { padding-left: 12px; } }
	@media (pointer: coarse) { .dia { width: 16px; height: 16px; margin: -8px 0 0 -8px; } .edge { width: 18px; } .edge.l { left: -9px; } .edge.r { right: -9px; } }
</style>
