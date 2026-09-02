import { db } from '$lib/server/db';
import { currency } from '$lib/server/settings';
import { tree } from '$lib/server/categories';
import {
	byCategory,
	byMonth,
	bySubCategory,
	byYear,
	draftsInRange,
	filtersToQuery,
	parseFilters,
	total
} from '$lib/server/reports';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const filters = parseFilters(url);
	const viewer = locals.user!.id;

	return {
		filters,
		query: filtersToQuery(filters),
		currency: currency(db()),
		categories: tree(db()),
		people: db().prepare('SELECT id, display_name FROM users ORDER BY display_name').all() as {
			id: number;
			display_name: string;
		}[],
		byCategory: byCategory(db(), filters, viewer),
		bySubCategory: bySubCategory(db(), filters, viewer).slice(0, 15),
		byMonth: byMonth(db(), filters, viewer),
		byYear: byYear(db(), filters, viewer),
		drafts: draftsInRange(db(), filters, viewer),
		spent: total(byCategory(db(), filters, viewer))
	};
};
