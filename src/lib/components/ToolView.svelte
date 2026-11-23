<script lang="ts">
	import type { ToolId } from '#lib/tools/registry.ts';
	import Senhas from './tools/Senhas.svelte';
	import Hmac from './tools/Hmac.svelte';
	import Uuid from './tools/Uuid.svelte';
	import Cron from './tools/Cron.svelte';
	import Regex from './tools/Regex.svelte';
	import Lorem from './tools/Lorem.svelte';
	import Qr from './tools/Qr.svelte';
	import Barcode from './tools/Barcode.svelte';
	import Whatsapp from './tools/Whatsapp.svelte';
	import CpfCnpj from './tools/CpfCnpj.svelte';
	import WaHmac from './tools/WaHmac.svelte';
	import Wamid from './tools/Wamid.svelte';

	let { id }: { id: ToolId } = $props();
</script>

{#if id === 'senhas'}<Senhas />
{:else if id === 'hmac'}<Hmac />
{:else if id === 'uuid'}<Uuid />
{:else if id === 'cron'}<Cron />
{:else if id === 'regex'}<Regex />
{:else if id === 'lorem'}<Lorem />
{:else if id === 'qr'}<Qr />
{:else if id === 'barcode'}<Barcode />
{:else if id === 'whatsapp'}<Whatsapp />
{:else if id === 'wa-hmac'}<WaHmac />
{:else if id === 'wamid'}<Wamid />
{:else if id === 'cpf-cnpj'}<CpfCnpj />
{/if}
