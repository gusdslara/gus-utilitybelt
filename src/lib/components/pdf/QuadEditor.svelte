<script lang="ts">
	// Ajuste manual do recorte: 4 cantos + 4 bordas arrastáveis (mouse, toque e teclado) e lupa durante o arraste.
	// Coordenadas normalizadas (0..1) sobre a imagem exibida.
	import type { Quad } from '#lib/scan/geometry.ts';
	import { t } from '#lib/i18n/index.svelte.ts';

	let { src, width, height, quad, onchange }: { src: string; width: number; height: number; quad: Quad; onchange: (q: Quad) => void } = $props();

	let cw = $state(0);
	let ch = $state(0);
	let imgEl: HTMLImageElement | undefined = $state();
	let loupe: HTMLCanvasElement | undefined = $state();
	let drag = $state<{ kind: 'c' | 'e'; i: number } | null>(null);
	let start: { x: number; y: number; q: Quad } | null = null;

	const PAD = 22;
	const LOUPE = 128;
	const ZOOM = 2.6;
	const fit = $derived.by(() => {
		const aw = Math.max(10, cw - PAD * 2), ah = Math.max(10, ch - PAD * 2);
		const k = Math.min(aw / width, ah / height);
		return { w: width * k, h: height * k };
	});
	const pts = $derived(quad.map((p) => `${p.x},${p.y}`).join(' '));
	const mids = $derived(quad.map((p, i) => ({ x: (p.x + quad[(i + 1) % 4].x) / 2, y: (p.y + quad[(i + 1) % 4].y) / 2 })));
	const focus = $derived(drag ? (drag.kind === 'c' ? quad[drag.i] : mids[drag.i]) : null);
	const loupeLeft = $derived(!!focus && focus.x > 0.5);

	const clamp = (v: number) => Math.min(1, Math.max(0, v));

	function down(e: PointerEvent, kind: 'c' | 'e', i: number) {
		if (e.button > 0) return;
		e.preventDefault();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		drag = { kind, i };
		start = { x: e.clientX, y: e.clientY, q: quad.map((p) => ({ ...p })) as Quad };
	}

	function move(e: PointerEvent) {
		if (!drag || !start) return;
		const dx = (e.clientX - start.x) / fit.w, dy = (e.clientY - start.y) / fit.h;
		nudge(start.q, drag, dx, dy);
	}

	function nudge(base: Quad, d: { kind: 'c' | 'e'; i: number }, dx: number, dy: number) {
		const q = base.map((p) => ({ ...p })) as Quad;
		const idx = d.kind === 'c' ? [d.i] : [d.i, (d.i + 1) % 4];
		if (d.kind === 'e') {
			// a borda inteira anda junto, sem sair da imagem
			for (const k of idx) {
				dx = Math.min(1 - base[k].x, Math.max(-base[k].x, dx));
				dy = Math.min(1 - base[k].y, Math.max(-base[k].y, dy));
			}
		}
		for (const k of idx) q[k] = { x: clamp(base[k].x + dx), y: clamp(base[k].y + dy) };
		onchange(q);
	}

	function up() {
		drag = null;
		start = null;
	}

	function key(e: KeyboardEvent, kind: 'c' | 'e', i: number) {
		const step = e.shiftKey ? 0.02 : 0.004;
		const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
		if (!d) return;
		e.preventDefault();
		nudge(quad, { kind, i }, d[0], d[1]);
	}

	// Lupa: recorte ampliado ao redor do ponto arrastado, com as linhas do recorte.
	$effect(() => {
		const c = loupe, img = imgEl, f = focus;
		if (!c || !img || !f || !img.naturalWidth) return;
		const dpr = Math.min(2, devicePixelRatio || 1);
		c.width = c.height = LOUPE * dpr;
		const g = c.getContext('2d')!;
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.fillStyle = '#111';
		g.fillRect(0, 0, LOUPE, LOUPE);
		const nx = f.x * img.naturalWidth, ny = f.y * img.naturalHeight;
		const s = ((LOUPE / ZOOM) * img.naturalWidth) / fit.w; // lado da região (px da imagem carregada)
		g.imageSmoothingQuality = 'high';
		g.drawImage(img, nx - s / 2, ny - s / 2, s, s, 0, 0, LOUPE, LOUPE);
		const toL = (p: { x: number; y: number }) => [LOUPE / 2 + (p.x - f.x) * fit.w * ZOOM, LOUPE / 2 + (p.y - f.y) * fit.h * ZOOM];
		g.strokeStyle = '#dd206b';
		g.lineWidth = 2;
		g.beginPath();
		quad.forEach((p, i) => {
			const [x, y] = toL(p);
			if (i) g.lineTo(x, y);
			else g.moveTo(x, y);
		});
		g.closePath();
		g.stroke();
		g.strokeStyle = 'rgb(255 255 255 / 0.9)';
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(LOUPE / 2 - 8, LOUPE / 2);
		g.lineTo(LOUPE / 2 + 8, LOUPE / 2);
		g.moveTo(LOUPE / 2, LOUPE / 2 - 8);
		g.lineTo(LOUPE / 2, LOUPE / 2 + 8);
		g.stroke();
	});
</script>

<div class="qe" bind:clientWidth={cw} bind:clientHeight={ch}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="stage" style:width="{fit.w}px" style:height="{fit.h}px" onpointermove={move} onpointerup={up} onpointercancel={up}>
		<img bind:this={imgEl} {src} alt="" draggable="false" />
		<svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
			<path class="shade" fill-rule="evenodd" d="M-1 -1H2V2H-1Z M{pts.replaceAll(' ', ' L')}Z" />
			<polygon class="edge" points={pts} />
		</svg>
		{#each mids as m, i (i)}
			<button
				type="button" class="h mid" class:active={drag?.kind === 'e' && drag.i === i}
				style:left="{m.x * 100}%" style:top="{m.y * 100}%"
				aria-label={t('pdf.editor.edge', { n: i + 1 })}
				onpointerdown={(e) => down(e, 'e', i)} onkeydown={(e) => key(e, 'e', i)}
			><span></span></button>
		{/each}
		{#each quad as p, i (i)}
			<button
				type="button" class="h corner" class:active={drag?.kind === 'c' && drag.i === i}
				style:left="{p.x * 100}%" style:top="{p.y * 100}%"
				aria-label={t('pdf.editor.corner', { n: i + 1 })}
				onpointerdown={(e) => down(e, 'c', i)} onkeydown={(e) => key(e, 'c', i)}
			><span></span></button>
		{/each}
	</div>
	{#if focus}
		<canvas bind:this={loupe} class="loupe" class:left={loupeLeft} style:width="{LOUPE}px" style:height="{LOUPE}px" aria-hidden="true"></canvas>
	{/if}
</div>

<style>
	.qe { position: relative; width: 100%; height: 100%; min-height: 200px; display: grid; place-items: center; overflow: hidden; user-select: none; -webkit-user-select: none; }
	.stage { position: relative; touch-action: none; }
	img { width: 100%; height: 100%; display: block; border-radius: 2px; pointer-events: none; }
	svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
	.shade { fill: rgb(5 6 10 / 0.55); }
	.edge { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
	.h {
		position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0; border: 0; background: none;
		display: grid; place-items: center; touch-action: none; cursor: grab; z-index: 2;
	}
	.h:active { cursor: grabbing; }
	.h span { display: block; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px var(--accent), 0 2px 8px rgb(0 0 0 / 0.5); transition: transform 0.15s var(--ease); }
	.corner span { width: 18px; height: 18px; }
	.mid span { width: 12px; height: 12px; opacity: 0.9; }
	.h:hover span, .h.active span { transform: scale(1.25); }
	.h:focus-visible { outline: none; }
	.h:focus-visible span { box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px rgb(255 255 255 / 0.5); }
	.loupe {
		position: absolute; top: 8px; right: 8px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 8px 28px rgb(0 0 0 / 0.55);
		pointer-events: none; z-index: 3;
	}
	.loupe.left { right: auto; left: 8px; }
</style>
