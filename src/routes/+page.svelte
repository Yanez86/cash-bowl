<script lang="ts">
	// ponytail: testi in italiano e formattazione fissata su 'it'.
	// Nella fase 4 passano dai file di traduzione e dalla lingua dell'utente.
	import { resolve } from '$app/paths';
	import EntryForm from '$lib/EntryForm.svelte';
	import MonthNav from '$lib/MonthNav.svelte';
	import { formatAmount } from '$lib/money';

	let { data, form } = $props();

	const euro = (cents: number) => formatAmount(cents, 'it', data.currency);
</script>

<MonthNav ym={data.ym} path={resolve('/')} />

<h1>Il mio mese</h1>

{#if data.summary.drafts > 0}
	<p class="notice" role="status">
		Hai <strong>{data.summary.drafts}</strong>
		{data.summary.drafts === 1 ? 'bozza' : 'bozze'} da sistemare in questo mese: non sono contate nei
		totali. <a href={resolve('/drafts')}>Sistemale ora</a>
	</p>
{/if}

<dl class="summary">
	<div>
		<dt>Entrate</dt>
		<dd>{euro(data.summary.income)}</dd>
	</div>
	<div>
		<dt>Spese fisse</dt>
		<dd>{euro(data.summary.fixed)}</dd>
	</div>
	<div>
		<dt>Obiettivo di risparmio</dt>
		<dd>{euro(data.summary.goal)}</dd>
	</div>
	<div>
		<dt>Disponibile per il mese</dt>
		<dd>{euro(data.summary.available)}</dd>
	</div>
	<div>
		<dt>Speso finora</dt>
		<dd>{euro(data.summary.spent)}</dd>
	</div>
	<div class="highlight">
		<dt>Ti resta</dt>
		<dd>{euro(data.summary.remaining)}</dd>
	</div>
</dl>

{#if data.summary.remaining < 0}
	<p class="notice" role="status">
		Hai superato il disponibile di {euro(-data.summary.remaining)}. L'obiettivo di risparmio è
		ancora al sicuro finché il messo da parte resta sopra {euro(data.summary.goal)}.
	</p>
{/if}

<p>
	<a href={`${resolve('/month')}?ym=${data.ym}`}>Entrate, spese fisse e obiettivo</a> ·
	<a href={`${resolve('/expenses')}?ym=${data.ym}`}>Tutte le spese del mese</a>
</p>

<h2>Aggiungi una spesa</h2>
{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.saved === 'complete'}<p role="status">Spesa registrata.</p>{/if}
{#if form?.saved === 'draft'}
	<p role="status">Bozza salvata. La trovi in <a href={resolve('/drafts')}>Da sistemare</a>.</p>
{/if}
<form method="post" action="?/add">
	<EntryForm categories={data.categories} defaultDate={data.today} />
</form>

<h2>Dove sono finiti i soldi</h2>
<table>
	<thead>
		<tr><th scope="col">Categoria</th><th scope="col">Speso</th></tr>
	</thead>
	<tbody>
		{#each data.byCategory as row (row.id)}
			<tr><td>{row.name}</td><td>{euro(row.total)}</td></tr>
		{/each}
	</tbody>
	<tfoot>
		<tr><th scope="row">Totale</th><td>{euro(data.summary.spent)}</td></tr>
	</tfoot>
</table>

<h2>Ultime spese</h2>
{#if data.latest.length === 0}
	<p>Nessuna spesa registrata in questo mese.</p>
{:else}
	<ul class="latest">
		{#each data.latest as entry (entry.id)}
			<li>
				<a href={resolve('/expenses/[id]', { id: String(entry.id) })}>
					{entry.occurred_on} · {euro(entry.amount_cents ?? 0)} · {entry.category_name}
					{#if entry.note}<span class="hint">— {entry.note}</span>{/if}
					{#if entry.visibility === 'private'}<span class="hint">(privata)</span>{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.75rem;
	}
	.summary div {
		border: 1px solid;
		padding: 0.75rem;
	}
	.summary dt {
		font-size: 0.9em;
	}
	.summary dd {
		margin: 0;
		font-size: 1.4em;
		font-weight: 700;
	}
	.highlight {
		border-width: 3px;
	}
	.notice {
		border-left: 4px solid currentColor;
		padding: 0.5rem 0.75rem;
	}
	.latest {
		padding-left: 0;
		list-style: none;
	}
	.latest li {
		border-bottom: 1px solid;
	}
	.latest a {
		display: block;
		padding: 0.6rem 0;
	}
</style>
