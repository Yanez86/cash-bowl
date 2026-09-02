# CLAUDE.md — regole di scrittura del codice di cash-bowl

Questo file vale per chiunque (umano o AI) tocchi questo repository.
È la costituzione del progetto: se una regola qui contrasta con una richiesta
generica, vince questo file. Se una regola va cambiata, si cambia **qui prima**
di scrivere il codice.

---

## 1. Cos'è cash-bowl

Applicazione web **selfhosted** per la gestione delle spese familiari con il
**metodo kakebo**. I dati si inseriscono a mano: nessun collegamento a banche,
nessun servizio esterno obbligatorio, nessuna telemetria.

Licenza: **AGPL-3.0**.

Il proprietario del progetto ha competenze informatiche limitate. Ne discende
la regola più importante di tutte:

> **Il codice deve poter essere capito e riparato tra due anni da una persona
> non esperta, con l'aiuto di un assistente.**

Ogni scelta tecnica si giudica su questo, non sull'eleganza.

---

## 2. Principi (in ordine di priorità)

1. **Non scriverlo.** La funzionalità migliore è quella che non serve. Se non è
   in `piani.md`, non si scrive. Le idee nuove si aggiungono a `piani.md` e si
   discutono, non si implementano di slancio.
2. **Riusa quello che c'è già** nel repo prima di creare un nuovo helper.
3. **Usa la libreria standard** (Node, Web API, CSS, SQL) prima di una libreria
   esterna.
4. **Usa la piattaforma nativa** prima del JavaScript: `<input type="date">`
   invece di un date picker, CSS invece di animazioni JS, vincoli del database
   invece di controlli sparsi nel codice.
5. **Noioso batte furbo.** Il codice furbo è quello che qualcuno dovrà decifrare
   alle 3 di notte.
6. **Cancellare batte aggiungere.** Meno file, meno righe, meno dipendenze.

### Eccezioni: qui NON si semplifica mai

- Validazione dei dati in arrivo dall'utente.
- Sicurezza e controllo dei permessi.
- Gestione degli errori che potrebbe far perdere dati.
- Accessibilità.
- Qualunque cosa esplicitamente richiesta dal proprietario.

---

## 3. Stack tecnico (fissato, non si discute per singola PR)

| Cosa          | Scelta                                                   | Perché                                          |
| ------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Linguaggio    | TypeScript, `strict: true`                               | scelta del proprietario                         |
| Framework     | SvelteKit                                                | un solo progetto fa sia le pagine sia il server |
| Database      | SQLite via `better-sqlite3`                              | un unico file, backup = copia file              |
| Query         | SQL scritto a mano                                       | niente ORM da imparare e mantenere              |
| Password      | `crypto.scrypt` di Node                                  | già nella libreria standard                     |
| Stile         | CSS con variabili native                                 | niente framework CSS                            |
| Grafici       | SVG generato a mano; libreria solo se davvero necessaria | vedi §9                                         |
| Runtime       | Node LTS                                                 | —                                               |
| Distribuzione | Docker + docker-compose (app + Caddy per HTTPS)          | un comando                                      |

**Aggiungere una dipendenza richiede una motivazione scritta nella pull request**
che spieghi perché non bastano libreria standard, piattaforma o venti righe di
codice. Le dipendenze si contano: obiettivo, meno di 15 in produzione.

---

## 4. Struttura delle cartelle

```
src/
  lib/
    server/        codice che gira SOLO sul server (db, auth, backup)
    i18n/          it.json, en.json e la funzione t()
    components/    componenti riutilizzabili di interfaccia
  routes/          le pagine e le loro azioni
static/            icone, manifest PWA
migrations/        001_init.sql, 002_....sql — solo file numerati
tests/
docs/
```

Regole:

- Tutto ciò che sta in `src/lib/server/` **non deve mai** finire nel browser.
- Nessuna cartella nuova senza motivo. Nessuna cartella "utils" generica: se un
  helper serve a una sola pagina, sta accanto a quella pagina.

---

## 5. Il denaro

Regola non negoziabile:

- **Gli importi si salvano come numeri interi in centesimi.** Mai `float`, mai
  `REAL` nel database. `12,34 €` si salva come `1234`.
- La conversione da e verso il formato leggibile avviene **solo** in due punti:
  una funzione `parseAmount()` in ingresso e `formatAmount()` in uscita.
- La formattazione usa `Intl.NumberFormat` con la lingua e la valuta
  configurate. Mai simboli scritti a mano nel codice.
- La valuta è **una sola per installazione**, salvata nelle impostazioni. Nessuna
  conversione di cambio, nessun tasso, nessuna chiamata esterna.

---

## 6. Date e periodi

- Le date delle transazioni si salvano come testo `YYYY-MM-DD`. Senza orario,
  senza fuso orario: una spesa del 3 marzo è del 3 marzo ovunque.
- Il mese kakebo è il mese di calendario. Niente periodi personalizzati finché
  qualcuno non li chiede davvero.
- Timestamp tecnici (creazione, modifica, sessioni) in UTC, formato ISO 8601.

---

## 7. Database e migrazioni

- Un solo file: `data/cash-bowl.db`. Modalità WAL attiva.
- Le modifiche allo schema si fanno **solo** con nuovi file numerati in
  `migrations/`. Un file già applicato non si modifica mai più.
- Le migrazioni si applicano automaticamente all'avvio, dopo aver creato una
  copia di sicurezza del database.
- I vincoli stanno nel database: `NOT NULL`, `CHECK`, chiavi esterne attive
  (`PRAGMA foreign_keys = ON`), `UNIQUE` dove serve. Non si delega la coerenza al
  solo codice applicativo.
- Query sempre **parametrizzate**. Mai costruire SQL concatenando stringhe.
  Nessuna eccezione, nemmeno per un valore "sicuro".

---

## 8. Sicurezza

L'installazione è raggiungibile da internet: si progetta come se qualcuno stesse
provando a entrare.

- **Mai fidarsi del browser.** Ogni azione ricontrolla lato server chi è
  l'utente e cosa può fare. I controlli nell'interfaccia sono cortesia, non
  sicurezza.
- **Le spese private non escono mai.** Il filtro sulla visibilità sta nella
  clausola `WHERE` della query, non in un `if` a valle. Regola pratica: se
  cancellassi tutto il codice dell'interfaccia, l'API non dovrebbe comunque
  restituire una spesa privata altrui.
- Password: `crypto.scrypt`, sale casuale per utente, confronto a tempo costante
  (`crypto.timingSafeEqual`). Minimo 12 caratteri. Nessuna password di default,
  mai.
- Sessioni: token casuale da 32 byte, salvato **hashato** nel database, inviato
  in un cookie `HttpOnly; Secure; SameSite=Lax`, con scadenza.
- Limite ai tentativi di accesso falliti, per utente e per indirizzo IP.
- Messaggi di errore del login sempre identici ("credenziali non valide"): non
  rivelano se l'utente esiste.
- Nessun segreto scritto nel codice o nel repository: tutto da variabili
  d'ambiente. `.env` è in `.gitignore`.
- Nei log non finiscono mai password, token, cookie o importi personali.
- Tutti gli input validati sul server con uno schema esplicito, anche quelli che
  "arrivano solo dal nostro form".
- Dipendenze: `npm audit` in CI. Aggiornamenti di sicurezza applicati subito.

### 8.1 Bozze e file caricati dagli utenti (foto degli scontrini)

**Bozze.** Una spesa può essere salvata come bozza con **la sola foto oppure il
solo importo**. Ne discende che nel database importo, categoria e visibilità
sono _opzionali_ finché lo stato è `draft`. Conseguenza da non dimenticare: ogni
query che calcola totali, bilanci o report deve escludere le bozze in modo
esplicito. Il posto giusto per farlo è la clausola `WHERE`, non un filtro a
valle.

**Foto.** Una sola foto per spesa. Il ridimensionamento avviene **nel browser**
(canvas, lato lungo ~1600 px, JPEG): nessuna libreria di immagini sul server.
Regole non negoziabili:

- Dimensione massima verificata sul server, non solo nel browser.
- Il tipo del file si riconosce dai **byte iniziali** del file, non dal nome né
  da quello che dichiara il browser. Ammessi solo JPEG, PNG e WebP. Mai SVG.
- Il nome del file scelto dall'utente non si usa mai: si genera un nome casuale.
  Nessun pezzo di percorso arriva dall'esterno.
- I file stanno in `data/receipts/`, **fuori** dalla cartella servita
  pubblicamente. Non esiste un indirizzo diretto al file.
- Si scaricano solo attraverso una rotta che verifica sessione e permessi, con
  gli stessi controlli famiglia/privato delle spese.
- I metadati nascosti (**posizione GPS**, modello del telefono, orario) si
  rimuovono prima di salvare: una foto di scontrino dice dove sei stato.
- La risposta che serve l'immagine usa `Content-Type` esplicito e
  `Content-Disposition: attachment` dove opportuno; mai far interpretare il file
  come HTML.
- Cancellando la spesa si cancella il file. Un file orfano è un dato personale
  dimenticato sul disco.

Checklist completa e verifiche periodiche: `audit.md`.

---

## 9. Interfaccia, temi e accessibilità

### Regole generali

- Prima l'HTML semantico: `<button>` per le azioni, `<a>` per la navigazione,
  `<form>` per i dati. Mai `<div>` cliccabili.
- Ogni campo ha una `<label>` collegata. Niente `placeholder` al posto
  dell'etichetta.
- Tutto raggiungibile e usabile **da tastiera**, con il focus sempre visibile.
- Contrasto minimo 4,5:1 per il testo, 3:1 per i controlli.
- Aree toccabili di almeno 44×44 px sul telefono.
- L'app deve restare usabile con JavaScript lento o parzialmente fallito: i form
  funzionano come form normali, il JavaScript li migliora.
- Ogni stato va previsto: vuoto, caricamento, errore, successo. Uno schermo
  bianco non è uno stato.

### Temi

- **Tutti i colori sono variabili CSS** definite in un unico file
  (`src/lib/themes.css`). Nessun colore scritto a mano nei componenti: mai
  `#3b7d5a` dentro una pagina, sempre `var(--accent)`.
- Due dimensioni indipendenti:
  1. **Chiaro / scuro / automatico** — l'automatico segue le impostazioni del
     telefono (`prefers-color-scheme`).
  2. **Palette d'accento** — un piccolo insieme di temi predefiniti
     (indicativamente: Kakebo, Bosco, Ambra, Notte, Grigio). Ogni palette è
     poche righe di variabili, non un file di configurazione.
- La scelta è **per utente**, salvata sul profilo, e va applicata prima del primo
  disegno della pagina per evitare il lampo bianco.
- Ogni palette deve superare i contrasti minimi **sia in chiaro sia in scuro**.
  Una palette che non passa non entra: la bellezza non batte la leggibilità.
- Due interruttori di accessibilità accanto ai temi: **alto contrasto** e
  **riduci animazioni** (quest'ultimo rispetta anche
  `prefers-reduced-motion` di sistema).
- Un tema personalizzato dall'utente (scelta libera dei colori) **non** si fa
  finché non viene richiesto: le palette predefinite coprono il bisogno reale.

### Grafici

- Prima si prova con SVG generato a mano: un grafico a barre sono trenta righe.
  Una libreria si introduce solo quando serve davvero (es. molti punti dati) e
  con la motivazione scritta.
- L'informazione **non** può essere affidata al solo colore: etichette, motivi o
  valori scritti accanto.
- Ogni grafico ha sempre accanto una **tabella con gli stessi dati**, leggibile
  da screen reader e utile a chiunque.

---

## 10. Multilingua

- **Nessuna stringa visibile scritta nel codice.** Sempre `t('chiave')`.
- Due file: `src/lib/i18n/it.json` e `en.json`, con le stesse chiavi. Un test
  verifica che non ci siano chiavi mancanti da una parte o dall'altra.
- Chiavi descrittive e gerarchiche: `expense.form.amount`, non `label1`.
- Lingua rilevata dal browser, sovrascrivibile dall'utente e salvata sul
  profilo. Fallback: inglese.
- Numeri, date e valute sempre tramite `Intl`, mai formattati a mano.
- Le lingue si aggiungono con un nuovo file JSON, senza toccare il codice.

---

## 11. Test

Poca cerimonia, ma il minimo indispensabile.

- **Ogni logica non banale lascia un test**: calcoli del bilancio kakebo,
  conversione degli importi, permessi e visibilità delle spese, autenticazione,
  import/export.
- Niente test per il codice ovvio. Niente mock elaborati: si usa un database
  SQLite in memoria.
- Almeno un test che verifichi che **un utente non veda le spese private di un
  altro**. Questo test non si cancella mai.
- Prima di correggere un bug, si scrive il test che lo riproduce.
- Almeno un test che verifichi che **le bozze non entrino in nessun totale**.
- Almeno un test che verifichi che un file non-immagine rinominato in `.jpg`
  venga rifiutato, e uno che verifichi che la foto di una spesa privata altrui
  non sia scaricabile. Questi test non si cancellano mai.

---

## 12. Stile del codice

- TypeScript in modalità `strict`. Il tipo `any` va motivato con un commento.
- Formattazione automatica (Prettier) e `eslint`: non si discute di stile a mano.
- Nomi in **inglese** nel codice (variabili, funzioni, tabelle). Testi
  all'utente solo nei file di traduzione. I commenti possono essere in italiano.
- Funzioni corte. Se una funzione non entra in una schermata, probabilmente fa
  due cose.
- I commenti spiegano **il perché**, non il cosa. Il cosa lo dice il codice.
- Le scorciatoie deliberate si segnano con un commento che inizia con
  `ponytail:` e dice qual è il limite e quando andrà superato. Esempio:
  `// ponytail: ricalcolo tutto il mese a ogni salvataggio, ottimizzare oltre le ~5000 spese/mese`

---

## 13. Git

- Rami: si lavora su rami tematici, `main` resta sempre funzionante.
- Messaggi di commit: una riga, imperativo, in inglese.
  Esempio: `add monthly kakebo summary`.
- Un commit = una cosa sola.
- Non si committano mai: `.env`, il database, i backup, `node_modules`.

---

## 14. Cose da non fare, mai

- Aggiungere collegamenti a banche o servizi finanziari esterni.
- Inviare dati fuori dal server (telemetria, analytics, font remoti, CDN).
  L'app deve funzionare **senza internet**, sulla rete di casa.
- Creare astrazioni "per il futuro": interfacce con una sola implementazione,
  sistemi di plugin, opzioni di configurazione per valori che non cambiano mai.
- Introdurre un secondo database, una coda, una cache o un microservizio.
- Rompere la compatibilità dei dati esistenti senza una migrazione.
- Scrivere codice non richiesto da `piani.md`.
