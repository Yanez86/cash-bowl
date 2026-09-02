// Chi sei, e dove puoi andare. Questo controllo vale per ogni richiesta:
// l'interfaccia non decide niente sui permessi. Vedi CLAUDE.md §8.
import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, countUsers, readSession } from '$lib/server/auth';

/** Pagine raggiungibili senza aver fatto l'accesso. */
const PUBLIC_PATHS = new Set(['/login', '/setup']);

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? readSession(db(), token) : null;
	if (token && !event.locals.user) {
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	const path = event.url.pathname;
	const firstRun = countUsers(db()) === 0;

	if (firstRun && path !== '/setup') redirect(303, '/setup');
	if (!firstRun && path === '/setup') redirect(303, '/');
	if (!event.locals.user && !PUBLIC_PATHS.has(path)) redirect(303, '/login');
	if (event.locals.user && path === '/login') redirect(303, '/');

	return resolve(event);
};
