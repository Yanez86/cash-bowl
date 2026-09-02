import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { refuse } from '$lib/server/problem';
import { parseAmount } from '$lib/money';
import { isDate, today } from '$lib/server/kakebo';
import * as goals from '$lib/server/goals';
import type { Actions, PageServerLoad } from './$types';

const MAX_NAME = 80;
const MAX_NOTE = 200;

function id(form: FormData, field = 'id'): number | null {
	const value = Number(form.get(field));
	return Number.isInteger(value) && value > 0 ? value : null;
}

/** Nome, traguardo e data desiderata, controllati. */
function readGoal(form: FormData) {
	const name = String(form.get('name') ?? '').trim();
	if (!name || name.length > MAX_NAME) return { ok: false as const, key: 'errors.nameRequired' };

	const targetCents = parseAmount(String(form.get('target') ?? ''));
	if (targetCents === null) return { ok: false as const, key: 'errors.invalidAmount' };
	if (targetCents === 0) return { ok: false as const, key: 'errors.amountPositive' };

	const raw = String(form.get('due_on') ?? '').trim();
	if (raw && !isDate(raw)) return { ok: false as const, key: 'errors.invalidDate' };

	return { ok: true as const, input: { name, targetCents, dueOn: raw || null } };
}

export const load: PageServerLoad = ({ url }) => {
	const open = Number(url.searchParams.get('open'));
	const openId = Number.isInteger(open) && open > 0 ? open : null;

	return {
		currency: currency(db()),
		today: today(),
		goals: goals.list(db()),
		openId,
		deposits: openId ? goals.deposits(db(), openId) : []
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const parsed = readGoal(await request.formData());
		if (!parsed.ok) return refuse(400, parsed.key);

		goals.create(db(), parsed.input, locals.user!.id);
		return { created: parsed.input.name };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const target = id(form);
		const parsed = readGoal(form);
		if (!target) return refuse(400, 'errors.invalidEntry');
		if (!parsed.ok) return refuse(400, parsed.key);
		if (!goals.update(db(), target, parsed.input)) return refuse(404, 'errors.entryNotFound');
		return { updated: true };
	},

	deposit: async ({ request, locals }) => {
		const form = await request.formData();
		const target = id(form);
		if (!target) return refuse(400, 'errors.invalidEntry');

		const amountCents = parseAmount(String(form.get('amount') ?? ''));
		if (amountCents === null) return refuse(400, 'errors.invalidAmount');
		if (amountCents === 0) return refuse(400, 'errors.amountPositive');

		const occurredOn = String(form.get('occurred_on') ?? '').trim() || today();
		if (!isDate(occurredOn)) return refuse(400, 'errors.invalidDate');

		const note = String(form.get('note') ?? '').trim();
		if (note.length > MAX_NOTE) return refuse(400, 'errors.noteTooLong', { max: MAX_NOTE });

		// Il segno meno serve a ripescare dal salvadanaio, non è un errore.
		const signed = form.get('direction') === 'out' ? -amountCents : amountCents;
		if (
			!goals.addDeposit(
				db(),
				target,
				{ amountCents: signed, occurredOn, note: note || null },
				locals.user!.id
			)
		) {
			return refuse(404, 'errors.entryNotFound');
		}
		return { deposited: true };
	},

	removeDeposit: async ({ request }) => {
		const target = id(await request.formData());
		if (!target || !goals.removeDeposit(db(), target)) return refuse(404, 'errors.entryNotFound');
		return { depositRemoved: true };
	},

	done: async ({ request }) => {
		const form = await request.formData();
		const target = id(form);
		if (!target || !goals.setDone(db(), target, form.get('done') === '1')) {
			return refuse(404, 'errors.entryNotFound');
		}
		return { toggled: true };
	},

	remove: async ({ request }) => {
		const target = id(await request.formData());
		if (!target || !goals.remove(db(), target)) return refuse(404, 'errors.entryNotFound');
		return { removed: true };
	}
};
