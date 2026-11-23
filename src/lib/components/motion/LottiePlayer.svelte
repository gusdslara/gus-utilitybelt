<script lang="ts">
	// Player Lottie controlado: quem usa decide o frame (o relógio de reprodução fica no estado do app).
	// lottie-web é carregado sob demanda (só no cliente). Recarrega quando o JSON muda; troca de frame é barata.
	import { onDestroy, onMount } from 'svelte';
	import type { LottieJSON } from '#lib/motion/types.ts';
	import type { AnimationItem, LottiePlayer as Lottie } from 'lottie-web';

	let {
		json,
		frame,
		background = null,
		renderer = 'svg',
		layout = $bindable({ scale: 1, x: 0, y: 0, w: 0, h: 0 }),
		onerror
	}: {
		json: LottieJSON | null;
		frame: number;
		background?: string | null;
		renderer?: 'svg' | 'canvas';
		/** Posição do quadro da composição dentro do player (px CSS): para sobrepor alças de edição. */
		layout?: { scale: number; x: number; y: number; w: number; h: number };
		onerror?: (message: string) => void;
	} = $props();

	let host: HTMLDivElement;
	let box: HTMLDivElement;
	let lottie: Lottie | null = null;
	let anim: AnimationItem | null = null;
	let loaded = $state(false);
	let size = $state({ w: 0, h: 0 });
	let ro: ResizeObserver | undefined;

	onMount(async () => {
		ro = new ResizeObserver(() => {
			const r = host.getBoundingClientRect();
			size = { w: r.width, h: r.height };
		});
		ro.observe(host);
		const mod = await import('lottie-web');
		lottie = (mod.default ?? mod) as unknown as Lottie;
		loaded = true;
	});

	onDestroy(() => {
		ro?.disconnect();
		anim?.destroy();
		anim = null;
	});

	// Recarrega a animação quando o JSON (ou o renderizador) muda.
	$effect(() => {
		const j = json, r = renderer;
		if (!loaded || !lottie || !box) return;
		anim?.destroy();
		anim = null;
		if (!j) return;
		try {
			anim = lottie.loadAnimation({
				container: box,
				renderer: r,
				loop: false,
				autoplay: false,
				animationData: $state.snapshot(j) as object, // cópia simples (aceita JSON vindo de $state)
				rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false, hideOnTransparent: true } as never
			});
			anim.addEventListener('DOMLoaded', () => anim?.goToAndStop(Math.max(0, frame - (j.ip ?? 0)), true));
			anim.addEventListener('error' as never, () => onerror?.('render error'));
		} catch (e) {
			onerror?.(e instanceof Error ? e.message : String(e));
		}
	});

	$effect(() => {
		const f = frame;
		if (anim && anim.isLoaded) anim.goToAndStop(Math.max(0, f - (json?.ip ?? 0)), true);
	});

	// Caixa da composição dentro do player (contain).
	$effect(() => {
		const W = json?.w ?? 1, H = json?.h ?? 1;
		const s = Math.min(size.w / W, size.h / H) || 1;
		layout = { scale: s, x: (size.w - W * s) / 2, y: (size.h - H * s) / 2, w: W * s, h: H * s };
	});
</script>

<div class="player" bind:this={host}>
	<div
		class="frame"
		class:checker={!background}
		style:left="{layout.x}px"
		style:top="{layout.y}px"
		style:width="{layout.w}px"
		style:height="{layout.h}px"
		style:background={background ?? undefined}
	>
		<div class="anim" bind:this={box}></div>
	</div>
</div>

<style>
	.player { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; }
	.frame { position: absolute; box-shadow: 0 10px 40px rgb(0 0 0 / 0.45); }
	.frame.checker { background: repeating-conic-gradient(#d9dce3 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
	.anim { width: 100%; height: 100%; }
	.anim :global(svg), .anim :global(canvas) { display: block; width: 100% !important; height: 100% !important; }
</style>
