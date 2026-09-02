import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import { ocrAvailable } from '$lib/server/ocr';
import { generate } from '$lib/server/recurring';
import { currency } from '$lib/server/settings';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { readReceipts } from '$lib/server/receipt-upload';
import { addReceipt, MAX_PER_ENTRY } from '$lib/server/receipts';
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
	// Le ricorrenti mancanti entrano adesso: i conti del mese devono essere
	// giusti dal primo giorno. Rifarlo non cambia niente.
	generate(db(), ym, viewer);

	return {
		ocrAvailable: ocrAvailable(),
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

		const upload = await readReceipts(form, MAX_PER_ENTRY);
		if (!upload.ok) return refuse(400, upload.key);

		const id = createEntry(db(), parsed.input, locals.user!.id);
		for (const file of upload.files) addReceipt(db(), id, file);
		return { saved: parsed.input.status };
	}
};
