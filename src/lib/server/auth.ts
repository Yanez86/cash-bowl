// Password, sessioni e blocco dei tentativi falliti.
// Niente librerie esterne: basta il modulo crypto di Node. Vedi CLAUDE.md §8.
import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { DB } from './db';

const scrypt = promisify(scryptCallback) as (
	password: string,
	salt: Buffer,
	keylen: number
) => Promise<Buffer>;

/** Nome del cookie di sessione. */
export const SESSION_COOKIE = 'cash_bowl_session';

export const MIN_PASSWORD_LENGTH = 12;
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** Durata della sessione e soglia oltre la quale usare l'app la prolunga. */
const SESSION_DAYS = 30;
const RENEW_AFTER_DAYS = 15;

/** Blocco dei tentativi: quanti errori in quanti minuti. */
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MINUTES = 15;

export type SessionUser = {
	id: number;
	username: string;
	display_name: string;
	is_admin: number;
	locale: string;
	theme: string;
};

// --- password ---------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = await scrypt(password, salt, 64);
	return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, saltHex, hashHex] = stored.split('$');
	if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
	const expected = Buffer.from(hashHex, 'hex');
	const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Motivo per cui una password non va bene, oppure null se va bene. */
export function passwordProblem(password: string): string | null {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
	}
	return null;
}

/** Motivo per cui un nome utente non va bene, oppure null se va bene. */
export function usernameProblem(username: string): string | null {
	if (!USERNAME_PATTERN.test(username)) {
		return 'Il nome utente deve avere da 3 a 32 caratteri: lettere minuscole, numeri, punto, trattino.';
	}
	return null;
}

// --- utenti -----------------------------------------------------------------

export function countUsers(db: DB): number {
	return (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
}

export async function createUser(
	db: DB,
	user: { username: string; displayName: string; password: string; isAdmin?: boolean }
): Promise<number> {
	const hash = await hashPassword(user.password);
	const result = db
		.prepare(
			`INSERT INTO users (username, display_name, password_hash, is_admin)
			 VALUES (?, ?, ?, ?)`
		)
		.run(user.username, user.displayName, hash, user.isAdmin ? 1 : 0);
	return Number(result.lastInsertRowid);
}

export async function setPassword(db: DB, userId: number, password: string): Promise<void> {
	const hash = await hashPassword(password);
	db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
	// Cambiare password butta fuori tutte le altre sessioni. Vedi audit.md §1.1
	deleteUserSessions(db, userId);
}

// --- sessioni ---------------------------------------------------------------

const fingerprint = (token: string) => createHash('sha256').update(token).digest('hex');

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Crea una sessione e restituisce il token da mettere nel cookie (mai salvato in chiaro). */
export function createSession(db: DB, userId: number): string {
	const token = randomBytes(32).toString('base64url');
	db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
		fingerprint(token),
		userId,
		inDays(SESSION_DAYS)
	);
	return token;
}

/** Utente della sessione, se valida. Usare l'app prolunga la scadenza. */
export function readSession(db: DB, token: string): SessionUser | null {
	const hash = fingerprint(token);
	const row = db
		.prepare(
			`SELECT u.id, u.username, u.display_name, u.is_admin, u.locale, u.theme, s.expires_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1`
		)
		.get(hash, new Date().toISOString()) as (SessionUser & { expires_at: string }) | undefined;
	if (!row) return null;

	const remaining = Date.parse(row.expires_at) - Date.now();
	if (remaining < RENEW_AFTER_DAYS * 86_400_000) {
		db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(
			inDays(SESSION_DAYS),
			hash
		);
	}
	return {
		id: row.id,
		username: row.username,
		display_name: row.display_name,
		is_admin: row.is_admin,
		locale: row.locale,
		theme: row.theme
	};
}

export function deleteSession(db: DB, token: string): void {
	db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(fingerprint(token));
}

export function deleteUserSessions(db: DB, userId: number): void {
	db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function deleteExpiredSessions(db: DB): void {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}

// --- tentativi di accesso ---------------------------------------------------

export function tooManyAttempts(db: DB, username: string, ip: string): boolean {
	const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
	const row = db
		.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE at > ? AND (username = ? OR ip = ?)')
		.get(since, username, ip) as { n: number };
	return row.n >= MAX_ATTEMPTS;
}

function recordFailure(db: DB, username: string, ip: string): void {
	db.prepare('INSERT INTO login_attempts (username, ip, at) VALUES (?, ?, ?)').run(
		username,
		ip,
		new Date().toISOString()
	);
}

/**
 * Prova ad accedere. Restituisce il token di sessione, oppure null.
 * Il motivo del rifiuto non viene mai detto: non si rivela se l'utente esiste.
 */
export async function login(
	db: DB,
	username: string,
	password: string,
	ip: string
): Promise<string | null> {
	if (tooManyAttempts(db, username, ip)) return null;

	const row = db
		.prepare('SELECT id, password_hash FROM users WHERE username = ? AND is_active = 1')
		.get(username) as { id: number; password_hash: string } | undefined;

	// Anche senza utente si calcola comunque un hash: altrimenti il tempo di
	// risposta direbbe se il nome esiste.
	const stored = row?.password_hash ?? (await hashPassword('utente-inesistente'));
	const ok = await verifyPassword(password, stored);

	if (!row || !ok) {
		recordFailure(db, username, ip);
		return null;
	}

	db.prepare('DELETE FROM login_attempts WHERE username = ? OR ip = ?').run(username, ip);
	deleteExpiredSessions(db);
	return createSession(db, row.id);
}
