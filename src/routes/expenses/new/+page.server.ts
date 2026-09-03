import { redirect } from '@sveltejs/kit';
import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import { ocrAvailable } from '$lib/server/ocr';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { readReceipts } from '$lib/server/receipt-upload';
import { addReceipt, MAX_PER_ENTRY } from '$lib/server/receipts';
import { createEntry, today } from '$lib/server/kakebo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	ocrAvailable: ocrAvailable(),
	today: today(),
	categories: selectable(db())
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
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

		// Si torna al mese: i totali sono già aggiornati e ricaricare la pagina
		// non registra la spesa una seconda volta.
		redirect(303, `/?saved=${parsed.input.status}`);
	}
};
