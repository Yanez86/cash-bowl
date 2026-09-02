// Chi sei, in che lingua ti parlo, e con che aspetto. Vale per ogni richiesta:
// l'interfaccia non decide niente sui permessi. Vedi CLAUDE.md §8.
import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, countUsers, readSession } from '$lib/server/auth';
import { getSetting } from '$lib/server/settings';
import { isLocale, localeFromHeader, type Locale } from '$lib/i18n';

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

export const handle: Handle = async ({ event, resolve }) => {
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
