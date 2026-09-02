// I conti dei salvadanai. Sbagliare "quanto manca" o "quanto al mese" fa
// prendere decisioni sbagliate sui soldi veri. Vedi piani.md, fase 10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';
import { createUser } from '../src/lib/server/auth.ts';
import { missing, monthlyNeeded, monthsLeft, progress } from '../src/lib/goals.ts';
import * as goals from '../src/lib/server/goals.ts';

test('quanto manca e a che punto sei', () => {
	assert.equal(missing(150_000, 30_000), 120_000);
	assert.equal(missing(150_000, 150_000), 0);
	assert.equal(missing(150_000, 200_000), 0, 'superare il traguardo non dà un numero negativo');

	assert.equal(progress(150_000, 0), 0);
	assert.equal(progress(150_000, 75_000), 50);
	assert.equal(progress(150_000, 200_000), 100, 'la barra non va oltre il pieno');
});

test('quanti mesi restano, contando quello in corso', () => {
	assert.equal(monthsLeft('2026-03-10', '2026-03-31'), 1, 'lo stesso mese conta come uno');
	assert.equal(monthsLeft('2026-03-10', '2026-12-31'), 10);
	assert.equal(monthsLeft('2026-03-10', '2027-03-01'), 13);
	assert.equal(monthsLeft('2026-03-10', '2025-12-01'), 0, 'una data passata non dà mesi');
});

test('quanto mettere via al mese', () => {
	// 1200 € da mettere via in 10 mesi: 120 € al mese.
	assert.equal(monthlyNeeded(150_000, 30_000, '2026-12-31', '2026-03-10'), 12_000);
	// 100,00 € in tre mesi: 33,34 € al mese. Si arrotonda per eccesso, meglio un
	// centesimo in più che arrivare corti all'ultimo mese.
	assert.equal(monthlyNeeded(10_000, 0, '2026-05-31', '2026-03-01'), 3334);
	assert.equal(monthlyNeeded(150_000, 150_000, '2026-12-31', '2026-03-10'), null, 'già raggiunto');
	assert.equal(monthlyNeeded(150_000, 0, null, '2026-03-10'), null, 'senza data non c è un ritmo');
	assert.equal(
		monthlyNeeded(150_000, 30_000, '2025-01-01', '2026-03-10'),
		120_000,
		'tempo scaduto: manca tutto, e si dice'
	);
});

async function scenario() {
	const db = new Database(':memory:');
	db.pragma('foreign_keys = ON');
	migrate(db);
	const anna = await createUser(db, {
		username: 'anna',
		displayName: 'Anna',
		password: 'x'.repeat(12)
	});
	return { db, anna };
}

test('versamenti dentro e fuori dal salvadanaio', async () => {
	const { db, anna } = await scenario();
	const id = goals.create(db, { name: 'Vacanza', targetCents: 150_000, dueOn: null }, anna);

	goals.addDeposit(db, id, { amountCents: 50_000, occurredOn: '2026-03-01', note: null }, anna);
	goals.addDeposit(db, id, { amountCents: 20_000, occurredOn: '2026-04-01', note: 'Extra' }, anna);
	goals.addDeposit(
		db,
		id,
		{ amountCents: -10_000, occurredOn: '2026-05-01', note: 'Ripreso' },
		anna
	);

	const [goal] = goals.list(db);
	assert.equal(goal.saved_cents, 60_000, 'quello ripreso si sottrae');
	assert.equal(goal.deposits, 3);
	assert.equal(goals.deposits(db, id).length, 3);
});

test('un versamento da zero non si può registrare', async () => {
	const { db, anna } = await scenario();
	const id = goals.create(db, { name: 'Vacanza', targetCents: 150_000, dueOn: null }, anna);
	assert.throws(
		() => goals.addDeposit(db, id, { amountCents: 0, occurredOn: '2026-03-01', note: null }, anna),
		/CHECK/
	);
});

test('un salvadanaio che non esiste non accetta versamenti', async () => {
	const { db, anna } = await scenario();
	assert.equal(
		goals.addDeposit(db, 4242, { amountCents: 1000, occurredOn: '2026-03-01', note: null }, anna),
		false
	);
});

test('eliminando il salvadanaio spariscono i suoi movimenti', async () => {
	const { db, anna } = await scenario();
	const id = goals.create(db, { name: 'Vacanza', targetCents: 150_000, dueOn: null }, anna);
	goals.addDeposit(db, id, { amountCents: 50_000, occurredOn: '2026-03-01', note: null }, anna);

	assert.equal(goals.remove(db, id), true);
	assert.equal((db.prepare('SELECT COUNT(*) AS n FROM goal_deposits').get() as { n: number }).n, 0);
});

test('i salvadanai non entrano nei conti del mese', async () => {
	const { db, anna } = await scenario();
	const id = goals.create(db, { name: 'Vacanza', targetCents: 150_000, dueOn: null }, anna);
	goals.addDeposit(db, id, { amountCents: 50_000, occurredOn: '2026-03-01', note: null }, anna);

	const { summary } = await import('../src/lib/server/kakebo.ts');
	const march = summary(db, '2026-03', anna);
	assert.equal(march.spent, 0, 'mettere via dei soldi non è una spesa');
	assert.equal(march.income, 0);
	assert.equal(march.saved, 0);
});
