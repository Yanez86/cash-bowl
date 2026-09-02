// Il controllo che un modulo arrivi davvero da noi.
//
// Nasce da un problema vero: Safari su iPhone, senza HTTPS, manda
// "Origin: null" e nient'altro. Chi si affida alle intestazioni lo blocca.
// Vedi src/lib/server/csrf.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFormSubmission, originIsForeign, tokenMatches } from '../src/lib/server/csrf.ts';

const form = (method: string, type = 'application/x-www-form-urlencoded') =>
	new Request('http://casa:8080/setup', { method, headers: { 'content-type': type } });

test('si controllano solo le richieste che cambiano qualcosa', () => {
	assert.equal(isFormSubmission(form('POST')), true);
	assert.equal(isFormSubmission(form('POST', 'multipart/form-data; boundary=x')), true);
	assert.equal(isFormSubmission(form('DELETE')), true);
	assert.equal(isFormSubmission(new Request('http://casa:8080/')), false, 'una lettura no');
	assert.equal(isFormSubmission(form('POST', 'application/json')), false, 'non è un modulo HTML');
});

test('un origine dichiarata e diversa dalla nostra è un no secco', () => {
	const con = (origin: string | null) => {
		const request = form('POST');
		if (origin !== null) request.headers.set('origin', origin);
		return originIsForeign(request, 'http://casa:8080');
	};

	assert.equal(con('http://sito-cattivo.example'), true);
	assert.equal(con('http://casa:8081'), true, 'stessa macchina, porta diversa: è un altro sito');
	assert.equal(con('http://casa:8080'), false);

	// I due casi di Safari su iPhone: non dicono niente, e va bene così.
	// A dire di no ci pensa il gettone.
	assert.equal(con('null'), false, 'Safari su iPhone manda proprio la parola null');
	assert.equal(con(null), false, 'e a volte non manda niente');
});

test('il gettone deve combaciare esatto', () => {
	const vero = 'abcdefghijklmnopqrstuvwxyz012345';

	assert.equal(tokenMatches(vero, vero), true);
	assert.equal(tokenMatches('sbagliato', vero), false);
	assert.equal(tokenMatches(vero + 'x', vero), false, 'nemmeno un carattere in più');
	assert.equal(tokenMatches('', vero), false);
	assert.equal(tokenMatches(null, vero), false, 'modulo senza campo');
	assert.equal(tokenMatches(vero, undefined), false, 'visitatore senza cookie');
	assert.equal(tokenMatches(new File([], 'x'), vero), false, 'un file non è un gettone');
});
