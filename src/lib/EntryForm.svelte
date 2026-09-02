<script lang="ts">
	// Il modulo di una spesa. Serve sia per l'inserimento al volo sia per la
	// modifica: un solo posto in cui cambiare i campi.
	import { categoryLabel } from './CategoryLabel';
	import ReceiptField from './ReceiptField.svelte';
	import { translator, type Locale } from './i18n';
	import type { Choice } from './server/categories';
	import { today } from './dates';

	let {
		locale,
		categories,
		entry = null,
		defaultDate = today(),
		showDraftButton = true,
		entryId = null,
		receipt = null
	}: {
		locale: Locale;
		categories: Choice[];
		entryId?: number | null;
		receipt?: string | null;
		entry?: {
			amount?: string;
			occurred_on?: string;
			category_id?: number | null;
			note?: string | null;
			visibility?: string;
		} | null;
		defaultDate?: string;
		showDraftButton?: boolean;
	} = $props();

	const t = $derived(translator(locale));
</script>

<label for="amount">
	{t('common.amount')} <span class="hint">{t('common.amountExample')}</span>
</label>
<input
	id="amount"
	name="amount"
	inputmode="decimal"
	autocomplete="off"
	value={entry?.amount ?? ''}
/>

<label for="category_id">{t('common.category')}</label>
<select id="category_id" name="category_id">
	<option value="">{t('common.choose')}</option>
	{#each categories as choice (choice.id)}
		<option value={choice.id} selected={entry?.category_id === choice.id}>
			{categoryLabel(t, choice.rootKey, choice.child)}
		</option>
	{/each}
</select>

<label for="occurred_on">{t('common.date')}</label>
<input
	id="occurred_on"
	name="occurred_on"
	type="date"
	value={entry?.occurred_on ?? defaultDate}
	required
/>

<label for="note">{t('common.note')} <span class="hint">{t('common.optional')}</span></label>
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
		{t('entry.privateLabel')}
	</label>
</p>

<ReceiptField {locale} existing={receipt} {entryId} />

<p class="buttons">
	<button type="submit" name="status" value="complete">{t('common.save')}</button>
	{#if showDraftButton}
		<button type="submit" name="status" value="draft" class="quiet">{t('entry.saveDraft')}</button>
	{/if}
</p>

<style>
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
