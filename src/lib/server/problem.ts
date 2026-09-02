// Un errore restituito a una pagina ha sempre la stessa forma: una chiave di
// traduzione e i suoi eventuali valori. Vedi CLAUDE.md §10.
import { fail } from '@sveltejs/kit';
import type { Vars } from '$lib/i18n';

export const refuse = (status: number, key: string, vars?: Vars) =>
	fail(status, { error: key, vars });
