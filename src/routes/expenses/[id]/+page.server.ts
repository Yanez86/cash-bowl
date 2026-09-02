import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { refuse } from '$lib/server/problem';
import { readReceipt } from '$lib/server/receipt-upload';
import { deleteReceipt } from '$lib/server/receipts';
import { amountForInput } from '$lib/money';
import { deleteEntry, getEntry, today, updateEntry } from '$lib/server/kakebo';
import type { Actions, PageServerLoad } from './$types';

/** L'id dall'indirizzo, oppure 404: non ci si fida di quello che arriva dall'URL. */
function entryId(params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'errors.entryNotFound');
	return id;
}

export const load: PageServerLoad = ({ locals, params }) => {
	// getEntry filtra già per visibilità: una voce privata di un altro
	// non esiste, dal punto di vista di chi guarda.
	const entry = getEntry(db(), entryId(params), locals.user!.id);
	if (!entry) error(404, 'errors.entryNotFound');

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
		const viewer = locals.user!.id;
		const current = getEntry(db(), id, viewer);
		if (!current) error(404, 'errors.entryNotFound');

		const form = await request.formData();
		const parsed = readEntry(form, 'expense');
		if (!parsed.ok) return refuse(400, parsed.problem.key, parsed.problem.vars);

		if (parsed.input.categoryId !== null && !exists(db(), parsed.input.categoryId)) {
			return refuse(400, 'errors.invalidCategory');
		}

		const upload = await readReceipt(form);
		if (!upload.ok) return refuse(400, upload.key);

		// Nessuna foto inviata e nessuna rimozione: resta quella che c'era.
		const receiptFile = upload.removed ? null : (upload.file ?? current.receipt_file);

		if (!updateEntry(db(), id, { ...parsed.input, receiptFile }, viewer)) {
			// La modifica non è andata: la foto appena caricata non serve a nessuno.
			deleteReceipt(upload.file);
			error(404, 'errors.entryNotFound');
		}

		// Solo ora si butta via la vecchia: prima il dato, poi il file.
		if (receiptFile !== current.receipt_file) deleteReceipt(current.receipt_file);
		return { saved: true };
	},

	remove: ({ locals, params }) => {
		const id = entryId(params);
		const viewer = locals.user!.id;
		const current = getEntry(db(), id, viewer);
		if (!current || !deleteEntry(db(), id, viewer)) error(404, 'errors.entryNotFound');

		// Cancellare la voce cancella anche la foto: niente file orfani sul disco.
		deleteReceipt(current.receipt_file);
		redirect(303, '/expenses');
	}
};
