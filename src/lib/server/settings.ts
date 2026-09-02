import type { DB } from './db';

export function getSetting(db: DB, key: string, fallback: string): string {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		{ value: string } | undefined;
	return row?.value ?? fallback;
}

export const currency = (db: DB) => getSetting(db, 'currency', 'EUR');
