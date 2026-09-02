# audit.md — sicurezza e accessibilità

Due liste di controllo da rileggere e ri-spuntare **a ogni versione** prima di
pubblicarla, e comunque almeno una volta ogni sei mesi.

Non sono buone intenzioni: sono requisiti. Una voce non spuntata è un lavoro
aperto, non un dettaglio.

Legenda: `[ ]` da verificare · `[x]` verificato · `[!]` problema aperto

Ultima revisione completa: _mai (progetto in fase di documentazione)_

---

# Parte 1 — Sicurezza

Contesto di rischio: l'app gira su una macchina di casa **raggiungibile da
internet** e contiene dati finanziari di una famiglia. Si progetta assumendo che
qualcuno stia provando a entrare.

## 1.1 Accesso e identità

- [ ] Nessuna password predefinita, in nessun punto del sistema
- [ ] Password minimo 12 caratteri, controllate anche lato server
- [ ] Password salvate con `crypto.scrypt`, sale casuale per ciascun utente
- [ ] Confronto delle password a tempo costante (`timingSafeEqual`)
- [ ] Il messaggio di login errato è sempre identico e non rivela se l'utente esiste
- [ ] Limite ai tentativi falliti, per utente e per indirizzo IP, con attesa crescente
- [ ] Solo l'amministratore può creare account; la registrazione libera è disattivata
- [ ] La registrazione del primo utente si chiude da sola dopo la creazione dell'admin
- [ ] Il cambio password invalida tutte le altre sessioni di quell'utente
- [ ] Un utente disattivato perde immediatamente l'accesso

## 1.2 Sessioni

- [ ] Token di sessione casuale di almeno 32 byte, generato con `crypto.randomBytes`
- [ ] Il token è salvato **hashato** nel database, mai in chiaro
- [ ] Cookie con `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] Scadenza della sessione e cancellazione automatica di quelle scadute
- [ ] Il logout cancella la sessione dal server, non solo il cookie
- [ ] L'utente può vedere e chiudere le proprie sessioni attive

## 1.3 Permessi e dati privati

- [ ] Ogni richiesta al server ricontrolla identità e permessi: nessuna fiducia nel browser
- [ ] Il filtro famiglia/privato è nella query SQL, non in un controllo successivo
- [ ] Test automatico: l'utente A non ottiene mai una spesa privata dell'utente B
- [ ] Test automatico: un utente normale non accede alle funzioni da amministratore
- [ ] Nessun identificativo indovinabile espone dati altrui (provare a cambiare l'id nell'indirizzo)
- [ ] Gli export (CSV, PDF, JSON) rispettano gli stessi filtri di visibilità

## 1.4 Dati in ingresso

- [ ] Ogni campo validato sul server con uno schema esplicito
- [ ] Tutte le query SQL sono parametrizzate: zero concatenazioni di stringhe
- [ ] Importi accettati solo come interi in centesimi, con limiti minimo e massimo
- [ ] Date validate nel formato `YYYY-MM-DD` e in un intervallo ragionevole
- [ ] Testo libero (note, nomi di categoria) con lunghezza massima
- [ ] Nessun `innerHTML` con contenuto proveniente dall'utente
- [ ] Le celle dei CSV esportati sono protette dall'esecuzione di formule in Excel
      (valori che iniziano con `=`, `+`, `-`, `@`)
- [ ] Limite di dimensione sulle richieste in ingresso

## 1.5 Trasporto e configurazione

- [ ] HTTPS obbligatorio; il traffico in chiaro viene reindirizzato
- [ ] Certificato automatico e rinnovo automatico (Caddy)
- [ ] Header di sicurezza: `Content-Security-Policy`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Strict-Transport-Security`
- [ ] Protezione CSRF attiva su tutte le azioni che modificano dati
- [ ] Nessuna risorsa caricata da internet (font, script, CDN): l'app funziona offline
- [ ] Nessun segreto nel codice o nel repository; tutto da variabili d'ambiente
- [ ] Il container Docker non gira come utente `root`
- [ ] Sono esposte solo le porte necessarie
- [ ] I messaggi di errore mostrati all'utente non contengono dettagli tecnici interni

## 1.6 Riservatezza e tracce

- [ ] Nei log non compaiono mai password, token, cookie o importi personali
- [ ] Nessuna telemetria, nessun analytics, nessun invio di dati all'esterno
- [ ] I file di backup hanno permessi ristretti sul disco
- [ ] La cartella dei backup non è raggiungibile dal web
- [ ] È documentato cosa contiene esattamente un backup, prima di sincronizzarlo su cloud

## 1.7 Bozze e foto degli scontrini

- [ ] Dimensione massima del file verificata **sul server**, non solo nel browser
- [ ] Tipo del file riconosciuto dai byte iniziali, non dal nome: solo JPEG, PNG, WebP
- [ ] File SVG sempre rifiutati
- [ ] Il nome del file scelto dall'utente non viene mai usato: nome generato a caso
- [ ] Nessun pezzo di percorso proveniente dall'esterno finisce in un percorso reale
- [ ] Le foto stanno in `data/receipts/`, fuori dalla cartella pubblica del sito
- [ ] Nessun indirizzo diretto al file: si passa sempre da una rotta che controlla i permessi
- [ ] La foto di una spesa privata non è scaricabile da un altro utente
- [ ] Metadati nascosti rimossi prima del salvataggio: **posizione GPS**, modello, orario
- [ ] Il file non può essere interpretato come HTML dal browser
- [ ] Cancellando la spesa si cancella anche il file: nessun file orfano sul disco
- [ ] Limite complessivo allo spazio occupato, per evitare che il disco si riempia
- [ ] Le bozze rispettano gli stessi controlli di visibilità delle spese complete

## 1.8 Manutenzione

- [ ] `npm audit` eseguito automaticamente dalla CI a ogni modifica
- [ ] Nessuna dipendenza con vulnerabilità note di gravità alta o critica
- [ ] Numero di dipendenze di produzione sotto controllo (obiettivo: meno di 15)
- [ ] Le versioni sono numerate e c'è un canale per segnalare problemi (`SECURITY.md`)
- [ ] Procedura di ripristino da backup **provata davvero**, non solo scritta

## 1.9 Prove pratiche da rifare a ogni versione

1. Provare a entrare con password sbagliata dieci volte: deve scattare il blocco.
2. Copiare l'indirizzo di una spesa privata e aprirlo con un altro utente: deve negare.
3. Cambiare a mano un identificativo numerico nell'indirizzo: deve negare.
4. Aprire l'app in `http://`: deve reindirizzare a `https://`.
5. Fare logout e usare il tasto "indietro" del browser: non deve mostrare dati.
6. Cancellare il database di prova e ripristinarlo dal backup: deve funzionare.
7. Rinominare un file qualsiasi in `.jpg` e caricarlo: deve essere rifiutato.
8. Copiare l'indirizzo della foto di uno scontrino privato e aprirlo con un
   altro utente, e da finestra anonima: deve negare in entrambi i casi.
9. Caricare una foto scattata col telefono e ricontrollarne i metadati: la
   posizione GPS non deve esserci più.

---

# Parte 2 — Accessibilità

Obiettivo di riferimento: **WCAG 2.2 livello AA**. In pratica: l'app deve
funzionare per chi non usa il mouse, per chi non vede bene, per chi ha uno
schermo piccolo e per chi ha una connessione lenta.

## 2.1 Struttura e semantica

- [ ] HTML semantico: `<button>`, `<a>`, `<form>`, `<table>`, intestazioni in ordine
- [ ] Un solo `<h1>` per pagina, gerarchia dei titoli senza salti
- [ ] Punti di riferimento presenti: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Collegamento "vai al contenuto" all'inizio di ogni pagina
- [ ] Ogni pagina ha un titolo `<title>` descrittivo e tradotto
- [ ] L'attributo `lang` corrisponde alla lingua effettivamente mostrata

## 2.2 Tastiera

- [ ] Tutto raggiungibile e usabile senza mouse
- [ ] Focus sempre visibile e ben contrastato, su ogni tema
- [ ] Ordine di navigazione logico, coerente con l'ordine visivo
- [ ] Nessuna trappola: dalle finestre di dialogo si esce con `Esc`
- [ ] Le finestre di dialogo trattengono il focus e lo restituiscono alla chiusura
- [ ] Nessuna funzione richiede gesti complessi o trascinamento senza alternativa

## 2.3 Moduli di inserimento

- [ ] Ogni campo ha una `<label>` collegata; il `placeholder` non sostituisce l'etichetta
- [ ] Gli errori sono descritti a parole, vicino al campo, e annunciati agli screen reader
- [ ] I campi obbligatori sono indicati anche a parole, non solo con l'asterisco rosso
- [ ] Tastiera corretta sul telefono: numerica per gli importi, calendario per le date
- [ ] Autocompletamento attivo dove ha senso (`autocomplete`)
- [ ] Il contenuto già scritto non va perso in caso di errore di invio
- [ ] La foto dello scontrino è sempre **facoltativa**: si può salvare senza
- [ ] Esiste sempre l'alternativa alla fotocamera: scegliere un'immagine dalla galleria
- [ ] L'anteprima della foto ha un testo alternativo utile (es. "scontrino del 3 marzo, 24,50 €")
- [ ] L'avviso "hai N bozze da sistemare" è annunciato agli screen reader e non
      è affidato al solo colore

## 2.4 Colore e leggibilità

- [ ] Contrasto testo almeno 4,5:1; testo grande e controlli almeno 3:1
- [ ] **Verificato su tutte le palette, in chiaro e in scuro**
- [ ] Nessuna informazione affidata al solo colore (usare anche testo, icone, motivi)
- [ ] L'app resta leggibile con lo zoom al 200%
- [ ] Nessun testo dentro immagini
- [ ] La modalità "alto contrasto" produce un miglioramento reale e misurato

## 2.5 Movimento e tempo

- [ ] Rispetto di `prefers-reduced-motion` di sistema
- [ ] Interruttore "riduci animazioni" nelle impostazioni
- [ ] Nessun lampeggio, nessun contenuto che si muove da solo
- [ ] Nessuna azione a tempo limitato; la sessione non scade senza avviso

## 2.6 Telefono

- [ ] Aree toccabili di almeno 44×44 px, ben distanziate
- [ ] Funziona sia in verticale sia in orizzontale
- [ ] Nessuno scorrimento orizzontale indesiderato
- [ ] Le tabelle larghe restano leggibili (scorrimento dedicato o disposizione a schede)
- [ ] I controlli principali sono raggiungibili col pollice

## 2.7 Grafici e report

- [ ] Ogni grafico ha una descrizione testuale
- [ ] Ogni grafico ha accanto una tabella con gli stessi dati
- [ ] Le serie si distinguono anche in bianco e nero
- [ ] I valori importanti sono scritti, non solo disegnati

## 2.8 Prove pratiche da rifare a ogni versione

1. Completare un giro intero (accesso → inserire una spesa → vedere il report)
   usando **solo la tastiera**.
2. Ripetere lo stesso giro con uno screen reader (VoiceOver su Mac o iPhone,
   NVDA su Windows).
3. Portare lo zoom del browser al 200% e verificare che nulla si sovrapponga.
4. Aprire l'app su un telefono piccolo (schermo da 5 pollici).
5. Provare tutte le palette in chiaro e in scuro con un verificatore di contrasto.
6. Simulare una connessione lenta e verificare che gli stati di caricamento si vedano,
   compreso il caricamento della foto.
7. Salvare una bozza usando solo la tastiera, senza mai toccare la fotocamera.

---

## Come si registra un problema

Ogni voce con `[!]` va riportata in `piani.md` come attività, con:
data, descrizione, gravità (bassa / media / alta) e chi la prende in carico.
I problemi di gravità alta bloccano la pubblicazione della versione.
