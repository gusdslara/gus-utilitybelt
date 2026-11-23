<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { installBridge } from '#lib/ai/bridge.ts';
	import { i18n } from '#lib/i18n/index.svelte.ts';
	let { children } = $props();

	onMount(() => {
		// Idioma: escolha salva > idioma do navegador > inglês (igual à landing).
		i18n.init();
		// API para IAs e automação (window.utilitybelt + WebMCP + postMessage) em todas as páginas.
		return installBridge();
	});
</script>

<svelte:head>
	<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
	<link rel="alternate" type="application/json" href="/tools.json" title="tools.json" />
</svelte:head>

{@render children()}
