<script lang="ts">
	import { resolve } from '$app/paths';
	import Bars from '$lib/Bars.svelte';
	import Icon from '$lib/Icon.svelte';
	import { categoryLabel } from '$lib/CategoryLabel';
	import { translator } from '$lib/i18n';
	import { monthLabel } from '$lib/dates';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));

	const categoryRows = $derived(
		data.byCategory.map((slice) => ({
			label: categoryLabel(t, slice.key, null),
			amount: euro(slice.total),
			value: slice.total
		}))
	);
	const subRows = $derived(
		data.bySubCategory.map((slice) => ({
			label: slice.label,
			amount: euro(slice.total),
			value: slice.total
		}))
	);
	const monthRows = $derived(
		data.byMonth.map((slice) => ({
			label: monthLabel(slice.key, data.locale),
			amount: euro(slice.total),
			value: slice.total
		}))
	);
	const yearRows = $derived(
		data.byYear.map((slice) => ({
			label: slice.key,
			amount: euro(slice.total),
			value: slice.total
		}))
	);
</script>

<h1>{t('reports.title')}</h1>

<form method="get" class="filters">
	<div>
		<label for="from">{t('reports.from')}</label>
		<input id="from" name="from" type="month" value={data.filters.from} required />
	</div>
	<div>
		<label for="to">{t('reports.to')}</label>
		<input id="to" name="to" type="month" value={data.filters.to} required />
	</div>
	<div>
		<label for="category">{t('common.category')}</label>
		<select id="category" name="category">
			<option value="">{t('reports.allCategories')}</option>
			{#each data.categories as root (root.id)}
				<option value={root.id} selected={data.filters.categoryId === root.id}>
					{categoryLabel(t, root.kakebo_key ?? '', null)}
				</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="user">{t('common.who')}</label>
		<select id="user" name="user">
			<option value="">{t('reports.everyone')}</option>
			{#each data.people as person (person.id)}
				<option value={person.id} selected={data.filters.userId === person.id}>
					{person.display_name}
				</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="visibility">{t('reports.visibility')}</label>
		<select id="visibility" name="visibility">
			<option value="all" selected={data.filters.visibility === 'all'}>{t('reports.all')}</option>
			<option value="family" selected={data.filters.visibility === 'family'}>
				{t('reports.family')}
			</option>
			<option value="private" selected={data.filters.visibility === 'private'}>
				{t('reports.private')}
			</option>
		</select>
	</div>
	<div class="apply"><button type="submit">{t('reports.apply')}</button></div>
</form>

<p class="total">
	{t('reports.spentInRange', {
		amount: euro(data.spent),
		from: monthLabel(data.filters.from, data.locale),
		to: monthLabel(data.filters.to, data.locale)
	})}
</p>

{#if data.drafts > 0}
	<p class="notice" role="status">
		{t('reports.draftsExcluded', { count: data.drafts })}
		<a href={resolve('/drafts')}>{t('dashboard.draftsLink')}</a>
	</p>
{/if}

<p class="actions">
	<a class="with-icon" href={`${resolve('/reports/csv')}?${data.query}`} download>
		<Icon name="download" />
		{t('reports.downloadCsv')}
	</a>
	·
	<button type="button" class="quiet with-icon" onclick={() => window.print()}>
		<Icon name="printer" />
		{t('reports.print')}
	</button>
	<span class="hint">{t('reports.printHint')}</span>
</p>

{#if data.spent === 0}
	<p>{t('reports.empty')}</p>
{:else}
	<h2>{t('reports.byCategory')}</h2>
	<Bars caption={t('dashboard.spent')} header={t('common.category')} rows={categoryRows} />

	{#if subRows.length > 0}
		<h2>{t('reports.bySubCategory')}</h2>
		<Bars caption={t('dashboard.spent')} header={t('common.category')} rows={subRows} />
	{/if}

	<h2>{t('reports.byMonth')}</h2>
	<Bars caption={t('dashboard.spent')} header={t('reports.month')} rows={monthRows} />

	{#if yearRows.length > 1}
		<h2>{t('reports.byYear')}</h2>
		<Bars caption={t('dashboard.spent')} header={t('reports.year')} rows={yearRows} />
	{/if}
{/if}

<style>
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.5rem 1rem;
		align-items: end;
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: 0.5rem 0.8rem 1rem;
	}
	.filters label {
		margin-top: 0.5rem;
	}
	.apply {
		align-self: end;
	}
	.total {
		font-size: 1.2rem;
		font-weight: 700;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
</style>
