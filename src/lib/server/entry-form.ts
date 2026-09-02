// Legge e controlla i campi di un modulo. Tutto quello che arriva dal browser
// passa di qui prima di toccare il database. Vedi CLAUDE.md §8.
import { parseAmount } from '$lib/money';
import type { Problem } from './auth';
import { isDate, today, type EntryInput, type Kind } from './kakebo';

const MAX_NOTE = 500;

export type Parsed = { ok: true; input: EntryInput } | { ok: false; problem: Problem };

const no = (key: string, vars?: Problem['vars']): Parsed => ({ ok: false, problem: { key, vars } });

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
		if (amountCents === null) return no('errors.invalidAmount');
		if (amountCents === 0) return no('errors.amountPositive');
	} else if (status === 'complete') {
		return no('errors.amountRequired');
	}

	if (!isDate(occurredOn)) return no('errors.invalidDate');
	const year = Number(occurredOn.slice(0, 4));
	if (year < 2000 || year > 2100) return no('errors.unlikelyDate');

	let categoryId: number | null = null;
	if (rawCategory) {
		categoryId = Number(rawCategory);
		if (!Number.isInteger(categoryId) || categoryId <= 0) return no('errors.invalidCategory');
	} else if (status === 'complete' && kind === 'expense') {
		return no('errors.categoryRequired');
	}

	if (note.length > MAX_NOTE) return no('errors.noteTooLong', { max: MAX_NOTE });

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
