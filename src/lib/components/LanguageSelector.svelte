<script lang="ts">
	// Seletor de idioma (mesmo comportamento da landing: código do idioma + lista; escolha salva no navegador).
	import { i18n, LANGUAGES, t, type Language } from '#lib/i18n/index.svelte.ts';
	import { Languages, Check } from '@lucide/svelte';

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let items: HTMLButtonElement[] = $state([]);
	const current = $derived(LANGUAGES.find((l) => l.value === i18n.lang)!);

	function choose(l: Language) {
		// Página com versão em outro idioma (SEO): vai para a URL equivalente.
		const alt = i18n.alternates[l];
		if (alt && l !== i18n.lang) {
			i18n.set(l);
			location.href = alt;
			return;
		}
		i18n.set(l);
		open = false;
		root?.querySelector<HTMLButtonElement>('.trigger')?.focus();
	}

	function toggle() {
		open = !open;
		if (open) queueMicrotask(() => items[LANGUAGES.findIndex((l) => l.value === i18n.lang)]?.focus());
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		const i = items.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === 'Escape') { open = false; root?.querySelector<HTMLButtonElement>('.trigger')?.focus(); }
		else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
	}
</script>

<svelte:window onclick={(e) => { if (open && root && !root.contains(e.target as Node)) open = false; }} />

<div class="lang" bind:this={root} onkeydown={onKey} role="presentation">
	<button class="app trigger" class:on={open} aria-haspopup="menu" aria-expanded={open} aria-label={t('app.dock.language', { name: current.label })} onclick={toggle} data-app="language">
		<Languages size={18} strokeWidth={1.75} />
		<span class="code">{current.short}</span>
		<span class="tip" role="tooltip">{t('common.language')}</span>
	</button>
	{#if open}
		<div class="menu" role="menu" aria-label={t('common.language')}>
			{#each LANGUAGES as l, i (l.value)}
				<button bind:this={items[i]} role="menuitemradio" aria-checked={i18n.lang === l.value} lang={l.tag} class:sel={i18n.lang === l.value} onclick={() => choose(l.value)}>
					<span class="short">{l.short}</span>
					<span>{l.label}</span>
					{#if i18n.lang === l.value}<Check size={15} class="ok-ico" />{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.lang { position: relative; flex-shrink: 0; }
	.trigger { flex-direction: column; gap: 1px; }
	.code { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; line-height: 1; }
	.trigger.on { background: rgb(255 255 255 / 0.12); color: var(--text); }
	.menu {
		position: absolute; left: calc(100% + 14px); bottom: 0; min-width: 180px; padding: 6px; display: grid; gap: 2px;
		background: var(--surface-solid); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-dock);
		animation: pop 0.16s var(--ease); z-index: 20;
	}
	.menu button {
		display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 8px 10px; border: 0; border-radius: var(--radius-sm);
		background: none; color: var(--text-2); text-align: left; font-size: 0.9rem;
	}
	.menu button:hover, .menu button:focus-visible { background: rgb(255 255 255 / 0.06); color: var(--text); outline: none; }
	.menu button.sel { color: var(--text); font-weight: 600; }
	.short { font-family: var(--mono); font-size: 0.72rem; color: var(--text-3); width: 22px; }
	.menu :global(.ok-ico) { margin-left: auto; color: var(--accent); }
	@keyframes pop { from { opacity: 0; transform: translateX(-4px) scale(0.98); } to { opacity: 1; transform: none; } }
	@media (prefers-reduced-motion: reduce) { .menu { animation: none; } }
	@media (max-width: 720px) {
		.lang { flex: 1 1 0; min-width: 0; max-width: 44px; display: flex; }
		.lang .trigger { flex: 1 1 auto; width: 100%; max-width: none; }
		.menu { left: auto; right: 0; bottom: calc(100% + 12px); }
	}
</style>
