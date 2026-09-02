import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import { generate } from '$lib/server/recurring';
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

/** La risposta alla quarta domanda: un pensiero, non un tema. */
const MAX_REFLECTION = 2000;

const monthOf = (url: URL) => {
	const requested = url.searchParams.get('ym') ?? '';
	return isMonth(requested) ? requested : currentMonth();
};

export const load: PageServerLoad = ({ locals, url }) => {
	const ym = monthOf(url);
	const viewer = locals.user!.id;
	generate(db(), ym, viewer);

	const month = db().prepare('SELECT reflection FROM months WHERE ym = ?').get(ym) as
		{ reflection: string | null } | undefined;

	return {
		ym,
		reflection: month?.reflection ?? '',
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

	reflection: async ({ request, url }) => {
		const form = await request.formData();
		const text = String(form.get('reflection') ?? '')
			.trim()
			.slice(0, MAX_REFLECTION);
		const ym = monthOf(url);

		db()
			.prepare(
				`INSERT INTO months (ym, reflection) VALUES (?, ?)
				 ON CONFLICT (ym) DO UPDATE SET reflection = excluded.reflection`
			)
			.run(ym, text || null);
		return { reflectionSaved: true };
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
