// Controlli sulle parti che, se cedono, fanno entrare qualcuno che non deve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';
import {
	createSession,
	createUser,
	deleteSession,
	hashPassword,
	login,
	readSession,
	setPassword,
	usernameProblem,
	verifyPassword
} from '../src/lib/server/auth.ts';

function fresh() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrate(db);
	return db;
}

const anna = { username: 'anna', displayName: 'Anna', password: 'una-password-lunga' };

test('la password si verifica solo con quella giusta', async () => {
	const stored = await hashPassword('una-password-lunga');
	assert.equal(await verifyPassword('una-password-lunga', stored), true);
	assert.equal(await verifyPassword('una-password-lunga ', stored), false);
	assert.equal(await verifyPassword('altro', stored), false);
	assert.equal(await verifyPassword('qualsiasi', 'spazzatura'), false);
});

test('due utenti con la stessa password hanno impronte diverse', async () => {
	const a = await hashPassword('stessa-password-qui');
	const b = await hashPassword('stessa-password-qui');
	assert.notEqual(a, b, 'il sale casuale deve rendere diverse le due impronte');
});

test('accesso riuscito, accesso fallito e sessione leggibile', async () => {
	const db = fresh();
	await createUser(db, anna);

	assert.equal(await login(db, 'anna', 'sbagliata-ma-lunga', '10.0.0.1'), null);
	assert.equal(await login(db, 'nessuno', anna.password, '10.0.0.1'), null);

	const token = await login(db, 'anna', anna.password, '10.0.0.1');
	assert.ok(token);
	assert.equal(readSession(db, token)?.username, 'anna');
	assert.equal(readSession(db, 'token-inventato'), null);
});

test('il token non è salvato in chiaro nel database', async () => {
	const db = fresh();
	const id = await createUser(db, anna);
	const token = createSession(db, id);
	const rows = db.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
	assert.equal(rows.length, 1);
	assert.notEqual(rows[0].token_hash, token);
});

test('uscire chiude la sessione sul server', async () => {
	const db = fresh();
	const id = await createUser(db, anna);
	const token = createSession(db, id);
	deleteSession(db, token);
	assert.equal(readSession(db, token), null);
});

test('cambiare password butta fuori tutti i dispositivi', async () => {
	const db = fresh();
	const id = await createUser(db, anna);
	const token = createSession(db, id);
	await setPassword(db, id, 'nuova-password-lunga');
	assert.equal(readSession(db, token), null);
});

test('un utente disattivato non entra e la sua sessione non vale più', async () => {
	const db = fresh();
	const id = await createUser(db, anna);
	const token = createSession(db, id);
	db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
	assert.equal(readSession(db, token), null);
	assert.equal(await login(db, 'anna', anna.password, '10.0.0.1'), null);
});

test('una sessione scaduta non vale', async () => {
	const db = fresh();
	const id = await createUser(db, anna);
	const token = createSession(db, id);
	db.prepare('UPDATE sessions SET expires_at = ?').run('2000-01-01T00:00:00Z');
	assert.equal(readSession(db, token), null);
});

test('dopo troppi tentativi falliti si blocca anche la password giusta', async () => {
	const db = fresh();
	await createUser(db, anna);
	const insert = db.prepare('INSERT INTO login_attempts (username, ip, at) VALUES (?, ?, ?)');
	for (let i = 0; i < 10; i++) insert.run('anna', '10.0.0.1', new Date().toISOString());

	assert.equal(await login(db, 'anna', anna.password, '10.0.0.1'), null);
	// Da un altro indirizzo e con un altro nome il blocco non deve scattare.
	await createUser(db, { username: 'bruno', displayName: 'Bruno', password: 'altra-password-qui' });
	assert.ok(await login(db, 'bruno', 'altra-password-qui', '10.0.0.2'));
});

test('i nomi utente strani vengono rifiutati', () => {
	assert.equal(usernameProblem('anna'), null);
	assert.ok(usernameProblem('Anna'));
	assert.ok(usernameProblem('an'));
	assert.ok(usernameProblem('anna maria'));
	assert.ok(usernameProblem('.anna'));
});
