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

<MonthNav ym={data.ym} path={resolve('/')} locale={data.locale} />

<h1>{t('dashboard.title')}</h1>

{#if data.saved === 'complete'}<p class="notice" role="status">{t('dashboard.saved')}</p>{/if}
{#if data.saved === 'draft'}
	<p class="notice" role="status">
		{t('dashboard.savedDraft')} <a href={resolve('/drafts')}>{t('dashboard.draftsLink')}</a>
	</p>
{/if}

{#if data.summary.drafts > 0}
	<p class="notice" role="status">
		{t('dashboard.drafts', { count: data.summary.drafts })}
		<a href={resolve('/drafts')}>{t('dashboard.draftsLink')}</a>
	</p>
{/if}

<dl class="summary">
	<div class="lead">
		<dt>{t('dashboard.remaining')}</dt>
		<dd class:negative={data.summary.remaining < 0}>{euro(data.summary.remaining)}</dd>
	</div>
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
					<td><CategoryTag {t} rootKey={row.kakebo_key} /></td>
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
	<!-- Stessa riga della pagina delle spese del mese: una lista, un solo stile. -->
	<ul class="records">
		{#each data.latest as entry (entry.id)}
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

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.75rem;
	}
	.summary div {
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: 0.75rem;
	}
	.summary dt {
		color: var(--muted);
		font-size: 0.9em;
	}
	/* Gli altri cinque numeri fanno un passo indietro: senza retrocessione non
	   esiste gerarchia, esistono solo sei riquadri che gridano insieme. */
	.summary dd {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 500;
	}

	/* Nel kakebo una sola domanda conta: quanto rimane. Sta da sola, in cima, e
	   vince per dimensione — non per colore, che da solo non basta mai. */
	.lead {
		grid-column: 1 / -1;
		padding: 1rem;
		border-color: var(--accent);
	}
	.lead dt {
		font-size: 1rem;
	}
	.lead dd {
		font-size: clamp(2.4rem, 12vw, 3.4rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	/* Il segno meno c'è già: il colore lo rinforza, non lo sostituisce. */
	.negative {
		color: var(--danger);
	}
</style>
