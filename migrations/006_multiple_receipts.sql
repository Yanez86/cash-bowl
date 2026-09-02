-- Una spesa può avere più foto: scontrino lungo fotografato in due pezzi,
-- fattura su più pagine. Le foto già caricate diventano la prima di ognuna.
CREATE TABLE receipts (
	id INTEGER PRIMARY KEY,
	transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
	file TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX receipts_transaction ON receipts (transaction_id, position);

INSERT INTO receipts (transaction_id, file, position)
SELECT id, receipt_file, 1 FROM transactions WHERE receipt_file IS NOT NULL;

ALTER TABLE transactions DROP COLUMN receipt_file;
