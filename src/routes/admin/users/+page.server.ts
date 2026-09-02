import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	createUser,
	deleteUserSessions,
	passwordProblem,
	setPassword,
	usernameProblem
} from '$lib/server/auth';

type Row = {
	id: number;
	username: string;
	display_name: string;
	is_admin: number;
	is_active: number;
	created_at: string;
};

const list = () =>
	db()
		.prepare(
			`SELECT id, username, display_name, is_admin, is_active, created_at
			 FROM users ORDER BY display_name`
		)
		.all() as Row[];

const otherAdminsActive = (id: number) =>
	(
		db()
			.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND is_active = 1 AND id != ?')
			.get(id) as { n: number }
	).n > 0;

/** L'id passato dal modulo, oppure null se non è un numero. */
function userId(form: FormData): number | null {
	const raw = Number(form.get('id'));
	return Number.isInteger(raw) && raw > 0 ? raw : null;
}

export const load: PageServerLoad = ({ locals }) => ({ users: list(), me: locals.user });

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '').trim();
		const username = String(form.get('username') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		const isAdmin = form.get('is_admin') === 'on';

		if (!displayName) return fail(400, { error: 'Scrivi il nome della persona.' });
		const problem = usernameProblem(username) ?? passwordProblem(password);
		if (problem) return fail(400, { error: problem });

		const taken = db().prepare('SELECT 1 FROM users WHERE username = ?').get(username);
		if (taken) return fail(400, { error: 'Questo nome utente è già preso.' });

		await createUser(db(), { username, displayName, password, isAdmin });
		return { created: username };
	},

	toggleActive: async ({ request, locals }) => {
		const form = await request.formData();
		const id = userId(form);
		if (!id) return fail(400, { error: 'Utente non valido.' });
		if (id === locals.user!.id) return fail(400, { error: 'Non puoi disattivare te stesso.' });

		const row = db().prepare('SELECT is_active FROM users WHERE id = ?').get(id) as
			{ is_active: number } | undefined;
		if (!row) return fail(404, { error: 'Utente non trovato.' });

		if (row.is_active === 1 && !otherAdminsActive(id)) {
			return fail(400, { error: 'Deve restare almeno un amministratore attivo.' });
		}

		const next = row.is_active === 1 ? 0 : 1;
		db().prepare('UPDATE users SET is_active = ? WHERE id = ?').run(next, id);
		// Disattivare deve avere effetto subito, non alla scadenza della sessione.
		if (next === 0) deleteUserSessions(db(), id);
		return { updated: true };
	},

	resetPassword: async ({ request }) => {
		const form = await request.formData();
		const id = userId(form);
		const password = String(form.get('password') ?? '');
		if (!id) return fail(400, { error: 'Utente non valido.' });

		const problem = passwordProblem(password);
		if (problem) return fail(400, { error: problem });

		const exists = db().prepare('SELECT 1 FROM users WHERE id = ?').get(id);
		if (!exists) return fail(404, { error: 'Utente non trovato.' });

		await setPassword(db(), id, password);
		return { passwordReset: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = userId(form);
		if (!id) return fail(400, { error: 'Utente non valido.' });
		if (id === locals.user!.id) return fail(400, { error: 'Non puoi eliminare te stesso.' });
		if (!otherAdminsActive(id)) {
			return fail(400, { error: 'Deve restare almeno un amministratore attivo.' });
		}

		db().prepare('DELETE FROM users WHERE id = ?').run(id);
		return { deleted: true };
	}
};
