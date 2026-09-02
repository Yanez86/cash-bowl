-- Si entra con un nome utente, non con l'email: l'applicazione non invia posta
-- (le password le reimposta l'amministratore), quindi l'indirizzo sarebbe un
-- dato personale conservato senza scopo.
ALTER TABLE users RENAME COLUMN email TO username;

-- Serve a bloccare chi prova password a raffica. Vedi audit.md §1.1
CREATE TABLE login_attempts (
	id INTEGER PRIMARY KEY,
	username TEXT NOT NULL,
	ip TEXT NOT NULL,
	at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX login_attempts_at ON login_attempts (at);
