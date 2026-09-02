// Copie di sicurezza automatiche del database.
//
// La copia si fa con VACUUM INTO: è SQLite stesso a scriverla, mentre
// l'applicazione continua a funzionare, e quello che ne esce è un file
// coerente. Copiare il file a mano mentre qualcuno scrive, no.
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, type DB } from './db.ts';

/** Quante copie giornaliere si tengono prima di buttare via le più vecchie. */
export const KEEP = Number(process.env.BACKUP_KEEP ?? 14);

const PREFIX = 'cash-bowl-';

export const backupsDir = () => join(DATA_DIR, 'backups');

export type Backup = { file: string; bytes: number; at: string };

/** Le copie presenti, dalla più recente. */
export function listBackups(): Backup[] {
	const dir = backupsDir();
	if (!existsSync(dir)) return [];

	return readdirSync(dir)
		.filter((file) => file.endsWith('.db'))
		.map((file) => {
			const info = statSync(join(dir, file));
			return { file, bytes: info.size, at: info.mtime.toISOString() };
		})
		.sort((a, b) => b.at.localeCompare(a.at));
}

/** Scrive una copia e restituisce il nome del file. */
export function backupNow(db: DB, name: string): string {
	mkdirSync(backupsDir(), { recursive: true });
	const file = `${name}.db`;
	db.prepare('VACUUM INTO ?').run(join(backupsDir(), file));
	return file;
}

/**
 * Tiene solo le copie giornaliere più recenti. Le copie fatte prima di una
 * migrazione non si toccano: servono proprio quando qualcosa va storto.
 */
export function rotate(keep = KEEP): string[] {
	const daily = listBackups().filter((backup) => backup.file.startsWith(PREFIX));
	const removed: string[] = [];

	for (const backup of daily.slice(keep)) {
		try {
			unlinkSync(join(backupsDir(), backup.file));
			removed.push(backup.file);
		} catch {
			// Sparita per conto suo: va bene lo stesso.
		}
	}
	return removed;
}

const dayName = (today: string) => `${PREFIX}${today}`;

/** La copia di oggi esiste già? */
export function hasTodayBackup(today: string): boolean {
	return existsSync(join(backupsDir(), `${dayName(today)}.db`));
}

/** Fa la copia del giorno se manca, poi ripulisce. Restituisce il nome, o null. */
export function dailyBackup(db: DB, today: string): string | null {
	if (hasTodayBackup(today)) return null;
	const file = backupNow(db, dayName(today));
	rotate();
	return file;
}
