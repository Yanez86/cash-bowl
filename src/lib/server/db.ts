// Accesso a SQLite e applicazione delle migrazioni.
// Regole: un solo file di database, migrazioni numerate mai modificate a posteriori,
// copia di sicurezza automatica prima di applicarne di nuove. Vedi CLAUDE.md §7.
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DATA_DIR = process.env.DATA_DIR ?? 'data';

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? 'migrations';

export type DB = Database.Database;

/** Elenco ordinato dei file di migrazione: 001_init.sql, 002_....sql */
function migrationFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith('.sql'))
		.sort();
}

/**
 * Applica le migrazioni non ancora eseguite, una transazione ciascuna.
 * Prima di toccare un database esistente ne salva una copia coerente.
 */
export function migrate(db: DB, dir = MIGRATIONS_DIR): string[] {
	db.exec(`CREATE TABLE IF NOT EXISTS migrations (
		name TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL
	)`);

	const done = new Set(
		db
			.prepare('SELECT name FROM migrations')
			.all()
			.map((r) => (r as { name: string }).name)
	);
	const pending = migrationFiles(dir).filter((f) => !done.has(f));
	if (pending.length === 0) return [];

	if (done.size > 0) backup(db, `pre-migration-${timestamp()}`);

	const record = db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)');
	for (const file of pending) {
		const sql = readFileSync(join(dir, file), 'utf8');
		db.transaction(() => {
			db.exec(sql);
			record.run(file, new Date().toISOString());
		})();
	}
	return pending;
}

/** Copia coerente del database in data/backups/<nome>.db, senza fermare l'applicazione. */
export function backup(db: DB, name: string): string {
	const dir = join(DATA_DIR, 'backups');
	mkdirSync(dir, { recursive: true });
	const path = join(dir, `${name}.db`);
	db.prepare('VACUUM INTO ?').run(path);
	return path;
}

function timestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Apre (o crea) un database già migrato. */
export function openDatabase(file = join(DATA_DIR, 'cash-bowl.db')): DB {
	mkdirSync(DATA_DIR, { recursive: true });
	const db = new Database(file);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	migrate(db);
	return db;
}

let instance: DB | undefined;

/** Il database dell'applicazione: aperto una volta sola, al primo utilizzo. */
export function db(): DB {
	instance ??= openDatabase();
	return instance;
}
