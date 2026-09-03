<script lang="ts">
	import { resolve } from '$app/paths';
	import CategoryTag from '$lib/CategoryTag.svelte';
	import Icon from '$lib/Icon.svelte';
	import MonthNav from '$lib/MonthNav.svelte';
	import { translator } from '$lib/i18n';
	import { dayLabel, dayParts } from '$lib/dates';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));
	const parts = $derived((iso: string) => dayParts(iso, data.locale));
</script>

<MonthNav ym={data.ym} path={resolve('/expenses')} locale={data.locale} />

<h1>{t('expenses.title')}</h1>

{#if data.entries.length === 0}
	<p>{t('expenses.empty')} <a href={resolve('/expenses/new')}>{t('expenses.addOne')}</a></p>
{:else}
	<p class="hint">
		{t('expenses.summary', { count: data.entries.length, amount: euro(data.summary.spent) })}
	</p>

	<ul class="records">
		{#each data.entries as entry (entry.id)}
			{@const date = parts(entry.occurred_on)}
			<li>
				<time class="date" datetime={entry.occurred_on}>
					<span class="day">{date.day}</span>
					<span class="month">{date.month}</span>
					<span class="year">{date.year}</span>
				</time>

				<p class="meta">
					<CategoryTag
						{t}
						rootKey={entry.category_root_key ?? ''}
						child={entry.category_child}
						icon={entry.category_icon}
					/>
					{#if entry.visibility === 'private'}
						<span class="hint">{t('entry.private')}</span>
					{/if}
					{#if entry.receipt_count > 0}
						<span class="hint with-icon">
							<Icon name="camera" size={16} />
							{t('receipt.count', { count: entry.receipt_count })}
						</span>
					{/if}
				</p>

				<p class="amount">{euro(entry.amount_cents ?? 0)}</p>

				<a class="icon-button" href={resolve('/expenses/[id]', { id: String(entry.id) })}>
					<Icon name="pencil" />
					<span class="visually-hidden">
						{t('expenses.editOne', { date: dayLabel(entry.occurred_on, data.locale) })}
					</span>
				</a>

				{#if entry.note}<p class="note hint">{entry.note}</p>{/if}

				<p class="author"><span class="tag">{entry.author}</span></p>
			</li>
		{/each}
	</ul>
{/if}
