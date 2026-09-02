# cash-bowl

Gestione delle spese familiari con il **metodo kakebo**, da tenere in casa
propria. Selfhosted, gratuita e libera.

> **Stato: in progettazione.** Nessun codice ancora scritto: al momento questo
> repository contiene solo i documenti di progetto. Le istruzioni di
> installazione qui sotto descrivono come funzionerà, non ancora come funziona.

*[English version below](#english)*

---

## Cosa fa

- Registri a mano entrate e spese, dal telefono o dal computer.
- Segue il **kakebo**: a inizio mese decidi quanto vuoi risparmiare, durante il
  mese registri le spese nelle quattro categorie (Sopravvivenza, Svago, Cultura,
  Extra), a fine mese l'app ti mostra com'è andata e ti pone le quattro domande
  del metodo.
- Più persone in famiglia, ognuna col proprio accesso. Le spese sono di famiglia
  oppure private, lo decidi tu voce per voce.
- Report configurabili: per categoria, per periodo, andamento nel tempo,
  con export in CSV e PDF.
- Categorie e sotto-categorie modificabili come vuoi.
- Italiano e inglese. Temi chiari, scuri e a colori diversi.
- Si installa sul telefono dalla schermata home, come un'app.

## Cosa NON fa, di proposito

- **Non si collega alla banca.** I dati li inserisci tu.
- **Non manda niente fuori.** Nessuna telemetria, nessun servizio esterno,
  nessun font o script caricato da internet.
- I tuoi dati restano sul tuo server, in un unico file.

## Installazione (prevista)

Serve [Docker](https://docs.docker.com/get-docker/) installato.

```bash
git clone https://github.com/<utente>/cash-bowl.git
cd cash-bowl
cp .env.example .env      # apri il file e cambia le impostazioni
docker compose up -d
```

Poi apri `http://localhost:8080` e crea il primo utente: sarà
l'amministratore, e da lì potrà creare gli account degli altri familiari.

**Se vuoi usarla anche fuori casa** leggi prima la guida alla messa in sicurezza:
serve HTTPS. La configurazione inclusa (Caddy) se ne occupa da sola, ma va detto
qual è il tuo indirizzo.

## Backup

L'app salva ogni giorno una copia del database in `data/backups/`.
Se fai puntare quella cartella dentro una cartella già sincronizzata con
Google Drive, Dropbox o Nextcloud, hai il backup fuori casa senza dare
nessuna password al programma.

Prova almeno una volta a ripristinare un backup: un backup mai provato non è
un backup.

## Documenti del progetto

| File | Contenuto |
|---|---|
| [CLAUDE.md](CLAUDE.md) | regole di scrittura del codice |
| [piani.md](piani.md) | cosa costruiamo e in che ordine |
| [audit.md](audit.md) | liste di controllo su sicurezza e accessibilità |

## Licenza

[AGPL-3.0](LICENSE). Puoi usarla, modificarla e ridistribuirla gratuitamente.
Se la modifichi e la offri ad altri come servizio online, devi rendere
pubbliche le tue modifiche.

---

<a name="english"></a>

# cash-bowl (English)

Self-hosted family expense tracking using the **kakebo** method. Free and open.

> **Status: planning.** No code yet — this repository currently holds project
> documents only.

- Manual entry only: **no bank connections**, by design.
- **Nothing leaves your server**: no telemetry, no external services, no CDN.
- Kakebo cycle: set a savings goal at the start of the month, log spending into
  the four categories, review with the four kakebo questions at month end.
- Multiple household users; each expense is either shared or private.
- Configurable reports, CSV and PDF export, editable categories.
- English and Italian. Light, dark and colour themes.
- Installable from the browser as a PWA.

## Install (planned)

Requires [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/<user>/cash-bowl.git
cd cash-bowl
cp .env.example .env      # edit the settings
docker compose up -d
```

Open `http://localhost:8080` and create the first user, who becomes the
administrator and can then create the other household accounts.

Project documents are written in Italian: [CLAUDE.md](CLAUDE.md) (code rules),
[piani.md](piani.md) (roadmap), [audit.md](audit.md) (security and
accessibility checklists).

Licensed under [AGPL-3.0](LICENSE).
