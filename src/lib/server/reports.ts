// I report: gli stessi numeri del cruscotto, ma su un periodo scelto e con i
// filtri. Vale sempre la regola della riservatezza: si vedono le voci di
// famiglia più le proprie private, e il filtro sta nella query. CLAUDE.md §8.
import type { DB } from './db';
import { currentMonth, isMonth } from './kakebo.ts';

export type Visibility = 'all' | 'family' | 'private';

export type Filters = {
	from: string;
	to: string;
	categoryId: number | null;
	userId: number | null;
	visibility: Visibility;
};

/** Le condizioni comuni a tutte le interrogazioni dei report. */
const WHERE = `
	t.kind = 'expense'
	AND t.status = 'complete'
	AND t.occurred_on >= @from AND t.occurred_on <= @to
	AND (t.visibility = 'family' OR t.created_by = @viewer)
	AND (@categoryId IS NULL OR t.category_id = @categoryId OR c.parent_id = @categoryId)
	AND (@userId IS NULL OR t.created_by = @userId)
	AND (
		@visibility = 'all'
		OR (@visibility = 'family' AND t.visibility = 'family')
		OR (@visibility = 'private' AND t.visibility = 'private')
	)`;

const FROM = `
	FROM transactions t
	LEFT JOIN categories c ON c.id = t.category_id
	LEFT JOIN categories root ON root.id = c.parent_id`;

const args = (filters: Filters, viewer: number) => ({
	from: `${filters.from}-01`,
	to: `${filters.to}-31`,
	viewer,
	categoryId: filters.categoryId,
	userId: filters.userId,
	visibility: filters.visibility
});

export type Slice = { label: string; key: string; total: number };

/** Speso per categoria kakebo, dalla più costosa. */
export function byCategory(db: DB, filters: Filters, viewer: number): Slice[] {
	return db
		.prepare(
			`SELECT COALESCE(root.kakebo_key, c.kakebo_key) AS key,
			        COALESCE(root.kakebo_key, c.kakebo_key) AS label,
			        SUM(t.amount_cents) AS total
			 ${FROM} WHERE ${WHERE}
			 GROUP BY key ORDER BY total DESC`
		)
		.all(args(filters, viewer)) as Slice[];
}

/** Speso per sotto-categoria: qui i nomi li ha scelti la famiglia. */
export function bySubCategory(db: DB, filters: Filters, viewer: number): Slice[] {
	return db
		.prepare(
			`SELECT CAST(t.category_id AS TEXT) AS key,
			        CASE WHEN c.parent_id IS NULL THEN '' ELSE c.name END AS label,
			        SUM(t.amount_cents) AS total
			 ${FROM} WHERE ${WHERE} AND c.parent_id IS NOT NULL
			 GROUP BY t.category_id ORDER BY total DESC`
		)
		.all(args(filters, viewer)) as Slice[];
}

/** Speso mese per mese: serve a vedere se stai migliorando. */
export function byMonth(db: DB, filters: Filters, viewer: number): Slice[] {
	return db
		.prepare(
			`SELECT substr(t.occurred_on, 1, 7) AS key, substr(t.occurred_on, 1, 7) AS label,
			        SUM(t.amount_cents) AS total
			 ${FROM} WHERE ${WHERE}
			 GROUP BY key ORDER BY key`
		)
		.all(args(filters, viewer)) as Slice[];
}

/** Speso anno per anno. */
export function byYear(db: DB, filters: Filters, viewer: number): Slice[] {
	return db
		.prepare(
			`SELECT substr(t.occurred_on, 1, 4) AS key, substr(t.occurred_on, 1, 4) AS label,
			        SUM(t.amount_cents) AS total
			 ${FROM} WHERE ${WHERE}
			 GROUP BY key ORDER BY key`
		)
		.all(args(filters, viewer)) as Slice[];
}

export type ReportRow = {
	occurred_on: string;
	root_key: string | null;
	child: string | null;
	note: string | null;
	author: string;
	visibility: string;
	amount_cents: number;
};

/** Le singole spese del periodo: è quello che finisce nel file CSV. */
export function rows(db: DB, filters: Filters, viewer: number): ReportRow[] {
	return db
		.prepare(
			`SELECT t.occurred_on,
			        COALESCE(root.kakebo_key, c.kakebo_key) AS root_key,
			        CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.name END AS child,
			        t.note, u.display_name AS author, t.visibility, t.amount_cents
			 ${FROM} JOIN users u ON u.id = t.created_by
			 WHERE ${WHERE}
			 ORDER BY t.occurred_on, t.id`
		)
		.all(args(filters, viewer)) as ReportRow[];
}

/** Quante bozze cadono nel periodo: non contate, ma da non nascondere. */
export function draftsInRange(db: DB, filters: Filters, viewer: number): number {
	return (
		db
			.prepare(
				`SELECT COUNT(*) AS n FROM transactions t
				 WHERE t.status = 'draft'
				   AND t.occurred_on >= @from AND t.occurred_on <= @to
				   AND (t.visibility = 'family' OR t.created_by = @viewer)`
			)
			.get({ from: `${filters.from}-01`, to: `${filters.to}-31`, viewer }) as { n: number }
	).n;
}

export const total = (slices: Slice[]) => slices.reduce((sum, slice) => sum + slice.total, 0);

/** Quanti mesi indietro guarda un report appena aperto. */
const DEFAULT_SPAN = 11;

function monthsBefore(ym: string, count: number): string {
	const [year, month] = ym.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1 - count, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Legge i filtri dall'indirizzo. Quello che non si capisce torna al predefinito. */
export function parseFilters(url: URL): Filters {
	const now = currentMonth();
	const asMonth = (name: string, fallback: string) => {
		const value = url.searchParams.get(name) ?? '';
		return isMonth(value) ? value : fallback;
	};

	let from = asMonth('from', monthsBefore(now, DEFAULT_SPAN));
	let to = asMonth('to', now);
	if (from > to) [from, to] = [to, from];

	const asId = (name: string) => {
		const value = Number(url.searchParams.get(name));
		return Number.isInteger(value) && value > 0 ? value : null;
	};

	const wanted = url.searchParams.get('visibility') ?? '';
	const visibility: Visibility = wanted === 'family' || wanted === 'private' ? wanted : 'all';

	return { from, to, categoryId: asId('category'), userId: asId('user'), visibility };
}

/** Gli stessi filtri, riscritti come query per i collegamenti e il file CSV. */
export function filtersToQuery(filters: Filters): string {
	const params = new URLSearchParams({ from: filters.from, to: filters.to });
	if (filters.categoryId) params.set('category', String(filters.categoryId));
	if (filters.userId) params.set('user', String(filters.userId));
	if (filters.visibility !== 'all') params.set('visibility', filters.visibility);
	return params.toString();
}
