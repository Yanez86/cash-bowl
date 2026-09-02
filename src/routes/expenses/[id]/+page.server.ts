import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { amountForInput } from '$lib/money';
import { deleteEntry, getEntry, today, updateEntry } from '$lib/server/kakebo';
import type { Actions, PageServerLoad } from './$types';

/** L'id dall'indirizzo, oppure 404: non ci si fida di quello che arriva dall'URL. */
function entryId(params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Voce non trovata.');
	return id;
}

export const load: PageServerLoad = ({ locals, params }) => {
	// getEntry filtra già per visibilità: una voce privata di un altro
	// non esiste, dal punto di vista di chi guarda.
	const entry = getEntry(db(), entryId(params), locals.user!.id);
	if (!entry) error(404, 'Voce non trovata.');

	return {
		entry: {
			...entry,
			amount: entry.amount_cents === null ? '' : amountForInput(entry.amount_cents)
		},
		today: today(),
		categories: selectable(db())
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const id = entryId(params);
		const form = await request.formData();
		const parsed = readEntry(form, 'expense');
		if (!parsed.ok) return fail(400, { error: parsed.error });

		if (parsed.input.categoryId !== null && !exists(db(), parsed.input.categoryId)) {
			return fail(400, { error: 'Categoria non valida.' });
		}
		if (!updateEntry(db(), id, parsed.input, locals.user!.id)) {
			error(404, 'Voce non trovata.');
		}
		return { saved: true };
	},

	remove: ({ locals, params }) => {
		if (!deleteEntry(db(), entryId(params), locals.user!.id)) error(404, 'Voce non trovata.');
		redirect(303, '/expenses');
	}
};
