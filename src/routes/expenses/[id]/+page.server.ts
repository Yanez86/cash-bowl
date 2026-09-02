import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { ocrAvailable } from '$lib/server/ocr';
import { exists, selectable } from '$lib/server/categories';
import { readEntry } from '$lib/server/entry-form';
import { refuse } from '$lib/server/problem';
import { readReceipts } from '$lib/server/receipt-upload';
import {
	MAX_PER_ENTRY,
	addReceipt,
	deleteReceipt,
	filesOf,
	listReceipts,
	removeReceipt
} from '$lib/server/receipts';
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
	const id = entryId(params);
	const entry = getEntry(db(), id, locals.user!.id);
	if (!entry) error(404, 'errors.entryNotFound');

	return {
		ocrAvailable: ocrAvailable(),
		entry: {
			...entry,
			amount: entry.amount_cents === null ? '' : amountForInput(entry.amount_cents)
		},
		receipts: listReceipts(db(), id, locals.user!.id),
		maxReceipts: MAX_PER_ENTRY,
		today: today(),
		categories: selectable(db())
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const id = entryId(params);
		const viewer = locals.user!.id;
		if (!getEntry(db(), id, viewer)) error(404, 'errors.entryNotFound');

		const form = await request.formData();
		const parsed = readEntry(form, 'expense');
		if (!parsed.ok) return refuse(400, parsed.problem.key, parsed.problem.vars);

		if (parsed.input.categoryId !== null && !exists(db(), parsed.input.categoryId)) {
			return refuse(400, 'errors.invalidCategory');
		}

		// Prima si tolgono quelle segnate, poi si contano i posti liberi.
		const dropped: string[] = [];
		for (const value of form.getAll('receipt_remove')) {
			const receiptId = Number(value);
			const file = Number.isInteger(receiptId) ? removeReceipt(db(), receiptId, viewer) : null;
			if (file) dropped.push(file);
		}

		const room = MAX_PER_ENTRY - listReceipts(db(), id, viewer).length;
		const upload = await readReceipts(form, room);
		if (!upload.ok) return refuse(400, upload.key);

		if (!updateEntry(db(), id, parsed.input, viewer)) {
			// La modifica non è andata: le foto appena caricate non servono a nessuno.
			for (const file of upload.files) deleteReceipt(file);
			error(404, 'errors.entryNotFound');
		}

		for (const file of upload.files) addReceipt(db(), id, file);
		// Solo ora si buttano via le vecchie: prima il dato, poi il file.
		for (const file of dropped) deleteReceipt(file);
		return { saved: true };
	},

	remove: ({ locals, params }) => {
		const id = entryId(params);
		const viewer = locals.user!.id;
		if (!getEntry(db(), id, viewer)) error(404, 'errors.entryNotFound');

		const files = filesOf(db(), id);
		if (!deleteEntry(db(), id, viewer)) error(404, 'errors.entryNotFound');

		// Cancellare la voce cancella anche le foto: niente file orfani sul disco.
		for (const file of files) deleteReceipt(file);
		redirect(303, '/expenses');
	}
};
