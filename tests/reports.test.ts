// I report leggono gli stessi dati del cruscotto: devono rispettare le stesse
// regole. Un report che mostra la spesa privata di un altro è la fuga di dati
// più facile da non accorgersene. Vedi audit.md §1.3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';
import { createUser } from '../src/lib/server/auth.ts';
import { createEntry, type EntryInput } from '../src/lib/server/kakebo.ts';
import {
	byCategory,
	byMonth,
	byYear,
	draftsInRange,
	filtersToQuery,
	parseFilters,
	rows,
	total,
	type Filters
} from '../src/lib/server/reports.ts';

const RANGE: Filters = {
	from: '2026-01',
	to: '2026-12',
	categoryId: null,
	userId: null,
	visibility: 'all'
};

async function scenario() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrate(db);
	const anna = await createUser(db, {
		username: 'anna',
		displayName: 'Anna',
		password: 'x'.repeat(12)
	});
	const bruno = await createUser(db, {
		username: 'bruno',
		displayName: 'Bruno',
		password: 'x'.repeat(12)
	});
	const id = (key: string) =>
		(db.prepare('SELECT id FROM categories WHERE kakebo_key = ?').get(key) as { id: number }).id;
	return { db, anna, bruno, survival: id('survival'), leisure: id('leisure') };
}

const entry = (over: Partial<EntryInput> = {}): EntryInput => ({
	kind: 'expense',
	status: 'complete',
	amountCents: 1000,
	occurredOn: '2026-03-10',
	categoryId: null,
	note: null,
	visibility: 'family',
	...over
});

test('il report non mostra le spese private di un altro', async () => {
	const { db, anna, bruno, survival } = await scenario();
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);
	createEntry(db, entry({ amountCents: 7000, categoryId: survival, visibility: 'private' }), anna);

	assert.equal(total(byCategory(db, RANGE, anna)), 8000, 'Anna vede anche le sue private');
	assert.equal(total(byCategory(db, RANGE, bruno)), 1000, 'Bruno vede solo quelle di famiglia');
	assert.equal(total(byMonth(db, RANGE, bruno)), 1000);
	assert.equal(total(byYear(db, RANGE, bruno)), 1000);
	assert.equal(rows(db, RANGE, bruno).length, 1, 'nemmeno nel file CSV');
});

test('le bozze non entrano nei report, ma vengono contate a parte', async () => {
	const { db, anna, survival } = await scenario();
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);
	createEntry(db, entry({ status: 'draft', amountCents: 5000 }), anna);

	assert.equal(total(byCategory(db, RANGE, anna)), 1000);
	assert.equal(rows(db, RANGE, anna).length, 1);
	assert.equal(draftsInRange(db, RANGE, anna), 1);
});

test('il periodo taglia davvero', async () => {
	const { db, anna, survival } = await scenario();
	createEntry(
		db,
		entry({ amountCents: 1000, categoryId: survival, occurredOn: '2026-03-10' }),
		anna
	);
	createEntry(
		db,
		entry({ amountCents: 2000, categoryId: survival, occurredOn: '2025-12-31' }),
		anna
	);
	createEntry(
		db,
		entry({ amountCents: 3000, categoryId: survival, occurredOn: '2027-01-01' }),
		anna
	);

	assert.equal(total(byCategory(db, RANGE, anna)), 1000);
	assert.equal(
		total(byCategory(db, { ...RANGE, from: '2025-01', to: '2027-12' }, anna)),
		6000,
		'allargando il periodo tornano tutte'
	);
});

test('i filtri per categoria, persona e visibilità', async () => {
	const { db, anna, bruno, survival, leisure } = await scenario();
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);
	createEntry(db, entry({ amountCents: 2000, categoryId: leisure }), bruno);
	createEntry(db, entry({ amountCents: 4000, categoryId: leisure, visibility: 'private' }), anna);

	assert.equal(total(byCategory(db, { ...RANGE, categoryId: survival }, anna)), 1000);
	assert.equal(total(byCategory(db, { ...RANGE, userId: bruno }, anna)), 2000);
	assert.equal(total(byCategory(db, { ...RANGE, visibility: 'family' }, anna)), 3000);
	assert.equal(total(byCategory(db, { ...RANGE, visibility: 'private' }, anna)), 4000);
	assert.equal(
		total(byCategory(db, { ...RANGE, visibility: 'private' }, bruno)),
		0,
		'le private di Anna restano invisibili anche chiedendole apposta'
	);
});

test('il filtro per categoria prende anche le sotto-categorie', async () => {
	const { db, anna, survival } = await scenario();
	db.prepare('INSERT INTO categories (parent_id, name, position) VALUES (?, ?, 1)').run(
		survival,
		'Spesa alimentare'
	);
	const child = (
		db.prepare("SELECT id FROM categories WHERE name = 'Spesa alimentare'").get() as { id: number }
	).id;
	createEntry(db, entry({ amountCents: 3000, categoryId: child }), anna);
	createEntry(db, entry({ amountCents: 2000, categoryId: survival }), anna);

	assert.equal(total(byCategory(db, { ...RANGE, categoryId: survival }, anna)), 5000);
});

test('i filtri sbagliati tornano ai valori predefiniti', () => {
	const bad = parseFilters(
		new URL('http://x/reports?from=pippo&to=2026-99&category=-1&user=abc&visibility=tutto')
	);
	assert.match(bad.from, /^\d{4}-\d{2}$/);
	assert.match(bad.to, /^\d{4}-\d{2}$/);
	assert.ok(bad.from <= bad.to);
	assert.equal(bad.categoryId, null);
	assert.equal(bad.userId, null);
	assert.equal(bad.visibility, 'all');
});

test('un periodo al contrario viene raddrizzato', () => {
	const swapped = parseFilters(new URL('http://x/reports?from=2026-12&to=2026-01'));
	assert.equal(swapped.from, '2026-01');
	assert.equal(swapped.to, '2026-12');
	assert.equal(filtersToQuery(swapped), 'from=2026-01&to=2026-12');
});
