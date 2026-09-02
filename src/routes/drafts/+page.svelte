<script lang="ts">
	import { resolve } from '$app/paths';
	import { translator } from '$lib/i18n';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number | null) =>
		cents === null ? t('drafts.missingAmount') : formatAmount(cents, data.locale, data.currency)
	);
</script>

<h1>{t('drafts.title')}</h1>
<p>{t('drafts.intro')}</p>

{#if data.drafts.length === 0}
	<p>{t('drafts.empty')}</p>
{:else}
	<div class="scroller">
		<table>
			<caption class="hint">{t('drafts.oldestFirst')}</caption>
			<thead>
				<tr>
					<th scope="col">{t('common.date')}</th>
					<th scope="col">{t('common.amount')}</th>
					<th scope="col">{t('common.note')}</th>
					<th scope="col">{t('common.who')}</th>
					<th scope="col">{t('common.actions')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.drafts as draft (draft.id)}
					<tr>
						<td>{draft.occurred_on}</td>
						<td>{euro(draft.amount_cents)}</td>
						<td>
							{draft.note ?? t('common.none')}
							{#if draft.receipt_count > 0}
								<span class="hint">📷 {draft.receipt_count}</span>
							{/if}
						</td>
						<td>{draft.author}</td>
						<td>
							<a href={resolve('/expenses/[id]', { id: String(draft.id) })}>
								{t('common.edit')}
								<span class="visually-hidden">
									{t('drafts.complete', { date: draft.occurred_on })}
								</span>
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
