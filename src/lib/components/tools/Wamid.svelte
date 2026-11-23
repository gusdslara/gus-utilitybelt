<script lang="ts">
	// Decodificador de WAMID (aceita vários, ou o JSON inteiro do webhook) e gerador para testes.
	import { decodeWamid, encodeWamid } from '#lib/tools/whatsapp.ts';
	import { t } from '#lib/i18n/index.svelte.ts';
	import CopyButton from './CopyButton.svelte';
	import { ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw } from '@lucide/svelte';

	let mode = $state<'decode' | 'encode'>('decode');
	let input = $state('wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJBMTE4RTUA');

	// Encontra wamids em qualquer texto (linhas soltas ou JSON do webhook).
	const items = $derived.by(() => {
		const text = input.trim();
		if (!text) return [];
		let found: string[] = text.match(/wamid\.[A-Za-z0-9+/_=-]+/g) ?? [];
		if (!found.length) found = text.split(/\s+/).filter(Boolean);
		return [...new Set(found)].slice(0, 200).map(decodeWamid);
	});

	let phone = $state('5511999998888');
	let fromMe = $state(true);
	let messageId = $state('');
	let seed = $state(0);
	const generated = $derived.by(() => {
		void seed;
		const digits = phone.replace(/\D/g, '');
		return digits ? encodeWamid({ phone: digits, fromMe, messageId: messageId.trim() || undefined }) : '';
	});
</script>

<div class="stack">
	<div class="seg" role="group" aria-label={t('common.mode')}>
		<button aria-pressed={mode === 'decode'} onclick={() => (mode = 'decode')}>{t('whatsapp.wamid.decode')}</button>
		<button aria-pressed={mode === 'encode'} onclick={() => (mode = 'encode')}>{t('whatsapp.wamid.encode')}</button>
	</div>

	{#if mode === 'decode'}
		<label class="field">
			<span class="label">{t('whatsapp.wamid.input')}</span>
			<textarea class="textarea" bind:value={input} spellcheck="false"></textarea>
			<span class="hint">{t('whatsapp.wamid.inputHint')}</span>
		</label>

		{#if input.trim()}
			<p class="hint" aria-live="polite">{items.length ? t('whatsapp.wamid.found', { count: items.length }) : t('whatsapp.wamid.none')}</p>
		{/if}

		<ul class="cards">
			{#each items as it, i (i)}
				<li class="card" class:bad={!it.valid}>
					<code class="wid">{it.wamid}</code>
					{#if it.valid}
						<dl>
							<dt>{t('whatsapp.wamid.phone')}</dt>
							<dd><code>+{it.phone}</code></dd>
							<dt>{t('whatsapp.wamid.direction')}</dt>
							<dd class="dir">
								{#if it.fromMe === true}<ArrowUpRight size={15} /> {t('whatsapp.wamid.outbound')}
								{:else if it.fromMe === false}<ArrowDownLeft size={15} /> {t('whatsapp.wamid.inbound')}
								{:else}{t('whatsapp.wamid.unknown')}{/if}
							</dd>
							<dt>{t('whatsapp.wamid.messageId')}</dt>
							<dd><code>{it.messageId}</code></dd>
							<dt>{t('whatsapp.wamid.chatType')}</dt>
							<dd>{it.chatType === 1 ? t('whatsapp.wamid.chatTypeUser', { n: 1 }) : (it.chatType ?? '—')}</dd>
						</dl>
						<div class="row">
							<CopyButton text={it.phone} label={t('whatsapp.wamid.phone')} />
							<CopyButton text={JSON.stringify({ wamid: it.wamid, phone: it.phone, fromMe: it.fromMe, messageId: it.messageId, chatType: it.chatType }, null, 2)} label={t('whatsapp.wamid.copyJson')} />
							<a class="btn ghost" href={`https://wa.me/${it.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> {t('whatsapp.wamid.openChat')}</a>
						</div>
					{:else}
						<p class="error">{t(`whatsapp.wamid.errors.${it.error}`)}</p>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="hint">{t('whatsapp.wamid.formatNote')}</p>
	{:else}
		<div class="grid-2">
			<label class="field">
				<span class="label">{t('whatsapp.wamid.genPhone')}</span>
				<input class="input mono" inputmode="tel" bind:value={phone} spellcheck="false" />
			</label>
			<label class="field">
				<span class="label">{t('whatsapp.wamid.genId')}</span>
				<input class="input mono" bind:value={messageId} spellcheck="false" placeholder="3EB0C0E4FF8C06B19F0477" />
				<span class="hint">{t('whatsapp.wamid.genIdHint')}</span>
			</label>
		</div>
		<div class="field">
			<span class="label">{t('whatsapp.wamid.genDirection')}</span>
			<div class="seg" role="radiogroup" aria-label={t('whatsapp.wamid.genDirection')}>
				<button role="radio" aria-checked={fromMe} onclick={() => (fromMe = true)}><ArrowUpRight size={14} /> {t('whatsapp.wamid.outbound')}</button>
				<button role="radio" aria-checked={!fromMe} onclick={() => (fromMe = false)}><ArrowDownLeft size={14} /> {t('whatsapp.wamid.inbound')}</button>
			</div>
		</div>
		<div class="field">
			<span class="label">{t('whatsapp.wamid.genOutput')}</span>
			<div class="out" aria-live="polite">{generated || '—'}</div>
			<div class="row">
				<CopyButton text={generated} />
				<button class="btn" onclick={() => seed++} disabled={!!messageId.trim()}><RefreshCw size={15} /> {t('common.regenerate')}</button>
			</div>
			<span class="hint">{t('whatsapp.wamid.genHint')}</span>
		</div>
	{/if}
</div>

<style>
	.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
	.card { border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-3) var(--space-4); background: rgb(0 0 0 / 0.16); display: grid; gap: var(--space-3); }
	.card.bad { border-color: rgb(255 92 108 / 0.35); }
	.wid { font-family: var(--mono); font-size: 0.78rem; color: var(--text-3); overflow-wrap: anywhere; }
	dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px var(--space-4); font-size: 0.9rem; }
	dt { color: var(--text-2); }
	dd { margin: 0; overflow-wrap: anywhere; }
	dd code { font-family: var(--mono); }
	.dir { display: inline-flex; align-items: center; gap: 6px; }
	.seg button { display: inline-flex; align-items: center; gap: 6px; }
	@media (max-width: 520px) { dl { grid-template-columns: 1fr; } dt { margin-top: 4px; } }
</style>
