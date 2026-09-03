import { db } from '$lib/server/db';
import { generate } from '$lib/server/recurring';
import { currency } from '$lib/server/settings';
import { currentMonth, isMonth, listEntries, spentByCategory, summary } from '$lib/server/kakebo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const requested = url.searchParams.get('ym') ?? '';
	const ym = isMonth(requested) ? requested : currentMonth();
	// Arriva da /expenses/new dopo il salvataggio: si accettano solo i due
	// valori previsti, quello che arriva dall'indirizzo non si usa mai a scatola chiusa.
	const saved = url.searchParams.get('saved');
	const viewer = locals.user!.id;
	// Le ricorrenti mancanti entrano adesso: i conti del mese devono essere
	// giusti dal primo giorno. Rifarlo non cambia niente.
	generate(db(), ym, viewer);

	return {
		saved: saved === 'complete' || saved === 'draft' ? saved : null,
		ym,
		currency: currency(db()),
		summary: summary(db(), ym, viewer),
		byCategory: spentByCategory(db(), ym, viewer),
		latest: listEntries(db(), { ym, viewer, kind: 'expense', status: 'complete', limit: 10 })
	};
};
