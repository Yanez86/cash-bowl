// Export e reimportazione dei dati in un file leggibile.
//
// Il file contiene tutto il database tranne le foto, che sono già file dentro
// data/receipts/ e si copiano come cartella. Vedi piani.md, fase 7.
import type { DB } from './db.ts';

/** Le tabelle esportate, nell'ordine in cui si possono riscrivere senza rompere
    i riferimenti fra loro. */
const TABLES = ['users', 'settings', 'categories', 'months', 'transactions'] as const;

export const FORMAT = 1;

/** Le colonne che esistono davvero in una tabella, chieste al database. */
function columnsOf(db: DB, table: string): string[] {
	return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
		(column) => column.name
	);
}

export type Dump = {
	format: number;
	exportedAt: string;
	tables: Record<string, Record<string, unknown>[]>;
};

export function exportData(db: DB): Dump {
	const tables: Dump['tables'] = {};
	for (const table of TABLES) {
		tables[table] = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
	}
	// Le sessioni non si esportano: chi ripristina deve rifare l'accesso.
	return { format: FORMAT, exportedAt: new Date().toISOString(), tables };
}

export type ImportResult =
	{ ok: true; counts: Record<string, number> } | { ok: false; key: string };

/**
 * Rimette dentro un file esportato, sostituendo tutto. O riesce del tutto o non
 * cambia niente: è una transazione sola.
 */
export function importData(db: DB, raw: unknown): ImportResult {
	if (!raw || typeof raw !== 'object') return { ok: false, key: 'errors.importNotAFile' };
	const dump = raw as Partial<Dump>;
	if (dump.format !== FORMAT) return { ok: false, key: 'errors.importWrongFormat' };
	if (!dump.tables || typeof dump.tables !== 'object') {
		return { ok: false, key: 'errors.importNotAFile' };
	}

	for (const table of TABLES) {
		if (!Array.isArray(dump.tables[table])) return { ok: false, key: 'errors.importMissingTable' };
	}
	if (dump.tables.users.length === 0) return { ok: false, key: 'errors.importNoUsers' };

	const counts: Record<string, number> = {};
	try {
		db.transaction(() => {
			db.prepare('DELETE FROM sessions').run();
			db.prepare('DELETE FROM login_attempts').run();
			for (const table of [...TABLES].reverse()) db.prepare(`DELETE FROM ${table}`).run();

			for (const table of TABLES) {
				// I nomi delle colonne li dice il database, non il file caricato:
				// quello che arriva da fuori non entra mai in una query. CLAUDE.md §7.
				const allowed = columnsOf(db, table);
				const rows = dump.tables![table];
				counts[table] = rows.length;

				for (const row of rows) {
					const columns = allowed.filter((column) => column in row);
					if (columns.length === 0) continue;

					const values: Record<string, unknown> = {};
					for (const column of columns) values[column] = row[column] ?? null;

					const holes = columns.map((column) => `@${column}`).join(', ');
					db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${holes})`).run(values);
				}
			}
		})();
	} catch {
		// La transazione ha già rimesso tutto com'era.
		return { ok: false, key: 'errors.importFailed' };
	}

	return { ok: true, counts };
}
