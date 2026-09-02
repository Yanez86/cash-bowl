<script lang="ts">
	import { resolve } from '$app/paths';
	import { categoryLabel } from '$lib/CategoryLabel';
	import MonthNav from '$lib/MonthNav.svelte';
	import { translator } from '$lib/i18n';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));
</script>

<MonthNav ym={data.ym} path={resolve('/expenses')} locale={data.locale} />

<h1>{t('expenses.title')}</h1>

{#if data.entries.length === 0}
	<p>{t('expenses.empty')} <a href={resolve('/')}>{t('expenses.addOne')}</a></p>
{:else}
	<div class="scroller">
		<table>
			<caption class="hint">
				{t('expenses.summary', {
					count: data.entries.length,
					amount: euro(data.summary.spent)
				})}
			</caption>
			<thead>
				<tr>
					<th scope="col">{t('common.date')}</th>
					<th scope="col">{t('common.category')}</th>
					<th scope="col">{t('common.note')}</th>
					<th scope="col">{t('common.who')}</th>
					<th scope="col">{t('common.amount')}</th>
					<th scope="col">{t('common.actions')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.entries as entry (entry.id)}
					<tr>
						<td>{entry.occurred_on}</td>
						<td>{categoryLabel(t, entry.category_root_key ?? '', entry.category_child)}</td>
						<td>
							{entry.note ?? t('common.none')}
							{#if entry.visibility === 'private'}
								<span class="hint">{t('entry.private')}</span>
							{/if}
							{#if entry.receipt_count > 0}
								<span class="hint">📷 {entry.receipt_count}</span>
							{/if}
						</td>
						<td>{entry.author}</td>
						<td>{euro(entry.amount_cents ?? 0)}</td>
						<td>
							<a href={resolve('/expenses/[id]', { id: String(entry.id) })}>
								{t('common.edit')}
								<span class="visually-hidden">
									{t('expenses.editOne', { date: entry.occurred_on })}
								</span>
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
