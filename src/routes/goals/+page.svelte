<script lang="ts">
	import Csrf from '$lib/Csrf.svelte';
	import { resolve } from '$app/paths';
	import Icon from '$lib/Icon.svelte';
	import { translator } from '$lib/i18n';
	import { dayLabel } from '$lib/dates';
	import { missing, monthlyNeeded, progress } from '$lib/goals';
	import { amountForInput, formatAmount } from '$lib/money';

	let { data, form } = $props();
	const t = $derived(translator(data.locale));
	const euro = $derived((cents: number) => formatAmount(cents, data.locale, data.currency));
	const day = $derived((iso: string) => dayLabel(iso, data.locale));
</script>

<h1>{t('goals.title')}</h1>
<p>{t('goals.intro')}</p>

{#if form?.error}<p class="error" role="alert">{t(form.error, form.vars)}</p>{/if}
{#if form?.created}<p class="notice" role="status">
		{t('goals.created', { name: form.created })}
	</p>{/if}
{#if form?.updated}<p class="notice" role="status">{t('goals.updated')}</p>{/if}
{#if form?.deposited}<p class="notice" role="status">{t('goals.deposited')}</p>{/if}
{#if form?.depositRemoved}<p class="notice" role="status">{t('goals.depositRemoved')}</p>{/if}
{#if form?.toggled}<p class="notice" role="status">{t('goals.toggled')}</p>{/if}
{#if form?.removed}<p class="notice" role="status">{t('goals.removed')}</p>{/if}

{#if data.goals.length === 0}
	<p>{t('goals.empty')}</p>
{/if}

{#each data.goals as goal (goal.id)}
	{@const left = missing(goal.target_cents, goal.saved_cents)}
	{@const percent = progress(goal.target_cents, goal.saved_cents)}
	{@const pace = monthlyNeeded(goal.target_cents, goal.saved_cents, goal.due_on, data.today)}
	<section class:done={goal.is_done}>
		<h2>{goal.name}</h2>

		<p class="figures">
			<strong>{euro(goal.saved_cents)}</strong>
			{t('goals.of', { target: euro(goal.target_cents) })} — {percent}%
		</p>
		<div class="track">
			<span class="fill" style={`width: ${percent}%`} aria-hidden="true"></span>
		</div>

		<p>
			{#if left === 0}
				{t('goals.reached')}
			{:else}
				{t('goals.missing', { amount: euro(left) })}
				{#if goal.due_on}
					· {t('goals.by', { date: day(goal.due_on) })}
					{#if pace !== null}· <strong>{t('goals.pace', { amount: euro(pace) })}</strong>{/if}
				{/if}
			{/if}
		</p>

		<form method="post" action="?/deposit" class="row">
			<Csrf token={data.csrf} />
			<input type="hidden" name="id" value={goal.id} />
			<label class="visually-hidden" for={`amount-${goal.id}`}>
				{t('goals.depositFor', { name: goal.name })}
			</label>
			<input
				id={`amount-${goal.id}`}
				name="amount"
				inputmode="decimal"
				placeholder={t('common.amount')}
				required
			/>
			<label class="visually-hidden" for={`date-${goal.id}`}>{t('common.date')}</label>
			<input id={`date-${goal.id}`} name="occurred_on" type="date" value={data.today} required />
			<label class="visually-hidden" for={`note-${goal.id}`}>{t('common.note')}</label>
			<input id={`note-${goal.id}`} name="note" maxlength="200" placeholder={t('common.note')} />
			<button type="submit" name="direction" value="in">{t('goals.putIn')}</button>
			<button type="submit" name="direction" value="out" class="quiet">{t('goals.takeOut')}</button>
		</form>

		<details open={data.openId === goal.id}>
			<summary>
				<a href={`${resolve('/goals')}?open=${goal.id}#goal-${goal.id}`} id={`goal-${goal.id}`}>
					{t('goals.movements', { count: goal.deposits })}
				</a>
			</summary>

			{#if data.openId === goal.id}
				{#if data.deposits.length === 0}
					<p class="hint">{t('goals.noMovements')}</p>
				{:else}
					<div class="scroller">
						<table>
							<thead>
								<tr>
									<th scope="col">{t('common.date')}</th>
									<th scope="col">{t('common.amount')}</th>
									<th scope="col">{t('common.note')}</th>
									<th scope="col">{t('common.who')}</th>
									<th scope="col">{t('common.actions')}</th>
								</tr>
							</thead>
							<tbody>
								{#each data.deposits as movement (movement.id)}
									<tr>
										<td>{day(movement.occurred_on)}</td>
										<td>{euro(movement.amount_cents)}</td>
										<td>{movement.note ?? t('common.none')}</td>
										<td>{movement.author}</td>
										<td>
											<form method="post" action="?/removeDeposit">
												<Csrf token={data.csrf} />
												<input type="hidden" name="id" value={movement.id} />
												<button type="submit" class="icon-button danger">
													<Icon name="trash" />
													<span class="visually-hidden">{t('common.delete')}</span>
												</button>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</details>

		<details>
			<summary>{t('goals.change')}</summary>
			<form method="post" action="?/update">
				<Csrf token={data.csrf} />
				<input type="hidden" name="id" value={goal.id} />
				<label for={`name-${goal.id}`}>{t('goals.name')}</label>
				<input id={`name-${goal.id}`} name="name" value={goal.name} maxlength="80" required />
				<label for={`target-${goal.id}`}>{t('goals.target')}</label>
				<input
					id={`target-${goal.id}`}
					name="target"
					inputmode="decimal"
					value={amountForInput(goal.target_cents)}
					required
				/>
				<label for={`due-${goal.id}`}
					>{t('goals.due')} <span class="hint">{t('common.optional')}</span></label
				>
				<input id={`due-${goal.id}`} name="due_on" type="date" value={goal.due_on ?? ''} />
				<p class="row">
					<button type="submit">{t('common.save')}</button>
				</p>
			</form>
			<div class="row">
				<form method="post" action="?/done">
					<Csrf token={data.csrf} />
					<input type="hidden" name="id" value={goal.id} />
					<input type="hidden" name="done" value={goal.is_done ? '0' : '1'} />
					<button type="submit" class="quiet">
						{goal.is_done ? t('goals.reopen') : t('goals.close')}
					</button>
				</form>
				<form method="post" action="?/remove">
					<Csrf token={data.csrf} />
					<input type="hidden" name="id" value={goal.id} />
					<button type="submit" class="quiet">{t('goals.deleteGoal')}</button>
				</form>
			</div>
		</details>
	</section>
{/each}

<h2>{t('goals.addTitle')}</h2>
<form method="post" action="?/create">
	<Csrf token={data.csrf} />
	<label for="name">{t('goals.name')}</label>
	<input id="name" name="name" maxlength="80" placeholder={t('goals.example')} required />

	<label for="target"
		>{t('goals.target')} <span class="hint">{t('common.amountExample')}</span></label
	>
	<input id="target" name="target" inputmode="decimal" autocomplete="off" required />

	<label for="due_on">{t('goals.due')} <span class="hint">{t('common.optional')}</span></label>
	<input id="due_on" name="due_on" type="date" />

	<p><button type="submit">{t('goals.createSubmit')}</button></p>
</form>

<style>
	section {
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		padding: 0.6rem 0.9rem 1rem;
		margin-bottom: 1rem;
	}
	section.done {
		opacity: 0.7;
	}
	.figures {
		margin: 0.2rem 0;
		font-size: 1.1rem;
	}
	.track {
		height: 0.8rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.row input {
		flex: 1 1 7rem;
		width: auto;
	}
	summary {
		cursor: pointer;
		min-height: var(--tap);
		padding: 0.6rem 0;
	}
</style>
