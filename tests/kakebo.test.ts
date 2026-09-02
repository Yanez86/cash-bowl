// I due controlli che non si cancellano mai: le bozze non falsano i conti,
// e nessuno vede le spese private di un altro. Vedi CLAUDE.md §11.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';
import { createUser } from '../src/lib/server/auth.ts';
import * as categories from '../src/lib/server/categories.ts';
import {
	MAX_PER_ENTRY,
	addReceipt,
	filesOf,
	findReceipt,
	listReceipts,
	removeReceipt
} from '../src/lib/server/receipts.ts';
import {
	countDrafts,
	createEntry,
	deleteEntry,
	getEntry,
	listEntries,
	setSavingsGoal,
	spentByCategory,
	summary,
	updateEntry,
	type EntryInput
} from '../src/lib/server/kakebo.ts';

const YM = '2026-03';

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
	const survival = (
		db.prepare("SELECT id FROM categories WHERE kakebo_key = 'survival'").get() as { id: number }
	).id;
	return { db, anna, bruno, survival };
}

const entry = (over: Partial<EntryInput> = {}): EntryInput => ({
	kind: 'expense',
	status: 'complete',
	amountCents: 1000,
	occurredOn: `${YM}-10`,
	categoryId: null,
	note: null,
	visibility: 'family',
	...over
});

test('il bilancio del mese fa i conti giusti', async () => {
	const { db, anna, survival } = await scenario();
	createEntry(db, entry({ kind: 'income', amountCents: 200_000, categoryId: null }), anna);
	createEntry(db, entry({ kind: 'fixed', amountCents: 80_000 }), anna);
	setSavingsGoal(db, YM, 30_000);
	createEntry(db, entry({ amountCents: 4500, categoryId: survival }), anna);

	const s = summary(db, YM, anna);
	assert.equal(s.income, 200_000);
	assert.equal(s.fixed, 80_000);
	assert.equal(s.goal, 30_000);
	assert.equal(s.available, 90_000, 'entrate meno spese fisse meno obiettivo');
	assert.equal(s.spent, 4500);
	assert.equal(s.remaining, 85_500);
	assert.equal(s.saved, 115_500, 'messo davvero da parte: entrate meno fisse meno speso');
});

test('le bozze non entrano in nessun totale, ma vengono contate', async () => {
	const { db, anna, survival } = await scenario();
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);
	createEntry(db, entry({ status: 'draft', amountCents: 5000, categoryId: null }), anna);

	assert.equal(summary(db, YM, anna).spent, 1000, 'la bozza non deve essere sommata');
	assert.equal(summary(db, YM, anna).drafts, 1);
	assert.equal(countDrafts(db, anna), 1);

	const perCategory = spentByCategory(db, YM, anna);
	const total = perCategory.reduce((sum, row) => sum + row.total, 0);
	assert.equal(total, 1000, 'nemmeno nei totali per categoria');
});

test('una bozza si può salvare senza importo e senza categoria', async () => {
	const { db, anna } = await scenario();
	const id = createEntry(db, entry({ status: 'draft', amountCents: null, categoryId: null }), anna);
	assert.ok(getEntry(db, id, anna));
});

test('una voce completa non può restare senza importo né senza categoria', async () => {
	const { db, anna } = await scenario();
	assert.throws(() => createEntry(db, entry({ amountCents: null }), anna), /CHECK/);
	assert.throws(() => createEntry(db, entry({ categoryId: null }), anna), /CHECK/);
});

test('entrate e spese fisse non possono essere private', async () => {
	const { db, anna } = await scenario();
	assert.throws(
		() => createEntry(db, entry({ kind: 'income', visibility: 'private' }), anna),
		/CHECK/
	);
});

test('nessuno vede le spese private di un altro', async () => {
	const { db, anna, bruno, survival } = await scenario();
	const privata = createEntry(
		db,
		entry({ amountCents: 7000, categoryId: survival, visibility: 'private' }),
		anna
	);
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);

	assert.equal(summary(db, YM, anna).spent, 8000, 'Anna vede famiglia più le sue private');
	assert.equal(summary(db, YM, bruno).spent, 1000, 'Bruno vede solo quelle di famiglia');

	assert.ok(getEntry(db, privata, anna));
	assert.equal(getEntry(db, privata, bruno), null, 'Bruno non deve poterla nemmeno aprire');

	assert.equal(listEntries(db, { ym: YM, viewer: bruno }).length, 1);
	assert.equal(
		spentByCategory(db, YM, bruno).reduce((s, r) => s + r.total, 0),
		1000
	);
});

test('nessuno modifica o cancella le spese private di un altro', async () => {
	const { db, anna, bruno, survival } = await scenario();
	const privata = createEntry(
		db,
		entry({ amountCents: 7000, categoryId: survival, visibility: 'private' }),
		anna
	);

	assert.equal(updateEntry(db, privata, entry({ amountCents: 1 }), bruno), false);
	assert.equal(deleteEntry(db, privata, bruno), false);
	assert.equal(getEntry(db, privata, anna)?.amount_cents, 7000, 'deve essere rimasta intatta');

	assert.equal(deleteEntry(db, privata, anna), true);
});

test('la foto di una spesa privata non è raggiungibile da un altro', async () => {
	const { db, anna, bruno, survival } = await scenario();
	const id = createEntry(db, entry({ categoryId: survival, visibility: 'private' }), anna);
	addReceipt(db, id, '4d6f4a1e-0000-4000-8000-000000000000.jpg');

	const [photo] = listReceipts(db, id, anna);
	assert.ok(photo, 'la proprietaria la vede');

	// La rotta /receipts/[id] parte da qui: se la spesa non si vede, non c'è
	// nessun percorso da cui arrivare al file.
	assert.equal(findReceipt(db, photo.id, anna)?.file, '4d6f4a1e-0000-4000-8000-000000000000.jpg');
	assert.equal(findReceipt(db, photo.id, bruno), null);
	assert.deepEqual(listReceipts(db, id, bruno), []);
	assert.equal(removeReceipt(db, photo.id, bruno), null, 'e nemmeno può cancellarla');
});

test('una spesa non tiene più di cinque foto', async () => {
	const { db, anna, survival } = await scenario();
	const id = createEntry(db, entry({ categoryId: survival }), anna);

	for (let index = 1; index <= MAX_PER_ENTRY; index++) {
		assert.equal(addReceipt(db, id, `4d6f4a1e-0000-4000-8000-00000000000${index}.jpg`), true);
	}
	assert.equal(addReceipt(db, id, '4d6f4a1e-0000-4000-8000-000000000009.jpg'), false);
	assert.equal(listReceipts(db, id, anna).length, MAX_PER_ENTRY);
});

test('cancellando la spesa spariscono anche le sue foto', async () => {
	const { db, anna, survival } = await scenario();
	const id = createEntry(db, entry({ categoryId: survival }), anna);
	addReceipt(db, id, '4d6f4a1e-0000-4000-8000-000000000000.jpg');

	assert.deepEqual(filesOf(db, id), ['4d6f4a1e-0000-4000-8000-000000000000.jpg']);
	deleteEntry(db, id, anna);
	assert.deepEqual(listReceipts(db, id, anna), [], 'le righe se ne vanno con la spesa');
});

test('le spese di un altro mese restano fuori', async () => {
	const { db, anna, survival } = await scenario();
	createEntry(db, entry({ amountCents: 1000, categoryId: survival }), anna);
	createEntry(
		db,
		entry({ amountCents: 9999, categoryId: survival, occurredOn: '2026-04-01' }),
		anna
	);
	assert.equal(summary(db, YM, anna).spent, 1000);
});

test('le sotto-categorie sommano nella loro categoria kakebo', async () => {
	const { db, anna, survival } = await scenario();
	categories.addChild(db, survival, 'Spesa alimentare');
	const child = (
		db.prepare("SELECT id FROM categories WHERE name = 'Spesa alimentare'").get() as { id: number }
	).id;

	createEntry(db, entry({ amountCents: 3000, categoryId: child }), anna);
	createEntry(db, entry({ amountCents: 2000, categoryId: survival }), anna);

	const row = spentByCategory(db, YM, anna).find((r) => r.kakebo_key === 'survival');
	assert.equal(row?.total, 5000);
});

test('le categorie: due livelli, radici intoccabili, usate non si eliminano', async () => {
	const { db, anna, survival } = await scenario();
	categories.addChild(db, survival, 'Spesa alimentare');
	const child = (
		db.prepare("SELECT id FROM categories WHERE name = 'Spesa alimentare'").get() as { id: number }
	).id;

	assert.throws(() => categories.addChild(db, child, 'Troppo in fondo'), /annidano/);
	assert.equal(categories.setActive(db, survival, false), false, 'le radici restano attive');
	assert.equal(categories.remove(db, survival), false, 'le radici non si eliminano');

	assert.equal(categories.remove(db, child), true, 'mai usata: si può eliminare');
	categories.addChild(db, survival, 'Trasporti');
	const usata = (
		db.prepare("SELECT id FROM categories WHERE name = 'Trasporti'").get() as { id: number }
	).id;
	createEntry(db, entry({ amountCents: 500, categoryId: usata }), anna);
	assert.equal(categories.remove(db, usata), false, 'già usata: si disattiva soltanto');
	assert.equal(categories.setActive(db, usata, false), true);
});
