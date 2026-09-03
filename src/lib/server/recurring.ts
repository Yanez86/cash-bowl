// Le voci che tornano ogni mese.
//
// La generazione è volutamente prudente: mai nel futuro, mai prima del mese in
// cui la ricorrente è nata, mai dopo il mese in cui finisce, e mai due volte.
// L'ultima garanzia non è in questo file ma nel database, in un indice unico: se
// anche il codice sbagliasse, il doppione non entrerebbe comunque.
// Vedi migrations/007_recurring.sql e 009_recurring_end.sql
import type { DB } from './db.ts';
import { currentMonth, isMonth, type Kind } from './kakebo.ts';

export type Recurring = {
	id: number;
	kind: Kind;
	description: string;
	amount_cents: number;
	category_id: number | null;
	category_root_key: string | null;
	category_child: string | null;
	category_icon: string | null;
	day_of_month: number;
	starts_ym: string;
	ends_ym: string | null;
	is_active: number;
	author: string;
};

const COLUMNS = `r.id, r.kind, r.description, r.amount_cents, r.category_id,
	COALESCE(root.kakebo_key, c.kakebo_key) AS category_root_key,
	CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.name END AS category_child,
	c.icon AS category_icon,
	r.day_of_month, r.starts_ym, r.ends_ym, r.is_active, u.display_name AS author
	FROM recurring r
	LEFT JOIN categories c ON c.id = r.category_id
	LEFT JOIN categories root ON root.id = c.parent_id
	JOIN users u ON u.id = r.created_by`;

export function list(db: DB): Recurring[] {
	return db
		.prepare(`SELECT ${COLUMNS} ORDER BY r.is_active DESC, r.kind, r.description`)
		.all() as Recurring[];
}

export type NewRecurring = {
	kind: Kind;
	description: string;
	amountCents: number;
	categoryId: number | null;
	dayOfMonth: number;
	startsYm: string;
	/** Ultimo mese compreso. null: per sempre, finché non la chiudi. */
	endsYm: string | null;
};

export function create(db: DB, input: NewRecurring, author: number): number {
	const result = db
		.prepare(
			`INSERT INTO recurring
			   (kind, description, amount_cents, category_id, day_of_month, starts_ym, ends_ym,
			    created_by)
			 VALUES (@kind, @description, @amountCents, @categoryId, @dayOfMonth, @startsYm, @endsYm,
			         @author)`
		)
		.run({ ...input, author });
	return Number(result.lastInsertRowid);
}

/** Il mese da cui vale la ricorrente, o null se non esiste. */
export function startsYm(db: DB, id: number): string | null {
	const row = db.prepare('SELECT starts_ym FROM recurring WHERE id = ?').get(id) as
		{ starts_ym: string } | undefined;
	return row?.starts_ym ?? null;
}

/** Cambia importo, descrizione e scadenza. I mesi già registrati non si toccano. */
export function update(
	db: DB,
	id: number,
	amountCents: number,
	description: string,
	endsYm: string | null
): boolean {
	return (
		db
			.prepare('UPDATE recurring SET amount_cents = ?, description = ?, ends_ym = ? WHERE id = ?')
			.run(amountCents, description, endsYm, id).changes > 0
	);
}

export function setActive(db: DB, id: number, active: boolean): boolean {
	return (
		db.prepare('UPDATE recurring SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id).changes >
		0
	);
}

/** Elimina la regola. Le voci già registrate restano, senza più un padre. */
export function remove(db: DB, id: number): boolean {
	return db.prepare('DELETE FROM recurring WHERE id = ?').run(id).changes > 0;
}

/**
 * Inserisce nel mese le ricorrenti che ancora non ci sono.
 * Restituisce quante ne ha aggiunte. Chiamarla due volte non cambia niente.
 */
export function generate(db: DB, ym: string, author: number): number {
	// Mai nel futuro: aprire per sbaglio il mese di fra tre anni non deve
	// produrre tre anni di affitti.
	if (!isMonth(ym) || ym > currentMonth()) return 0;

	const due = db
		.prepare(
			`SELECT r.id, r.kind, r.amount_cents, r.category_id, r.day_of_month
			 FROM recurring r
			 WHERE r.is_active = 1 AND r.starts_ym <= @ym
			   AND (r.ends_ym IS NULL OR r.ends_ym >= @ym)
			   AND NOT EXISTS (
			     SELECT 1 FROM transactions t
			     WHERE t.recurring_id = r.id AND substr(t.occurred_on, 1, 7) = @ym
			   )`
		)
		.all({ ym }) as {
		id: number;
		kind: Kind;
		amount_cents: number;
		category_id: number | null;
		day_of_month: number;
	}[];

	const insert = db.prepare(
		`INSERT INTO transactions
		   (kind, status, amount_cents, occurred_on, category_id, note, visibility,
		    created_by, recurring_id)
		 SELECT @kind, 'complete', @amountCents, @occurredOn, @categoryId, r.description, 'family',
		        @author, @id
		 FROM recurring r WHERE r.id = @id`
	);

	let added = 0;
	for (const row of due) {
		const day = String(row.day_of_month).padStart(2, '0');
		try {
			insert.run({
				kind: row.kind,
				amountCents: row.amount_cents,
				occurredOn: `${ym}-${day}`,
				categoryId: row.category_id,
				author,
				id: row.id
			});
			added++;
		} catch {
			// L'indice unico ha fermato un doppione: è esattamente il suo mestiere.
		}
	}
	return added;
}
