<script lang="ts">
	import { CronExpressionParser } from 'cron-parser';
	import CopyButton from './CopyButton.svelte';
	import { describeCron as describe } from '#lib/tools/cron.ts';
	import { t, i18n } from '#lib/i18n/index.svelte.ts';

	const fields = $derived([t('tools.cron.fields.minute'), t('tools.cron.fields.hour'), t('tools.cron.fields.dom'), t('tools.cron.fields.month'), t('tools.cron.fields.dow')]);

	const presets = $derived<{ label: string; expr: string }[]>([
		{ label: t('tools.cron.presets.everyMinute'), expr: '* * * * *' },
		{ label: t('tools.cron.presets.every15'), expr: '*/15 * * * *' },
		{ label: t('tools.cron.presets.hourly'), expr: '0 * * * *' },
		{ label: t('tools.cron.presets.daily'), expr: '0 0 * * *' },
		{ label: t('tools.cron.presets.weekdays'), expr: '0 9 * * 1-5' },
		{ label: t('tools.cron.presets.weekly'), expr: '0 3 * * 0' },
		{ label: t('tools.cron.presets.monthly'), expr: '30 6 1 * *' }
	]);

	let expr = $state('0 9 * * 1-5');
	let tz = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);

	const parts = $derived(expr.trim().split(/\s+/));

	const result = $derived.by(() => {
		try {
			if (parts.length !== 5) throw new Error(t('tools.cron.fieldCount'));
			const it = CronExpressionParser.parse(expr, { tz: tz || undefined });
			return { ok: true as const, next: it.take(6).map((d) => d.toDate()), error: '' };
		} catch (e) {
			return { ok: false as const, next: [] as Date[], error: (e as Error).message };
		}
	});

	const fmt = (d: Date) =>
		new Intl.DateTimeFormat(i18n.tag, { dateStyle: 'short', timeStyle: 'medium', timeZone: tz || undefined }).format(d);

</script>

<div class="stack">
	<div class="row">
		{#each presets as p (p.expr)}
			<button class="btn" onclick={() => (expr = p.expr)} aria-pressed={expr === p.expr}>{p.label}</button>
		{/each}
	</div>

	<div class="grid-fields" role="group" aria-label={t('tools.cron.fieldsAria')}>
		{#each fields as f, i (i)}
			<label class="field">
				<span class="label">{f}</span>
				<input class="input mono" value={parts[i] ?? ''} oninput={(e) => {
					const next = [...parts];
					while (next.length < 5) next.push('*');
					next[i] = (e.currentTarget as HTMLInputElement).value.trim() || '*';
					expr = next.slice(0, 5).join(' ');
				}} aria-label={f} />
			</label>
		{/each}
	</div>

	<div class="grid-2">
		<label class="field"><span class="label">{t('tools.cron.expression')}</span><input class="input mono" bind:value={expr} aria-invalid={!result.ok} /></label>
		<label class="field"><span class="label">{t('tools.cron.timezone')}</span><input class="input mono" bind:value={tz} /></label>
	</div>

	{#if result.ok}
		<p class="ok">{describe(parts, i18n.lang)}</p>
		<div class="field">
			<span class="label">{t('tools.cron.next')}</span>
			<ol class="next">
				{#each result.next as d, i (i)}<li>{fmt(d)}</li>{/each}
			</ol>
		</div>
	{:else}
		<p class="error">{result.error}</p>
	{/if}

	<div class="row"><CopyButton text={expr} label={t('tools.cron.copy')} /></div>
	<p class="hint">{t('tools.cron.hintFields')} <code>*</code>{t('tools.cron.hintLists')} <code>1,3</code>{t('tools.cron.hintRanges')} <code>1-5</code> {t('tools.cron.hintSteps')} <code>*/10</code>.</p>
</div>

<style>
	.grid-fields { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-3); }
	.next { margin: 0; padding-left: 20px; display: grid; gap: 4px; font-family: var(--mono); font-size: 0.88rem; color: var(--text-2); }
	code { font-family: var(--mono); }
	@media (max-width: 720px) { .grid-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
