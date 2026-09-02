import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import {
	createEntry,
	currentMonth,
	isMonth,
	listEntries,
	spentByCategory,
	summary,
	today
} from '$lib/server/kakebo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const requested = url.searchParams.get('ym') ?? '';
	const ym = isMonth(requested) ? requested : currentMonth();
	const viewer = locals.user!.id;

	return {
		ym,
		today: today(),
		currency: currency(db()),
		summary: summary(db(), ym, viewer),
		byCategory: spentByCategory(db(), ym, viewer),
		latest: listEntries(db(), { ym, viewer, kind: 'expense', status: 'complete', limit: 10 }),
		categories: selectable(db())
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = readEntry(form, 'expense');
		if (!parsed.ok) return fail(400, { error: parsed.error });

		if (parsed.input.categoryId !== null && !exists(db(), parsed.input.categoryId)) {
			return fail(400, { error: 'Categoria non valida.' });
		}

		createEntry(db(), parsed.input, locals.user!.id);
		return { saved: parsed.input.status };
	}
};
