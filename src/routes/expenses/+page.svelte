<script lang="ts">
	import { resolve } from '$app/paths';
	import MonthNav from '$lib/MonthNav.svelte';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const euro = (cents: number) => formatAmount(cents, 'it', data.currency);
</script>

<MonthNav ym={data.ym} path={resolve('/expenses')} />

<h1>Spese del mese</h1>

{#if data.entries.length === 0}
	<p>Nessuna spesa registrata in questo mese. <a href={resolve('/')}>Aggiungine una</a>.</p>
{:else}
	<table>
		<caption class="hint">
			{data.entries.length} spese, per un totale di {euro(data.summary.spent)}
		</caption>
		<thead>
			<tr>
				<th scope="col">Data</th>
				<th scope="col">Categoria</th>
				<th scope="col">Nota</th>
				<th scope="col">Chi</th>
				<th scope="col">Importo</th>
				<th scope="col">Azioni</th>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry (entry.id)}
				<tr>
					<td>{entry.occurred_on}</td>
					<td>{entry.category_name}</td>
					<td>
						{entry.note ?? '—'}
						{#if entry.visibility === 'private'}<span class="hint">(privata)</span>{/if}
					</td>
					<td>{entry.author}</td>
					<td>{euro(entry.amount_cents ?? 0)}</td>
					<td>
						<a href={resolve('/expenses/[id]', { id: String(entry.id) })}>
							Modifica <span class="hint">del {entry.occurred_on}</span>
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
