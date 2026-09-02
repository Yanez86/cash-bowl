// Copie di sicurezza ed export. Un backup che non si sa ripristinare non è un
// backup: qui si prova anche il giro completo. Vedi piani.md, fase 7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'cash-bowl-backup-'));
const { backupNow, backupsDir, dailyBackup, hasTodayBackup, listBackups, rotate } =
	await import('../src/lib/server/backup.ts');
const { migrate } = await import('../src/lib/server/db.ts');
const { createUser } = await import('../src/lib/server/auth.ts');
const { createEntry } = await import('../src/lib/server/kakebo.ts');
const { exportData, importData } = await import('../src/lib/server/transfer.ts');

async function filled(file = ':memory:') {
	const db = new Database(file);
	db.pragma('foreign_keys = ON');
	migrate(db);
	const anna = await createUser(db, {
		username: 'anna',
		displayName: 'Anna',
		password: 'x'.repeat(12)
	});
	const survival = (
		db.prepare("SELECT id FROM categories WHERE kakebo_key = 'survival'").get() as { id: number }
	).id;
	createEntry(
		db,
		{
			kind: 'expense',
			status: 'complete',
			amountCents: 4550,
			occurredOn: '2026-03-10',
			categoryId: survival,
			note: 'Supermercato',
			visibility: 'private',
			receiptFile: null
		},
		anna
	);
	return { db, anna };
}

test('la copia del giorno si fa una volta sola', async () => {
	const { db } = await filled();
	assert.equal(hasTodayBackup('2026-03-10'), false);

	const first = dailyBackup(db, '2026-03-10');
	assert.equal(first, 'cash-bowl-2026-03-10.db');
	assert.ok(existsSync(join(backupsDir(), first!)));

	assert.equal(dailyBackup(db, '2026-03-10'), null, 'la seconda volta non rifà niente');
});

test('la rotazione tiene le più recenti e non tocca le altre', async () => {
	const { db } = await filled();
	for (const day of ['01', '02', '03', '04', '05']) {
		backupNow(db, `cash-bowl-2026-04-${day}`);
	}
	backupNow(db, 'pre-migration-importante');

	const daily = () => listBackups().filter((backup) => backup.file.startsWith('cash-bowl-'));
	const before = daily().length;

	const removed = rotate(3);
	assert.equal(removed.length, before - 3, 'via tutte le giornaliere oltre le tre più recenti');
	assert.equal(daily().length, 3);

	const left = listBackups().map((backup) => backup.file);
	assert.ok(left.includes('cash-bowl-2026-04-05.db'), 'la più recente resta');
	assert.ok(!left.includes('cash-bowl-2026-04-01.db'), 'la più vecchia se ne va');
	assert.ok(
		left.includes('pre-migration-importante.db'),
		'le copie fatte prima di una migrazione non si toccano'
	);
});

test('la copia è un database vero e completo', async () => {
	const { db } = await filled();
	const file = backupNow(db, 'prova-copia');

	const copy = new Database(join(backupsDir(), file), { readonly: true });
	const entry = copy.prepare('SELECT amount_cents, note FROM transactions').get() as {
		amount_cents: number;
		note: string;
	};
	assert.equal(entry.amount_cents, 4550);
	assert.equal(entry.note, 'Supermercato');
	copy.close();
});

test('export e reimportazione: il giro completo', async () => {
	const { db } = await filled();
	const dump = exportData(db);
	assert.equal(dump.tables.transactions.length, 1);
	assert.equal(dump.tables.users.length, 1);
	assert.ok(!('sessions' in dump.tables), 'le sessioni non si esportano');

	// Un database nuovo e vuoto: dentro ci deve tornare tutto.
	const fresh = new Database(':memory:');
	fresh.pragma('foreign_keys = ON');
	migrate(fresh);

	const result = importData(fresh, JSON.parse(JSON.stringify(dump)));
	assert.ok(result.ok);

	const entry = fresh.prepare('SELECT amount_cents, note, visibility FROM transactions').get() as {
		amount_cents: number;
		note: string;
		visibility: string;
	};
	assert.equal(entry.amount_cents, 4550);
	assert.equal(entry.note, 'Supermercato');
	assert.equal(entry.visibility, 'private');
	assert.equal(
		(fresh.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number }).n,
		4,
		'le quattro categorie non si sdoppiano'
	);
});

test('rifiuta i file che non sono un export nostro', async () => {
	const { db } = await filled();
	assert.deepEqual(importData(db, null), { ok: false, key: 'errors.importNotAFile' });
	assert.deepEqual(importData(db, { format: 99, tables: {} }), {
		ok: false,
		key: 'errors.importWrongFormat'
	});
	assert.deepEqual(importData(db, { format: 1, tables: { users: [] } }), {
		ok: false,
		key: 'errors.importMissingTable'
	});

	const empty = exportData(db);
	empty.tables.users = [];
	assert.deepEqual(importData(db, empty), { ok: false, key: 'errors.importNoUsers' });
});

test('un file rotto non lascia il database a metà', async () => {
	const { db } = await filled();
	const broken = exportData(db);
	// Una voce che punta a una categoria inesistente: deve fallire tutto insieme.
	broken.tables.transactions.push({ ...broken.tables.transactions[0], id: 99, category_id: 4242 });

	assert.deepEqual(importData(db, broken), { ok: false, key: 'errors.importFailed' });
	assert.equal(
		(db.prepare('SELECT COUNT(*) AS n FROM transactions').get() as { n: number }).n,
		1,
		'i dati di prima sono ancora tutti lì'
	);
});

test('i nomi di colonna inventati nel file non entrano nella query', async () => {
	const { db } = await filled();
	const dump = exportData(db);
	// Una colonna che non esiste, con dentro un tentativo di iniezione.
	dump.tables.users[0]["nome'); DROP TABLE users; --"] = 'x';

	const fresh = new Database(':memory:');
	fresh.pragma('foreign_keys = ON');
	migrate(fresh);

	const result = importData(fresh, JSON.parse(JSON.stringify(dump)));
	assert.ok(result.ok, 'la colonna in più viene semplicemente ignorata');
	assert.equal((fresh.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n, 1);
});
