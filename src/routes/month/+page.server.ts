import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { readEntry } from '$lib/server/entry-form';
import { parseAmount } from '$lib/money';
import {
	createEntry,
	currentMonth,
	deleteEntry,
	isMonth,
	listEntries,
	setSavingsGoal,
	summary
} from '$lib/server/kakebo';
import type { Actions, PageServerLoad } from './$types';

const monthOf = (url: URL) => {
	const requested = url.searchParams.get('ym') ?? '';
	return isMonth(requested) ? requested : currentMonth();
};

export const load: PageServerLoad = ({ locals, url }) => {
	const ym = monthOf(url);
	const viewer = locals.user!.id;
	return {
		ym,
		currency: currency(db()),
		summary: summary(db(), ym, viewer),
		incomes: listEntries(db(), { ym, viewer, kind: 'income', status: 'complete' }),
		fixed: listEntries(db(), { ym, viewer, kind: 'fixed', status: 'complete' })
	};
};

export const actions: Actions = {
	income: async ({ request, locals }) => addEntry(request, locals.user!.id, 'income'),
	fixed: async ({ request, locals }) => addEntry(request, locals.user!.id, 'fixed'),

	goal: async ({ request, url }) => {
		const form = await request.formData();
		const cents = parseAmount(String(form.get('amount') ?? '0').trim() || '0');
		if (cents === null) return refuse(400, 'errors.invalidAmount');

		setSavingsGoal(db(), monthOf(url), cents);
		return { goalSaved: true };
	},

	remove: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id) || id <= 0) return refuse(400, 'errors.invalidEntry');
		if (!deleteEntry(db(), id, locals.user!.id)) return refuse(404, 'errors.entryNotFound');
		return { removed: true };
	}
};

async function addEntry(request: Request, userId: number, kind: 'income' | 'fixed') {
	const form = await request.formData();
	const parsed = readEntry(form, kind);
	if (!parsed.ok) return refuse(400, parsed.problem.key, parsed.problem.vars);

	createEntry(db(), parsed.input, userId);
	return { added: true };
}
