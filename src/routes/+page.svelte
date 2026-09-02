<script lang="ts">
	import { resolve } from '$app/paths';
	import { categoryLabel } from '$lib/CategoryLabel';
	import EntryForm from '$lib/EntryForm.svelte';
	import MonthNav from '$lib/MonthNav.svelte';
	import { translator } from '$lib/i18n';
	import { formatAmount } from '$lib/money';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));
</script>

<MonthNav ym={data.ym} path={resolve('/')} locale={data.locale} />

<h1>{t('dashboard.title')}</h1>

{#if data.summary.drafts > 0}
	<p class="notice" role="status">
		{t('dashboard.drafts', { count: data.summary.drafts })}
		<a href={resolve('/drafts')}>{t('dashboard.draftsLink')}</a>
	</p>
{/if}

<dl class="summary">
	<div>
		<dt>{t('dashboard.income')}</dt>
		<dd>{euro(data.summary.income)}</dd>
	</div>
	<div>
		<dt>{t('dashboard.fixed')}</dt>
		<dd>{euro(data.summary.fixed)}</dd>
	</div>
	<div>
		<dt>{t('dashboard.goal')}</dt>
		<dd>{euro(data.summary.goal)}</dd>
	</div>
	<div>
		<dt>{t('dashboard.available')}</dt>
		<dd>{euro(data.summary.available)}</dd>
	</div>
	<div>
		<dt>{t('dashboard.spent')}</dt>
		<dd>{euro(data.summary.spent)}</dd>
	</div>
	<div class="highlight">
		<dt>{t('dashboard.remaining')}</dt>
		<dd>{euro(data.summary.remaining)}</dd>
	</div>
</dl>

{#if data.summary.remaining < 0}
	<p class="error" role="status">
		{t('dashboard.overspent', {
			amount: euro(-data.summary.remaining),
			saved: euro(data.summary.saved)
		})}
	</p>
{/if}

<p>
	<a href={`${resolve('/month')}?ym=${data.ym}`}>{t('dashboard.planLink')}</a> ·
	<a href={`${resolve('/expenses')}?ym=${data.ym}`}>{t('dashboard.expensesLink')}</a>
</p>

<h2 id="add">{t('dashboard.addTitle')}</h2>
{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.saved === 'complete'}<p class="notice" role="status">{t('dashboard.saved')}</p>{/if}
{#if form?.saved === 'draft'}
	<p class="notice" role="status">
		{t('dashboard.savedDraft')} <a href={resolve('/drafts')}>{t('dashboard.draftsLink')}</a>
	</p>
{/if}
<form method="post" action="?/add" enctype="multipart/form-data">
	<EntryForm locale={data.locale} categories={data.categories} defaultDate={data.today} />
</form>

<h2>{t('dashboard.whereTitle')}</h2>
<div class="scroller">
	<table>
		<thead>
			<tr><th scope="col">{t('common.category')}</th><th scope="col">{t('dashboard.spent')}</th></tr
			>
		</thead>
		<tbody>
			{#each data.byCategory as row (row.id)}
				<tr>
					<td>{categoryLabel(t, row.kakebo_key, null)}</td>
					<td>{euro(row.total)}</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr><th scope="row">{t('common.total')}</th><td>{euro(data.summary.spent)}</td></tr>
		</tfoot>
	</table>
</div>

<h2>{t('dashboard.latestTitle')}</h2>
{#if data.latest.length === 0}
	<p>{t('dashboard.empty')}</p>
{:else}
	<ul class="latest">
		{#each data.latest as entry (entry.id)}
			<li>
				<a href={resolve('/expenses/[id]', { id: String(entry.id) })}>
					{entry.occurred_on} · {euro(entry.amount_cents ?? 0)} ·
					{categoryLabel(t, entry.category_root_key ?? '', entry.category_child)}
					{#if entry.note}<span class="hint">— {entry.note}</span>{/if}
					{#if entry.visibility === 'private'}<span class="hint">{t('entry.private')}</span>{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
	}
	.summary div {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
	}
	.summary dt {
		color: var(--muted);
		font-size: 0.9em;
	}
	.summary dd {
		margin: 0;
		font-size: 1.4em;
		font-weight: 700;
	}
	.highlight {
		border-color: var(--accent);
		border-width: 2px;
	}
	.latest {
		padding-left: 0;
		list-style: none;
	}
	.latest li {
		border-bottom: 1px solid var(--border);
	}
	.latest a {
		display: block;
		padding: 0.7rem 0;
		min-height: var(--tap);
	}
</style>
