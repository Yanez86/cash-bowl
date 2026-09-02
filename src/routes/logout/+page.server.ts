import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, deleteSession } from '$lib/server/auth';
import { clearSessionCookie } from '$lib/server/session-cookie';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		// La sessione si cancella dal server, non basta buttare via il cookie.
		if (token) deleteSession(db(), token);
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
};
