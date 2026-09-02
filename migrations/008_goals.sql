-- I salvadanai: vacanza, fondo emergenze, macchina nuova.
-- Restano fuori dai conti del mese: nessun numero del kakebo cambia per colpa
-- loro. È la scelta che li rende spiegabili. Vedi piani.md, fase 10.
CREATE TABLE goals (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	target_cents INTEGER NOT NULL CHECK (target_cents > 0),
	due_on TEXT CHECK (
		due_on IS NULL OR due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
	),
	is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
	created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Un versamento può essere negativo: capita di dover ripescare dal salvadanaio.
CREATE TABLE goal_deposits (
	id INTEGER PRIMARY KEY,
	goal_id INTEGER NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
	amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
	occurred_on TEXT NOT NULL CHECK (
		occurred_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
	),
	note TEXT,
	created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX goal_deposits_goal ON goal_deposits (goal_id, occurred_on);
