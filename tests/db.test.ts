// Controllo minimo della base dati: le migrazioni si applicano una volta sola
// e i vincoli scritti nello schema fanno davvero il loro lavoro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';

function fresh() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	return db;
}

test('le migrazioni si applicano e non si ripetono', () => {
	const db = fresh();
	const applied = migrate(db);
	assert.ok(applied.includes('001_init.sql'));
	assert.ok(applied.includes('002_username_and_login_attempts.sql'));
	assert.deepEqual(migrate(db), [], 'la seconda esecuzione non deve applicare nulla');

	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
		.all()
		.map((r) => (r as { name: string }).name);
	for (const t of ['users', 'sessions', 'settings', 'migrations', 'login_attempts']) {
		assert.ok(tables.includes(t), `manca la tabella ${t}`);
	}
});

test('lo schema rifiuta i valori non previsti', () => {
	const db = fresh();
	migrate(db);
	const insert = db.prepare(
		'INSERT INTO users (username, display_name, password_hash, locale) VALUES (?, ?, ?, ?)'
	);
	insert.run('anna', 'Anna', 'x', 'it');
	assert.throws(() => insert.run('anna', 'Altro', 'x', 'it'), /UNIQUE/);
	assert.throws(() => insert.run('bruno', 'Bruno', 'x', 'fr'), /CHECK/);
});

test('cancellando un utente spariscono le sue sessioni', () => {
	const db = fresh();
	migrate(db);
	db.prepare(
		'INSERT INTO users (id, username, display_name, password_hash) VALUES (1, ?, ?, ?)'
	).run('anna', 'Anna', 'x');
	db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, 1, ?)').run(
		'impronta',
		'2099-01-01T00:00:00Z'
	);
	db.prepare('DELETE FROM users WHERE id = 1').run();
	const left = db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number };
	assert.equal(left.n, 0);
});
