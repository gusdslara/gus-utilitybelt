<script lang="ts">
	// Scanner pela câmera, em tela cheia: detecção do documento ao vivo (worker), captura automática quando a
	// imagem estabiliza, lanterna, foto na resolução máxima do sensor (ImageCapture) e revisão do recorte.
	// Sem HTTPS/câmera: cai para a câmera nativa do aparelho (<input capture>), com o mesmo recorte automático.
	import { onDestroy, onMount } from 'svelte';
	import { pdf, uid } from '#lib/pdf/store.svelte.ts';
	import { scan } from '#lib/scan/client.ts';
	import { FULL_QUAD, type Quad } from '#lib/scan/geometry.ts';
	import { SCAN_FILTERS, type ScanFilter } from '#lib/scan/enhance.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import QuadEditor from './QuadEditor.svelte';
	import { portal } from './portal.ts';
	import { X, Flashlight, FlashlightOff, SwitchCamera, ImagePlus, Camera, Check, RotateCcw, LoaderCircle, Zap, ZapOff, ScanEye, Eye } from '@lucide/svelte';

	let { onclose }: { onclose: () => void } = $props();

	type Phase = 'starting' | 'live' | 'error' | 'processing' | 'review';
	let phase = $state<Phase>('starting');
	let error = $state<'denied' | 'unavailable' | null>(null);
	let video: HTMLVideoElement | undefined = $state();
	let stream: MediaStream | null = null;
	let track: MediaStreamTrack | null = null;
	let facing = $state<'environment' | 'user'>('environment');
	let cams = $state(0);
	let torchOk = $state(false);
	let torch = $state(false);
	let auto = $state(load('ub.scan.auto', true));
	let review = $state(load('ub.scan.review', false));
	let cw = $state(0);
	let ch = $state(0);
	let vw = $state(0);
	let vh = $state(0);
	let target = $state<Quad | null>(null); // última detecção (suavizada)
	let shown = $state<Quad | null>(null); // interpolada a 60 fps para o overlay
	let stableSince = 0;
	let stability = $state(0);
	let flash = $state(false);
	let added = $state<string[]>([]);
	let rv = $state<{ key: string; blob: Blob; url: string; w: number; h: number; iw: number; ih: number; quad: Quad; detected: Quad | null } | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let nativeInput: HTMLInputElement | undefined = $state();
	let capturing = false;
	let armed = true;
	let lastCaptureAt = 0;
	let lastCaptured: Quad | null = null;
	let lost = 0;
	let alive = true;
	let raf = 0;
	let detectTimer: ReturnType<typeof setTimeout> | undefined;
	let slowTimer: ReturnType<typeof setTimeout> | undefined;
	/** Permissão pendente há alguns segundos: oferece a câmera do aparelho enquanto espera. */
	let slow = $state(false);

	const STABLE_MS = 1100;
	const lastThumb = $derived(added.length ? pdf.byId(added[added.length - 1])?.preview ?? null : null);
	const hint = $derived(
		phase !== 'live' ? '' : !target ? t('pdf.scanner.searching') : area(target) < 0.18 ? t('pdf.scanner.closer') : auto ? t('pdf.scanner.hold') : t('pdf.scanner.found')
	);

	function load(k: string, d: boolean) {
		try {
			const v = localStorage.getItem(k);
			return v === null ? d : v === '1';
		} catch {
			return d;
		}
	}
	function save(k: string, v: boolean) {
		try {
			localStorage.setItem(k, v ? '1' : '0');
		} catch {
			/* sem storage */
		}
	}

	function area(q: Quad) {
		let s = 0;
		for (let i = 0; i < 4; i++) s += q[i].x * q[(i + 1) % 4].y - q[(i + 1) % 4].x * q[i].y;
		return Math.abs(s) / 2;
	}
	const maxMove = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

	async function start() {
		stop();
		phase = 'starting';
		error = null;
		slow = false;
		clearTimeout(slowTimer);
		slowTimer = setTimeout(() => (slow = true), 4000);
		if (!navigator.mediaDevices?.getUserMedia) {
			phase = 'error';
			error = 'unavailable';
			return;
		}
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } }
			});
		} catch (e) {
			phase = 'error';
			error = (e as DOMException)?.name === 'NotAllowedError' || (e as DOMException)?.name === 'SecurityError' ? 'denied' : 'unavailable';
			return;
		}
		if (!alive) return stop();
		track = stream.getVideoTracks()[0] ?? null;
		const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
		torchOk = !!caps.torch;
		torch = false;
		if (caps.focusMode?.includes('continuous')) track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
		navigator.mediaDevices.enumerateDevices().then((d) => (cams = d.filter((x) => x.kind === 'videoinput').length)).catch(() => {});
		if (video) {
			video.srcObject = stream;
			await video.play().catch(() => {});
		}
		phase = 'live';
		detectLoop();
	}

	function stop() {
		clearTimeout(detectTimer);
		clearTimeout(slowTimer);
		stream?.getTracks().forEach((tr) => tr.stop());
		stream = null;
		track = null;
		target = shown = null;
	}

	function onMeta() {
		if (!video) return;
		vw = video.videoWidth;
		vh = video.videoHeight;
	}

	// Detecção ao vivo: um quadro por vez no worker dedicado (~10 por segundo).
	async function detectLoop() {
		clearTimeout(detectTimer);
		if (!alive || phase !== 'live' || !video) return;
		if (video.readyState >= 2 && video.videoWidth && !scan.liveBusy && !document.hidden) {
			onMeta();
			try {
				const k = 320 / Math.max(vw, vh);
				const bmp = await createImageBitmap(video, { resizeWidth: Math.round(vw * k), resizeHeight: Math.round(vh * k), resizeQuality: 'low' });
				const r = await scan.detectFrame(bmp);
				onDetect(r.quad, r.score);
			} catch {
				/* quadro perdido */
			}
		}
		detectTimer = setTimeout(detectLoop, 70);
	}

	function onDetect(q: Quad | null, score: number) {
		const now = performance.now();
		if (!q || score < 0.28) {
			if (++lost >= 3) {
				target = null;
				stableSince = now;
				armed = true;
			}
			stability = 0;
			return;
		}
		lost = 0;
		if (target && maxMove(target, q) < 0.08) {
			const moved = maxMove(target, q);
			target = target.map((p, i) => ({ x: p.x * 0.45 + q[i].x * 0.55, y: p.y * 0.45 + q[i].y * 0.55 })) as Quad;
			if (moved > 0.018) stableSince = now;
		} else {
			target = q;
			stableSince = now;
		}
		if (lastCaptured && maxMove(lastCaptured, target) > 0.07) armed = true;
		stability = Math.min(1, (now - stableSince) / STABLE_MS);
		if (auto && armed && stability >= 1 && area(target) >= 0.18 && now - lastCaptureAt > 2200 && phase === 'live') capture(true);
	}

	// Overlay suave: aproxima o polígono exibido do alvo a cada quadro.
	function animateOverlay() {
		if (!alive) return;
		if (target) {
			shown = shown ? (shown.map((p, i) => ({ x: p.x + (target![i].x - p.x) * 0.35, y: p.y + (target![i].y - p.y) * 0.35 })) as Quad) : target;
		} else shown = null;
		raf = requestAnimationFrame(animateOverlay);
	}

	// object-fit: cover → posição do vídeo na tela.
	const map = $derived.by(() => {
		if (!vw || !vh || !cw || !ch) return null;
		const s = Math.max(cw / vw, ch / vh);
		return { s, ox: (cw - vw * s) / 2, oy: (ch - vh * s) / 2 };
	});
	const poly = $derived(shown && map ? shown.map((p) => `${map.ox + p.x * vw * map.s},${map.oy + p.y * vh * map.s}`).join(' ') : '');

	async function grabPhoto(): Promise<Blob> {
		// Foto na resolução do sensor quando o navegador permite (Chrome/Android); senão, o quadro do vídeo.
		const IC = (globalThis as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto(o?: object): Promise<Blob>; getPhotoCapabilities(): Promise<{ imageWidth?: { max: number }; imageHeight?: { max: number } }> } }).ImageCapture;
		if (IC && track && track.readyState === 'live') {
			try {
				const ic = new IC(track);
				const caps = await ic.getPhotoCapabilities().catch(() => null);
				const opts = caps?.imageWidth?.max ? { imageWidth: caps.imageWidth.max, imageHeight: caps.imageHeight?.max, fillLightMode: torch ? 'flash' : 'off' } : {};
				const b = await ic.takePhoto(opts).catch(() => ic.takePhoto());
				if (b && b.size > 0) return b;
			} catch {
				/* cai para o quadro */
			}
		}
		const v = video!;
		const c = document.createElement('canvas');
		c.width = v.videoWidth;
		c.height = v.videoHeight;
		c.getContext('2d')!.drawImage(v, 0, 0);
		return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('capture'))), 'image/jpeg', 0.95));
	}

	async function capture(fromAuto = false) {
		if (capturing || phase !== 'live') return;
		capturing = true;
		lastCaptureAt = performance.now();
		armed = false;
		lastCaptured = target;
		const liveQuad = target;
		const liveAspect = vw / vh;
		flash = true;
		setTimeout(() => (flash = false), 180);
		navigator.vibrate?.(fromAuto ? [20, 40, 20] : 25);
		try {
			const blob = await grabPhoto();
			phase = 'processing';
			const key = uid();
			const info = await scan.probe(key, blob, true);
			// Detecta de novo na foto cheia; se falhar, usa a detecção ao vivo quando o enquadramento é o mesmo.
			const quad = info.quad ?? (liveQuad && Math.abs(info.width / info.height - liveAspect) < 0.02 ? liveQuad : null);
			if (review) {
				const r = await scan.render(key, blob, { quad: null, rotation: 0, filter: 'original', threshold: 50 }, 1600, 0.85);
				rv = { key, blob, url: URL.createObjectURL(r.blob), w: r.width, h: r.height, iw: info.width, ih: info.height, quad: quad ?? FULL_QUAD, detected: info.quad };
				phase = 'review';
			} else {
				const id = await pdf.addScan(blob, { quad }, { width: info.width, height: info.height, detected: info.quad }, key);
				added = [...added, id];
				phase = 'live';
				detectLoop();
			}
		} catch {
			phase = 'live';
			detectLoop();
		} finally {
			capturing = false;
		}
	}

	async function keep() {
		if (!rv) return;
		const full = rv.quad.every((p, i) => Math.abs(p.x - FULL_QUAD[i].x) < 0.002 && Math.abs(p.y - FULL_QUAD[i].y) < 0.002);
		const id = await pdf.addScan(rv.blob, { quad: full ? null : rv.quad }, { width: rv.iw, height: rv.ih, detected: rv.detected }, rv.key);
		added = [...added, id];
		closeReview();
	}

	function retake() {
		if (rv) scan.forget(rv.key);
		closeReview();
	}

	function closeReview() {
		if (rv) URL.revokeObjectURL(rv.url);
		rv = null;
		phase = stream ? 'live' : 'error';
		lastCaptureAt = performance.now();
		detectLoop();
	}

	async function toggleTorch() {
		if (!track) return;
		try {
			await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
			torch = !torch;
		} catch {
			torchOk = false;
		}
	}

	function switchCam() {
		facing = facing === 'environment' ? 'user' : 'environment';
		start();
	}

	async function importFiles(list: FileList | null) {
		if (!list?.length) return;
		const files = [...list];
		const before = new Set(pdf.pages.map((p) => p.id));
		await pdf.addFiles(files, 'scan');
		added = [...added, ...pdf.pages.filter((p) => !before.has(p.id)).map((p) => p.id)];
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			if (phase === 'review') retake();
			else onclose();
		} else if ((e.key === ' ' || e.key === 'Enter') && phase === 'live' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
			e.preventDefault();
			capture();
		}
	}

	function onVisibility() {
		// Volta da aba/app: a câmera pode ter sido liberada pelo sistema.
		if (!document.hidden && phase === 'live' && (!track || track.readyState === 'ended')) start();
	}

	onMount(() => {
		start();
		raf = requestAnimationFrame(animateOverlay);
		document.addEventListener('visibilitychange', onVisibility);
	});

	onDestroy(() => {
		alive = false;
		cancelAnimationFrame(raf);
		stop();
		scan.stopLive();
		if (rv) {
			URL.revokeObjectURL(rv.url);
			scan.forget(rv.key);
		}
		document.removeEventListener('visibilitychange', onVisibility);
	});
</script>

<svelte:window onkeydown={onKey} />

<div class="scanner" use:portal role="dialog" aria-modal="true" aria-label={t('pdf.scanner.title')}>
	<div class="cam" bind:clientWidth={cw} bind:clientHeight={ch}>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={video} playsinline muted autoplay onloadedmetadata={onMeta} onresize={onMeta} class:mirror={facing === 'user'}></video>
		{#if poly && phase === 'live'}
			<svg class="overlay" class:mirror={facing === 'user'} viewBox="0 0 {cw} {ch}" aria-hidden="true">
				<polygon points={poly} class:stable={stability >= 1} />
			</svg>
		{/if}
		{#if flash}<div class="flash" aria-hidden="true"></div>{/if}

		{#if phase === 'starting'}
			<div class="center">
				<LoaderCircle class="spin" size={28} /><span>{t('pdf.scanner.starting')}</span>
				{#if slow}<button class="btn big" onclick={() => nativeInput?.click()}><Camera size={18} /> {t('pdf.scanner.native')}</button>{/if}
			</div>
		{:else if phase === 'processing'}
			<div class="center glass"><LoaderCircle class="spin" size={28} /><span>{t('pdf.scanner.processing')}</span></div>
		{:else if phase === 'error'}
			<div class="center err">
				<ScanEye size={40} strokeWidth={1.5} />
				<p>{error === 'denied' ? t('pdf.scanner.denied') : t('pdf.scanner.unavailable')}</p>
				<div class="row">
					<button class="btn primary big" onclick={() => nativeInput?.click()}><Camera size={18} /> {t('pdf.scanner.native')}</button>
					<button class="btn big" onclick={start}><RotateCcw size={16} /> {t('pdf.scanner.retry')}</button>
				</div>
			</div>
		{/if}

		{#if phase === 'live' && hint}
			<div class="hint" aria-live="polite">{hint}</div>
		{/if}
	</div>

	<header class="bar top">
		<button class="round" onclick={onclose} aria-label={t('pdf.scanner.close')}><X size={22} /></button>
		<div class="filters" role="radiogroup" aria-label={t('pdf.scanner.filter')}>
			{#each SCAN_FILTERS as f (f)}
				<button role="radio" aria-checked={pdf.scanFilter === f} onclick={() => (pdf.scanFilter = f as ScanFilter)}>{t(`pdf.filters.${f}`)}</button>
			{/each}
		</div>
		<div class="tg">
			<button class="round" class:on={auto} aria-pressed={auto} onclick={() => save('ub.scan.auto', (auto = !auto))} title={t('pdf.scanner.auto')} aria-label={t('pdf.scanner.auto')}>
				{#if auto}<Zap size={20} />{:else}<ZapOff size={20} />{/if}
			</button>
			<button class="round" class:on={review} aria-pressed={review} onclick={() => save('ub.scan.review', (review = !review))} title={t('pdf.scanner.review')} aria-label={t('pdf.scanner.review')}>
				<Eye size={20} />
			</button>
			{#if torchOk}
				<button class="round" class:on={torch} aria-pressed={torch} onclick={toggleTorch} title={t('pdf.scanner.torch')} aria-label={t('pdf.scanner.torch')}>
					{#if torch}<Flashlight size={20} />{:else}<FlashlightOff size={20} />{/if}
				</button>
			{/if}
		</div>
	</header>

	<footer class="bar bottom">
		<button class="thumb" onclick={onclose} disabled={!added.length} aria-label="{t('pdf.scanner.done')} ({added.length})">
			{#if lastThumb}<img src={lastThumb} alt="" />{:else if added.length}<LoaderCircle class="spin" size={18} />{:else}<ImagePlus size={20} />{/if}
			{#if added.length}<span class="badge">{added.length}</span>{/if}
		</button>
		<button class="shutter" onclick={() => capture()} disabled={phase !== 'live'} aria-label={t('pdf.scanner.capture')} style:--p={auto ? stability : 0}>
			<span class="ring" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
		</button>
		<div class="side">
			<button class="round" onclick={() => fileInput?.click()} aria-label={t('pdf.scanner.gallery')} title={t('pdf.scanner.gallery')}><ImagePlus size={20} /></button>
			{#if cams > 1}
				<button class="round" onclick={switchCam} aria-label={t('pdf.scanner.switchCam')} title={t('pdf.scanner.switchCam')}><SwitchCamera size={20} /></button>
			{/if}
			{#if added.length}
				<button class="done" onclick={onclose}><Check size={18} /> {t('pdf.scanner.done')}</button>
			{/if}
		</div>
	</footer>

	{#if phase === 'review' && rv}
		<div class="review">
			<div class="rv-view">
				<QuadEditor src={rv.url} width={rv.w} height={rv.h} quad={rv.quad} onchange={(q) => rv && (rv.quad = q)} />
			</div>
			<div class="rv-bar">
				<button class="btn big" onclick={retake}><RotateCcw size={16} /> {t('pdf.scanner.retake')}</button>
				<button class="btn primary big" onclick={keep}><Check size={18} /> {t('pdf.scanner.keep')}</button>
			</div>
		</div>
	{/if}

	<input bind:this={fileInput} type="file" accept="image/*,.heic,.heif" multiple hidden onchange={(e) => { importFiles(e.currentTarget.files); e.currentTarget.value = ''; }} />
	<input bind:this={nativeInput} type="file" accept="image/*" capture="environment" hidden onchange={(e) => { importFiles(e.currentTarget.files); e.currentTarget.value = ''; }} />
</div>

<style>
	.scanner { position: fixed; inset: 0; z-index: 300; background: #000; color: #fff; display: grid; grid-template-rows: 1fr; overflow: hidden; touch-action: manipulation; }
	.cam { position: absolute; inset: 0; }
	video { width: 100%; height: 100%; object-fit: cover; display: block; background: #000; }
	.mirror { transform: scaleX(-1); }
	.overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
	.overlay polygon { fill: rgb(221 32 107 / 0.16); stroke: var(--accent); stroke-width: 3; stroke-linejoin: round; transition: fill 0.25s, stroke 0.25s; }
	.overlay polygon.stable { fill: rgb(61 220 151 / 0.2); stroke: var(--ok); }
	.flash { position: absolute; inset: 0; background: #fff; animation: flash 0.18s ease-out forwards; pointer-events: none; }
	@keyframes flash { from { opacity: 0.85; } to { opacity: 0; } }
	.center { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; text-align: center; padding: 24px; }
	.center.glass { background: rgb(0 0 0 / 0.45); }
	.center.err p { max-width: 420px; line-height: 1.5; color: #d7dae4; }
	.hint {
		position: absolute; left: 50%; bottom: calc(150px + env(safe-area-inset-bottom)); transform: translateX(-50%);
		padding: 8px 14px; border-radius: 99px; background: rgb(0 0 0 / 0.55); backdrop-filter: blur(8px); font-size: 0.88rem; white-space: nowrap;
	}
	.bar { position: absolute; left: 0; right: 0; display: flex; align-items: center; gap: 10px; padding: 12px 14px; z-index: 2; }
	.top { top: 0; padding-top: calc(12px + env(safe-area-inset-top)); background: linear-gradient(rgb(0 0 0 / 0.6), transparent); }
	.bottom {
		bottom: 0; justify-content: space-between; padding: 18px 22px calc(22px + env(safe-area-inset-bottom));
		background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
	}
	.round {
		width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; flex-shrink: 0;
		background: rgb(255 255 255 / 0.14); color: #fff; backdrop-filter: blur(10px); transition: background 0.15s, transform 0.12s;
	}
	.round:hover { background: rgb(255 255 255 / 0.24); }
	.round:active { transform: scale(0.94); }
	.round.on { background: #fff; color: #111; }
	.tg { display: flex; gap: 8px; margin-left: auto; }
	.filters { display: flex; gap: 2px; padding: 3px; border-radius: 99px; background: rgb(0 0 0 / 0.45); backdrop-filter: blur(10px); overflow-x: auto; scrollbar-width: none; }
	.filters button { border: 0; background: none; color: #cfd3de; font-size: 0.8rem; padding: 7px 11px; border-radius: 99px; white-space: nowrap; min-height: 34px; }
	.filters button[aria-checked='true'] { background: #fff; color: #111; font-weight: 600; }
	.shutter { position: relative; width: 78px; height: 78px; border-radius: 50%; border: 0; background: none; padding: 0; flex-shrink: 0; }
	.shutter .ring {
		position: absolute; inset: 0; border-radius: 50%;
		background: conic-gradient(var(--ok) calc(var(--p) * 360deg), rgb(255 255 255 / 0.9) 0);
		mask: radial-gradient(circle, transparent 33px, #000 34px); -webkit-mask: radial-gradient(circle, transparent 33px, #000 34px);
	}
	.shutter .dot { position: absolute; inset: 8px; border-radius: 50%; background: #fff; transition: transform 0.12s var(--ease); }
	.shutter:active .dot { transform: scale(0.9); }
	.shutter:disabled { opacity: 0.5; }
	.thumb {
		position: relative; width: 54px; height: 54px; border-radius: 12px; border: 2px solid rgb(255 255 255 / 0.85); padding: 0; overflow: visible;
		background: rgb(255 255 255 / 0.12); color: #fff; display: grid; place-items: center; flex-shrink: 0;
	}
	.thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; animation: pop 0.3s var(--ease); }
	.thumb:disabled { opacity: 0.6; cursor: default; }
	.badge { position: absolute; top: -8px; right: -8px; min-width: 22px; height: 22px; border-radius: 99px; background: var(--accent); font-size: 0.75rem; font-weight: 700; display: grid; place-items: center; padding: 0 6px; }
	.side { display: flex; align-items: center; gap: 8px; min-width: 54px; justify-content: flex-end; }
	.done { min-height: 44px; display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 99px; border: 0; background: var(--accent); color: #fff; font-weight: 600; }
	.big { min-height: 46px; padding: 0 18px; font-size: 0.95rem; }
	.row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
	.review { position: absolute; inset: 0; z-index: 5; background: #0b0c10; display: grid; grid-template-rows: 1fr auto; }
	.rv-view { min-height: 0; padding-top: env(safe-area-inset-top); }
	.rv-bar { display: flex; justify-content: center; gap: 12px; padding: 14px 16px calc(16px + env(safe-area-inset-bottom)); border-top: 1px solid rgb(255 255 255 / 0.08); }
	.rv-bar .btn { flex: 1; max-width: 220px; }
	@keyframes pop { from { transform: scale(0.6); opacity: 0; } }
	@media (max-width: 560px) {
		.top { flex-wrap: wrap; }
		.filters { order: 3; width: 100%; justify-content: center; }
		.hint { bottom: calc(132px + env(safe-area-inset-bottom)); }
	}
	@media (prefers-reduced-motion: reduce) { .flash { display: none; } }
</style>
