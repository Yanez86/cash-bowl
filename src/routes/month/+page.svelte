<script lang="ts">
	import { resolve } from '$app/paths';
	import MonthNav from '$lib/MonthNav.svelte';
	import { amountForInput, formatAmount } from '$lib/money';

	let { data, form } = $props();

	const euro = (cents: number) => formatAmount(cents, 'it', data.currency);
</script>

<MonthNav ym={data.ym} path={resolve('/month')} />

<h1>Il piano del mese</h1>
<p>
	Il kakebo parte da qui: quanto entra, quanto se ne va da solo, e quanto vuoi mettere da parte.
	Entrate e spese fisse sono sempre di famiglia.
</p>

{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.added}<p role="status">Voce aggiunta.</p>{/if}
{#if form?.removed}<p role="status">Voce eliminata.</p>{/if}
{#if form?.goalSaved}<p role="status">Obiettivo aggiornato.</p>{/if}

<h2>Obiettivo di risparmio</h2>
<form method="post" action="?/goal">
	<label for="goal">Quanto vuoi mettere da parte questo mese</label>
	<input
		id="goal"
		name="amount"
		inputmode="decimal"
		value={amountForInput(data.summary.goal)}
		autocomplete="off"
	/>
	<p><button type="submit">Salva l'obiettivo</button></p>
</form>
<p>
	Disponibile per le spese di tutti i giorni: <strong>{euro(data.summary.available)}</strong>
</p>

<h2>Entrate — {euro(data.summary.income)}</h2>
{#if data.incomes.length === 0}
	<p>Nessuna entrata registrata.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th scope="col">Data</th><th scope="col">Nota</th><th scope="col">Importo</th><th
					scope="col">Azioni</th
				>
			</tr>
		</thead>
		<tbody>
			{#each data.incomes as row (row.id)}
				<tr>
					<td>{row.occurred_on}</td>
					<td>{row.note ?? '—'}</td>
					<td>{euro(row.amount_cents ?? 0)}</td>
					<td>
						<form method="post" action="?/remove">
							<input type="hidden" name="id" value={row.id} />
							<button type="submit"
								>Elimina <span class="hint">{row.note ?? row.occurred_on}</span></button
							>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<form method="post" action="?/income">
	<label for="income_amount">Nuova entrata</label>
	<input id="income_amount" name="amount" inputmode="decimal" autocomplete="off" required />
	<label for="income_note">Descrizione</label>
	<input id="income_note" name="note" maxlength="500" placeholder="Stipendio" />
	<label for="income_date">Data</label>
	<input id="income_date" name="occurred_on" type="date" value={`${data.ym}-01`} required />
	<p><button type="submit">Aggiungi l'entrata</button></p>
</form>

<h2>Spese fisse — {euro(data.summary.fixed)}</h2>
{#if data.fixed.length === 0}
	<p>Nessuna spesa fissa registrata.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th scope="col">Data</th><th scope="col">Nota</th><th scope="col">Importo</th><th
					scope="col">Azioni</th
				>
			</tr>
		</thead>
		<tbody>
			{#each data.fixed as row (row.id)}
				<tr>
					<td>{row.occurred_on}</td>
					<td>{row.note ?? '—'}</td>
					<td>{euro(row.amount_cents ?? 0)}</td>
					<td>
						<form method="post" action="?/remove">
							<input type="hidden" name="id" value={row.id} />
							<button type="submit"
								>Elimina <span class="hint">{row.note ?? row.occurred_on}</span></button
							>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<form method="post" action="?/fixed">
	<label for="fixed_amount">Nuova spesa fissa</label>
	<input id="fixed_amount" name="amount" inputmode="decimal" autocomplete="off" required />
	<label for="fixed_note">Descrizione</label>
	<input id="fixed_note" name="note" maxlength="500" placeholder="Affitto" />
	<label for="fixed_date">Data</label>
	<input id="fixed_date" name="occurred_on" type="date" value={`${data.ym}-01`} required />
	<p><button type="submit">Aggiungi la spesa fissa</button></p>
</form>
