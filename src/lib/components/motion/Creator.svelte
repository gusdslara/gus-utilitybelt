<script lang="ts">
	// Modo Criar do app Motion: palco (Lottie gerado da cena, com alças para mover/escalar/girar),
	// painel de propriedades com keyframes (◆), presets de animação em um clique, cena e linha do tempo.
	import { onMount } from 'svelte';
	import { studio, type KeyRef } from '#lib/motion/studio.svelte.ts';
	import { evalProp, hasKey, layerBounds, svgToPaths, newScene } from '#lib/motion/scene.ts';
	import { toLottie } from '#lib/motion/to-lottie.ts';
	import { PRESETS, TEMPLATES } from '#lib/motion/presets.ts';
	import { EASINGS } from '#lib/motion/easing.ts';
	import type { Easing, LottieJSON, MotionLayer, Prop, PresetGroup, Vec2, ShapeLayer, TextLayer } from '#lib/motion/types.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import LottiePlayer from './LottiePlayer.svelte';
	import Timeline from './Timeline.svelte';
	import Slider from '../image/Slider.svelte';
	import {
		Play, Pause, SkipBack, Repeat, Type, Square, Circle, Star, Hexagon, FileCode2, ImagePlus, Undo2, Redo2, Trash, CopyPlus, ArrowUp, ArrowDown,
		Diamond, Download, Sparkles, Settings2, SlidersHorizontal, Eraser, LayoutTemplate, FilePlus
	} from '@lucide/svelte';

	let { onexport }: { onexport: (json: LottieJSON, name: string) => void } = $props();

	let layout = $state({ scale: 1, x: 0, y: 0, w: 0, h: 0 });
	let tab = $state<'props' | 'anim' | 'scene'>('props');
	let presetDur = $state(0.6);
	let svgInput: HTMLInputElement | undefined = $state();
	let imgInput: HTMLInputElement | undefined = $state();
	let stageEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		studio.load();
	});

	// Lottie compilado da cena: recompila no próximo frame de animação (agrupa várias edições seguidas).
	let compiled = $state.raw<LottieJSON | null>(null);
	let pending = 0;
	$effect(() => {
		void studio.rev;
		const scene = $state.snapshot(studio.scene);
		cancelAnimationFrame(pending);
		pending = requestAnimationFrame(() => {
			try {
				compiled = toLottie(scene as typeof studio.scene);
			} catch (e) {
				console.error(e);
			}
		});
	});

	const sel = $derived(studio.selected);
	const f = $derived(Math.round(studio.frame));
	const time = (fr: number) => `${(fr / studio.scene.fps).toFixed(2)}s`;

	// ----- Adicionar camadas -----

	function addShape(shape: ShapeLayer['shape']) {
		studio.addLayer('shape', { shape, name: t(`motion.shapes.${shape}` as Parameters<typeof t>[0]) });
	}

	async function importSvg(file: File) {
		try {
			// Escala para ~60% do menor lado da cena (o traço escala junto).
			const r = svgToPaths(await file.text(), { size: Math.round(Math.min(studio.scene.width, studio.scene.height) * 0.6) });
			if (!r.paths.length) throw new Error('no paths');
			const l = studio.addLayer('shape', { shape: 'path', name: file.name.replace(/\.svg$/i, ''), paths: r.paths }) as ShapeLayer;
			const hex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
			l.fill.on = r.fill !== 'none';
			if (hex(r.fill)) l.fill.color.value = hex(r.fill)!;
			if (r.stroke && r.stroke !== 'none') {
				l.stroke.on = true;
				l.stroke.color.value = hex(r.stroke) ?? '#ffffff';
				if (r.strokeWidth) l.stroke.width.value = r.strokeWidth;
			}
			studio.changed();
		} catch {
			alert(t('motion.svgFailed'));
		}
	}

	async function importImage(file: File) {
		const src = await new Promise<string>((res, rej) => {
			const fr = new FileReader();
			fr.onload = () => res(fr.result as string);
			fr.onerror = rej;
			fr.readAsDataURL(file);
		});
		const bmp = await createImageBitmap(file);
		const k = Math.min(1, (Math.min(studio.scene.width, studio.scene.height) * 0.8) / Math.max(bmp.width, bmp.height));
		studio.addLayer('image', { src, width: Math.round(bmp.width * k), height: Math.round(bmp.height * k), name: file.name.replace(/\.\w+$/, '') });
		bmp.close();
	}

	// ----- Palco: selecionar e arrastar -----

	function hit(px: number, py: number): MotionLayer | undefined {
		for (const l of studio.scene.layers) {
			if (!l.visible || l.locked || f < l.start || f >= l.end) continue;
			const b = layerBounds(l, f);
			const a = (-b.rotation * Math.PI) / 180;
			const dx = px - b.cx, dy = py - b.cy;
			const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
			if (Math.abs(lx) <= b.w / 2 + 6 && Math.abs(ly) <= b.h / 2 + 6) return l;
		}
	}

	const toComp = (e: PointerEvent) => {
		const r = stageEl!.getBoundingClientRect();
		return [(e.clientX - r.left - layout.x) / layout.scale, (e.clientY - r.top - layout.y) / layout.scale] as Vec2;
	};

	function stageDown(e: PointerEvent, handle: 'move' | 'scale' | 'rotate' = 'move') {
		if (e.button !== 0) return;
		const p0 = toComp(e);
		let l = studio.selected;
		if (handle === 'move') {
			l = hit(p0[0], p0[1]);
			studio.selectedId = l?.id ?? null;
			studio.selectedKey = null;
		}
		if (!l || l.locked) return;
		e.preventDefault();
		e.stopPropagation();
		studio.pause();
		const el = e.currentTarget as HTMLElement;
		el.setPointerCapture(e.pointerId);
		const tr = l.transform;
		const pos0 = evalProp(tr.position, f), sc0 = evalProp(tr.scale, f), rot0 = evalProp(tr.rotation, f);
		const b = layerBounds(l, f);
		const id = l.id;
		const move = (ev: PointerEvent) => {
			const p = toComp(ev);
			if (handle === 'move') {
				let nx = pos0[0] + p[0] - p0[0], ny = pos0[1] + p[1] - p0[1];
				if (ev.shiftKey) Math.abs(p[0] - p0[0]) > Math.abs(p[1] - p0[1]) ? (ny = pos0[1]) : (nx = pos0[0]);
				studio.setProp('position', tr.position, [Math.round(nx), Math.round(ny)] as Vec2, id);
			} else if (handle === 'scale') {
				const d0 = Math.hypot(p0[0] - b.cx, p0[1] - b.cy) || 1, d1 = Math.hypot(p[0] - b.cx, p[1] - b.cy);
				const k = d1 / d0;
				studio.setProp('scale', tr.scale, [Math.round(sc0[0] * k), Math.round(sc0[1] * k)] as Vec2, id);
			} else {
				const a0 = Math.atan2(p0[1] - b.cy, p0[0] - b.cx), a1 = Math.atan2(p[1] - b.cy, p[0] - b.cx);
				let r = rot0 + ((a1 - a0) * 180) / Math.PI;
				if (ev.shiftKey) r = Math.round(r / 15) * 15;
				studio.setProp('rotation', tr.rotation, Math.round(r * 10) / 10, id);
			}
		};
		const up = () => {
			el.removeEventListener('pointermove', move);
			el.removeEventListener('pointerup', up);
		};
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerup', up);
	}

	const box = $derived.by(() => {
		void studio.rev;
		const l = sel;
		if (!l || !l.visible || f < l.start || f >= l.end) return null;
		const b = layerBounds(l, f);
		return { left: layout.x + b.cx * layout.scale, top: layout.y + b.cy * layout.scale, w: b.w * layout.scale, h: b.h * layout.scale, rot: b.rotation };
	});

	// ----- Propriedades -----

	const num = (e: Event) => +(e.target as HTMLInputElement).value;
	const str = (e: Event) => (e.target as HTMLInputElement).value;

	function keyBtn<T>(label: string, p: Prop<T>) {
		return { on: hasKey(p, f), animated: p.keys.length > 0, toggle: () => studio.toggleKey(label, p, evalProp(p, f)) };
	}

	const selKey = $derived.by(() => {
		void studio.rev;
		const k = studio.selectedKey;
		if (!k) return null;
		const l = studio.scene.layers.find((x) => x.id === k.layerId);
		const p = l ? (k.path.split('.').reduce<unknown>((o, s) => (o as Record<string, unknown>)?.[s], l) as Prop<unknown>) : null;
		const key = p?.keys.find((x) => x.t === k.t);
		return key ? { ref: k as KeyRef, ease: key.ease } : null;
	});

	const easeName = (e: Easing) => (typeof e === 'string' ? e : 'bezier');
	const groups: PresetGroup[] = ['entrance', 'emphasis', 'exit', 'loop'];

	function applyPreset(id: (typeof PRESETS)[number]['id'], group: PresetGroup) {
		const l = sel;
		if (!l) return;
		const d = Math.round(presetDur * studio.scene.fps);
		const at = group === 'entrance' ? Math.max(l.start, f) : group === 'exit' ? Math.max(l.start, Math.min(f, l.end - d)) : f;
		studio.preset(id, at, d);
	}

	function sizePreset(w: number, h: number) {
		studio.commit();
		studio.scene.width = w;
		studio.scene.height = h;
		studio.changed();
	}

	function onKey(e: KeyboardEvent) {
		const tg = e.target as HTMLElement;
		if (tg.closest('input, textarea, select, [contenteditable]')) return;
		const mod = e.ctrlKey || e.metaKey;
		if (e.key === ' ') { e.preventDefault(); studio.toggle(); }
		else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? studio.redo() : studio.undo(); }
		else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); studio.redo(); }
		else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); studio.duplicateLayer(); }
		else if (e.key === 'ArrowRight') { e.preventDefault(); studio.seek(f + (e.shiftKey ? 10 : 1)); }
		else if (e.key === 'ArrowLeft') { e.preventDefault(); studio.seek(f - (e.shiftKey ? 10 : 1)); }
		else if (e.key === 'Home') studio.seek(0);
		else if (e.key === 'End') studio.seek(studio.scene.frames - 1);
		else if (e.key === 'Delete' || e.key === 'Backspace') { if (studio.selectedKey) studio.deleteKey(); else studio.removeLayer(); }
	}
</script>

<svelte:window onkeydown={onKey} />
<input bind:this={svgInput} type="file" accept=".svg,image/svg+xml" hidden onchange={(e) => { const fl = (e.target as HTMLInputElement).files?.[0]; if (fl) importSvg(fl); (e.target as HTMLInputElement).value = ''; }} />
<input bind:this={imgInput} type="file" accept="image/*" hidden onchange={(e) => { const fl = (e.target as HTMLInputElement).files?.[0]; if (fl) importImage(fl); (e.target as HTMLInputElement).value = ''; }} />

{#if !studio.started}
	<div class="gallery">
		<h2><LayoutTemplate size={20} />{t('motion.templatesTitle')}</h2>
		<p class="muted">{t('motion.templatesHint')}</p>
		<div class="tpls">
			<button class="tpl blank" onclick={() => studio.setScene(newScene({ name: t('motion.untitled') }))}><FilePlus size={28} /><strong>{t('motion.blank')}</strong></button>
			{#each TEMPLATES as tp (tp.id)}
				{@const sc = tp.make()}
				<button class="tpl" onclick={() => studio.setScene(tp.make())}>
					<span class="pv" style:aspect-ratio="{sc.width} / {sc.height}"><LottiePlayer json={toLottie(sc)} frame={Math.round(sc.frames * 0.6)} background={sc.background} /></span>
					<strong>{t(`motion.templates.${tp.id}` as Parameters<typeof t>[0])}</strong>
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="creator">
		<div class="toolbar" role="toolbar" aria-label={t('motion.add')}>
			<button class="btn sm" onclick={() => studio.addLayer('text', { name: t('motion.layerText'), text: t('motion.sampleText') })}><Type size={15} /><span>{t('motion.layerText')}</span></button>
			<button class="btn icon sm" title={t('motion.shapes.rect')} aria-label={t('motion.shapes.rect')} onclick={() => addShape('rect')}><Square size={16} /></button>
			<button class="btn icon sm" title={t('motion.shapes.ellipse')} aria-label={t('motion.shapes.ellipse')} onclick={() => addShape('ellipse')}><Circle size={16} /></button>
			<button class="btn icon sm" title={t('motion.shapes.star')} aria-label={t('motion.shapes.star')} onclick={() => addShape('star')}><Star size={16} /></button>
			<button class="btn icon sm" title={t('motion.shapes.polygon')} aria-label={t('motion.shapes.polygon')} onclick={() => addShape('polygon')}><Hexagon size={16} /></button>
			<button class="btn icon sm" title={t('motion.importSvg')} aria-label={t('motion.importSvg')} onclick={() => svgInput?.click()}><FileCode2 size={16} /></button>
			<button class="btn icon sm" title={t('motion.addImage')} aria-label={t('motion.addImage')} onclick={() => imgInput?.click()}><ImagePlus size={16} /></button>
			<span class="sep"></span>
			<button class="btn icon ghost sm" aria-label={t('image.cmd.undo')} disabled={!studio.canUndo} onclick={() => studio.undo()}><Undo2 size={16} /></button>
			<button class="btn icon ghost sm" aria-label={t('image.cmd.redo')} disabled={!studio.canRedo} onclick={() => studio.redo()}><Redo2 size={16} /></button>
			<span class="sp"></span>
			<button class="btn ghost sm" onclick={() => { studio.started = false; }}><LayoutTemplate size={15} /><span class="hide-sm">{t('motion.templatesShort')}</span></button>
			<button class="btn primary sm" onclick={() => compiled && onexport(compiled, studio.scene.name)}><Download size={15} />{t('motion.export')}</button>
		</div>

		<div class="work">
			<div class="stage" bind:this={stageEl} onpointerdown={(e) => stageDown(e)} role="application" aria-label={t('motion.stage')}>
				<LottiePlayer json={compiled} frame={studio.frame} background={studio.scene.background} bind:layout />
				{#if box}
					<div class="sel-box" style:left="{box.left}px" style:top="{box.top}px" style:width="{box.w}px" style:height="{box.h}px" style:transform="translate(-50%, -50%) rotate({box.rot}deg)">
						<span class="h scale" role="presentation" onpointerdown={(e) => stageDown(e, 'scale')}></span>
						<span class="h rot" role="presentation" onpointerdown={(e) => stageDown(e, 'rotate')}></span>
					</div>
				{/if}
			</div>

			<aside class="side">
				<div class="tabs" role="tablist">
					<button role="tab" aria-selected={tab === 'props'} onclick={() => (tab = 'props')}><SlidersHorizontal size={14} />{t('motion.tabProps')}</button>
					<button role="tab" aria-selected={tab === 'anim'} onclick={() => (tab = 'anim')}><Sparkles size={14} />{t('motion.tabAnim')}</button>
					<button role="tab" aria-selected={tab === 'scene'} onclick={() => (tab = 'scene')}><Settings2 size={14} />{t('motion.tabScene')}</button>
				</div>
				<div class="pane">
					{#if tab === 'scene'}
						<label class="field"><span class="label">{t('motion.name')}</span><input class="input" value={studio.scene.name} onchange={(e) => { studio.commit(); studio.scene.name = str(e); studio.changed(); }} /></label>
						<div class="field">
							<span class="label">{t('motion.size')}</span>
							<div class="chips">
								{#each [[1080, 1080], [1920, 1080], [1080, 1920], [1080, 1350], [512, 512], [800, 600]] as [w, h] (w + 'x' + h)}
									<button class="chip" aria-pressed={studio.scene.width === w && studio.scene.height === h} onclick={() => sizePreset(w, h)}>{w}×{h}</button>
								{/each}
							</div>
							<div class="row2">
								<input class="input" type="number" min="16" max="4096" value={studio.scene.width} aria-label={t('image.dlg.width')} onchange={(e) => sizePreset(num(e), studio.scene.height)} />
								<input class="input" type="number" min="16" max="4096" value={studio.scene.height} aria-label={t('image.dlg.height')} onchange={(e) => sizePreset(studio.scene.width, num(e))} />
							</div>
						</div>
						<div class="field">
							<span class="label">FPS</span>
							<div class="seg">{#each [24, 25, 30, 60] as r (r)}<button aria-pressed={studio.scene.fps === r} onclick={() => { studio.commit(); const k = r / studio.scene.fps; studio.scene.fps = r; studio.scene.frames = Math.round(studio.scene.frames * k); studio.changed(); }}>{r}</button>{/each}</div>
						</div>
						<Slider label={t('motion.duration')} value={+(studio.scene.frames / studio.scene.fps).toFixed(2)} min={0.5} max={60} step={0.1} unit="s" onchange={(v) => { studio.commit('duration'); const old = studio.scene.frames; studio.scene.frames = Math.max(1, Math.round(v * studio.scene.fps)); for (const l of studio.scene.layers) if (l.end >= old) l.end = studio.scene.frames; studio.changed(); }} />
						<div class="row">
							<label class="check"><input type="checkbox" checked={!!studio.scene.background} onchange={(e) => { studio.commit(); studio.scene.background = (e.target as HTMLInputElement).checked ? '#ffffff' : null; studio.changed(); }} />{t('motion.background')}</label>
							{#if studio.scene.background}<input type="color" value={studio.scene.background} oninput={(e) => { studio.commit('bg'); studio.scene.background = str(e); studio.changed(); }} />{/if}
						</div>
					{:else if !sel}
						<p class="muted">{t('motion.noSelection')}</p>
					{:else if tab === 'anim'}
						<Slider label={t('motion.presetDuration')} value={presetDur} min={0.1} max={5} step={0.1} unit="s" onchange={(v) => (presetDur = v)} />
						<p class="hint">{t('motion.presetHint', { time: time(f) })}</p>
						{#each groups as g (g)}
							<h3>{t(`motion.groups.${g}`)}</h3>
							<div class="presets">
								{#each PRESETS.filter((p) => p.group === g && p.layerKinds.includes(sel.kind)) as p (p.id)}
									<button class="preset" onclick={() => applyPreset(p.id, g)}>{t(`motion.presets.${p.id}` as Parameters<typeof t>[0])}</button>
								{/each}
							</div>
						{/each}
						<button class="btn ghost" onclick={() => studio.clearAnimation()}><Eraser size={15} />{t('motion.clearAnim')}</button>
					{:else}
						{@const tr = sel.transform}
						<div class="layer-head">
							<input class="input" value={sel.name} aria-label={t('motion.name')} onchange={(e) => studio.edit('name', (l) => (l.name = str(e)))} />
							<button class="btn icon ghost sm" title={t('motion.duplicate')} aria-label={t('motion.duplicate')} onclick={() => studio.duplicateLayer()}><CopyPlus size={15} /></button>
							<button class="btn icon ghost sm" title={t('motion.up')} aria-label={t('motion.up')} onclick={() => studio.moveLayer(sel.id, -1)}><ArrowUp size={15} /></button>
							<button class="btn icon ghost sm" title={t('motion.down')} aria-label={t('motion.down')} onclick={() => studio.moveLayer(sel.id, 1)}><ArrowDown size={15} /></button>
							<button class="btn icon ghost sm" title={t('motion.delete')} aria-label={t('motion.delete')} onclick={() => studio.removeLayer()}><Trash size={15} /></button>
						</div>

						{#if selKey}
							<div class="keybox">
								<Diamond size={14} /><span>{t('motion.keyAt', { time: time(selKey.ref.t) })}</span>
								<select class="input sm" value={easeName(selKey.ease)} aria-label={t('motion.easing')} onchange={(e) => studio.setEase(selKey.ref, str(e) as Easing)}>
									{#each EASINGS.filter((x) => typeof x === 'string') as en (en)}<option value={en}>{t(`motion.easings.${en}` as Parameters<typeof t>[0])}</option>{/each}
								</select>
								<button class="btn icon ghost sm" aria-label={t('motion.deleteKey')} onclick={() => studio.deleteKey()}><Trash size={14} /></button>
							</div>
						{/if}

						{#snippet kb(label: string, p: Prop<any>)}
							{@const k = keyBtn(label, p)}
							<button class="kb" class:on={k.on} class:anim={k.animated} title={k.on ? t('motion.removeKey') : t('motion.addKey')} aria-label={k.on ? t('motion.removeKey') : t('motion.addKey')} aria-pressed={k.on} onclick={k.toggle}><Diamond size={12} /></button>
						{/snippet}

						<h3>{t('motion.transform')}</h3>
						{@const pos = evalProp(tr.position, f)}
						{@const scl = evalProp(tr.scale, f)}
						<div class="prow"><span>{t('motion.props.position')}</span>
							<input class="input n" type="number" value={Math.round(pos[0])} aria-label="X" onchange={(e) => studio.setProp('position', tr.position, [num(e), pos[1]] as Vec2)} />
							<input class="input n" type="number" value={Math.round(pos[1])} aria-label="Y" onchange={(e) => studio.setProp('position', tr.position, [pos[0], num(e)] as Vec2)} />
							{@render kb('position', tr.position)}
						</div>
						<div class="prow"><span>{t('motion.props.scale')}</span>
							<input class="input n" type="number" value={Math.round(scl[0])} aria-label="X %" onchange={(e) => studio.setProp('scale', tr.scale, [num(e), scl[1]] as Vec2)} />
							<input class="input n" type="number" value={Math.round(scl[1])} aria-label="Y %" onchange={(e) => studio.setProp('scale', tr.scale, [scl[0], num(e)] as Vec2)} />
							{@render kb('scale', tr.scale)}
						</div>
						<div class="prow"><span>{t('motion.props.rotation')}</span>
							<input class="input n wide" type="number" value={Math.round(evalProp(tr.rotation, f))} aria-label={t('motion.props.rotation')} onchange={(e) => studio.setProp('rotation', tr.rotation, num(e))} />
							{@render kb('rotation', tr.rotation)}
						</div>
						<div class="prow"><span>{t('motion.props.opacity')}</span>
							<input class="range" type="range" min="0" max="100" value={evalProp(tr.opacity, f)} aria-label={t('motion.props.opacity')} oninput={(e) => studio.setProp('opacity', tr.opacity, num(e))} />
							{@render kb('opacity', tr.opacity)}
						</div>

						{#if sel.kind === 'shape'}
							{@const s = sel as ShapeLayer}
							<h3>{t('motion.shape')}</h3>
							{#if s.shape !== 'path'}
								{@const sz = evalProp(s.size, f)}
								<div class="prow"><span>{t('motion.props.size')}</span>
									<input class="input n" type="number" value={Math.round(sz[0])} aria-label="W" onchange={(e) => studio.setProp('size', s.size, [num(e), sz[1]] as Vec2)} />
									<input class="input n" type="number" value={Math.round(sz[1])} aria-label="H" onchange={(e) => studio.setProp('size', s.size, [sz[0], num(e)] as Vec2)} />
									{@render kb('size', s.size)}
								</div>
							{/if}
							{#if s.shape === 'rect'}
								<div class="prow"><span>{t('motion.props.radius')}</span><input class="input n wide" type="number" min="0" value={Math.round(evalProp(s.radius, f))} aria-label={t('motion.props.radius')} onchange={(e) => studio.setProp('radius', s.radius, num(e))} />{@render kb('radius', s.radius)}</div>
							{/if}
							{#if s.shape === 'star' || s.shape === 'polygon'}
								<Slider label={t('motion.points')} value={s.points} min={3} max={24} onchange={(v) => studio.edit('points', (l) => ((l as ShapeLayer).points = v))} />
							{/if}
							{#if s.shape === 'star'}
								<Slider label={t('motion.inner')} value={s.innerRatio} min={0.1} max={0.95} step={0.01} scale={100} unit="%" onchange={(v) => studio.edit('inner', (l) => ((l as ShapeLayer).innerRatio = v))} />
							{/if}
							<div class="prow"><label class="check"><input type="checkbox" checked={s.fill.on} onchange={(e) => studio.edit('fill', (l) => ((l as ShapeLayer).fill.on = (e.target as HTMLInputElement).checked))} />{t('motion.props.fill')}</label>
								<input type="color" value={evalProp(s.fill.color, f)} aria-label={t('motion.props.fill')} oninput={(e) => studio.setProp('fillColor', s.fill.color, str(e))} />{@render kb('fillColor', s.fill.color)}
							</div>
							<div class="prow"><label class="check"><input type="checkbox" checked={s.stroke.on} onchange={(e) => studio.edit('stroke', (l) => ((l as ShapeLayer).stroke.on = (e.target as HTMLInputElement).checked))} />{t('motion.props.stroke')}</label>
								<input type="color" value={evalProp(s.stroke.color, f)} aria-label={t('motion.props.stroke')} oninput={(e) => studio.setProp('strokeColor', s.stroke.color, str(e))} />
								<input class="input n" type="number" min="0" value={evalProp(s.stroke.width, f)} aria-label={t('motion.props.strokeWidth')} onchange={(e) => studio.setProp('strokeWidth', s.stroke.width, num(e))} />{@render kb('strokeWidth', s.stroke.width)}
							</div>
							<div class="prow"><label class="check"><input type="checkbox" checked={s.trim.on} onchange={(e) => studio.edit('trim', (l) => ((l as ShapeLayer).trim.on = (e.target as HTMLInputElement).checked))} />{t('motion.props.trim')}</label>
								{#if s.trim.on}
									<input class="input n" type="number" min="0" max="100" value={Math.round(evalProp(s.trim.start, f))} aria-label={t('motion.props.trimStart')} onchange={(e) => studio.setProp('trimStart', s.trim.start, num(e))} />
									<input class="input n" type="number" min="0" max="100" value={Math.round(evalProp(s.trim.end, f))} aria-label={t('motion.props.trimEnd')} onchange={(e) => studio.setProp('trimEnd', s.trim.end, num(e))} />{@render kb('trimEnd', s.trim.end)}
								{/if}
							</div>
						{:else if sel.kind === 'text'}
							{@const tx = sel as TextLayer}
							<h3>{t('motion.text')}</h3>
							<textarea class="textarea" rows="2" value={tx.text} aria-label={t('motion.text')} oninput={(e) => studio.edit('text', (l) => ((l as TextLayer).text = (e.target as HTMLTextAreaElement).value))}></textarea>
							<div class="row2">
								<select class="input" value={tx.font} aria-label={t('image.opt.font')} onchange={(e) => studio.edit('font', (l) => ((l as TextLayer).font = str(e)))}>
									{#each ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact', 'system-ui'] as fo (fo)}<option value={fo}>{fo}</option>{/each}
								</select>
								<select class="input" value={tx.weight} aria-label={t('image.opt.weight')} onchange={(e) => studio.edit('font', (l) => ((l as TextLayer).weight = num(e)))}>
									{#each [300, 400, 500, 600, 700, 800, 900] as w (w)}<option value={w}>{w}</option>{/each}
								</select>
							</div>
							<Slider label={t('image.opt.fontSize')} value={tx.size} min={8} max={400} unit="px" onchange={(v) => studio.edit('fontSize', (l) => ((l as TextLayer).size = v))} />
							<div class="prow"><span>{t('motion.props.color')}</span><input type="color" value={tx.color} aria-label={t('motion.props.color')} oninput={(e) => studio.edit('color', (l) => ((l as TextLayer).color = str(e)))} />
								<div class="seg">{#each ['left', 'center', 'right'] as const as a (a)}<button aria-pressed={tx.align === a} onclick={() => studio.edit('align', (l) => ((l as TextLayer).align = a))}>{t(`image.align.${a}`)}</button>{/each}</div>
							</div>
							<Slider label={t('motion.tracking')} value={tx.tracking} min={-100} max={400} onchange={(v) => studio.edit('tracking', (l) => ((l as TextLayer).tracking = v))} />
							<label class="field"><span class="label">{t('motion.textAnim')}</span>
								<select class="input" value={tx.animator} onchange={(e) => studio.edit('animator', (l) => { const x = l as TextLayer; x.animator = str(e) as TextLayer['animator']; if (x.animEnd <= x.animStart) { x.animStart = f; x.animEnd = f + studio.scene.fps; } })}>
									{#each ['none', 'typewriter', 'fadeChars', 'slideChars', 'scaleChars'] as a (a)}<option value={a}>{t(`motion.animators.${a}` as Parameters<typeof t>[0])}</option>{/each}
								</select>
							</label>
							{#if tx.animator !== 'none'}
								<div class="row2">
									<label class="mini">{t('motion.from')}<input class="input" type="number" min="0" value={tx.animStart} onchange={(e) => studio.edit('animStart', (l) => ((l as TextLayer).animStart = num(e)))} /></label>
									<label class="mini">{t('motion.to')}<input class="input" type="number" min="0" value={tx.animEnd} onchange={(e) => studio.edit('animEnd', (l) => ((l as TextLayer).animEnd = num(e)))} /></label>
								</div>
							{/if}
						{/if}
						<h3>{t('motion.timing')}</h3>
						<div class="row2">
							<label class="mini">{t('motion.in')}<input class="input" type="number" min="0" value={sel.start} onchange={(e) => studio.edit('start', (l) => (l.start = Math.max(0, Math.min(l.end - 1, num(e)))))} /></label>
							<label class="mini">{t('motion.out')}<input class="input" type="number" min="1" value={sel.end} onchange={(e) => studio.edit('end', (l) => (l.end = Math.max(l.start + 1, Math.min(studio.scene.frames, num(e)))))} /></label>
						</div>
					{/if}
				</div>
			</aside>
		</div>

		<div class="transport" role="toolbar" aria-label={t('motion.transport')}>
			<button class="btn icon ghost" aria-label={t('motion.toStart')} onclick={() => studio.seek(0)}><SkipBack size={17} /></button>
			<button class="btn icon play" aria-label={studio.playing ? t('motion.pause') : t('motion.play')} onclick={() => studio.toggle()}>
				{#if studio.playing}<Pause size={18} />{:else}<Play size={18} />{/if}
			</button>
			<button class="btn icon ghost" class:on={studio.loop} aria-pressed={studio.loop} aria-label={t('motion.loop')} onclick={() => (studio.loop = !studio.loop)}><Repeat size={16} /></button>
			<span class="tc">{time(f)} <small>/ {time(studio.scene.frames)} · {f}f</small></span>
			<select class="input sm" bind:value={studio.speed} aria-label={t('motion.speed')}>
				{#each [0.25, 0.5, 1, 1.5, 2] as s (s)}<option value={s}>{s}×</option>{/each}
			</select>
		</div>

		<div class="tlwrap"><Timeline /></div>
	</div>
{/if}

<style>
	.creator { height: 100%; display: grid; grid-template-rows: auto 1fr auto minmax(140px, 32%); min-height: 0; }
	.toolbar { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
	.btn.sm { padding: 6px 10px; font-size: 0.8rem; min-height: 34px; }
	.btn.icon.sm { padding: 6px; }
	.sep { width: 1px; height: 22px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
	.sp { flex: 1; }
	.work { display: grid; grid-template-columns: 1fr 320px; min-height: 0; }
	.stage { position: relative; min-height: 0; background: #101219; touch-action: none; overflow: hidden; }
	.sel-box { position: absolute; border: 1.5px solid var(--accent); pointer-events: none; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4); }
	.h { position: absolute; width: 12px; height: 12px; border-radius: 3px; background: #fff; border: 1.5px solid var(--accent); pointer-events: auto; touch-action: none; }
	.h.scale { right: -7px; bottom: -7px; cursor: nwse-resize; }
	.h.rot { left: 50%; top: -30px; margin-left: -6px; border-radius: 50%; cursor: grab; }
	.h.rot::after { content: ''; position: absolute; left: 4px; top: 11px; width: 1.5px; height: 17px; background: var(--accent); }
	.side { display: flex; flex-direction: column; min-height: 0; border-left: 1px solid var(--border); }
	.tabs { display: flex; gap: 2px; padding: 6px 8px 0; }
	.tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 0; border-radius: 8px 8px 0 0; background: transparent; color: var(--text-3); font-size: 0.8rem; font-weight: 550; }
	.tabs button[aria-selected='true'] { color: var(--text); background: rgb(255 255 255 / 0.05); box-shadow: inset 0 -2px 0 var(--accent); }
	.pane { padding: 10px 12px 16px; overflow: auto; display: grid; gap: 10px; align-content: start; }
	h3 { font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-3); margin-top: 4px; }
	.muted { color: var(--text-2); font-size: 0.86rem; }
	.layer-head { display: flex; gap: 2px; align-items: center; }
	.layer-head .input { flex: 1; padding: 6px 8px; }
	.prow { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--text-2); flex-wrap: wrap; }
	.prow > span:first-child { min-width: 64px; }
	.input.n { width: 66px; padding: 5px 6px; font-size: 0.8rem; }
	.input.n.wide { width: 90px; }
	.input.sm { width: auto; padding: 5px 8px; font-size: 0.8rem; }
	.range { flex: 1; accent-color: var(--accent); min-width: 80px; }
	.kb { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text-3); padding: 0; margin-left: auto; }
	.kb.anim { color: var(--warn); }
	.kb.on { background: var(--warn); color: #111; border-color: var(--warn); }
	input[type='color'] { width: 36px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; }
	.row, .row2 { display: flex; gap: 8px; align-items: center; }
	.row2 > * { flex: 1; min-width: 0; }
	.row2 .input { padding: 6px 8px; }
	.mini { display: grid; gap: 3px; font-size: 0.72rem; color: var(--text-3); }
	.chips { display: flex; flex-wrap: wrap; gap: 4px; }
	.chip { padding: 5px 8px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface-2); font-size: 0.74rem; font-variant-numeric: tabular-nums; }
	.chip[aria-pressed='true'], .seg button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #fff; }
	.presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 5px; }
	.preset { padding: 8px 6px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); font-size: 0.76rem; font-weight: 600; transition: border-color 0.12s, transform 0.1s; }
	.preset:hover { border-color: var(--accent); }
	.preset:active { transform: scale(0.96); }
	.keybox { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; background: rgb(255 181 71 / 0.1); border: 1px solid rgb(255 181 71 / 0.35); font-size: 0.8rem; }
	.keybox :global(svg) { color: var(--warn); }
	.keybox select { flex: 1; }
	.transport { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--border); }
	.play { background: var(--accent); color: #fff; border-color: transparent; width: 40px; height: 40px; border-radius: 50%; }
	.btn.on { color: var(--accent); }
	.tc { font-variant-numeric: tabular-nums; font-size: 0.86rem; margin: 0 6px; }
	.tc small { color: var(--text-3); }
	.tlwrap { min-height: 0; overflow: hidden; }
	.gallery { padding: 20px; overflow: auto; height: 100%; display: grid; gap: 10px; align-content: start; max-width: 1100px; margin: 0 auto; }
	.gallery h2 { display: flex; align-items: center; gap: 8px; font-size: 1.15rem; }
	.tpls { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; margin-top: 6px; }
	.tpl { display: grid; gap: 8px; padding: 10px; border-radius: var(--radius); border: 1px solid var(--border); background: rgb(0 0 0 / 0.18); text-align: left; transition: border-color 0.15s, transform 0.15s var(--ease); }
	.tpl:hover { border-color: var(--accent); transform: translateY(-2px); }
	.tpl.blank { place-items: center; align-content: center; min-height: 150px; color: var(--text-2); }
	.pv { display: block; width: 100%; max-height: 160px; border-radius: 8px; overflow: hidden; pointer-events: none; }
	@media (max-width: 900px) {
		.creator { grid-template-rows: auto minmax(220px, 1fr) auto auto minmax(120px, 26%); }
		.work { display: contents; }
		.side { border-left: 0; border-top: 1px solid var(--border); max-height: 34dvh; }
		.hide-sm { display: none; }
	}
	@media (prefers-reduced-motion: reduce) { .tpl:hover { transform: none; } }
</style>
