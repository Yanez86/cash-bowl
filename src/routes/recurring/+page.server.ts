import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { exists, selectable } from '$lib/server/categories';
import { refuse } from '$lib/server/problem';
import { parseAmount } from '$lib/money';
import { currentMonth, type Kind } from '$lib/server/kakebo';
import * as recurring from '$lib/server/recurring';
import type { Actions, PageServerLoad } from './$types';

const MAX_DESCRIPTION = 100;

const KINDS: Kind[] = ['fixed', 'expense', 'income'];

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

		recurring.create(
			db(),
			{ kind, description, amountCents, categoryId, dayOfMonth: day, startsYm: currentMonth() },
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
		if (!recurring.update(db(), target, amountCents, description)) {
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
