import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/lib/csv.ts';

test('mette fra virgolette solo quello che serve', () => {
	assert.equal(toCsv([['a', 'b']]), 'a,b');
	assert.equal(toCsv([['con, virgola']]), '"con, virgola"');
	assert.equal(toCsv([['con "virgolette"']]), '"con ""virgolette"""');
	assert.equal(toCsv([['a'], ['b']]), 'a\r\nb');
});

test('disinnesca le celle che Excel eseguirebbe come formule', () => {
	// Il caso vero: una nota scritta da qualcuno che vuole fare danni.
	const attacco = "=cmd|' /c calc'!A1";
	assert.equal(
		toCsv([[attacco]]),
		`'${attacco}`,
		'deve iniziare con un apice, così Excel lo legge come testo'
	);

	for (const inizio of ['=', '+', '-', '@', '\t']) {
		const cella = toCsv([[`${inizio}qualcosa`]]);
		assert.ok(cella.includes(`'${inizio}`), `non disinnescata: ${JSON.stringify(inizio)}`);
	}
});

test('i numeri e i testi normali restano intatti', () => {
	assert.equal(toCsv([['2026-03-10', '45.50', 'Supermercato']]), '2026-03-10,45.50,Supermercato');
});
