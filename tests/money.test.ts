import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountForInput, formatAmount, parseAmount } from '../src/lib/money.ts';

test('legge gli importi come li scrive una persona', () => {
	assert.equal(parseAmount('12,34'), 1234);
	assert.equal(parseAmount('12.34'), 1234);
	assert.equal(parseAmount('12'), 1200);
	assert.equal(parseAmount('0,50'), 50);
	assert.equal(parseAmount('1,5'), 150);
	assert.equal(parseAmount('1.234,56'), 123456);
	assert.equal(parseAmount('1 234,56'), 123456);
	assert.equal(parseAmount(' 7,90 '), 790);
});

test('rifiuta quello che non è un importo', () => {
	for (const bad of [
		'',
		'dodici',
		'12,345,67',
		'1,234,56',
		'12.34.56',
		'-5',
		'1e3',
		'12,,3',
		',50'
	]) {
		assert.equal(parseAmount(bad), null, `avrebbe dovuto rifiutare ${JSON.stringify(bad)}`);
	}
});

test('rifiuta gli importi assurdi', () => {
	assert.equal(parseAmount('999999999'), null);
});

test('scrive gli importi nella lingua giusta', () => {
	// In italiano il separatore delle migliaia compare solo da cinque cifre.
	assert.match(formatAmount(123456, 'it', 'EUR'), /1234,56/);
	assert.match(formatAmount(1234567, 'it', 'EUR'), /12\.345,67/);
	assert.match(formatAmount(1234567, 'en', 'EUR'), /12,345\.67/);
	assert.equal(amountForInput(1234), '12.34');
});

test('andata e ritorno senza perdere centesimi', () => {
	for (const cents of [1, 99, 100, 12345, 999999]) {
		assert.equal(parseAmount(amountForInput(cents)), cents);
	}
});
