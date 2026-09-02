<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatAmount } from '$lib/money';

	let { data } = $props();
	const euro = (cents: number | null) =>
		cents === null ? 'da mettere' : formatAmount(cents, 'it', data.currency);
</script>

<h1>Da sistemare</h1>
<p>
	Le bozze non entrano in nessun totale finché non hanno importo, categoria e data. Sono qui
	apposta: registri al volo, sistemi con calma.
</p>

{#if data.drafts.length === 0}
	<p>Nessuna bozza in sospeso. Tutto a posto.</p>
{:else}
	<table>
		<caption class="hint">Dalla più vecchia</caption>
		<thead>
			<tr>
				<th scope="col">Data</th>
				<th scope="col">Importo</th>
				<th scope="col">Nota</th>
				<th scope="col">Chi</th>
				<th scope="col">Azioni</th>
			</tr>
		</thead>
		<tbody>
			{#each data.drafts as draft (draft.id)}
				<tr>
					<td>{draft.occurred_on}</td>
					<td>{euro(draft.amount_cents)}</td>
					<td>{draft.note ?? '—'}</td>
					<td>{draft.author}</td>
					<td>
						<a href={resolve('/expenses/[id]', { id: String(draft.id) })}>
							Completa <span class="hint">la bozza del {draft.occurred_on}</span>
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
