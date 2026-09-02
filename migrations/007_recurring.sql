-- Le voci che tornano ogni mese: affitto, bollette, abbonamenti, stipendio.
-- Vengono inserite da sole a inizio mese, così i conti sono giusti dal primo
-- giorno. Sono sempre di famiglia, come tutte le entrate e le spese fisse.
CREATE TABLE recurring (
	id INTEGER PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'fixed', 'expense')),
	description TEXT NOT NULL,
	amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
	category_id INTEGER REFERENCES categories (id) ON DELETE RESTRICT,
	-- Fino al 28: così esiste in tutti i mesi, febbraio compreso.
	day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
	starts_ym TEXT NOT NULL CHECK (starts_ym GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
	created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

	-- Una spesa ha sempre una categoria; entrate e spese fisse no.
	CHECK (kind != 'expense' OR category_id IS NOT NULL)
);

-- Da quale ricorrente è nata una voce. Cancellando la ricorrente, le voci già
-- registrate restano: sono spese vere, avvenute davvero.
ALTER TABLE transactions ADD COLUMN recurring_id INTEGER REFERENCES recurring (id) ON DELETE SET NULL;

-- La garanzia contro i doppioni non sta nel codice ma qui: una ricorrente può
-- comparire una volta sola per mese, qualunque cosa faccia l'applicazione.
CREATE UNIQUE INDEX transactions_one_per_month
	ON transactions (recurring_id, substr(occurred_on, 1, 7))
	WHERE recurring_id IS NOT NULL;
