// Le quattro categorie kakebo non si toccano: si aggiungono sotto-categorie.
// Una categoria già usata non si cancella, si disattiva: lo storico deve restare
// leggibile. Vedi piani.md, fase 3.
import type { DB } from './db';

export type Category = {
	id: number;
	parent_id: number | null;
	kakebo_key: string | null;
	name: string;
	position: number;
	is_active: number;
	/** Nome di un'icona di CATEGORY_ICONS, oppure null. Vedi src/lib/icons.ts. */
	icon: string | null;
};

export type Root = Category & { children: Category[] };

export function tree(db: DB, includeInactive = false): Root[] {
	const rows = db
		.prepare(
			`SELECT id, parent_id, kakebo_key, name, position, is_active, icon FROM categories
			 WHERE is_active = 1 OR ? = 1
			 ORDER BY position, name`
		)
		.all(includeInactive ? 1 : 0) as Category[];

	const roots = rows
		.filter((c) => c.parent_id === null)
		.map((c) => ({ ...c, children: [] as Category[] }));
	const byId = new Map(roots.map((r) => [r.id, r]));
	for (const row of rows) {
		if (row.parent_id !== null) byId.get(row.parent_id)?.children.push(row);
	}
	return roots;
}

export type Choice = { id: number; rootKey: string; child: string | null };

/**
 * Le categorie scegliibili in un modulo. Il nome delle quattro radici non viene
 * dal database ma dalla chiave: così si traduce. Vedi CLAUDE.md §10.
 */
export function selectable(db: DB): Choice[] {
	return tree(db).flatMap((root) => [
		{ id: root.id, rootKey: root.kakebo_key ?? '', child: null },
		...root.children.map((child) => ({
			id: child.id,
			rootKey: root.kakebo_key ?? '',
			child: child.name
		}))
	]);
}

export function exists(db: DB, id: number): boolean {
	return (
		db.prepare('SELECT 1 FROM categories WHERE id = ? AND is_active = 1').get(id) !== undefined
	);
}

export function addChild(db: DB, parentId: number, name: string): void {
	const parent = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(parentId) as
		{ parent_id: number | null } | undefined;
	if (!parent) throw new Error('categoria principale inesistente');
	// Due livelli e basta: una sotto-categoria non può avere figlie.
	if (parent.parent_id !== null) throw new Error('le sotto-categorie non si annidano');

	const next =
		(
			db
				.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM categories WHERE parent_id = ?')
				.get(parentId) as { m: number }
		).m + 1;
	db.prepare('INSERT INTO categories (parent_id, name, position) VALUES (?, ?, ?)').run(
		parentId,
		name,
		next
	);
}

/** Nome e icona si salvano insieme: nella pagina sono un modulo solo. */
export function save(db: DB, id: number, name: string, icon: string | null): void {
	db.prepare('UPDATE categories SET name = ?, icon = ? WHERE id = ?').run(name, icon, id);
}

/** Disattiva o riattiva. Le quattro categorie kakebo restano sempre attive. */
export function setActive(db: DB, id: number, active: boolean): boolean {
	const row = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(id) as
		{ parent_id: number | null } | undefined;
	if (!row || row.parent_id === null) return false;
	db.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
	return true;
}

export function inUse(db: DB, id: number): boolean {
	return db.prepare('SELECT 1 FROM transactions WHERE category_id = ?').get(id) !== undefined;
}

/** Elimina davvero, ma solo una sotto-categoria mai usata. */
export function remove(db: DB, id: number): boolean {
	const row = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(id) as
		{ parent_id: number | null } | undefined;
	if (!row || row.parent_id === null || inUse(db, id)) return false;
	db.prepare('DELETE FROM categories WHERE id = ?').run(id);
	return true;
}

/** Sposta una sotto-categoria di un posto in su o in giù fra le sue sorelle. */
export function move(db: DB, id: number, direction: -1 | 1): boolean {
	const row = db.prepare('SELECT parent_id, position FROM categories WHERE id = ?').get(id) as
		{ parent_id: number | null; position: number } | undefined;
	if (!row || row.parent_id === null) return false;

	const neighbour = db
		.prepare(
			direction === -1
				? 'SELECT id, position FROM categories WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1'
				: 'SELECT id, position FROM categories WHERE parent_id = ? AND position > ? ORDER BY position ASC LIMIT 1'
		)
		.get(row.parent_id, row.position) as { id: number; position: number } | undefined;
	if (!neighbour) return false;

	const swap = db.prepare('UPDATE categories SET position = ? WHERE id = ?');
	db.transaction(() => {
		swap.run(neighbour.position, id);
		swap.run(row.position, neighbour.id);
	})();
	return true;
}
