-- Il rituale di fine mese: le prime tre domande del kakebo hanno una risposta
-- che l'applicazione calcola da sola. La quarta — "come puoi migliorare?" —
-- la scrive la famiglia, ed è quella che vale.
ALTER TABLE months ADD COLUMN reflection TEXT;
