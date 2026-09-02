import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { listDrafts } from '$lib/server/kakebo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	currency: currency(db()),
	// Dalla più vecchia: le bozze vanno smaltite, non archiviate.
	drafts: listDrafts(db(), locals.user!.id)
});
