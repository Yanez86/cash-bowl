# Cash Bowl

Gestione delle spese familiari con il **metodo kakebo**, da tenere in casa
propria. Selfhosted, gratuita e libera.

> **Stato: funziona, ed è in prova.** L'applicazione è completa e la si usa
> tutti i giorni, ma non ha ancora una versione numerata né l'audit finale di
> sicurezza e accessibilità (vedi [piani.md](piani.md), fasi 12 e 13). Se la
> installi adesso, sappi che sei fra i primi.

_[English version below](#english)_

---

## Cosa fa

- Registri a mano entrate e spese, dal telefono o dal computer.
- Segue il **kakebo**: a inizio mese decidi quanto vuoi risparmiare, durante il
  mese registri le spese nelle quattro categorie (Sopravvivenza, Svago, Cultura,
  Extra), a fine mese l'app ti mostra com'è andata e ti pone le quattro domande
  del metodo.
- **Spese al volo**: alla cassa fotografi lo scontrino o scrivi solo la cifra e
  salvi. Resta una _bozza_ che completi con calma; le bozze non falsano i conti,
  ma l'app ti ricorda quante ne hai da sistemare.
- **Foto degli scontrini**, fino a cinque per spesa, rimpicciolite dal telefono
  e ripulite dai dati di posizione. Un pulsante prova a **leggere l'importo**
  dalla foto e te lo propone: il riconoscimento avviene dentro il telefono,
  senza mandare niente fuori.
- **Spese ricorrenti**: affitto, stipendio, abbonamenti. Compaiono da sole
  all'apertura del mese, e possono finire a una data scelta o dopo un numero di
  volte.
- **Obiettivi di risparmio** con i versamenti e quanto mettere via ogni mese per
  arrivare in tempo.
- Più persone in famiglia, ognuna col proprio accesso. Le spese sono di famiglia
  oppure private, lo decidi tu voce per voce.
- Report configurabili: per categoria, per periodo, andamento nel tempo, con
  export in CSV e PDF.
- Categorie e sotto-categorie modificabili come vuoi, ognuna con la sua icona.
- Italiano e inglese. Temi chiari, scuri e a colori diversi, con alto contrasto
  e animazioni ridotte, scelti da ogni persona per sé.
- Si installa sul telefono dalla schermata home, come un'app.

## Cosa NON fa, di proposito

- **Non si collega alla banca.** I dati li inserisci tu.
- **Non manda niente fuori.** Nessuna telemetria, nessun servizio esterno,
  nessun font o script caricato da internet.
- I tuoi dati restano sul tuo server, in un unico file.

## Installazione

Serve [Docker](https://docs.docker.com/get-docker/) installato.

```bash
git clone https://github.com/Yanez86/cash-bowl.git
cd cash-bowl
cp .env.example .env      # apri il file e cambia le impostazioni
docker compose up -d
```

La prima accensione costruisce l'immagine e ci mette qualche minuto; le
successive sono immediate.

Poi apri `http://localhost:8080` e crea il primo utente: sarà l'amministratore,
e da lì potrà creare gli account degli altri familiari. Dopo il primo, la pagina
di registrazione si chiude da sola: da fuori non si registra nessuno.

**Se vuoi usarla anche fuori casa** serve HTTPS. La configurazione inclusa
(Caddy) se ne occupa da sola — certificato gratuito e rinnovo automatico — ma
va detto qual è il tuo indirizzo:

1. in `.env` scrivi `SITE_ADDRESS=cash.tuodominio.it` e
   `ORIGIN=https://cash.tuodominio.it`;
2. in `docker-compose.yml` togli il commento alle righe `'80:80'` e `'443:443'`;
3. sul router, inoltra le porte 80 e 443 verso il computer che ospita l'app;
4. `docker compose up -d --force-recreate`.

Il nome di dominio deve puntare al tuo indirizzo di casa, altrimenti il
certificato non si può ottenere. Non aprire sul router la porta 8080: è quella
senza HTTPS.

## Provare in casa, dal computer e dal telefono

Serve Docker attivo. Dalla cartella del progetto:

```bash
docker compose up -d      # accende
docker compose down       # spegne
docker compose logs -f app   # guarda cosa sta facendo
```

Poi apri:

- dal computer: `http://localhost:8080`
- dal telefono, sullo stesso wi-fi: `http://<indirizzo-del-computer>:8080`

Per usare due indirizzi diversi, nel file `.env` lascia commentata la riga
`ORIGIN` e togli il commento a `PROTOCOL_HEADER` e `HOST_HEADER`.

Sul telefono puoi già aggiungere l'app alla schermata home. Senza HTTPS però
alcune cose da "app vera" (funzionamento senza rete, richiesta di installazione
su Android) restano spente: tornano quando l'installazione ha un indirizzo
HTTPS, come descritto sopra.

Per ricominciare da zero, cancellando tutti i dati di prova:

```bash
docker compose down && rm -rf data && docker compose up -d
```

## Backup

L'app salva ogni giorno una copia del database in `data/backups/` e tiene le
ultime 14 (`BACKUP_KEEP` nel file `.env`). Fa una copia anche prima di ogni
aggiornamento dello schema e prima di ogni reimportazione.

Le foto degli scontrini sono file normali in `data/receipts/`: si copiano da
sole insieme alla cartella, senza duplicarle ogni giorno.

Se fai stare la cartella `data` dentro una cartella già sincronizzata con Google
Drive, Dropbox o Nextcloud, hai il backup fuori casa senza dare nessuna password
al programma.

Nella pagina **Manutenzione** (dal menu, solo per l'amministratore) vedi quanto
occupano i dati, quando è stata fatta l'ultima copia, e puoi scaricare tutto:
il database in un file solo, oppure l'esportazione in formato leggibile (JSON).

## Ripristino: come tornare indietro

Provalo almeno una volta **prima** di averne bisogno: un backup mai provato non
è un backup.

**Strada 1 — rimettere a posto il database (la più semplice).**

```bash
docker compose down                                   # spegni, sempre
cp data/backups/cash-bowl-2026-09-01.db data/cash-bowl.db   # la copia del giorno che vuoi
rm -f data/cash-bowl.db-wal data/cash-bowl.db-shm     # residui della sessione interrotta
docker compose up -d
```

Le foto non sono dentro quel file: se hai perso anche quelle, rimetti al suo
posto la cartella `data/receipts/` copiandola dal tuo backup.

**Strada 2 — reimportare l'esportazione JSON su un'installazione nuova.**
Accendi l'app, crea un utente provvisorio, vai in **Manutenzione → Reimporta i
dati** e carica il file. La reimportazione sostituisce tutto quello che c'è (il
programma fa prima una copia da solo) e alla fine tutti rifanno l'accesso con le
password di prima. Anche qui le foto vanno rimesse copiando `data/receipts/`.

## Aggiornare

```bash
cd cash-bowl
git pull
docker compose up -d --build
```

Gli aggiornamenti dello schema del database si applicano da soli all'avvio, dopo
che il programma ha fatto una copia di sicurezza. Se qualcosa va storto, spegni
e usa la Strada 1 qui sopra: la copia si chiama `pre-migration-...`.

## Documenti del progetto

| File                   | Contenuto                                       |
| ---------------------- | ----------------------------------------------- |
| [CLAUDE.md](CLAUDE.md) | regole di scrittura del codice                  |
| [piani.md](piani.md)   | cosa costruiamo e in che ordine                 |
| [audit.md](audit.md)   | liste di controllo su sicurezza e accessibilità |

Tecnologia: TypeScript, SvelteKit, SQLite. Due sole librerie esterne — il
database e il riconoscimento del testo negli scontrini — e nessuna chiamata a
internet. Per lavorarci: `npm install`, `npm run dev`, `npm test` (serve
Node 22).

## Licenza

[AGPL-3.0](LICENSE). Puoi usarla, modificarla e ridistribuirla gratuitamente.
Se la modifichi e la offri ad altri come servizio online, devi rendere pubbliche
le tue modifiche.

---

<a name="english"></a>

# Cash Bowl (English)

Self-hosted family expense tracking using the **kakebo** method. Free and open.

> **Status: working, and in trial use.** The application is complete and used
> daily, but it has no numbered release yet and the final security and
> accessibility audit is still to come.

- Manual entry only: **no bank connections**, by design.
- **Nothing leaves your server**: no telemetry, no external services, no CDN.
- Kakebo cycle: set a savings goal at the start of the month, log spending into
  the four categories, review with the four kakebo questions at month end.
- **Quick capture**: snap the receipt or type just the amount and save. It stays
  a _draft_ until you complete it; drafts never affect the totals.
- **Receipt photos**, up to five per expense, resized on the phone and stripped
  of location metadata. A button can read the total off the photo, in the
  browser, offline.
- **Recurring entries** (rent, salary, subscriptions) that can end on a chosen
  month or after a number of times, and **savings goals** with a monthly pace.
- Multiple household users; each expense is either shared or private.
- Configurable reports, CSV and PDF export, editable categories with icons.
- English and Italian. Light, dark and colour themes, per user.
- Installable from the browser as a PWA.

## Install

Requires [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/Yanez86/cash-bowl.git
cd cash-bowl
cp .env.example .env      # edit the settings
docker compose up -d
```

Open `http://localhost:8080` and create the first user, who becomes the
administrator and can then create the other household accounts; registration
closes itself afterwards.

To reach it from outside your home you need HTTPS: set `SITE_ADDRESS` and
`ORIGIN` to your domain in `.env`, uncomment ports 80 and 443 in
`docker-compose.yml`, and forward those ports on your router. The bundled Caddy
gets and renews the certificate on its own.

Daily database backups land in `data/backups/`; receipt photos are plain files
in `data/receipts/`. To restore, stop the stack, copy a backup over
`data/cash-bowl.db`, delete the leftover `-wal` and `-shm` files, start again.

Project documents are written in Italian: [CLAUDE.md](CLAUDE.md) (code rules),
[piani.md](piani.md) (roadmap), [audit.md](audit.md) (security and
accessibility checklists).

Licensed under [AGPL-3.0](LICENSE).
