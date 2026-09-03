<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { categoryLabel } from '$lib/CategoryLabel';
	import CategoryTag from '$lib/CategoryTag.svelte';
	import Icon from '$lib/Icon.svelte';
	import { translator } from '$lib/i18n';
	import { monthLabel } from '$lib/dates';
	import { amountForInput, formatAmount } from '$lib/money';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));

	const KIND_LABEL = {
		fixed: 'recurring.kindFixed',
		expense: 'recurring.kindExpense',
		income: 'recurring.kindIncome'
	} as const;

	let kind = $state('fixed');

	/** Finita: l'ultimo mese è passato. Resta in elenco, ma non genera più nulla. */
	const finished = (endsYm: string | null) => endsYm !== null && endsYm < data.thisMonth;

	/** Il mese salvato mostrato nel campo data come il suo ultimo giorno. */
	function endOfMonth(ym: string): string {
		const [year, month] = ym.split('-').map(Number);
		const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
		return `${ym}-${String(day).padStart(2, '0')}`;
	}

	// Scrivere una data o un numero di volte accende da sé la casella accanto:
	// senza JavaScript si sceglie a mano, e il server rifiuta le combinazioni
	// incoerenti.
	function pick(event: Event, choice: string) {
		const form = (event.currentTarget as HTMLInputElement).form;
		for (const radio of form?.querySelectorAll<HTMLInputElement>('input[name="ends"]') ?? []) {
			radio.checked = radio.value === choice;
		}
	}
</script>

<!-- startsYm serve solo al `min` del campo data: il server rifiuta comunque una
     scadenza precedente al mese di inizio, qui il browser lo dice prima. -->
{#snippet endsChoice(endsYm: string | null, startsYm: string)}
	<fieldset class="ends">
		<legend>{t('recurring.ends')}</legend>
		<label>
			<input type="radio" name="ends" value="forever" checked={endsYm === null} />
			{t('recurring.endsForever')}
		</label>
		<span class="choice">
			<label>
				<input type="radio" name="ends" value="until" checked={endsYm !== null} />
				{t('recurring.endsUntil')}
			</label>
			<input
				type="date"
				name="ends_on"
				value={endsYm ? endOfMonth(endsYm) : ''}
				min={endOfMonth(startsYm)}
				aria-label={t('recurring.endsOnLabel')}
				oninput={(event) => pick(event, 'until')}
			/>
		</span>
		<span class="choice">
			<label>
				<input type="radio" name="ends" value="times" />
				{t('recurring.endsTimes')}
			</label>
			<input
				type="number"
				name="times"
				min="1"
				max="600"
				aria-label={t('recurring.endsTimesLabel')}
				oninput={(event) => pick(event, 'times')}
			/>
			<span class="hint">{t('recurring.endsTimesHint')}</span>
		</span>
	</fieldset>
{/snippet}

<h1>{t('recurring.title')}</h1>
<p>{t('recurring.intro', { month: monthLabel(data.thisMonth, data.locale) })}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.created}
	<p class="notice" role="status">{t('recurring.created', { name: form.created })}</p>
{/if}
{#if form?.updated}<p class="notice" role="status">{t('recurring.updated')}</p>{/if}
{#if form?.toggled}<p class="notice" role="status">{t('recurring.toggled')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('recurring.removed')}</p>{/if}

{#if data.items.length === 0}
	<p>{t('recurring.empty')}</p>
{:else}
	<ul class="items">
		{#each data.items as item (item.id)}
			<li class:dormant={!item.is_active || finished(item.ends_ym)}>
				<p class="head">
					<strong>{item.description}</strong>
					{#if finished(item.ends_ym)}<span class="state">{t('recurring.finished')}</span>{/if}
					{#if !item.is_active}<span class="state">{t('recurring.suspended')}</span>{/if}
					<span class="amount">{euro(item.amount_cents)}</span>
				</p>
				<p class="meta hint">
					{t(KIND_LABEL[item.kind])}
					{#if item.category_root_key}
						· <CategoryTag
							{t}
							rootKey={item.category_root_key}
							child={item.category_child}
							icon={item.category_icon}
						/>
					{/if}
					· {t('recurring.everyMonthOn', { day: item.day_of_month })}
					· {t('recurring.since', { month: monthLabel(item.starts_ym, data.locale) })}
					{#if item.ends_ym}
						· {t('recurring.until', { month: monthLabel(item.ends_ym, data.locale) })}
					{/if}
				</p>

				<form method="post" action="?/update">
					<Csrf token={data.csrf} />
					<input type="hidden" name="id" value={item.id} />
					<div class="row">
						<label class="visually-hidden" for={`description-${item.id}`}>
							{t('recurring.descriptionOf', { name: item.description })}
						</label>
						<input
							id={`description-${item.id}`}
							name="description"
							value={item.description}
							maxlength="100"
							required
						/>
						<label class="visually-hidden" for={`amount-${item.id}`}>
							{t('recurring.amountOf', { name: item.description })}
						</label>
						<input
							id={`amount-${item.id}`}
							name="amount"
							inputmode="decimal"
							value={amountForInput(item.amount_cents)}
							required
						/>
					</div>
					<details>
						<summary>
							{t('recurring.changeEnd')}
							<span class="visually-hidden">— {item.description}</span>
						</summary>
						{@render endsChoice(item.ends_ym, item.starts_ym)}
					</details>
					<!-- Salva in fondo al modulo: sta sempre sotto l'ultima cosa che hai
					     cambiato, anche a scadenza aperta. -->
					<button type="submit" class="quiet">{t('common.save')}</button>
				</form>

				<div class="row actions">
					<form method="post" action="?/toggle">
						<Csrf token={data.csrf} />
						<input type="hidden" name="id" value={item.id} />
						<input type="hidden" name="active" value={item.is_active ? '0' : '1'} />
						<button type="submit" class="quiet">
							{item.is_active ? t('recurring.suspend') : t('recurring.resume')}
							<span class="visually-hidden">{item.description}</span>
						</button>
					</form>
					<form method="post" action="?/remove">
						<Csrf token={data.csrf} />
						<input type="hidden" name="id" value={item.id} />
						<button type="submit" class="icon-button danger">
							<Icon name="trash" />
							<span class="visually-hidden">
								{t('common.delete')}
								{item.description}
							</span>
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<h2>{t('recurring.addTitle')}</h2>
<p class="hint">{t('recurring.addHint')}</p>
<form method="post" action="?/create">
	<Csrf token={data.csrf} />
	<label for="kind">{t('recurring.kind')}</label>
	<select id="kind" name="kind" bind:value={kind}>
		<option value="fixed">{t('recurring.kindFixed')}</option>
		<option value="expense">{t('recurring.kindExpense')}</option>
		<option value="income">{t('recurring.kindIncome')}</option>
	</select>

	<label for="description">{t('plan.description')}</label>
	<input
		id="description"
		name="description"
		maxlength="100"
		placeholder={t('recurring.example')}
		required
	/>

	<label for="amount"
		>{t('common.amount')} <span class="hint">{t('common.amountExample')}</span></label
	>
	<input id="amount" name="amount" inputmode="decimal" autocomplete="off" required />

	{#if kind === 'expense'}
		<label for="category_id">{t('common.category')}</label>
		<select id="category_id" name="category_id" required>
			<option value="">{t('common.choose')}</option>
			{#each data.categories as choice (choice.id)}
				<option value={choice.id}>{categoryLabel(t, choice.rootKey, choice.child)}</option>
			{/each}
		</select>
	{/if}

	<label for="day_of_month">
		{t('recurring.day')} <span class="hint">{t('recurring.dayHint')}</span>
	</label>
	<input id="day_of_month" name="day_of_month" type="number" min="1" max="28" value="1" required />

	{@render endsChoice(null, data.thisMonth)}

	<p><button type="submit">{t('recurring.createSubmit')}</button></p>
</form>

<style>
	.items {
		list-style: none;
		padding-left: 0;
	}
	.items li {
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: 0.6rem 0.8rem 0.8rem;
		margin-bottom: 0.75rem;
		background: var(--surface);
	}
	/* Sospesa o terminata: la scheda arretra col fondo, non con l'opacità. Il
	   testo resta leggibile (CLAUDE.md §9) e a dirlo è l'etichetta, non il
	   colore. */
	.items li.dormant {
		background: var(--bg);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 0.5rem;
		margin: 0;
	}
	.head .amount {
		margin-left: auto;
		font-weight: 600;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.state {
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.85em;
		font-weight: 600;
	}
	.meta {
		margin: 0.15rem 0 0.5rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.row input[name='description'] {
		flex: 2 1 12rem;
		width: auto;
	}
	.row input[name='amount'] {
		flex: 1 1 7rem;
		width: auto;
	}
	/* Il cestino sta staccato dagli altri tasti: non lo si preme per sbaglio. */
	.actions {
		margin-top: 0.5rem;
	}
	.actions form:last-child {
		margin-left: auto;
	}
	/* Una scelta per riga: «per sempre», «fino al…», «per N volte» non stanno
	   mai su una riga sola senza spezzare le etichette. */
	.ends {
		display: grid;
		gap: 0.5rem;
		padding: 0.5rem 0.8rem 0.8rem;
	}
	.ends label {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin: 0;
	}
	.choice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.ends input[type='date'] {
		width: auto;
	}
	.ends input[type='number'] {
		width: 5rem;
	}
	/* Niente display:flex qui: toglierebbe il triangolino che dice «si apre». */
	summary {
		cursor: pointer;
		min-height: var(--tap);
		padding: 0.6rem 0;
	}
</style>
