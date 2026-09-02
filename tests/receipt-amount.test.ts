// Il riconoscimento dell'importo dentro il testo di uno scontrino.
// L'OCR sbaglia spesso: questo pezzo deve almeno non sbagliare da solo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAmount } from '../src/lib/receipt-amount.ts';

test('prende il totale, non le singole voci', () => {
	const scontrino = `
		SUPERMERCATO ROSSI
		VIA GARIBALDI 12
		PANE                  2,40
		LATTE INTERO          1,29
		PASTA 500G            0,89
		TOTALE EURO          45,50
		CONTANTI             50,00
		RESTO                 4,50
	`;
	assert.equal(findAmount(scontrino), 4550);
});

test('il contante dato non è quello che hai speso', () => {
	// Il caso che mi è capitato davvero provando su uno scontrino finto:
	// CONTANTE sta sotto TOTALE, ed è sempre una cifra più grande.
	const scontrino = `
		PANE                  2,40
		TOTALE EURO          45,50
		CONTANTE             50,00
		RESTO                 4,50
	`;
	assert.equal(findAmount(scontrino), 4550);
	assert.equal(findAmount(scontrino.replace('CONTANTE', 'CONTANTI')), 4550);
	assert.equal(findAmount(scontrino.replace('CONTANTE', 'CASH')), 4550);
});

test('legge il totale quando la cifra è sulla riga dopo', () => {
	assert.equal(findAmount('SUBTOTALE\n12,00\nTOTALE\n15,90\n'), 1590);
});

test('capisce le migliaia scritte in tutti i modi', () => {
	assert.equal(findAmount('TOTALE 1.234,56'), 123456);
	assert.equal(findAmount('TOTAL 1,234.56'), 123456);
	assert.equal(findAmount('TOTALE 1 234,56'), 123456);
});

test('senza la parola totale prende il più grande della parte finale', () => {
	const scontrino = `
		BAR CENTRALE
		CAFFE                 1,20
		CORNETTO              1,50
		2,70
	`;
	assert.equal(findAmount(scontrino), 270);
});

test('non si fa ingannare da numeri che non sono importi', () => {
	const scontrino = `
		SCONTRINO N. 0042
		P.IVA 01234567890
		DATA 10/03/2026 ORE 18:45
		TOTALE                 7,80
	`;
	assert.equal(findAmount(scontrino), 780);
});

test('scarta le cifre assurde', () => {
	assert.equal(findAmount('CODICE 99999999,99'), null, 'centomila euro non è uno scontrino');
	assert.equal(findAmount('TOTALE 0,00'), null, 'zero non è un importo');
});

test('quando non trova niente lo dice', () => {
	assert.equal(findAmount(''), null);
	assert.equal(findAmount('testo senza nessun numero'), null);
	assert.equal(findAmount('12 34 56'), null, 'senza centesimi non è un importo');
});

test('regge il testo sporco che esce da una foto storta', () => {
	// Righe vere prodotte da un riconoscimento imperfetto.
	const sporco = `
		SUPERNERCAT0 R0SSI
		P4NE                 2,40
		T0TALE  EUR         45,5O
		TOTALE EUR          45,50
	`;
	assert.equal(findAmount(sporco), 4550);
});
