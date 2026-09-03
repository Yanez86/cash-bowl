import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { exists, selectable } from '$lib/server/categories';
import { refuse } from '$lib/server/problem';
import type { Vars } from '$lib/i18n';
import { parseAmount } from '$lib/money';
import { shiftMonth } from '$lib/dates';
import { currentMonth, isDate, type Kind } from '$lib/server/kakebo';
import * as recurring from '$lib/server/recurring';
import type { Actions, PageServerLoad } from './$types';

const MAX_DESCRIPTION = 100;

const KINDS: Kind[] = ['fixed', 'expense', 'income'];

// Cinquant'anni di ricorrenze: oltre, è quasi sicuramente un errore di battitura.
const MAX_TIMES = 600;

/**
 * Le tre scelte del modulo — per sempre, fino a una data, per un numero di volte
 * — diventano un valore solo: l'ultimo mese compreso, oppure null per sempre.
 * «Dodici volte da marzo 2026» è un altro modo di scrivere «fino a febbraio 2027».
 */
function endsYm(
	form: FormData,
	startsYm: string
): { month: string | null } | { error: string; vars?: Vars } {
	const choice = String(form.get('ends') ?? '');

	if (choice === 'forever') return { month: null };

	if (choice === 'until') {
		const date = String(form.get('ends_on') ?? '');
		if (!isDate(date)) return { error: 'errors.invalidDate' };
		// Le ricorrenti sono mensili: del giorno scelto teniamo solo il mese.
		const month = date.slice(0, 7);
		if (month < startsYm) return { error: 'errors.endsBeforeStart' };
		return { month };
	}

	if (choice === 'times') {
		const times = Number(form.get('times'));
		if (!Number.isInteger(times) || times < 1 || times > MAX_TIMES) {
			return { error: 'errors.invalidTimes', vars: { max: MAX_TIMES } };
		}
		return { month: shiftMonth(startsYm, times - 1) };
	}

	return { error: 'errors.invalidEntry' };
}

function id(form: FormData): number | null {
	const value = Number(form.get('id'));
	return Number.isInteger(value) && value > 0 ? value : null;
}

export const load: PageServerLoad = () => ({
	currency: currency(db()),
	thisMonth: currentMonth(),
	items: recurring.list(db()),
	categories: selectable(db())
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') ?? '') as Kind;
		if (!KINDS.includes(kind)) return refuse(400, 'errors.invalidEntry');

		const description = String(form.get('description') ?? '').trim();
		if (!description || description.length > MAX_DESCRIPTION) {
			return refuse(400, 'errors.nameRequired');
		}

		const amountCents = parseAmount(String(form.get('amount') ?? ''));
		if (amountCents === null) return refuse(400, 'errors.invalidAmount');
		if (amountCents === 0) return refuse(400, 'errors.amountPositive');

		const day = Number(form.get('day_of_month'));
		if (!Number.isInteger(day) || day < 1 || day > 28) return refuse(400, 'errors.invalidDay');

		// Solo le spese hanno una categoria: entrate e spese fisse no.
		let categoryId: number | null = null;
		if (kind === 'expense') {
			categoryId = Number(form.get('category_id'));
			if (!Number.isInteger(categoryId) || !exists(db(), categoryId)) {
				return refuse(400, 'errors.categoryRequired');
			}
		}

		const startsYm = currentMonth();
		const ends = endsYm(form, startsYm);
		if ('error' in ends) return refuse(400, ends.error, ends.vars);

		recurring.create(
			db(),
			{
				kind,
				description,
				amountCents,
				categoryId,
				dayOfMonth: day,
				startsYm,
				endsYm: ends.month
			},
			locals.user!.id
		);
		return { created: description };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const target = id(form);
		const amountCents = parseAmount(String(form.get('amount') ?? ''));
		const description = String(form.get('description') ?? '').trim();

		if (!target || !description || description.length > MAX_DESCRIPTION) {
			return refuse(400, 'errors.nameRequired');
		}
		if (amountCents === null || amountCents === 0) return refuse(400, 'errors.invalidAmount');

		// La scadenza si conta sempre dal mese in cui la ricorrente è nata, anche
		// quando la si cambia dopo.
		const startsYm = recurring.startsYm(db(), target);
		if (startsYm === null) return refuse(404, 'errors.entryNotFound');
		const ends = endsYm(form, startsYm);
		if ('error' in ends) return refuse(400, ends.error, ends.vars);

		if (!recurring.update(db(), target, amountCents, description, ends.month)) {
			return refuse(404, 'errors.entryNotFound');
		}
		// I mesi già registrati restano com'erano: erano spese vere.
		return { updated: true };
	},

	toggle: async ({ request }) => {
		const form = await request.formData();
		const target = id(form);
		if (!target || !recurring.setActive(db(), target, form.get('active') === '1')) {
			return refuse(404, 'errors.entryNotFound');
		}
		return { toggled: true };
	},

	remove: async ({ request }) => {
		const form = await request.formData();
		const target = id(form);
		if (!target || !recurring.remove(db(), target)) return refuse(404, 'errors.entryNotFound');
		return { removed: true };
	}
};
