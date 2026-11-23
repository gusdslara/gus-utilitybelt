<script lang="ts" module>
	export type MenuItem = { cmd: string; label: string; key?: string; disabled?: boolean; checked?: boolean } | { sep: true } | { header: string };
	export type MenuDef = { id: string; label: string; items: MenuItem[] };
</script>

<script lang="ts">
	// Barra de menus (desktop): abre no clique, troca no hover, navega por teclado. No celular vira acordeão (mode="list").
	import { ChevronDown, Check } from '@lucide/svelte';
	let { menus, run, mode = 'bar' }: { menus: MenuDef[]; run: (cmd: string) => void; mode?: 'bar' | 'list' } = $props();

	let open = $state<string | null>(null);
	let barEl: HTMLElement | undefined = $state();

	function pick(cmd: string) {
		open = null;
		run(cmd);
	}

	$effect(() => {
		if (!open || mode !== 'bar') return;
		const onDoc = (e: PointerEvent) => {
			if (!barEl?.contains(e.target as Node)) open = null;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				open = null;
				e.stopPropagation();
			}
		};
		document.addEventListener('pointerdown', onDoc, true);
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('pointerdown', onDoc, true);
			document.removeEventListener('keydown', onKey, true);
		};
	});

	function itemsKey(e: KeyboardEvent) {
		const list = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
		const i = list.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const idx = menus.findIndex((m) => m.id === open);
			open = menus[(idx + (e.key === 'ArrowRight' ? 1 : -1) + menus.length) % menus.length].id;
			queueMicrotask(() => barEl?.querySelector<HTMLButtonElement>('.drop button:not(:disabled)')?.focus());
		}
	}
</script>

{#snippet items(list: MenuItem[])}
	{#each list as it, i (i)}
		{#if 'sep' in it}<hr />
		{:else if 'header' in it}<p class="hdr">{it.header}</p>
		{:else}
			<button role="menuitem" disabled={it.disabled} onclick={() => pick(it.cmd)}>
				<span class="ck">{#if it.checked}<Check size={14} />{/if}</span>
				<span class="lb">{it.label}</span>
				{#if it.key}<kbd>{it.key}</kbd>{/if}
			</button>
		{/if}
	{/each}
{/snippet}

{#if mode === 'bar'}
	<div class="bar" bind:this={barEl} role="menubar" tabindex="-1">
		{#each menus as m (m.id)}
			<div class="mwrap">
				<button
					class="top"
					class:on={open === m.id}
					role="menuitem"
					aria-haspopup="true"
					aria-expanded={open === m.id}
					onclick={() => (open = open === m.id ? null : m.id)}
					onpointerenter={() => open && (open = m.id)}
					onkeydown={(e) => {
						if (e.key === 'ArrowDown') {
							e.preventDefault();
							open = m.id;
							queueMicrotask(() => barEl?.querySelector<HTMLButtonElement>('.drop button:not(:disabled)')?.focus());
						}
					}}>{m.label}</button
				>
				{#if open === m.id}
					<div class="drop" role="menu" tabindex="-1" onkeydown={itemsKey}>
						{@render items(m.items)}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="list">
		{#each menus as m (m.id)}
			<details>
				<summary>{m.label}<ChevronDown size={16} /></summary>
				<div class="sub" role="menu">{@render items(m.items)}</div>
			</details>
		{/each}
	</div>
{/if}

<style>
	.bar { display: flex; gap: 1px; }
	.mwrap { position: relative; }
	.top { background: transparent; border: 0; padding: 6px 10px; border-radius: 6px; font-size: 0.84rem; color: var(--text-2); }
	.top:hover, .top.on { background: var(--surface-3); color: var(--text); }
	.drop {
		position: absolute; top: calc(100% + 4px); left: 0; z-index: 40; min-width: 250px; max-height: min(70dvh, 620px); overflow: auto;
		padding: 5px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface-solid);
		box-shadow: 0 18px 50px rgb(0 0 0 / 0.55); animation: in 0.12s var(--ease);
	}
	@keyframes in { from { opacity: 0; transform: translateY(-4px); } }
	button[role='menuitem']:not(.top) {
		width: 100%; display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 8px; text-align: left;
		padding: 7px 10px; border: 0; border-radius: 6px; background: transparent; font-size: 0.85rem; color: var(--text);
	}
	button[role='menuitem']:not(.top):hover:not(:disabled), button[role='menuitem']:not(.top):focus-visible { background: var(--accent-soft); outline: none; }
	button:disabled { opacity: 0.4; cursor: default; }
	.ck { display: inline-grid; color: var(--accent); }
	kbd { font-family: var(--mono); font-size: 0.7rem; color: var(--text-3); }
	hr { border: 0; border-top: 1px solid var(--border); margin: 4px 6px; }
	.hdr { font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-3); padding: 8px 10px 3px; font-weight: 650; }
	.list { display: grid; gap: 4px; }
	details { border: 1px solid var(--border); border-radius: var(--radius-sm); background: rgb(0 0 0 / 0.15); }
	summary { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; font-weight: 600; cursor: pointer; list-style: none; min-height: 44px; }
	summary::-webkit-details-marker { display: none; }
	details[open] summary :global(svg) { transform: rotate(180deg); }
	.sub { padding: 0 6px 6px; }
	.list button[role='menuitem'] { min-height: 44px; }
	.list kbd { display: none; }
</style>
