<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { categoryLabel } from '$lib/CategoryLabel';
	import { translator } from '$lib/i18n';
	import { monthLabel } from '$lib/dates';
	import { amountForInput, formatAmount } from '$lib/money';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));

	const KIND_LABEL = {
		fixed: 'recurring.kindFixed',
		expense: 'recurring.kindExpense',
		income: 'recurring.kindIncome'
	} as const;

	let kind = $state('fixed');
</script>

<h1>{t('recurring.title')}</h1>
<p>{t('recurring.intro', { month: monthLabel(data.thisMonth, data.locale) })}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.created}
	<p class="notice" role="status">{t('recurring.created', { name: form.created })}</p>
{/if}
{#if form?.updated}<p class="notice" role="status">{t('recurring.updated')}</p>{/if}
{#if form?.toggled}<p class="notice" role="status">{t('recurring.toggled')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('recurring.removed')}</p>{/if}

{#if data.items.length === 0}
	<p>{t('recurring.empty')}</p>
{:else}
	<ul class="items">
		{#each data.items as item (item.id)}
			<li class:inactive={!item.is_active}>
				<p class="head">
					<strong>{item.description}</strong>
					<span class="hint">
						{t(KIND_LABEL[item.kind])}
						{#if item.category_root_key}
							· {categoryLabel(t, item.category_root_key, item.category_child)}
						{/if}
						· {t('recurring.everyMonthOn', { day: item.day_of_month })}
						· {t('recurring.since', { month: monthLabel(item.starts_ym, data.locale) })}
						{#if !item.is_active}· {t('recurring.suspended')}{/if}
					</span>
				</p>

				<form method="post" action="?/update" class="row">
					<Csrf token={data.csrf} />
					<input type="hidden" name="id" value={item.id} />
					<label class="visually-hidden" for={`description-${item.id}`}>
						{t('recurring.descriptionOf', { name: item.description })}
					</label>
					<input
						id={`description-${item.id}`}
						name="description"
						value={item.description}
						maxlength="100"
						required
					/>
					<label class="visually-hidden" for={`amount-${item.id}`}>
						{t('recurring.amountOf', { name: item.description })}
					</label>
					<input
						id={`amount-${item.id}`}
						name="amount"
						inputmode="decimal"
						value={amountForInput(item.amount_cents)}
						required
					/>
					<button type="submit" class="quiet">{t('common.save')}</button>
				</form>

				<div class="row">
					<form method="post" action="?/toggle">
						<Csrf token={data.csrf} />
						<input type="hidden" name="id" value={item.id} />
						<input type="hidden" name="active" value={item.is_active ? '0' : '1'} />
						<button type="submit" class="quiet">
							{item.is_active ? t('recurring.suspend') : t('recurring.resume')}
							<span class="visually-hidden">{item.description}</span>
						</button>
					</form>
					<form method="post" action="?/remove">
						<Csrf token={data.csrf} />
						<input type="hidden" name="id" value={item.id} />
						<button type="submit" class="quiet">
							{t('common.delete')} <span class="visually-hidden">{item.description}</span>
						</button>
					</form>
					<span class="hint">{euro(item.amount_cents)}</span>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<h2>{t('recurring.addTitle')}</h2>
<p class="hint">{t('recurring.addHint')}</p>
<form method="post" action="?/create">
	<Csrf token={data.csrf} />
	<label for="kind">{t('recurring.kind')}</label>
	<select id="kind" name="kind" bind:value={kind}>
		<option value="fixed">{t('recurring.kindFixed')}</option>
		<option value="expense">{t('recurring.kindExpense')}</option>
		<option value="income">{t('recurring.kindIncome')}</option>
	</select>

	<label for="description">{t('plan.description')}</label>
	<input
		id="description"
		name="description"
		maxlength="100"
		placeholder={t('recurring.example')}
		required
	/>

	<label for="amount"
		>{t('common.amount')} <span class="hint">{t('common.amountExample')}</span></label
	>
	<input id="amount" name="amount" inputmode="decimal" autocomplete="off" required />

	{#if kind === 'expense'}
		<label for="category_id">{t('common.category')}</label>
		<select id="category_id" name="category_id" required>
			<option value="">{t('common.choose')}</option>
			{#each data.categories as choice (choice.id)}
				<option value={choice.id}>{categoryLabel(t, choice.rootKey, choice.child)}</option>
			{/each}
		</select>
	{/if}

	<label for="day_of_month">
		{t('recurring.day')} <span class="hint">{t('recurring.dayHint')}</span>
	</label>
	<input id="day_of_month" name="day_of_month" type="number" min="1" max="28" value="1" required />

	<p><button type="submit">{t('recurring.createSubmit')}</button></p>
</form>

<style>
	.items {
		list-style: none;
		padding-left: 0;
	}
	.items li {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.6rem 0.8rem;
		margin-bottom: 0.75rem;
		background: var(--surface);
	}
	.head {
		margin: 0 0 0.5rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.row input[name='description'] {
		flex: 2 1 12rem;
		width: auto;
	}
	.row input[name='amount'] {
		flex: 1 1 7rem;
		width: auto;
	}
	.inactive {
		opacity: 0.65;
	}
</style>
