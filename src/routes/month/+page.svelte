<script lang="ts">
	import { resolve } from '$app/paths';
	import MonthNav from '$lib/MonthNav.svelte';
	import { translator } from '$lib/i18n';
	import { amountForInput, formatAmount } from '$lib/money';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));

	const sections = $derived([
		{
			action: '?/income',
			rows: data.incomes,
			title: t('plan.incomeTitle', { amount: euro(data.summary.income) }),
			empty: t('plan.incomeEmpty'),
			newLabel: t('plan.incomeNew'),
			example: t('plan.incomeExample'),
			submit: t('plan.incomeSubmit'),
			id: 'income'
		},
		{
			action: '?/fixed',
			rows: data.fixed,
			title: t('plan.fixedTitle', { amount: euro(data.summary.fixed) }),
			empty: t('plan.fixedEmpty'),
			newLabel: t('plan.fixedNew'),
			example: t('plan.fixedExample'),
			submit: t('plan.fixedSubmit'),
			id: 'fixed'
		}
	]);
</script>

<MonthNav ym={data.ym} path={resolve('/month')} locale={data.locale} />

<h1>{t('plan.title')}</h1>
<p>{t('plan.intro')}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.added}<p class="notice" role="status">{t('plan.added')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('plan.removed')}</p>{/if}
{#if form?.goalSaved}<p class="notice" role="status">{t('plan.goalSaved')}</p>{/if}

<h2>{t('plan.goalTitle')}</h2>
<form method="post" action="?/goal">
	<label for="goal">{t('plan.goalLabel')}</label>
	<input
		id="goal"
		name="amount"
		inputmode="decimal"
		value={amountForInput(data.summary.goal)}
		autocomplete="off"
	/>
	<p><button type="submit">{t('plan.goalSubmit')}</button></p>
</form>
<p>{t('plan.availableIs', { amount: euro(data.summary.available) })}</p>

{#each sections as section (section.id)}
	<h2>{section.title}</h2>
	{#if section.rows.length === 0}
		<p>{section.empty}</p>
	{:else}
		<div class="scroller">
			<table>
				<thead>
					<tr>
						<th scope="col">{t('common.date')}</th>
						<th scope="col">{t('common.note')}</th>
						<th scope="col">{t('common.amount')}</th>
						<th scope="col">{t('common.actions')}</th>
					</tr>
				</thead>
				<tbody>
					{#each section.rows as row (row.id)}
						<tr>
							<td>{row.occurred_on}</td>
							<td>{row.note ?? t('common.none')}</td>
							<td>{euro(row.amount_cents ?? 0)}</td>
							<td>
								<form method="post" action="?/remove">
									<input type="hidden" name="id" value={row.id} />
									<button type="submit" class="quiet">
										{t('common.delete')}
										<span class="visually-hidden">{row.note ?? row.occurred_on}</span>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<form method="post" action={section.action}>
		<label for={`${section.id}_amount`}>{section.newLabel}</label>
		<input
			id={`${section.id}_amount`}
			name="amount"
			inputmode="decimal"
			autocomplete="off"
			required
		/>
		<label for={`${section.id}_note`}>{t('plan.description')}</label>
		<input id={`${section.id}_note`} name="note" maxlength="500" placeholder={section.example} />
		<label for={`${section.id}_date`}>{t('common.date')}</label>
		<input
			id={`${section.id}_date`}
			name="occurred_on"
			type="date"
			value={`${data.ym}-01`}
			required
		/>
		<p><button type="submit">{section.submit}</button></p>
	</form>
{/each}
