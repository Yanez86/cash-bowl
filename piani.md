# piani.md — cosa costruiamo e in che ordine

Elenco unico delle attività di cash-bowl. Se una cosa non è qui, non si scrive.
Le idee nuove si aggiungono in fondo, in "Idee da valutare", e si discutono
prima di essere promosse a una fase.

Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto

Stato attuale: **fase 0 completata, nessuna riga di codice scritta.**

---

## Decisioni già prese

| Tema | Scelta |
|---|---|
| Installazione | Docker + docker-compose, un comando |
| Utenti | login separati; ogni spesa è "di famiglia" (default) o "privata" |
| Registrazione | il primo utente è admin, poi crea lui gli altri |
| Metodo | kakebo: 4 categorie ufficiali + sotto-categorie personalizzabili |
| Telefono | PWA installabile sulla schermata home |
| Licenza | AGPL-3.0 |
| Backup | automatico giornaliero in una cartella locale, sincronizzata dall'utente |
| Valuta | una sola per installazione, scegliibile |
| Server | in casa, raggiungibile da fuori → HTTPS obbligatorio |
| Tecnologia | TypeScript + SvelteKit + SQLite |
| Temi | chiaro/scuro/auto + palette d'accento, per utente |
| Lingue | italiano e inglese |
| Bozze | spesa salvabile al volo con **la sola foto oppure il solo importo**; fuori dai conti finché non è completata |
| Scontrini | **una** foto per spesa, rimpicciolita dal telefono prima dell'invio |

---

## Fase 0 — Fondamenta (documenti e repository)

- [x] `CLAUDE.md` — regole di scrittura del codice
- [x] `piani.md` — questo file
- [x] `audit.md` — checklist sicurezza e accessibilità
- [x] `README.md` — presentazione e istruzioni
- [x] `LICENSE` (AGPL-3.0) e `.gitignore`
- [x] `git init` e primo commit
- [ ] Creazione del repository su GitHub (`cash-bowl`, pubblico)

---

## Fase 1 — Scheletro tecnico

Obiettivo: una pagina bianca che parte con un comando e si aggiorna da sola.

- [ ] Progetto SvelteKit + TypeScript `strict`, Prettier, ESLint
- [ ] Connessione a SQLite e sistema di migrazioni numerate
- [ ] `docker-compose.yml`: app + Caddy (HTTPS automatico) + volume dei dati
- [ ] Variabili d'ambiente e file `.env.example` documentato
- [ ] Pipeline CI: build, test, `npm audit`
- [ ] Prima migrazione: tabelle `users`, `sessions`, `settings`

**Fatta quando:** `docker compose up` mostra una pagina e i dati sopravvivono al
riavvio.

---

## Fase 2 — Utenti e accesso

- [ ] Registrazione del **primo** utente, che diventa amministratore
- [ ] Login e logout con sessioni sicure (cookie HttpOnly)
- [ ] Blocco dopo troppi tentativi falliti
- [ ] Pannello admin: creare, disattivare, eliminare utenti familiari
- [ ] Cambio password e reimpostazione da parte dell'admin
- [ ] Profilo utente: nome, lingua, tema
- [ ] Test: un utente non può vedere né modificare i dati privati di un altro

**Fatta quando:** due persone diverse entrano e vedono la propria schermata.

---

## Fase 3 — Il cuore: spese, bozze e kakebo

- [ ] Tabelle `categories`, `transactions`, `months`
- [ ] Categorie iniziali kakebo: Sopravvivenza, Svago, Cultura, Extra
- [ ] Gestione sotto-categorie: crea, rinomina, riordina, disattiva
      (le categorie usate **non** si cancellano: si disattivano, per non perdere lo storico)
- [ ] Inserimento di una spesa: importo, data, categoria, nota,
      "di famiglia" o "privata"
- [ ] Inserimento delle entrate e delle spese fisse del mese
- [ ] Impostazione dell'obiettivo di risparmio mensile
- [ ] Calcolo del disponibile: entrate − spese fisse − obiettivo di risparmio
- [ ] Modifica ed eliminazione di una voce
- [ ] Test dei calcoli del bilancio con importi in centesimi

### Bozze di spesa

- [ ] Stato `draft` sulla transazione (bozza / completata)
- [ ] Salvataggio al volo: basta **la foto oppure l'importo**; data di oggi
      automatica; categoria, nota e visibilità si mettono dopo
- [ ] Pulsante di inserimento rapido sempre raggiungibile col pollice
- [ ] Le bozze **non entrano** nei totali del bilancio kakebo
- [ ] Avviso ben visibile nella schermata principale: "hai N bozze da sistemare"
- [ ] Elenco "da sistemare", ordinato dalla più vecchia, con completamento in un passaggio
- [ ] Una bozza si completa quando ha importo, data e categoria
- [ ] Test: le bozze restano fuori da tutti i totali e da tutti i report

**Fatta quando:** puoi registrare un mese intero, salvare una spesa in due tocchi
mentre sei alla cassa, e l'app ti dice quanto ti resta.

---

## Fase 4 — Interfaccia, telefono e lingue

- [ ] Impianto multilingua: `t()`, `it.json`, `en.json`, rilevamento e selettore
- [ ] Test che verifica le chiavi di traduzione mancanti
- [ ] Layout responsive, pensato prima per il telefono
- [ ] **Temi**: file unico di variabili CSS, chiaro/scuro/auto,
      palette d'accento (Kakebo, Bosco, Ambra, Notte, Grigio)
- [ ] Interruttori "alto contrasto" e "riduci animazioni"
- [ ] Selezione del tema salvata sul profilo e applicata senza lampo bianco
- [ ] PWA: manifest, icone, installabile sulla schermata home
- [ ] Stati vuoto / caricamento / errore su ogni schermata

**Fatta quando:** l'app si installa sul telefono, parla due lingue e cambia tema.

---

## Fase 5 — Scontrini fotografati

- [ ] Scatto diretto dal telefono (`<input type="file" accept="image/*" capture>`)
      e, in alternativa, scelta di un'immagine già in galleria
- [ ] **Rimpicciolimento nel browser prima dell'invio**: lato lungo ~1600 px,
      JPEG, obiettivo 200–400 KB
- [ ] **Una sola foto per spesa** (la seconda sostituisce la prima, con conferma)
- [ ] Controlli sul server: dimensione massima, tipo verificato dai byte reali
      del file e non dal nome, solo JPEG/PNG/WebP
- [ ] Rimozione dei dati nascosti nella foto (**posizione GPS**, modello del
      telefono) prima del salvataggio
- [ ] Salvataggio come file in `data/receipts/`, nome casuale, **fuori** dalla
      cartella pubblica del sito
- [ ] La foto si scarica solo attraverso un indirizzo che verifica chi sei:
      una foto di una spesa privata altrui non deve mai essere raggiungibile
- [ ] Anteprima nella scheda della spesa, con ingrandimento a schermo intero
- [ ] Eliminazione della foto; cancellando la spesa si cancella anche il file
- [ ] Le foto rientrano nell'export completo dei dati e nel ripristino
- [ ] Pagina di stato: spazio occupato dagli scontrini
- [ ] Test: l'utente A non scarica la foto di una spesa privata dell'utente B
- [ ] Test: un file non-immagine rinominato in `.jpg` viene rifiutato

**Fatta quando:** alla cassa fotografi lo scontrino, esce una bozza, e la sera la
completi dal divano.

---

## Fase 6 — Report

- [ ] Bilancio mensile kakebo: previsto contro reale, risparmiato contro obiettivo
- [ ] Rituale di fine mese con le quattro domande kakebo e le risposte salvate
- [ ] Spese per categoria in un periodo scelto (grafico + tabella equivalente)
- [ ] Andamento nel tempo: confronto tra mesi e tra anni
- [ ] Filtri configurabili: periodo, categorie, utente, famiglia/privato
- [ ] Le bozze sono escluse dai report, ma segnalate come "N voci non conteggiate"
- [ ] Export CSV
- [ ] Export PDF tramite stampa del browser, con foglio di stile dedicato

**Fatta quando:** a fine mese capisci in trenta secondi come è andata.

---

## Fase 7 — Backup e manutenzione

- [ ] Backup automatico giornaliero del database in `data/backups/`
- [ ] Rotazione: conserva le ultime N copie, cancella le più vecchie
- [ ] Le foto degli scontrini sono già file: si sincronizzano come cartella,
      non si duplicano ogni giorno
- [ ] Copia di sicurezza automatica prima di ogni migrazione
- [ ] Export completo dei dati (JSON + foto) e reimportazione
- [ ] Procedura di ripristino scritta e **provata almeno una volta**
- [ ] Pagina di stato: versione, spazio occupato, data dell'ultimo backup

**Fatta quando:** hai cancellato il database di prova e l'hai ripristinato.

---

## Fase 8 — Distribuzione

- [ ] `README.md` con installazione in un comando
- [ ] Immagine Docker pubblicata automaticamente a ogni versione
- [ ] Versioni numerate e `CHANGELOG.md`
- [ ] Guida all'aggiornamento e alla messa in sicurezza (HTTPS, porte, router)
- [ ] Schermate dell'app nel README
- [ ] `CONTRIBUTING.md` e `SECURITY.md`

**Fatta quando:** una persona estranea al progetto la installa da sola.

---

## Fase 9 — Audit finale

- [ ] Audit di sicurezza completo secondo `audit.md`
- [ ] Audit di accessibilità completo secondo `audit.md`
- [ ] Prova reale con screen reader e sola tastiera
- [ ] Verifica dei contrasti su tutte le palette, in chiaro e in scuro
- [ ] Correzione di quanto emerso e nuova verifica

---

## Idee da valutare (non approvate)

Da qui non si scrive nulla senza una decisione esplicita.

- Spese ricorrenti create automaticamente ogni mese
- Lettura automatica dell'importo dallo scontrino fotografato (OCR)
- Più foto per la stessa spesa (fatture su più pagine)
- Obiettivi di risparmio a lungo termine (vacanza, fondo emergenze)
- Importazione da CSV di un altro programma
- Tema personalizzato con colori scelti liberamente dall'utente
- Notifiche promemoria di fine mese
- Più valute con tassi di cambio — **contrario** al principio "nessun servizio esterno"
- Widget o app native — **contrario** alla scelta PWA

---

## Registro delle decisioni

| Data | Decisione | Motivo |
|---|---|---|
| 2026-09-02 | TypeScript invece di Python | scelta del proprietario, confermata dopo aver discusso i costi di manutenzione |
| 2026-09-02 | Backup su cartella locale invece di caricamento diretto su cloud | evita di custodire password del cloud dentro l'app |
| 2026-09-02 | Una sola valuta, scegliibile | evita tassi di cambio e chiamate a servizi esterni |
| 2026-09-02 | Temi predefiniti, non personalizzati | copre il bisogno reale con poche righe di CSS |
| 2026-09-02 | Bozze escluse dai totali, con avviso ben visibile | i numeri del kakebo devono restare affidabili |
| 2026-09-02 | Bozza salvabile con la sola foto o il solo importo | l'inserimento al volo deve stare in due tocchi |
| 2026-09-02 | Una foto per spesa, rimpicciolita nel browser | disco del server contenuto, caricamento veloce, nessuna libreria di immagini sul server |
| 2026-09-02 | Rimozione dei dati GPS dalle foto | una foto di scontrino porta con sé il luogo in cui è stata scattata |
