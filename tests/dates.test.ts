// Una data del kakebo non ha orario: il 1° marzo è il 1° marzo ovunque.
// Il fuso va imposto prima di importare, perché Intl lo legge all'avvio.
process.env.TZ = 'America/New_York';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayLabel, dayParts, monthLabel, shiftMonth } from '../src/lib/dates.ts';

test('il giorno si scrive per una persona, non come nel database', () => {
	assert.equal(dayLabel('2026-03-02', 'it'), '2 mar 2026');
	assert.equal(dayLabel('2026-12-31', 'en'), 'Dec 31, 2026');
});

// Senza timeZone: 'UTC' un fuso a ovest di Greenwich mostrerebbe il giorno prima:
// il primo marzo diventerebbe "28 feb" e il mese diventerebbe "febbraio".
test('un fuso orario diverso non sposta la data indietro di un giorno', () => {
	assert.equal(dayLabel('2026-03-01', 'it'), '1 mar 2026');
	assert.equal(monthLabel('2026-03', 'it'), 'marzo 2026');
});

// Le frecce del mese devono stare su una riga sola: nome corto, anno sempre.
test("il mese in forma breve tiene l'anno", () => {
	assert.equal(monthLabel('2026-09', 'it', true), 'set 2026');
	assert.equal(monthLabel('2025-12', 'en', true), 'Dec 2025');
});

test('la data impilata: giorno, mese corto, anno', () => {
	assert.deepEqual(dayParts('2026-09-02', 'it'), { day: '2', month: 'set', year: '2026' });
	assert.deepEqual(dayParts('2026-09-02', 'en'), { day: '2', month: 'Sep', year: '2026' });
	// Anche qui il fuso non deve spostare il giorno.
	assert.deepEqual(dayParts('2026-03-01', 'it'), { day: '1', month: 'mar', year: '2026' });
});

test('il mese prima e il mese dopo', () => {
	assert.equal(shiftMonth('2026-01', -1), '2025-12');
	assert.equal(shiftMonth('2026-12', 1), '2027-01');

	// Così si conta la scadenza di una ricorrente «per dodici volte»: il primo
	// mese è già una volta, quindi da marzo 2026 finisce a febbraio 2027.
	assert.equal(shiftMonth('2026-03', 12 - 1), '2027-02');
});
