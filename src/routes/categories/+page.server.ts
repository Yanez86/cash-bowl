import { refuse } from '$lib/server/problem';
import { db } from '$lib/server/db';
import * as categories from '$lib/server/categories';
import type { Actions, PageServerLoad } from './$types';

const MAX_NAME = 60;

function name(form: FormData): string | null {
	const value = String(form.get('name') ?? '').trim();
	return value && value.length <= MAX_NAME ? value : null;
}

function id(form: FormData, field = 'id'): number | null {
	const value = Number(form.get(field));
	return Number.isInteger(value) && value > 0 ? value : null;
}

export const load: PageServerLoad = () => ({ tree: categories.tree(db(), true) });

export const actions: Actions = {
	add: ({ request }) =>
		request.formData().then((form) => {
			const parentId = id(form, 'parent_id');
			const value = name(form);
			if (!parentId || !value) {
				return refuse(400, 'errors.categoryNameRequired', { max: MAX_NAME });
			}
			try {
				categories.addChild(db(), parentId, value);
			} catch {
				return refuse(400, 'errors.categoryNameTaken');
			}
			return { added: value };
		}),

	rename: ({ request }) =>
		request.formData().then((form) => {
			const target = id(form);
			const value = name(form);
			if (!target || !value) return refuse(400, 'errors.categoryNameRequired', { max: MAX_NAME });
			try {
				categories.rename(db(), target, value);
			} catch {
				return refuse(400, 'errors.categoryNameTaken');
			}
			return { renamed: true };
		}),

	toggle: ({ request }) =>
		request.formData().then((form) => {
			const target = id(form);
			const active = form.get('active') === '1';
			if (!target || !categories.setActive(db(), target, active)) {
				return refuse(400, 'errors.rootCategoryFixed');
			}
			return { toggled: true };
		}),

	remove: ({ request }) =>
		request.formData().then((form) => {
			const target = id(form);
			if (!target || !categories.remove(db(), target)) {
				return refuse(400, 'errors.categoryInUse');
			}
			return { removed: true };
		}),

	move: ({ request }) =>
		request.formData().then((form) => {
			const target = id(form);
			const direction = form.get('direction') === 'up' ? -1 : 1;
			if (!target || !categories.move(db(), target, direction)) {
				return refuse(400, 'errors.cannotMove');
			}
			return { moved: true };
		})
};
