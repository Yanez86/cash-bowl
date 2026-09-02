# piani.md — cosa costruiamo e in che ordine

Elenco unico delle attività di cash-bowl. Se una cosa non è qui, non si scrive.
Le idee nuove si aggiungono in fondo, in "Idee da valutare", e si discutono
prima di essere promosse a una fase.

Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto

Stato attuale: **fase 11 completata** (lettura dell'importo dallo scontrino). Prossima: fase 12.

---

## Decisioni già prese

| Tema          | Scelta                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Installazione | Docker + docker-compose, un comando                                                                          |
| Utenti        | login separati; ogni spesa è "di famiglia" (default) o "privata"                                             |
| Registrazione | il primo utente è admin, poi crea lui gli altri                                                              |
| Metodo        | kakebo: 4 categorie ufficiali + sotto-categorie personalizzabili                                             |
| Telefono      | PWA installabile sulla schermata home                                                                        |
| Licenza       | AGPL-3.0                                                                                                     |
| Backup        | automatico giornaliero in una cartella locale, sincronizzata dall'utente                                     |
| Valuta        | una sola per installazione, scegliibile                                                                      |
| Server        | in casa, raggiungibile da fuori → HTTPS obbligatorio                                                         |
| Tecnologia    | TypeScript + SvelteKit + SQLite                                                                              |
| Temi          | chiaro/scuro/auto + palette d'accento, per utente                                                            |
| Lingue        | italiano e inglese                                                                                           |
| Bozze         | spesa salvabile al volo con **la sola foto oppure il solo importo**; fuori dai conti finché non è completata |
| Scontrini     | **una** foto per spesa, rimpicciolita dal telefono prima dell'invio                                          |

---

## Fase 0 — Fondamenta (documenti e repository)

- [x] `CLAUDE.md` — regole di scrittura del codice
- [x] `piani.md` — questo file
- [x] `audit.md` — checklist sicurezza e accessibilità
- [x] `README.md` — presentazione e istruzioni
- [x] `LICENSE` (AGPL-3.0) e `.gitignore`
- [x] `git init` e primo commit
- [x] Repository pubblico su GitHub: https://github.com/Yanez86/cash-bowl

---

## Fase 1 — Scheletro tecnico

Obiettivo: una pagina bianca che parte con un comando e si aggiorna da sola.

- [x] Progetto SvelteKit + TypeScript `strict`, Prettier, ESLint
- [x] Connessione a SQLite e sistema di migrazioni numerate (`src/lib/server/db.ts`)
- [x] `docker-compose.yml`: app + Caddy (HTTPS automatico) + volume dei dati
- [x] Variabili d'ambiente e file `.env.example` documentato
- [x] Pipeline CI: build, test, `npm audit`
- [x] Prima migrazione: tabelle `users`, `sessions`, `settings`
- [x] **Provato davvero su Docker** (2026-09-02): immagine costruita (474 MB),
      `docker compose up` avviato, applicazione raggiungibile attraverso Caddy,
      dati conservati allo spegnimento e riaccensione, app non in esecuzione come
      amministratore di sistema (`uid=1000 node`)

**Fatta quando:** `docker compose up` mostra una pagina e i dati sopravvivono al
riavvio.
**Verificato:** `docker compose up` costruisce e avvia app + Caddy; la pagina
risponde su :8080 con le intestazioni di sicurezza; spegnendo e riaccendendo
restano spese, ricorrenti, foto e obiettivi; la copia di sicurezza del giorno
viene fatta da sola.

---

## Fase 2 — Utenti e accesso

- [x] Registrazione del **primo** utente, che diventa amministratore
      (poi la pagina si chiude da sola: nessuno da fuori si registra)
- [x] Login e logout con sessioni sicure (cookie HttpOnly, SameSite, 30 giorni
      che si rinnovano usando l'app)
- [x] Blocco dopo troppi tentativi falliti (10 in 15 minuti, per nome utente e per IP)
- [x] Pannello admin: creare, disattivare, riattivare, eliminare utenti familiari
- [x] Cambio password e reimpostazione da parte dell'admin
- [x] Profilo utente: nome e password
- [x] Test: 10 controlli automatici su password, sessioni e blocchi
- [ ] Lingua e tema nel profilo: rimandati alla fase 4, quando avranno un effetto
      visibile. Le colonne nel database ci sono già.
- [ ] Test "un utente non vede i dati privati di un altro": si scrive nella fase 3,
      quando esisteranno le spese da proteggere. Per ora è verificato che un
      utente normale non entra nel pannello amministratore (403).

**Fatta quando:** due persone diverse entrano e vedono la propria schermata.
**Verificato:** creazione admin, creazione di un secondo utente, accesso, uscita,
403 sul pannello riservato, blocco dopo 10 tentativi, migrazione 002 applicata
con copia di sicurezza automatica. 13 test verdi, tipi e lint puliti.

---

## Fase 3 — Il cuore: spese, bozze e kakebo

- [x] Tabelle `categories`, `transactions`, `months`
- [x] Categorie iniziali kakebo: Sopravvivenza, Svago, Cultura, Extra
- [x] Gestione sotto-categorie: crea, rinomina, riordina, disattiva
      (le categorie usate **non** si cancellano: si disattivano, per non perdere lo storico)
- [x] Inserimento di una spesa: importo, data, categoria, nota,
      "di famiglia" o "privata"
- [x] Inserimento delle entrate e delle spese fisse del mese
- [x] Impostazione dell'obiettivo di risparmio mensile
- [x] Calcolo del disponibile: entrate − spese fisse − obiettivo di risparmio
- [x] Modifica ed eliminazione di una voce
- [x] Test dei calcoli del bilancio con importi in centesimi

### Bozze di spesa

- [x] Stato `draft` sulla transazione (bozza / completata)
- [x] Salvataggio al volo con il solo importo; **la sola foto** arriva nella fase 5
- [x] Pulsante di inserimento rapido sempre raggiungibile col pollice
      (pulsante rotondo fisso in basso a destra, fatto nella fase 4)
- [x] Le bozze **non entrano** nei totali del bilancio kakebo
- [x] Avviso ben visibile nella schermata principale: "hai N bozze da sistemare"
- [x] Elenco "da sistemare", ordinato dalla più vecchia, con completamento in un passaggio
- [x] Una bozza si completa quando ha importo, data e categoria
- [x] Test: le bozze restano fuori da tutti i totali e da tutti i report

**Fatta quando:** puoi registrare un mese intero, salvare una spesa in due tocchi
mentre sei alla cassa, e l'app ti dice quanto ti resta.
**Verificato:** entrate 2000 − fisse 800 − obiettivo 300 = 900 disponibili;
spesa di 45,50 più una privata da 30 → Davide vede 75,50 speso, Anna solo 45,50;
la bozza da 12,90 resta fuori dai totali ed è segnalata. 28 test verdi.

## Fase 4 — Interfaccia, telefono e lingue

- [x] Impianto multilingua: `t()`, `it.json`, `en.json`, rilevamento e selettore
- [x] Test che verifica le chiavi di traduzione mancanti (e quelle vuote)
- [x] Layout responsive, pensato prima per il telefono
- [x] **Temi**: file unico di variabili CSS, chiaro/scuro/auto,
      palette d'accento (Kakebo, Bosco, Ambra, Notte, Grigio)
- [x] 18 test automatici sui contrasti: ogni palette, in chiaro e in scuro
- [x] Interruttori "alto contrasto" e "riduci animazioni"
- [x] Selezione del tema salvata sul profilo e applicata senza lampo bianco
      (gli attributi sono già nell'HTML servito dal server)
- [x] PWA: manifest, icone, installabile sulla schermata home
- [x] Icone PNG generate da uno script senza librerie (`scripts/make-icons.mjs`)
- [x] Service worker che tiene in cache i file dell'applicazione, mai le pagine
- [x] Stati vuoto ed errore su ogni schermata (pagina di errore tradotta)
- [ ] Indicatore di caricamento: i moduli sono form normali, il browser mostra il
      suo. Un indicatore nostro serve solo quando arriverà il caricamento delle
      foto, nella fase 5.

**Fatta quando:** l'app si installa sul telefono, parla due lingue e cambia tema.
**Verificato:** browser italiano → interfaccia italiana; browser inglese →
interfaccia inglese; cambio a inglese + scuro + ambra + alto contrasto riflesso
negli attributi della pagina; valori inventati rifiutati e riportati ai
predefiniti; manifest, service worker e icone serviti correttamente.

## Fase 5 — Scontrini fotografati

- [x] Scatto diretto dal telefono e, in alternativa, scelta di un'immagine già
      in galleria (un solo campo: lo scegli tu al momento)
- [x] **Rimpicciolimento nel browser prima dell'invio**: lato lungo ~1600 px,
      JPEG, orientamento della foto rispettato
- [x] Funziona anche senza JavaScript: parte il file originale e fa tutto il server
- [x] **Una sola foto per spesa** (la nuova sostituisce la vecchia)
- [x] Controlli sul server: dimensione massima 4 MB, tipo verificato dai byte
      reali del file e non dal nome, solo JPEG e PNG, mai SVG
- [x] Rimozione dei dati nascosti (**posizione GPS**, modello del telefono,
      commenti) prima del salvataggio
- [x] Salvataggio come file in `data/receipts/`, nome casuale, permessi 600,
      **fuori** dalla cartella pubblica del sito
- [x] La foto si scarica solo attraverso `/receipts/<voce>`, che verifica chi sei
- [x] Anteprima nella scheda della spesa, con ingrandimento a schermo intero
- [x] Eliminazione della foto; cancellando la spesa si cancella anche il file
- [x] Indicatore 📷 negli elenchi di spese e bozze
- [x] Test: l'utente A non scarica la foto di una spesa privata dell'utente B
- [x] Test: un file non-immagine rinominato in `.jpg` viene rifiutato
- [ ] Le foto nell'export completo dei dati e nel ripristino: fase 7
- [ ] Pagina di stato con lo spazio occupato dagli scontrini: fase 7
      (la funzione che lo calcola è già scritta)

**Fatta quando:** alla cassa fotografi lo scontrino, esce una bozza, e la sera la
completi dal divano.
**Verificato:** foto con dentro «GPSLatitude 45.4642» e «iPhone 15» caricata e
salvata **senza** quei dati; proprietario 200, altro utente 404, senza accesso
rimandato al login; intestazioni `nosniff`, `Content-Security-Policy` e
`Content-Disposition: inline` presenti; testo rinominato `.jpg` rifiutato; foto
da 5 MB rifiutata; nessuna voce creata nei due casi rifiutati; cancellando la
spesa il file sparisce dal disco. 57 test verdi.

## Fase 6 — Report

- [x] Bilancio mensile kakebo: previsto contro reale, risparmiato contro obiettivo
- [x] Rituale di fine mese con le quattro domande kakebo: alle prime tre risponde
      l'applicazione, la quarta la scrive la famiglia e resta salvata
- [x] Spese per categoria in un periodo scelto
- [x] Spese per sotto-categoria (le prime quindici)
- [x] Andamento nel tempo: mese per mese e anno per anno
- [x] Grafici a barre che **sono** la loro tabella: stessa struttura, stessi
      numeri, niente affidato al solo colore
- [x] Filtri configurabili: periodo, categoria, persona, famiglia/privato
- [x] Le bozze sono escluse dai report, ma segnalate come "N voci non conteggiate"
- [x] Export CSV, con le celle disinnescate contro le formule di Excel
- [x] Export PDF tramite stampa del browser, con foglio di stile dedicato
- [x] Test: il report non mostra mai le spese private di un altro, nemmeno
      chiedendole apposta con il filtro

**Fatta quando:** a fine mese capisci in trenta secondi come è andata.
**Verificato:** Davide vede 75,50 € (famiglia più le sue private), Anna 45,50 €;
il filtro "solo private" mostra 0 ad Anna; la bozza è segnalata e non conteggiata;
il CSV di Anna non contiene la riga privata di Davide; una nota scritta
`=cmd|' /c calc'!A1` esce dal CSV disinnescata. 67 test verdi.

## Fase 7 — Backup e manutenzione

- [x] Backup automatico giornaliero del database in `data/backups/`
      (parte all'avvio e poi si ricontrolla ogni ora)
- [x] Rotazione: conserva le ultime N copie (`BACKUP_KEEP`, di serie 14) e
      **non tocca** le copie fatte prima di una migrazione
- [x] Le foto degli scontrini sono già file: si sincronizzano come cartella,
      non si duplicano ogni giorno
- [x] Copia di sicurezza automatica prima di ogni migrazione (dalla fase 1)
- [x] Copia di sicurezza automatica anche prima di una reimportazione
- [x] Export completo dei dati in JSON e reimportazione, tutto o niente
- [x] Download del database in un file solo, coerente, fatto al momento
- [x] **Procedura di ripristino scritta e provata davvero** (nel README)
- [x] Pagina di stato: versione, spazio occupato, ultima copia, migrazioni applicate
- [ ] Le foto dentro il file di export: restano fuori di proposito. Sono già
      file dentro `data/receipts/` e si copiano come cartella; metterle nel JSON
      vorrebbe dire scrivere un compressore per rifare un lavoro che la cartella
      fa già. Nel README è scritto che vanno copiate a parte.

**Fatta quando:** hai cancellato il database di prova e l'hai ripristinato.
**Verificato:** database **e** foto cancellati del tutto, poi rimessi: sono
tornati accesso con la vecchia password, importi (45,50 € spesi), riflessione
del mese e foto dello scontrino (200 image/jpeg). Provata anche la seconda
strada: su un'installazione nuova, caricato il file JSON, l'utente provvisorio
sparisce e torna Davide con la sua password. Un file rotto viene rifiutato e i
dati restano intatti. 74 test verdi.

## Fase 8 — Più foto per spesa e foto raddrizzate

- [x] Tabella `receipts`: una spesa, fino a **5** foto. Quelle già caricate
      diventano la prima di ognuna, senza perderne nessuna
- [x] Galleria nella scheda della spesa: aggiungi, togli, apri a schermo intero
- [x] Si possono scegliere più foto in una volta sola
- [x] Il tetto di 5 è controllato sul server, non solo nell'interfaccia
- [x] **Foto raddrizzate**: il verso si legge dai metadati prima di cancellarli e
      si riscrive in un blocco costruito da noi, fatto di quel solo campo. Il
      browser raddrizza da solo; posizione GPS e modello spariscono come prima
- [x] Una foto già dritta non si porta dietro nessun blocco
- [x] Cancellando la spesa spariscono righe **e** file
- [x] Formato dell'export portato alla versione 2 (contiene le foto come righe)
- [x] Test: il tetto di 5, la visibilità delle singole foto, il verso conservato,
      i segreti rimossi

**Verificato:** tre foto caricate in una volta su una spesa privata; il
proprietario le scarica tutte e tre (200), un altro utente nessuna (404);
GPS assente da tutte; caricandone altre tre il rifiuto arriva prima di salvarne
anche una sola; togliendone una spariscono riga e file; cancellando la spesa
il disco resta pulito. 79 test verdi.

## Fase 9 — Spese ricorrenti

- [x] Tabella `recurring`: descrizione, importo, categoria, giorno del mese,
      tipo (spesa fissa, spesa o entrata), attiva o sospesa, da quale mese vale
- [x] All'apertura di un mese le ricorrenti mancanti vengono **inserite già
      valide**: i conti sono giusti dal primo giorno
- [x] Ogni voce ricorda da quale ricorrente è nata, e un **indice unico nel
      database** impedisce il doppione anche se sbagliasse il codice
- [x] Non si generano mesi futuri, né mesi precedenti alla creazione della
      ricorrente
- [x] Il giorno va da 1 a 28: così la voce esiste anche a febbraio
- [x] Pannello per crearle, sospenderle, cambiarne importo e descrizione
- [x] Cambiare l'importo non tocca i mesi già passati
- [x] Cancellare la regola non cancella le voci già registrate: erano spese vere
- [x] Test: generazione una volta sola, niente futuro, niente passato, sospese
      ferme, doppione rifiutato dal database

**Verificato:** affitto 800 e stipendio 2000 creati; il cruscotto li mostra
subito; ricaricando dieci volte le voci restano due; cambiando l'affitto a 850 il
mese in corso resta a 800; la sospensione funziona. 88 test verdi.

## Fase 10 — Obiettivi di risparmio

- [x] Tabelle `goals` e `goal_deposits`: nome, traguardo, data desiderata
      (facoltativa), versamenti con data e nota
- [x] Pagina con quanto manca, la percentuale e **quanto mettere via al mese**
      per arrivare in tempo
- [x] Si può anche **riprendere** dal salvadanaio: il movimento negativo è
      previsto, non è un errore
- [x] Chiudere un obiettivo raggiunto e riaprirlo
- [x] Eliminando l'obiettivo spariscono i suoi movimenti
- [x] Restano separati dai conti del mese: nessun numero del kakebo cambia
- [x] Test: quanto manca, la percentuale, i mesi che restano, il ritmo mensile,
      e la verifica che un versamento non tocchi i totali del mese

**Verificato:** «Vacanza 1500 € entro giugno 2027» → mancano 1500, da mettere via
150 al mese; versati 300 e ripresi 50 → mancano 1250, 125 al mese; i conti del
mese restano a zero; eliminando l'obiettivo spariscono anche i movimenti.
96 test verdi.

## Fase 11 — Lettura dell'importo dallo scontrino (OCR)

- [x] Pulsante «Leggi l'importo» che compare dopo aver scattato la foto
- [x] Il motore si carica solo alla prima volta che si preme, e poi il browser
      se lo tiene
- [x] I file stanno dentro l'installazione, copiati da `node_modules` al momento
      della build: **nessuno scaricamento da internet**, né in build né a runtime
- [x] Cerca prima le righe con TOTALE / IMPORTO / AMOUNT partendo dal fondo, poi
      quelle con la valuta, poi ripiega sull'importo più grande della parte finale
- [x] **Propone**: il campo si riempie solo dopo che hai premuto, e il messaggio
      dice di controllare
- [x] Se non trova niente lo dice, invece di riempire a caso
- [x] Se i file non sono stati copiati, il pulsante non compare affatto
- [x] Dipendenza `tesseract.js` (più `@tesseract.js-data/eng` solo in sviluppo):
      seconda e ultima dipendenza di produzione, motivata qui sotto
- [x] Test: nove casi sul riconoscimento dell'importo, compreso il contante

**Peso reale, misurato:** il telefono scarica **4,2 MB** la prima volta che
qualcuno preme il pulsante (motore 1,39 MB, dati lingua 2,82 MB, worker 0,03 MB),
e poi non li scarica più. Nell'immagine occupano 15 MB.

**Verificato davvero:** fabbricato uno scontrino finto, fotografato e passato al
motore: ha letto «TOTALE EURO 45,50 / CONTANTE 50,00 / RESTO 4,50» e ha proposto
**45,50**, non i 50,00 del contante. Il primo tentativo funzionava per caso —
`CONTANTI` non combaciava con la parola cercata — quindi la scelta della cifra è
stata riscritta a priorità: prima le parole che dicono _totale_, poi la valuta.
105 test verdi.

**Perché una dipendenza esterna** (CLAUDE.md §3 chiede di motivarla): riconoscere
del testo dentro una foto vuol dire un motore di riconoscimento; scriverlo a mano
non è una scorciatoia disponibile, e ogni alternativa passa da un servizio online,
che questo progetto non vuole. `tesseract.js` gira **nel browser**, non tocca il
server, e i suoi file stanno dentro l'installazione. Se un giorno pesasse troppo,
si toglie insieme alla fase: nient'altro dipende da lei.

## Fase 12 — Distribuzione

- [ ] `README.md` con installazione in un comando
- [ ] Immagine Docker pubblicata automaticamente a ogni versione
      (la build locale è già provata: vedi fase 1)
- [ ] Versioni numerate e `CHANGELOG.md`
- [ ] Guida all'aggiornamento e alla messa in sicurezza (HTTPS, porte, router)
- [ ] Schermate dell'app nel README
- [ ] `CONTRIBUTING.md` e `SECURITY.md`

**Fatta quando:** una persona estranea al progetto la installa da sola.

---

## Fase 13 — Audit finale

- [ ] Audit di sicurezza completo secondo `audit.md`
- [ ] Audit di accessibilità completo secondo `audit.md`
- [ ] Prova reale con screen reader e sola tastiera
- [ ] Verifica dei contrasti su tutte le palette, in chiaro e in scuro
- [ ] Correzione di quanto emerso e nuova verifica

---

## Idee da valutare (non approvate)

Da qui non si scrive nulla senza una decisione esplicita.

- Importazione da CSV di un altro programma
- Tema personalizzato con colori scelti liberamente dall'utente
- Notifiche promemoria di fine mese
- Più valute con tassi di cambio — **contrario** al principio "nessun servizio esterno"
- Widget o app native — **contrario** alla scelta PWA

---

## Registro delle decisioni

| Data       | Decisione                                                        | Motivo                                                                                  |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 2026-09-02 | TypeScript invece di Python                                      | scelta del proprietario, confermata dopo aver discusso i costi di manutenzione          |
| 2026-09-02 | Backup su cartella locale invece di caricamento diretto su cloud | evita di custodire password del cloud dentro l'app                                      |
| 2026-09-02 | Una sola valuta, scegliibile                                     | evita tassi di cambio e chiamate a servizi esterni                                      |
| 2026-09-02 | Temi predefiniti, non personalizzati                             | copre il bisogno reale con poche righe di CSS                                           |
| 2026-09-02 | Bozze escluse dai totali, con avviso ben visibile                | i numeri del kakebo devono restare affidabili                                           |
| 2026-09-02 | Bozza salvabile con la sola foto o il solo importo               | l'inserimento al volo deve stare in due tocchi                                          |
| 2026-09-02 | Una foto per spesa, rimpicciolita nel browser                    | disco del server contenuto, caricamento veloce, nessuna libreria di immagini sul server |
| 2026-09-02 | Rimozione dei dati GPS dalle foto                                | una foto di scontrino porta con sé il luogo in cui è stata scattata                     |
