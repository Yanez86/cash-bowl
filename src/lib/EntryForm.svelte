<script lang="ts">
	// Il modulo di una spesa. Serve sia per l'inserimento al volo sia per la
	// modifica: un solo posto in cui cambiare i campi.
	import { today } from './dates';

	let {
		categories,
		entry = null,
		defaultDate = today(),
		showDraftButton = true,
		submitLabel = 'Salva'
	}: {
		categories: { id: number; label: string }[];
		entry?: {
			amount?: string;
			occurred_on?: string;
			category_id?: number | null;
			note?: string | null;
			visibility?: string;
		} | null;
		defaultDate?: string;
		showDraftButton?: boolean;
		submitLabel?: string;
	} = $props();
</script>

<label for="amount">Importo <span class="hint">(per esempio 12,34)</span></label>
<input
	id="amount"
	name="amount"
	inputmode="decimal"
	autocomplete="off"
	value={entry?.amount ?? ''}
/>

<label for="category_id">Categoria</label>
<select id="category_id" name="category_id">
	<option value="">— scegli —</option>
	{#each categories as category (category.id)}
		<option value={category.id} selected={entry?.category_id === category.id}>
			{category.label}
		</option>
	{/each}
</select>

<label for="occurred_on">Data</label>
<input
	id="occurred_on"
	name="occurred_on"
	type="date"
	value={entry?.occurred_on ?? defaultDate}
	required
/>

<label for="note">Nota <span class="hint">(facoltativa)</span></label>
<input id="note" name="note" maxlength="500" value={entry?.note ?? ''} />

<p>
	<label for="visibility" class="hint">
		<input
			id="visibility"
			name="visibility"
			type="checkbox"
			value="private"
			checked={entry?.visibility === 'private'}
		/>
		Spesa privata: la vedrai solo tu
	</label>
</p>

<p class="buttons">
	<button type="submit" name="status" value="complete">{submitLabel}</button>
	{#if showDraftButton}
		<button type="submit" name="status" value="draft">Salva come bozza</button>
	{/if}
</p>

<style>
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
