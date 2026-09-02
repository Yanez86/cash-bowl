// Un solo posto in cui si decide come viaggia il cookie di sessione.
import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE } from './auth';

const DAYS_30 = 60 * 60 * 24 * 30;

export function setSessionCookie(cookies: Cookies, token: string, https: boolean): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: https,
		maxAge: DAYS_30
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
