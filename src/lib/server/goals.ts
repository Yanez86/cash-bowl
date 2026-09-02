// I salvadanai e i loro versamenti. Sono di famiglia: chi entra li vede tutti.
import type { DB } from './db.ts';

export type Goal = {
	id: number;
	name: string;
	target_cents: number;
	due_on: string | null;
	is_done: number;
	saved_cents: number;
	deposits: number;
	author: string;
};

export type Deposit = {
	id: number;
	amount_cents: number;
	occurred_on: string;
	note: string | null;
	author: string;
};

export function list(db: DB): Goal[] {
	return db
		.prepare(
			`SELECT g.id, g.name, g.target_cents, g.due_on, g.is_done,
			        COALESCE(SUM(d.amount_cents), 0) AS saved_cents,
			        COUNT(d.id) AS deposits,
			        u.display_name AS author
			 FROM goals g
			 LEFT JOIN goal_deposits d ON d.goal_id = g.id
			 JOIN users u ON u.id = g.created_by
			 GROUP BY g.id
			 ORDER BY g.is_done, g.due_on IS NULL, g.due_on, g.name`
		)
		.all() as Goal[];
}

export function deposits(db: DB, goalId: number): Deposit[] {
	return db
		.prepare(
			`SELECT d.id, d.amount_cents, d.occurred_on, d.note, u.display_name AS author
			 FROM goal_deposits d JOIN users u ON u.id = d.created_by
			 WHERE d.goal_id = ? ORDER BY d.occurred_on DESC, d.id DESC`
		)
		.all(goalId) as Deposit[];
}

export function create(
	db: DB,
	input: { name: string; targetCents: number; dueOn: string | null },
	author: number
): number {
	const result = db
		.prepare(
			'INSERT INTO goals (name, target_cents, due_on, created_by) VALUES (@name, @targetCents, @dueOn, @author)'
		)
		.run({ ...input, author });
	return Number(result.lastInsertRowid);
}

export function update(
	db: DB,
	id: number,
	input: { name: string; targetCents: number; dueOn: string | null }
): boolean {
	return (
		db
			.prepare(
				'UPDATE goals SET name = @name, target_cents = @targetCents, due_on = @dueOn WHERE id = @id'
			)
			.run({ ...input, id }).changes > 0
	);
}

export function setDone(db: DB, id: number, done: boolean): boolean {
	return db.prepare('UPDATE goals SET is_done = ? WHERE id = ?').run(done ? 1 : 0, id).changes > 0;
}

/** Elimina il salvadanaio e, con lui, i suoi versamenti. */
export function remove(db: DB, id: number): boolean {
	return db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes > 0;
}

export function addDeposit(
	db: DB,
	goalId: number,
	input: { amountCents: number; occurredOn: string; note: string | null },
	author: number
): boolean {
	if (!db.prepare('SELECT 1 FROM goals WHERE id = ?').get(goalId)) return false;
	db.prepare(
		`INSERT INTO goal_deposits (goal_id, amount_cents, occurred_on, note, created_by)
		 VALUES (@goalId, @amountCents, @occurredOn, @note, @author)`
	).run({ ...input, goalId, author });
	return true;
}

export function removeDeposit(db: DB, id: number): boolean {
	return db.prepare('DELETE FROM goal_deposits WHERE id = ?').run(id).changes > 0;
}
