// Legge e controlla i campi di un modulo. Tutto quello che arriva dal browser
// passa di qui prima di toccare il database. Vedi CLAUDE.md §8.
import { parseAmount } from '$lib/money';
import { isDate, today, type EntryInput, type Kind } from './kakebo';

const MAX_NOTE = 500;

export type Parsed = { ok: true; input: EntryInput } | { ok: false; error: string };

export function readEntry(form: FormData, kind: Kind): Parsed {
	const status = form.get('status') === 'draft' ? 'draft' : 'complete';
	const rawAmount = String(form.get('amount') ?? '').trim();
	const occurredOn = String(form.get('occurred_on') ?? '').trim() || today();
	const rawCategory = String(form.get('category_id') ?? '').trim();
	const note = String(form.get('note') ?? '').trim();
	const isPrivate = kind === 'expense' && form.get('visibility') === 'private';

	let amountCents: number | null = null;
	if (rawAmount) {
		amountCents = parseAmount(rawAmount);
		if (amountCents === null) return { ok: false, error: 'Importo non valido. Esempio: 12,34' };
		if (amountCents === 0) return { ok: false, error: "L'importo deve essere maggiore di zero." };
	} else if (status === 'complete') {
		return { ok: false, error: "Scrivi l'importo." };
	}

	if (!isDate(occurredOn)) return { ok: false, error: 'Data non valida.' };
	const year = Number(occurredOn.slice(0, 4));
	if (year < 2000 || year > 2100) return { ok: false, error: 'La data non sembra giusta.' };

	let categoryId: number | null = null;
	if (rawCategory) {
		categoryId = Number(rawCategory);
		if (!Number.isInteger(categoryId) || categoryId <= 0) {
			return { ok: false, error: 'Categoria non valida.' };
		}
	} else if (status === 'complete' && kind === 'expense') {
		return { ok: false, error: 'Scegli una categoria.' };
	}

	if (note.length > MAX_NOTE) {
		return { ok: false, error: `La nota non può superare i ${MAX_NOTE} caratteri.` };
	}

	return {
		ok: true,
		input: {
			kind,
			status,
			amountCents,
			occurredOn,
			categoryId,
			note: note || null,
			visibility: isPrivate ? 'private' : 'family'
		}
	};
}
