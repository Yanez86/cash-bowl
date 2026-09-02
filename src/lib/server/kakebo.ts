// Le voci del mese e i conti del kakebo.
//
// Regola di riservatezza: chi guarda vede le voci di famiglia più le proprie
// private, e nient'altro. Il filtro sta nella clausola WHERE di ogni query, non
// in un controllo successivo. Vedi CLAUDE.md §8.
import type { DB } from './db';

export type Kind = 'income' | 'fixed' | 'expense';
export type Visibility = 'family' | 'private';
export type Status = 'draft' | 'complete';

/** Vale per chiunque guardi: le voci di famiglia più le proprie. */
const VISIBLE = "(t.visibility = 'family' OR t.created_by = @viewer)";

const IN_MONTH = 't.occurred_on >= @from AND t.occurred_on <= @to';

const monthRange = (ym: string) => ({ from: `${ym}-01`, to: `${ym}-31` });

/** Il mese di oggi, secondo l'orologio del server (imposta TZ nel file .env). */
export function currentMonth(): string {
	return today().slice(0, 7);
}

/** La data di oggi come YYYY-MM-DD. */
export function today(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isMonth(ym: string): boolean {
	return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

export function isDate(date: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
}

export type Summary = {
	income: number;
	fixed: number;
	goal: number;
	available: number;
	spent: number;
	remaining: number;
	saved: number;
	drafts: number;
};

/**
 * I numeri del mese. Le bozze non entrano in nessun totale: sono contate a parte
 * perché la schermata possa ricordarti che ci sono.
 */
export function summary(db: DB, ym: string, viewer: number): Summary {
	const args = { ...monthRange(ym), viewer };

	// Il tipo passa come parametro, mai concatenato nella query. CLAUDE.md §7.
	const totals = db.prepare(
		`SELECT COALESCE(SUM(t.amount_cents), 0) AS total FROM transactions t
		 WHERE t.status = 'complete' AND t.kind = @kind AND ${IN_MONTH} AND ${VISIBLE}`
	);
	const sum = (kind: Kind) => (totals.get({ ...args, kind }) as { total: number }).total;

	const goal =
		(
			db.prepare('SELECT savings_goal_cents AS goal FROM months WHERE ym = ?').get(ym) as
				{ goal: number } | undefined
		)?.goal ?? 0;

	const income = sum('income');
	const fixed = sum('fixed');
	const spent = sum('expense');
	const drafts = (
		db
			.prepare(
				`SELECT COUNT(*) AS n FROM transactions t
				 WHERE t.status = 'draft' AND ${IN_MONTH} AND ${VISIBLE}`
			)
			.get(args) as { n: number }
	).n;

	const available = income - fixed - goal;
	return {
		income,
		fixed,
		goal,
		available,
		spent,
		remaining: available - spent,
		saved: income - fixed - spent,
		drafts
	};
}

export type CategoryTotal = { id: number; name: string; kakebo_key: string; total: number };

/** Speso nel mese, raggruppato per le quattro categorie kakebo. */
export function spentByCategory(db: DB, ym: string, viewer: number): CategoryTotal[] {
	return db
		.prepare(
			`SELECT root.id, root.name, root.kakebo_key,
			        COALESCE(SUM(t.amount_cents), 0) AS total
			 FROM categories root
			 LEFT JOIN categories child ON child.parent_id = root.id
			 LEFT JOIN transactions t
			   ON t.category_id IN (root.id, child.id)
			   AND t.status = 'complete' AND t.kind = 'expense'
			   AND ${IN_MONTH} AND ${VISIBLE}
			 WHERE root.parent_id IS NULL
			 GROUP BY root.id
			 ORDER BY root.position`
		)
		.all({ ...monthRange(ym), viewer }) as CategoryTotal[];
}

export type Entry = {
	id: number;
	kind: Kind;
	status: Status;
	amount_cents: number | null;
	occurred_on: string;
	category_id: number | null;
	category_root_key: string | null;
	category_child: string | null;
	note: string | null;
	visibility: Visibility;
	created_by: number;
	author: string;
};

// Il nome delle quattro categorie kakebo non viene dal database ma dalla chiave:
// così la pagina lo traduce. Le sotto-categorie hanno il nome scelto dall'utente.
const ENTRY_COLUMNS = `t.id, t.kind, t.status, t.amount_cents, t.occurred_on, t.category_id,
	COALESCE(root.kakebo_key, c.kakebo_key) AS category_root_key,
	CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.name END AS category_child,
	t.note, t.visibility, t.created_by, u.display_name AS author
	FROM transactions t
	LEFT JOIN categories c ON c.id = t.category_id
	LEFT JOIN categories root ON root.id = c.parent_id
	JOIN users u ON u.id = t.created_by`;

/** Le voci di un mese, di un tipo, che chi guarda ha il diritto di vedere. */
export function listEntries(
	db: DB,
	options: { ym: string; viewer: number; kind?: Kind; status?: Status; limit?: number }
): Entry[] {
	const filters = [IN_MONTH, VISIBLE];
	if (options.kind) filters.push('t.kind = @kind');
	if (options.status) filters.push('t.status = @status');

	return db
		.prepare(
			`SELECT ${ENTRY_COLUMNS}
			 WHERE ${filters.join(' AND ')}
			 ORDER BY t.occurred_on DESC, t.id DESC
			 LIMIT @limit`
		)
		.all({
			...monthRange(options.ym),
			viewer: options.viewer,
			kind: options.kind ?? null,
			status: options.status ?? null,
			limit: options.limit ?? 500
		}) as Entry[];
}

/** Tutte le bozze, di qualunque mese: vanno smaltite, non archiviate. */
export function listDrafts(db: DB, viewer: number): Entry[] {
	return db
		.prepare(
			`SELECT ${ENTRY_COLUMNS}
			 WHERE t.status = 'draft' AND ${VISIBLE}
			 ORDER BY t.occurred_on ASC, t.id ASC`
		)
		.all({ viewer }) as Entry[];
}

export function countDrafts(db: DB, viewer: number): number {
	return (
		db
			.prepare(`SELECT COUNT(*) AS n FROM transactions t WHERE t.status = 'draft' AND ${VISIBLE}`)
			.get({ viewer }) as { n: number }
	).n;
}

/** Una singola voce, solo se chi guarda può vederla. */
export function getEntry(db: DB, id: number, viewer: number): Entry | null {
	return (
		(db.prepare(`SELECT ${ENTRY_COLUMNS} WHERE t.id = @id AND ${VISIBLE}`).get({ id, viewer }) as
			Entry | undefined) ?? null
	);
}

export type EntryInput = {
	kind: Kind;
	status: Status;
	amountCents: number | null;
	occurredOn: string;
	categoryId: number | null;
	note: string | null;
	visibility: Visibility;
};

export function createEntry(db: DB, input: EntryInput, author: number): number {
	const result = db
		.prepare(
			`INSERT INTO transactions
			   (kind, status, amount_cents, occurred_on, category_id, note, visibility, created_by)
			 VALUES (@kind, @status, @amountCents, @occurredOn, @categoryId, @note, @visibility, @author)`
		)
		.run({ ...input, author });
	return Number(result.lastInsertRowid);
}

/** Modifica una voce. Restituisce false se chi scrive non aveva il diritto di toccarla. */
export function updateEntry(db: DB, id: number, input: EntryInput, viewer: number): boolean {
	const result = db
		.prepare(
			`UPDATE transactions AS t
			 SET kind = @kind, status = @status, amount_cents = @amountCents,
			     occurred_on = @occurredOn, category_id = @categoryId,
			     note = @note, visibility = @visibility
			 WHERE t.id = @id AND ${VISIBLE}`
		)
		.run({ ...input, id, viewer });
	return result.changes > 0;
}

export function deleteEntry(db: DB, id: number, viewer: number): boolean {
	const result = db
		.prepare(`DELETE FROM transactions AS t WHERE t.id = @id AND ${VISIBLE}`)
		.run({ id, viewer });
	return result.changes > 0;
}

export function setSavingsGoal(db: DB, ym: string, cents: number): void {
	db.prepare(
		`INSERT INTO months (ym, savings_goal_cents) VALUES (?, ?)
		 ON CONFLICT (ym) DO UPDATE SET savings_goal_cents = excluded.savings_goal_cents`
	).run(ym, cents);
}
