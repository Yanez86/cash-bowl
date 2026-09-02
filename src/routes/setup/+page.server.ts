// Primo avvio: si crea l'amministratore. Poi questa pagina non è più
// raggiungibile (ci pensa hooks.server.ts), così nessuno da fuori si registra.
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import {
	countUsers,
	createSession,
	createUser,
	passwordProblem,
	usernameProblem
} from '$lib/server/auth';
import { setSessionCookie } from '$lib/server/session-cookie';

export const actions: Actions = {
	default: async ({ request, cookies, url, locals }) => {
		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '').trim();
		const username = String(form.get('username') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		const repeat = String(form.get('password_repeat') ?? '');

		const values = { displayName, username };
		if (!displayName)
			return fail(400, { ...values, error: 'errors.nameRequired', vars: undefined });

		const problem = usernameProblem(username) ?? passwordProblem(password);
		if (problem) return fail(400, { ...values, error: problem.key, vars: problem.vars });
		if (password !== repeat) {
			return fail(400, { ...values, error: 'errors.passwordMismatch', vars: undefined });
		}

		// Corsa fra due richieste: il secondo arrivato non deve diventare admin.
		if (countUsers(db()) > 0) redirect(303, '/login');

		// Il primo utente si tiene la lingua con cui è arrivato dal browser.
		const id = await createUser(db(), {
			username,
			displayName,
			password,
			isAdmin: true,
			locale: locals.locale
		});
		setSessionCookie(cookies, createSession(db(), id), url.protocol === 'https:');
		redirect(303, '/');
	}
};
