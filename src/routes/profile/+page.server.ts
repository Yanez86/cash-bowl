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
import { isLocale } from '$lib/i18n';
import { ACCENTS, THEMES } from '$lib/appearance';

/** Quello che arriva dal browser non si crede: si sceglie da un elenco chiuso. */
const pick = (value: FormDataEntryValue | null, allowed: readonly string[], fallback: string) =>
	allowed.includes(String(value)) ? String(value) : fallback;

export const load: PageServerLoad = ({ locals }) => ({ user: locals.user });

export const actions: Actions = {
	name: async ({ request, locals }) => {
		const form = await request.formData();
		const displayName = String(form.get('display_name') ?? '').trim();
		if (!displayName) return fail(400, { nameError: 'errors.nameRequired' });

		db()
			.prepare('UPDATE users SET display_name = ? WHERE id = ?')
			.run(displayName, locals.user!.id);
		return { nameSaved: true };
	},

	appearance: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = String(form.get('locale') ?? '');
		const user = locals.user!;

		db()
			.prepare(
				`UPDATE users SET locale = ?, theme = ?, accent = ?, high_contrast = ?, reduced_motion = ?
				 WHERE id = ?`
			)
			.run(
				isLocale(raw) ? raw : user.locale,
				pick(form.get('theme'), THEMES, 'auto'),
				pick(form.get('accent'), ACCENTS, 'kakebo'),
				form.get('high_contrast') === 'on' ? 1 : 0,
				form.get('reduced_motion') === 'on' ? 1 : 0,
				user.id
			);
		return { appearanceSaved: true };
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
			return fail(400, { passwordError: 'errors.wrongCurrentPassword', passwordVars: undefined });
		}
		const problem = passwordProblem(next);
		if (problem) return fail(400, { passwordError: problem.key, passwordVars: problem.vars });
		if (next !== repeat) {
			return fail(400, { passwordError: 'errors.passwordMismatch', passwordVars: undefined });
		}

		// setPassword chiude tutte le sessioni, compresa questa: se ne apre una nuova
		// così non ti ritrovi buttato fuori dopo aver cambiato la password.
		await setPassword(db(), locals.user!.id, next);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		setSessionCookie(cookies, createSession(db(), locals.user!.id), url.protocol === 'https:');
		return { passwordSaved: true };
	}
};
