<script lang="ts">
	import { onMount } from 'svelte';
	import { editor } from '#lib/image/editor.svelte.ts';
	import { doc } from '#lib/image/doc.svelte.ts';
	import { fitTextBox } from '#lib/image/render.ts';
	import { t } from '#lib/i18n/index.svelte.ts';

	let host: HTMLDivElement;
	let base: HTMLCanvasElement;
	let overlay: HTMLCanvasElement;
	let textArea: HTMLTextAreaElement | undefined = $state();

	onMount(() => {
		editor.attach(base, overlay);
		const ro = new ResizeObserver(() => {
			const r = host.getBoundingClientRect();
			editor.setViewSize(r.width, r.height, Math.min(2, devicePixelRatio || 1));
		});
		ro.observe(host);
		// wheel precisa de passive: false para impedir o scroll da página.
		const onWheel = (e: WheelEvent) => {
			const r = host.getBoundingClientRect();
			editor.wheel(e, e.clientX - r.left, e.clientY - r.top);
		};
		host.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			ro.disconnect();
			host.removeEventListener('wheel', onWheel);
			editor.detach();
		};
	});

	// Recompõe quando qualquer propriedade visível das camadas muda.
	$effect(() => {
		void doc.rev;
		void doc.width;
		void doc.height;
		for (const l of doc.layers) {
			void l.visible; void l.opacity; void l.blend; void l.rev;
			JSON.stringify(l.vector);
			JSON.stringify(l.effects);
		}
		editor.invalidate();
	});

	$effect(() => {
		void editor.tool; void editor.zoom; void editor.cropBox; void editor.samPoints; void doc.selRev; void doc.activeId;
		editor.requestRender(true);
	});

	const pos = (e: PointerEvent) => {
		const r = host.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top] as const;
	};

	function down(e: PointerEvent) {
		if (editor.textEditing && e.target === overlay) editor.finishText();
		host.setPointerCapture(e.pointerId);
		e.preventDefault();
		editor.pointerDown(e, ...pos(e));
	}

	// Editor de texto sobre o canvas, na posição da camada.
	const textLayer = $derived(editor.textEditing ? doc.layers.find((l) => l.id === editor.textEditing) : undefined);
	const textBox = $derived.by(() => {
		const v = textLayer?.vector;
		if (!v || v.type !== 'text') return null;
		void doc.rev;
		fitTextBox(v);
		return {
			left: editor.panX + v.x * editor.zoom,
			top: editor.panY + v.y * editor.zoom,
			width: Math.max(120, v.w * editor.zoom + 24),
			height: Math.max(40, v.h * editor.zoom + 8),
			font: `${v.italic ? 'italic ' : ''}${v.weight} ${Math.max(12, Math.min(48, v.size * editor.zoom))}px ${v.font}`,
			rotation: v.rotation
		};
	});

	$effect(() => {
		if (textBox && textArea) {
			textArea.focus({ preventScroll: true });
		}
	});

	function onText(e: Event) {
		const v = textLayer?.vector;
		if (v?.type !== 'text') return;
		editor.propsHistory(t('image.hist.editText'));
		v.text = (e.target as HTMLTextAreaElement).value;
		doc.changed();
	}
</script>

<div
	class="viewport"
	bind:this={host}
	style:cursor={editor.hoverCursor}
	role="application"
	aria-label={t('image.canvasLabel')}
	onpointerdown={down}
	onpointermove={(e) => editor.pointerMove(e, ...pos(e))}
	onpointerup={(e) => editor.pointerUp(e, ...pos(e))}
	onpointercancel={(e) => editor.pointerCancel(e)}
	onpointerleave={() => editor.pointerLeave()}
	oncontextmenu={(e) => e.preventDefault()}
>
	<canvas bind:this={base} class="layer"></canvas>
	<canvas bind:this={overlay} class="layer"></canvas>
	{#if textBox && textLayer?.vector?.type === 'text'}
		<textarea
			bind:this={textArea}
			class="text-edit"
			style:left="{textBox.left}px"
			style:top="{textBox.top + textBox.height + 6}px"
			style:font={textBox.font}
			value={textLayer.vector.text}
			placeholder={t('image.textPlaceholder')}
			aria-label={t('image.textPlaceholder')}
			oninput={onText}
			onpointerdown={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				e.stopPropagation();
				if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) editor.finishText();
			}}
		></textarea>
	{/if}
</div>

<style>
	.viewport {
		position: relative; flex: 1; min-width: 0; min-height: 0; overflow: hidden;
		background: var(--img-workspace, #12141b);
		touch-action: none; user-select: none; -webkit-user-select: none;
	}
	.layer { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
	.text-edit {
		position: absolute; z-index: 3; min-width: 180px; max-width: min(520px, calc(100% - 16px)); min-height: 44px;
		resize: both; padding: 8px 10px; border-radius: var(--radius-sm);
		background: rgb(14 16 22 / 0.92); color: #fff; border: 1px solid var(--accent);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.5); line-height: 1.2;
	}
	.text-edit:focus { outline: none; }
</style>
