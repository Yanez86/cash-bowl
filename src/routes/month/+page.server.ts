import { fail } from '@sveltejs/kit';
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
		if (cents === null) return fail(400, { error: 'Importo non valido. Esempio: 250,00' });

		setSavingsGoal(db(), monthOf(url), cents);
		return { goalSaved: true };
	},

	remove: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { error: 'Voce non valida.' });
		if (!deleteEntry(db(), id, locals.user!.id)) return fail(404, { error: 'Voce non trovata.' });
		return { removed: true };
	}
};

async function addEntry(request: Request, userId: number, kind: 'income' | 'fixed') {
	const form = await request.formData();
	const parsed = readEntry(form, kind);
	if (!parsed.ok) return fail(400, { error: parsed.error });

	createEntry(db(), parsed.input, userId);
	return { added: true };
}
