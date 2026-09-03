// Le ricorrenti si inseriscono da sole: quindi devono farlo una volta sola, mai
// nel futuro e mai prima di essere nate. Vedi piani.md, fase 9.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate } from '../src/lib/server/db.ts';
import { createUser } from '../src/lib/server/auth.ts';
import { currentMonth, summary } from '../src/lib/server/kakebo.ts';
import * as recurring from '../src/lib/server/recurring.ts';

const THIS = currentMonth();

/** Il mese prima o il mese dopo di quello in corso. */
function shift(ym: string, by: number): string {
	const [year, month] = ym.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1 + by, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

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

const rent = (over: Partial<recurring.NewRecurring> = {}): recurring.NewRecurring => ({
	kind: 'fixed',
	description: 'Affitto',
	amountCents: 80_000,
	categoryId: null,
	dayOfMonth: 1,
	startsYm: THIS,
	endsYm: null,
	...over
});

test('la ricorrente entra nel mese e non si ripete', async () => {
	const { db, anna } = await scenario();
	recurring.create(db, rent(), anna);

	assert.equal(recurring.generate(db, THIS, anna), 1);
	assert.equal(recurring.generate(db, THIS, anna), 0, 'la seconda volta non fa niente');
	assert.equal(recurring.generate(db, THIS, anna), 0, 'e nemmeno la terza');

	assert.equal(summary(db, THIS, anna).fixed, 80_000);
	const row = db.prepare('SELECT note, visibility, occurred_on FROM transactions').get() as {
		note: string;
		visibility: string;
		occurred_on: string;
	};
	assert.equal(row.note, 'Affitto', 'la descrizione finisce nella nota');
	assert.equal(row.visibility, 'family', 'le ricorrenti sono sempre di famiglia');
	assert.equal(row.occurred_on, `${THIS}-01`);
});

test('non genera nel futuro', async () => {
	const { db, anna } = await scenario();
	recurring.create(db, rent(), anna);

	assert.equal(
		recurring.generate(db, shift(THIS, 1), anna),
		0,
		'il mese prossimo non esiste ancora'
	);
	assert.equal(recurring.generate(db, shift(THIS, 36), anna), 0, 'né quello di fra tre anni');
	assert.equal((db.prepare('SELECT COUNT(*) AS n FROM transactions').get() as { n: number }).n, 0);
});

test('non genera prima del mese in cui è nata', async () => {
	const { db, anna } = await scenario();
	recurring.create(db, rent(), anna);
	assert.equal(recurring.generate(db, shift(THIS, -1), anna), 0);
	assert.equal(recurring.generate(db, shift(THIS, -12), anna), 0);
});

test('una ricorrente sospesa non entra più', async () => {
	const { db, anna } = await scenario();
	const id = recurring.create(db, rent(), anna);
	recurring.setActive(db, id, false);

	assert.equal(recurring.generate(db, THIS, anna), 0);
	recurring.setActive(db, id, true);
	assert.equal(recurring.generate(db, THIS, anna), 1);
});

test('cambiare l importo non tocca i mesi già registrati', async () => {
	const { db, anna } = await scenario();
	const id = recurring.create(db, rent(), anna);
	recurring.generate(db, THIS, anna);

	recurring.update(db, id, 90_000, 'Affitto', null);
	assert.equal(summary(db, THIS, anna).fixed, 80_000, 'il mese già registrato resta a 800');
	assert.equal(recurring.generate(db, THIS, anna), 0, 'e non se ne aggiunge un secondo');
});

test('cancellando la regola le voci già registrate restano', async () => {
	const { db, anna } = await scenario();
	const id = recurring.create(db, rent(), anna);
	recurring.generate(db, THIS, anna);

	assert.equal(recurring.remove(db, id), true);
	assert.equal(summary(db, THIS, anna).fixed, 80_000, 'era una spesa vera, avvenuta davvero');
	const row = db.prepare('SELECT recurring_id FROM transactions').get() as {
		recurring_id: number | null;
	};
	assert.equal(row.recurring_id, null);
});

test('il database rifiuta il doppione anche se glielo chiediamo apposta', async () => {
	const { db, anna } = await scenario();
	const id = recurring.create(db, rent(), anna);
	recurring.generate(db, THIS, anna);

	// Scavalcando il modulo, come farebbe un errore di programmazione.
	assert.throws(
		() =>
			db
				.prepare(
					`INSERT INTO transactions
					   (kind, status, amount_cents, occurred_on, visibility, created_by, recurring_id)
					 VALUES ('fixed', 'complete', 80000, ?, 'family', ?, ?)`
				)
				.run(`${THIS}-15`, anna, id),
		/UNIQUE/
	);
});

test('una spesa ricorrente porta con sé la sua categoria', async () => {
	const { db, anna } = await scenario();
	const survival = (
		db.prepare("SELECT id FROM categories WHERE kakebo_key = 'survival'").get() as { id: number }
	).id;
	recurring.create(
		db,
		rent({ kind: 'expense', description: 'Abbonamento', amountCents: 1500, categoryId: survival }),
		anna
	);

	assert.equal(recurring.generate(db, THIS, anna), 1);
	assert.equal(summary(db, THIS, anna).spent, 1500);
});

test('una spesa ricorrente senza categoria non si può nemmeno creare', async () => {
	const { db, anna } = await scenario();
	assert.throws(
		() => recurring.create(db, rent({ kind: 'expense', categoryId: null }), anna),
		/CHECK/
	);
});

// Fase 14: una ricorrente può finire. L'ultimo mese è compreso.

test('l ultimo mese entra, il mese dopo no', async () => {
	const { db, anna } = await scenario();
	const last = shift(THIS, -1);
	recurring.create(db, rent({ startsYm: shift(THIS, -3), endsYm: last }), anna);

	assert.equal(recurring.generate(db, last, anna), 1, 'il mese di scadenza è compreso');
	assert.equal(recurring.generate(db, THIS, anna), 0, 'dal mese dopo non genera più');
	assert.equal(summary(db, THIS, anna).fixed, 0);
});

test('una per sempre non ha scadenza, e si può chiudere dopo', async () => {
	const { db, anna } = await scenario();
	const id = recurring.create(db, rent({ startsYm: shift(THIS, -3) }), anna);
	assert.equal(recurring.list(db)[0].ends_ym, null, 'per sempre');
	assert.equal(recurring.generate(db, shift(THIS, -2), anna), 1);

	// Chiuderla dopo: dal mese successivo alla scadenza non nasce più niente.
	recurring.update(db, id, 80_000, 'Affitto', shift(THIS, -2));
	assert.equal(recurring.generate(db, shift(THIS, -1), anna), 0);
});

test('il database rifiuta una scadenza precedente al mese di inizio', async () => {
	const { db, anna } = await scenario();
	assert.throws(() => recurring.create(db, rent({ endsYm: shift(THIS, -1) }), anna));
});
