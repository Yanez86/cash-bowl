// Protezione contro i moduli inviati da altri siti.
//
// SvelteKit di suo confronta l'intestazione "Origin" con l'indirizzo del sito.
// Funziona con quasi tutti i browser, ma **non con Safari su iPhone**: su una
// connessione senza HTTPS manda `Origin: null` e non manda né `Sec-Fetch-Site`
// né `Referer`. Non resta nessuna intestazione da guardare.
//
// Quindi non ci si affida alle intestazioni: a ogni visitatore si dà un gettone
// casuale in un cookie, e ogni modulo lo rimanda indietro in un campo nascosto.
// Un sito estraneo non può leggere il nostro cookie, quindi non può indovinare
// il gettone: è il metodo classico, e funziona su qualunque browser.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const CSRF_COOKIE = 'cash_bowl_csrf';
export const CSRF_FIELD = 'csrf';

/** I metodi che possono cambiare qualcosa: solo questi vanno controllati. */
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** I moduli HTML arrivano solo in queste due forme. */
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data'];

/** Il gettone di chi sta navigando: se non ce l'ha, gliene diamo uno. */
export function ensureToken(cookies: Cookies, https: boolean): string {
	const existing = cookies.get(CSRF_COOKIE);
	if (existing) return existing;

	const token = randomBytes(32).toString('base64url');
	cookies.set(CSRF_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: https,
		maxAge: 60 * 60 * 24 * 365
	});
	return token;
}

/** Confronto a tempo costante: due stringhe diverse non si distinguono dal tempo. */
function sameToken(a: string, b: string): boolean {
	const first = Buffer.from(a);
	const second = Buffer.from(b);
	return first.length === second.length && timingSafeEqual(first, second);
}

export function isFormSubmission(request: Request): boolean {
	const type = request.headers.get('content-type') ?? '';
	return UNSAFE.has(request.method) && FORM_TYPES.some((form) => type.startsWith(form));
}

/**
 * Un'origine dichiarata e diversa dalla nostra è un no secco, sempre.
 * "null" e "assente" non dicono niente: ci pensa il gettone.
 */
export function originIsForeign(request: Request, expected: string): boolean {
	const origin = request.headers.get('origin');
	return origin !== null && origin !== 'null' && origin !== expected;
}

/** Il gettone mandato dal modulo combacia con quello nel cookie? */
export function tokenMatches(sent: FormDataEntryValue | null, cookie: string | undefined): boolean {
	return typeof sent === 'string' && !!cookie && sameToken(sent, cookie);
}
