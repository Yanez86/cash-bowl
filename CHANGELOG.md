# Changelog

Le versioni di Cash Bowl, dalla più recente. I numeri seguono
[SemVer](https://semver.org/lang/it/): finché il primo numero è 0, qualcosa può
ancora cambiare in modo scomodo, ma i dati già inseriti non si perdono mai —
ogni cambiamento allo schema del database ha la sua migrazione.

## 0.1.0 — 2026-09-03

Prima versione pubblica. L'applicazione è completa e in uso; l'audit finale di
sicurezza e accessibilità è ancora da fare (vedi [piani.md](piani.md), fase 13).

**Il metodo kakebo**

- Piano del mese: entrate, spese fisse, obiettivo di risparmio, e quanto resta
  davvero da spendere.
- Le quattro categorie ufficiali (Sopravvivenza, Svago, Cultura, Extra) con
  sotto-categorie personalizzabili, riordinabili e con un'icona a scelta.
- Rituale di fine mese con le quattro domande del metodo.

**Registrare le spese**

- Inserimento rapido dal telefono, sempre a portata di pollice.
- Bozze: si salva con il solo importo o la sola foto, si completa con calma. Le
  bozze restano fuori da ogni totale e da ogni report, e l'app ricorda quante
  sono da sistemare.
- Fino a cinque foto di scontrino per spesa, rimpicciolite dal telefono,
  raddrizzate e ripulite dalla posizione GPS.
- Lettura dell'importo dallo scontrino, dentro il browser, senza internet.
- Spese ricorrenti che compaiono da sole ogni mese e possono finire a una data
  scelta o dopo un numero di volte.
- Obiettivi di risparmio con versamenti, prelievi e ritmo mensile.

**Famiglia e riservatezza**

- Più accessi, ognuno col suo. Il primo utente è l'amministratore e crea gli
  altri; poi la registrazione si chiude.
- Ogni spesa è di famiglia oppure privata: le private non escono mai da nessuna
  pagina, da nessun report e da nessun export.

**Report e dati**

- Spese per categoria, per sotto-categoria, per periodo e nel tempo, con
  grafici che sono anche tabelle.
- Export in CSV e PDF, export completo in JSON e reimportazione.
- Copia di sicurezza automatica ogni giorno, prima di ogni migrazione e prima
  di ogni reimportazione, con rotazione delle più vecchie.
- Pagina di manutenzione: versione, spazio occupato, copie presenti.

**Interfaccia**

- Italiano e inglese, rilevati dal browser e cambiabili nel profilo.
- Temi chiaro, scuro e automatico, cinque palette d'accento, alto contrasto e
  animazioni ridotte, scelti da ogni persona per sé.
- Installabile sul telefono dalla schermata home.

**Installazione**

- Docker Compose con Caddy per l'HTTPS automatico, un solo file di dati,
  nessuna chiamata a internet.
