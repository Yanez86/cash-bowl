import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	SESSION_COOKIE,
	createSession,
	passwordProblem,
	setPassword,
	verifyPassword
} from '$lib/server/auth';
import { setSessionCookie } from '$lib/server/session-cookie';

export const load: PageServerLoad = ({ locals }) => ({ user: locals.user });

export const actions: Actions = {
	name: async ({ request, locals }) => {
		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '').trim();
		if (!displayName) return fail(400, { nameError: 'Il nome non può essere vuoto.' });

		db()
			.prepare('UPDATE users SET display_name = ? WHERE id = ?')
			.run(displayName, locals.user!.id);
		return { nameSaved: true };
	},

	password: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();
		const current = String(form.get('current_password') ?? '');
		const next = String(form.get('new_password') ?? '');
		const repeat = String(form.get('new_password_repeat') ?? '');

		const row = db()
			.prepare('SELECT password_hash FROM users WHERE id = ?')
			.get(locals.user!.id) as { password_hash: string };

		if (!(await verifyPassword(current, row.password_hash))) {
			return fail(400, { passwordError: 'La password attuale non è corretta.' });
		}
		const problem = passwordProblem(next);
		if (problem) return fail(400, { passwordError: problem });
		if (next !== repeat) {
			return fail(400, { passwordError: 'Le due nuove password non coincidono.' });
		}

		// setPassword chiude tutte le sessioni, compresa questa: se ne apre una nuova
		// così non ti ritrovi buttato fuori dopo aver cambiato la password.
		await setPassword(db(), locals.user!.id, next);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		setSessionCookie(cookies, createSession(db(), locals.user!.id), url.protocol === 'https:');
		return { passwordSaved: true };
	}
};
