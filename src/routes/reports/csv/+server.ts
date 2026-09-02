// Lo stesso report, scaricabile. I filtri sono quelli dell'indirizzo, quindi il
// file contiene esattamente quello che la pagina mostrava.
import { db } from '$lib/server/db';
import { BOM, toCsv } from '$lib/csv';
import { translator } from '$lib/i18n';
import { amountForInput } from '$lib/money';
import { categoryLabel } from '$lib/CategoryLabel';
import { parseFilters, rows } from '$lib/server/reports';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, locals }) => {
	const filters = parseFilters(url);
	const t = translator(locals.locale);

	const header = [
		t('common.date'),
		t('common.category'),
		t('common.note'),
		t('common.who'),
		t('reports.visibility'),
		t('common.amount')
	];

	const body = rows(db(), filters, locals.user!.id).map((row) => [
		row.occurred_on,
		categoryLabel(t, row.root_key ?? '', row.child),
		row.note ?? '',
		row.author,
		row.visibility === 'private' ? t('reports.private') : t('reports.family'),
		amountForInput(row.amount_cents)
	]);

	const name = `cash-bowl-${filters.from}_${filters.to}.csv`;
	// L'a capo finale: certi programmi si lamentano se manca.
	return new Response(`${BOM}${toCsv([header, ...body])}\r\n`, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${name}"`,
			'Cache-Control': 'no-store'
		}
	});
};
