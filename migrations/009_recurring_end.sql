-- Quando finisce una ricorrente.
--
-- Una colonna sola: l'ultimo mese compreso. NULL vuol dire «per sempre», cioè
-- finché non la sospendi o la cancelli: è così che si comportano quelle già
-- esistenti, che restano tutte a NULL.
--
-- Anche «per dodici volte» finisce qui dentro: dodici volte da marzo 2026 sono
-- un modo di scrivere «fino a febbraio 2027». Il calcolo si fa una volta sola,
-- al salvataggio, e poi non c'è nessun contatore da tenere aggiornato.
ALTER TABLE recurring ADD COLUMN ends_ym TEXT
	CHECK (
		ends_ym IS NULL
		OR (ends_ym GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND ends_ym >= starts_ym)
	);
