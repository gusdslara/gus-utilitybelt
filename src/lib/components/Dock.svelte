<script lang="ts">
	import { FileCode, Image as ImageIcon, Clapperboard, Shield, Code, Type, IdCard, ClipboardList, Bot, MessageCircle } from '@lucide/svelte';
	import { clipboard } from '#lib/clipboard/history.svelte.ts';
	import { categoryLabel } from '#lib/tools/registry.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import type { AppId as Current } from '#lib/ai/ui.svelte.ts';
	import LanguageSelector from './LanguageSelector.svelte';
	let { current, onselect }: { current: Current; onselect: (id: Current) => void } = $props();

	const items = $derived<{ id: Current; label: string; icon: typeof Shield }[]>([
		{ id: 'editor', label: t('app.dock.editor'), icon: FileCode },
		{ id: 'image', label: t('app.dock.image'), icon: ImageIcon },
		{ id: 'motion', label: t('app.dock.motion'), icon: Clapperboard },
		{ id: 'seguranca', label: categoryLabel('seguranca'), icon: Shield },
		{ id: 'dev', label: categoryLabel('dev'), icon: Code },
		{ id: 'conteudo', label: categoryLabel('conteudo'), icon: Type },
		{ id: 'whatsapp', label: categoryLabel('whatsapp'), icon: MessageCircle },
		{ id: 'documentos', label: categoryLabel('documentos'), icon: IdCard }
	]);
</script>

<nav class="dock" aria-label={t('app.dock.label')}>
	{#each items as it, i (it.id)}
		{#if i === 3}<span class="divider" aria-hidden="true"></span>{/if}
		<button class="app" class:active={current === it.id} data-app={it.id} aria-label={it.label} aria-current={current === it.id ? 'page' : undefined} onclick={() => onselect(it.id)}>
			<it.icon size={22} strokeWidth={1.75} />
			<span class="tip" role="tooltip">{it.label}</span>
			<span class="dot" aria-hidden="true"></span>
		</button>
	{/each}
	<span class="spring" aria-hidden="true"></span>
	<button class="app" class:active={current === 'api'} data-app="api" aria-label={t('app.dock.api')} aria-current={current === 'api' ? 'page' : undefined} onclick={() => onselect('api')}>
		<Bot size={22} strokeWidth={1.75} />
		<span class="tip" role="tooltip">{t('app.dock.api')}</span>
		<span class="dot" aria-hidden="true"></span>
	</button>
	<button class="app" class:active={current === 'clipboard'} data-app="clipboard" aria-label={t('app.dock.clipboardCount', { count: clipboard.count })} aria-current={current === 'clipboard' ? 'page' : undefined} onclick={() => onselect('clipboard')}>
		<ClipboardList size={22} strokeWidth={1.75} />
		{#if clipboard.count}<span class="badge">{clipboard.count > 99 ? '99+' : clipboard.count}</span>{/if}
		<span class="tip" role="tooltip">{t('app.dock.clipboard')}</span>
		<span class="dot" aria-hidden="true"></span>
	</button>
	<LanguageSelector />
</nav>

<style>
	.dock {
		position: fixed; left: 12px; top: 12px; bottom: 12px;
		display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 8px;
		background: rgb(22 25 34 / 0.72);
		backdrop-filter: blur(22px) saturate(1.4);
		-webkit-backdrop-filter: blur(22px) saturate(1.4);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow: var(--shadow-dock);
		z-index: 10;
	}
	.dock :global(.app) {
		position: relative; width: 48px; height: 48px; display: grid; place-items: center; flex-shrink: 0;
		border-radius: 14px; border: 0; background: rgb(255 255 255 / 0.06); color: var(--text-2);
		transition: transform 0.25s var(--ease), background 0.2s, color 0.2s;
	}
	.dock :global(.app):hover { transform: scale(1.08); background: rgb(255 255 255 / 0.12); color: var(--text); }
	.dock :global(.app):active { transform: scale(0.97); }
	.dock :global(.app.active) { color: #fff; background: linear-gradient(160deg, var(--accent), #a3154f); }
	.dock :global(.dot) { position: absolute; left: -7px; width: 4px; height: 4px; border-radius: 50%; background: transparent; }
	.dock :global(.app.active .dot) { background: var(--text); }
	.dock :global(.tip) {
		position: absolute; left: calc(100% + 14px); top: 50%; transform: translate(-4px, -50%);
		white-space: nowrap; font-size: 0.78rem; padding: 5px 10px; border-radius: 8px;
		background: var(--surface-solid); border: 1px solid var(--border); color: var(--text);
		opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.15s var(--ease);
	}
	.dock :global(.app:hover .tip), .dock :global(.app:focus-visible .tip) { opacity: 1; transform: translate(0, -50%); }
	.spring { flex: 1; min-height: 12px; }
	.badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px; background: var(--accent); color: #fff; font-size: 0.65rem; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 0 2px var(--surface-solid); font-variant-numeric: tabular-nums; }
	.divider { height: 1px; width: 70%; margin: 4px 0; background: var(--border); flex-shrink: 0; }

	@media (max-width: 720px) {
		.dock { top: auto; left: 6px; right: 6px; bottom: 8px; flex-direction: row; justify-content: center; padding: 6px; gap: 3px; border-radius: 18px; }
		.dock :global(.app) { width: auto; flex: 1 1 0; min-width: 0; max-width: 44px; height: 44px; padding: 0; border-radius: 12px; }
		.dock :global(.dot) { left: auto; bottom: -6px; }
		.divider { width: 1px; height: auto; align-self: stretch; margin: 6px 1px; }
		.dock :global(.tip) { display: none; }
		.spring { flex: 0 0 1px; min-height: 0; width: 1px; align-self: stretch; margin: 6px 1px; background: var(--border); }
	}
	@media (prefers-reduced-motion: reduce) { .dock :global(.app):hover { transform: none; } }
</style>
