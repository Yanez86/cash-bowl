import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { currentMonth, isMonth, listEntries, summary } from '$lib/server/kakebo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const requested = url.searchParams.get('ym') ?? '';
	const ym = isMonth(requested) ? requested : currentMonth();
	const viewer = locals.user!.id;

	return {
		ym,
		currency: currency(db()),
		summary: summary(db(), ym, viewer),
		entries: listEntries(db(), { ym, viewer, kind: 'expense', status: 'complete' })
	};
};
