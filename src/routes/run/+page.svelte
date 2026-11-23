<script lang="ts">
	// Execução por link: /run?action=uuid_generate&version=7&count=3
	// Pensado para IAs de navegador (Leo, Copilot, Gemini, Comet, Atlas…) que só abrem URLs e leem a página:
	// o resultado aparece em <pre id="ub-result" data-status="ok|error"> como JSON.
	import ApiConsole from '#lib/components/ApiConsole.svelte';
	import { t } from '#lib/i18n/index.svelte.ts';
</script>

<svelte:head>
	<title>{t('api.runTitle')} · Gus Utility Belt</title>
	<meta name="description" content={t('api.runDescription')} />
</svelte:head>

<main class="run">
	<header class="bar">
		<a href="/" class="brand">Gus Utility Belt</a>
		<span class="hint">{t('api.runSubtitle')} · <a href="/llms.txt">llms.txt</a> · <a href="/tools.json">tools.json</a></span>
	</header>
	<ApiConsole standalone />
</main>

<style>
	.run { min-height: 100dvh; background: var(--bg); display: grid; grid-template-rows: auto 1fr; }
	.bar { display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap; padding: 12px 20px; border-bottom: 1px solid var(--border); background: var(--surface-solid); }
	.brand { font-weight: 650; color: var(--text); text-decoration: none; }
	.bar a:not(.brand) { color: var(--text-2); }
</style>
