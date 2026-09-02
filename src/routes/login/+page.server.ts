import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { login } from '$lib/server/auth';
import { setSessionCookie } from '$lib/server/session-cookie';

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		const token = await login(db(), username, password, getClientAddress());
		// Sempre lo stesso messaggio: non si rivela se il nome utente esiste,
		// né se il blocco per troppi tentativi è scattato. Vedi audit.md §1.1
		if (!token) {
			return fail(400, { username, error: 'Nome utente o password non validi.' });
		}

		setSessionCookie(cookies, token, url.protocol === 'https:');
		redirect(303, '/');
	}
};
