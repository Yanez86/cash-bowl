// Il pannello è solo per l'amministratore. Il controllo sta qui, sul server:
// nascondere il link nel menù non è una protezione. Vedi CLAUDE.md §8.
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user?.is_admin) error(403, 'Questa pagina è riservata agli amministratori.');
	return {};
};
