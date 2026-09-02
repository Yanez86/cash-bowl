// Le due lingue devono avere esattamente le stesse chiavi: una chiave che manca
// da una parte è una scritta che sparisce. Vedi CLAUDE.md §10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localeFromHeader, translator } from '../src/lib/i18n/index.ts';

const load = (name: string) =>
	JSON.parse(readFileSync(`src/lib/i18n/${name}.json`, 'utf8')) as Record<string, unknown>;

function keys(node: unknown, prefix = ''): string[] {
	if (!node || typeof node !== 'object') return [prefix];
	return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
		keys(value, prefix ? `${prefix}.${key}` : key)
	);
}

test('italiano e inglese hanno le stesse chiavi', () => {
	const it = keys(load('it')).sort();
	const en = keys(load('en')).sort();
	assert.deepEqual(
		it.filter((k) => !en.includes(k)),
		[],
		'chiavi presenti solo in italiano'
	);
	assert.deepEqual(
		en.filter((k) => !it.includes(k)),
		[],
		'chiavi presenti solo in inglese'
	);
});

test('nessuna scritta è rimasta vuota', () => {
	for (const name of ['it', 'en']) {
		const dictionary = load(name);
		for (const key of keys(dictionary)) {
			const value = key
				.split('.')
				.reduce<unknown>((node, step) => (node as Record<string, unknown>)?.[step], dictionary);
			assert.equal(typeof value, 'string', `${name}: ${key} non è una scritta`);
			assert.ok(String(value).trim().length > 0, `${name}: ${key} è vuota`);
		}
	}
});

test('il traduttore riempie i segnaposto e sceglie il plurale', () => {
	const t = translator('it');
	assert.match(t('setup.passwordHint', { min: 12 }), /12/);
	assert.match(t('dashboard.drafts', { count: 1 }), /1 bozza/);
	assert.match(t('dashboard.drafts', { count: 3 }), /3 bozze/);
	assert.equal(t('chiave.che.non.esiste'), 'chiave.che.non.esiste');
});

test('la lingua del browser viene riconosciuta', () => {
	assert.equal(localeFromHeader('it-IT,it;q=0.9,en;q=0.8', 'en'), 'it');
	assert.equal(localeFromHeader('en-GB,en;q=0.9', 'it'), 'en');
	assert.equal(
		localeFromHeader('fr-FR,fr;q=0.9', 'en'),
		'en',
		'lingua sconosciuta: si usa il ripiego'
	);
	assert.equal(localeFromHeader(null, 'it'), 'it');
});
