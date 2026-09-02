import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { readReceipt } from '$lib/server/receipt-upload';
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
		if (!parsed.ok) return refuse(400, parsed.problem.key, parsed.problem.vars);

		if (parsed.input.categoryId !== null && !exists(db(), parsed.input.categoryId)) {
			return refuse(400, 'errors.invalidCategory');
		}

		const upload = await readReceipt(form);
		if (!upload.ok) return refuse(400, upload.key);

		createEntry(db(), { ...parsed.input, receiptFile: upload.file }, locals.user!.id);
		return { saved: parsed.input.status };
	}
};
