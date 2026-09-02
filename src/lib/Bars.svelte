<script lang="ts">
	// Un grafico a barre che è anche la sua tabella: stessa struttura, stessi
	// numeri. Nessuna informazione è affidata al solo colore, e chi usa uno
	// screen reader legge una tabella normale. Vedi CLAUDE.md §9.
	let {
		caption,
		header,
		rows
	}: {
		caption: string;
		header: string;
		rows: { label: string; amount: string; value: number }[];
	} = $props();

	const largest = $derived(Math.max(1, ...rows.map((row) => row.value)));
</script>

<div class="scroller">
	<table>
		<caption class="hint">{caption}</caption>
		<thead>
			<tr>
				<th scope="col">{header}</th>
				<th scope="col" class="amount">{caption}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.label)}
				<tr>
					<th scope="row">{row.label}</th>
					<td class="amount">
						<span class="value">{row.amount}</span>
						<span
							class="bar"
							aria-hidden="true"
							style={`width: ${Math.round((row.value / largest) * 100)}%`}
						></span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.amount {
		width: 70%;
	}
	.value {
		display: block;
		font-variant-numeric: tabular-nums;
	}
	.bar {
		display: block;
		height: 0.6rem;
		margin-top: 0.2rem;
		min-width: 2px;
		background: var(--accent);
		border-radius: 3px;
	}
</style>
