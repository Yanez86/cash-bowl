<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/Icon.svelte';
	import { translator } from '$lib/i18n';
	import { dayLabel, dayParts } from '$lib/dates';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number | null) =>
		cents === null ? t('drafts.missingAmount') : formatAmount(cents, data.locale, data.currency)
	);
	const parts = $derived((iso: string) => dayParts(iso, data.locale));
</script>

<h1>{t('drafts.title')}</h1>
<p>{t('drafts.intro')}</p>

{#if data.drafts.length === 0}
	<p>{t('drafts.empty')}</p>
{:else}
	<p class="hint">{t('drafts.oldestFirst')}</p>

	<ul class="records">
		{#each data.drafts as draft (draft.id)}
			{@const date = parts(draft.occurred_on)}
			<li>
				<time class="date" datetime={draft.occurred_on}>
					<span class="day">{date.day}</span>
					<span class="month">{date.month}</span>
					<span class="year">{date.year}</span>
				</time>

				<p class="meta">
					{#if draft.receipt_count > 0}
						<span class="hint with-icon">
							<Icon name="camera" size={16} />
							{t('receipt.count', { count: draft.receipt_count })}
						</span>
					{/if}
				</p>

				<p class="amount">{euro(draft.amount_cents)}</p>

				<a class="icon-button" href={resolve('/expenses/[id]', { id: String(draft.id) })}>
					<Icon name="pencil" />
					<span class="visually-hidden">
						{t('drafts.complete', { date: dayLabel(draft.occurred_on, data.locale) })}
					</span>
				</a>

				{#if draft.note}<p class="note hint">{draft.note}</p>{/if}

				<p class="author"><span class="tag">{draft.author}</span></p>
			</li>
		{/each}
	</ul>
{/if}
