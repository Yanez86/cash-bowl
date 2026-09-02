// Chi sei, in che lingua ti parlo, e con che aspetto. Vale per ogni richiesta:
// l'interfaccia non decide niente sui permessi. Vedi CLAUDE.md §8.
import { error, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, countUsers, readSession } from '$lib/server/auth';
import { getSetting } from '$lib/server/settings';
import {
	CSRF_COOKIE,
	CSRF_FIELD,
	ensureToken,
	isFormSubmission,
	originIsForeign,
	tokenMatches
} from '$lib/server/csrf';
import { isLocale, localeFromHeader, type Locale } from '$lib/i18n';
import { dailyBackup } from '$lib/server/backup';
import { today } from '$lib/server/kakebo';

/** Pagine raggiungibili senza aver fatto l'accesso. */
const PUBLIC_PATHS = new Set(['/login', '/setup']);

/** Il colore della barra del browser sul telefono, per tema chiaro e scuro.
    Devono corrispondere a --bg-light e --bg-dark di themes.css. */
const THEME_COLOR = { light: '#f7f6f3', dark: '#16161a' };

const meta = (content: string, media?: string) =>
	`<meta name="theme-color" content="${content}"${media ? ` media="${media}"` : ''} />`;

/** Con il tema automatico servono due dichiarazioni: una per lo schermo chiaro
    e una per quello scuro. Con un tema scelto a mano ne basta una. */
function themeColorTags(theme: string): string {
	if (theme === 'light') return meta(THEME_COLOR.light);
	if (theme === 'dark') return meta(THEME_COLOR.dark);
	return [
		meta(THEME_COLOR.light, '(prefers-color-scheme: light)'),
		meta(THEME_COLOR.dark, '(prefers-color-scheme: dark)')
	].join('\n\t\t');
}

/** Ogni quanto il programma si chiede se serve la copia di sicurezza del giorno. */
const BACKUP_CHECK_MS = 60 * 60 * 1000;

/** Parte una volta sola, all'avvio del server. */
export const init: ServerInit = () => {
	if (process.env.BACKUP_ENABLED === 'false') return;

	const check = () => {
		try {
			dailyBackup(db(), today());
		} catch (problem) {
			// Una copia mancata non deve fermare l'applicazione, ma si deve sapere.
			console.error('copia di sicurezza non riuscita:', problem);
		}
	};

	check();
	// unref: questo orologio non deve tenere in vita il processo da solo.
	setInterval(check, BACKUP_CHECK_MS).unref();
};

export const handle: Handle = async ({ event, resolve }) => {
	const https = event.url.protocol === 'https:';
	event.locals.csrf = ensureToken(event.cookies, https);

	// Prima di tutto: questo modulo arriva davvero da noi?
	if (isFormSubmission(event.request)) {
		if (originIsForeign(event.request, event.url.origin)) {
			error(403, 'errors.foreignForm');
		}
		// ponytail: si copia il corpo della richiesta per leggere il gettone
		// senza consumarlo. Con una foto da qualche megabyte è memoria in più
		// per un istante; se un giorno desse fastidio, si sposta il gettone
		// nell'indirizzo dell'azione.
		const sent = await event.request.clone().formData();
		if (!tokenMatches(sent.get(CSRF_FIELD), event.cookies.get(CSRF_COOKIE))) {
			error(403, 'errors.foreignForm');
		}
	}

	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? readSession(db(), token) : null;
	if (token && !event.locals.user) {
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	const fallback = getSetting(db(), 'default_locale', 'en');
	const stored = event.locals.user?.locale ?? '';
	event.locals.locale = isLocale(stored)
		? stored
		: localeFromHeader(event.request.headers.get('accept-language'), fallbackLocale(fallback));

	const path = event.url.pathname;
	const firstRun = countUsers(db()) === 0;

	if (firstRun && path !== '/setup') redirect(303, '/setup');
	if (!firstRun && path === '/setup') redirect(303, '/');
	if (!event.locals.user && !PUBLIC_PATHS.has(path)) redirect(303, '/login');
	if (event.locals.user && path === '/login') redirect(303, '/');

	const theme = event.locals.user?.theme ?? 'auto';
	return resolve(event, {
		// L'aspetto è già negli attributi della pagina: nessun lampo bianco
		// prima che il foglio di stile faccia effetto. Vedi CLAUDE.md §9.
		transformPageChunk: ({ html }) =>
			html
				.replace('%lang%', event.locals.locale)
				.replace('%theme%', theme)
				.replace('%accent%', event.locals.user?.accent ?? 'kakebo')
				.replace('%contrast%', event.locals.user?.high_contrast ? 'high' : 'normal')
				.replace('%motion%', event.locals.user?.reduced_motion ? 'reduced' : 'full')
				.replace('%themeColor%', themeColorTags(theme))
	});
};

function fallbackLocale(value: string): Locale {
	return isLocale(value) ? value : 'en';
}
