-- La foto dello scontrino sta su disco, in data/receipts/. Nel database c'è
-- solo il nome del file, generato a caso: il nome scelto dall'utente non si usa
-- mai. Vedi CLAUDE.md §8.1
ALTER TABLE transactions ADD COLUMN receipt_file TEXT;
