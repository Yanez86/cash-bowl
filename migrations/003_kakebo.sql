-- Categorie kakebo, voci del mese e obiettivo di risparmio.
-- Gli importi sono SEMPRE numeri interi in centesimi: vedi CLAUDE.md §5.

-- Due soli livelli: le 4 categorie kakebo (parent_id NULL, con la loro chiave)
-- e le sotto-categorie create dagli utenti (parent_id valorizzato).
CREATE TABLE categories (
	id INTEGER PRIMARY KEY,
	parent_id INTEGER REFERENCES categories (id) ON DELETE RESTRICT,
	kakebo_key TEXT UNIQUE,
	name TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
	CHECK (
		(parent_id IS NULL AND kakebo_key IS NOT NULL)
		OR (parent_id IS NOT NULL AND kakebo_key IS NULL)
	)
);

CREATE UNIQUE INDEX categories_name_per_parent ON categories (parent_id, name);

INSERT INTO categories (kakebo_key, name, position) VALUES
	('survival', 'Sopravvivenza', 1),
	('leisure', 'Svago', 2),
	('culture', 'Cultura', 3),
	('extra', 'Extra', 4);

-- Il mese kakebo: quanto vuoi mettere da parte.
CREATE TABLE months (
	ym TEXT PRIMARY KEY CHECK (ym GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	savings_goal_cents INTEGER NOT NULL DEFAULT 0 CHECK (savings_goal_cents >= 0)
);

-- Entrate, spese fisse e spese variabili, complete o ancora in bozza.
CREATE TABLE transactions (
	id INTEGER PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'fixed', 'expense')),
	status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('draft', 'complete')),
	amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents > 0),
	occurred_on TEXT NOT NULL CHECK (
		occurred_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
	),
	category_id INTEGER REFERENCES categories (id) ON DELETE RESTRICT,
	note TEXT,
	visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'private')),
	created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

	-- Una voce completa ha sempre un importo; se è una spesa, anche la categoria.
	-- Una bozza può essere quasi vuota: è il suo scopo.
	CHECK (status = 'draft' OR amount_cents IS NOT NULL),
	CHECK (status = 'draft' OR kind != 'expense' OR category_id IS NOT NULL),

	-- Entrate e spese fisse sono sempre di famiglia: si parte da quanto entra in casa.
	CHECK (kind = 'expense' OR visibility = 'family')
);

CREATE INDEX transactions_occurred_on ON transactions (occurred_on);
CREATE INDEX transactions_category ON transactions (category_id);
CREATE INDEX transactions_status ON transactions (status);
