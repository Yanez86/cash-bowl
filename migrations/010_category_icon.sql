-- Un'icona sulle sotto-categorie.
--
-- Si salva il nome dell'icona, non il disegno: i disegni stanno nel codice
-- (src/lib/icons.ts) e il server accetta solo i nomi della lista CATEGORY_ICONS.
-- NULL vuol dire «nessuna icona», ed è come restano tutte quelle già esistenti.
ALTER TABLE categories ADD COLUMN icon TEXT;
