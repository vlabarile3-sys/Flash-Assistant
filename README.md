# Flash Assistant

> **Enterprise Ticketing & Automated Workflow System for Google Workspace**  
> Developed with Google Apps Script, Modern Vanilla HTML5/CSS3/JavaScript, Glassmorphism UI, and Google Sheets as a Real-time Relational Engine.

## Interactive Browser Preview

Open the [Flash Assistant demo](https://vlabarile3-sys.github.io/Flash-Assistant/Flash-Assistant-Demo.html) to explore sample tickets, reviewer feedback, QA decisions, a sample ticket form, and Jixy without downloading the project.

This preview uses fictional data and runs entirely in your browser. It does not connect to Google Sheets, Google Drive, or an AI service. The full application requires the Google Apps Script setup described below.

---

## Panoramica

**Flash Assistant** è una Single Page Application (SPA) modulare ad alte prestazioni progettata per la gestione centralizzata di ticket, escalation e supporto operativo all'interno dell'ecosistema Google Workspace.

Combina un'interfaccia moderna in stile glassmorphism con:
- Motore di validazione e wizard multi-step.
- Sincronizzazione in tempo reale dello stato ticket su Google Sheets.
- Queue offline automatica con fallback in localStorage.
- Motore NLP FAQ integrato con calcolo della pertinenza e search dinamico.
- Sintetizzatore audio nativo (Web Audio API) per feedback sonoro non invasivo.
- Generazione automatica di protocolli e gestione allegati su Google Drive.

---

## Architettura dei File

Il progetto è strutturato in 5 moduli disaccoppiati conformi agli standard di Google Apps Script:

| File | Tipologia | Descrizione |
|---|---|---|
| Code.gs | Server-Side | Controller backend: routing Web App (doGet), configurazione dinamica, CRUD Google Sheets, upload Drive e trigger automatici. |
| Index.html | Client-Side | Shell HTML principale, layout glassmorphism, modali interattivi e container del wizard. |
| CSS.html | Styling | Design system completo: variabili CSS, palette HSL, glassmorphism, responsive grid e micro-animazioni. |
| JavaScript.html | Logic | Client controller: state management, sincronizzazione server (google.script.run), Web Audio API e gestione coda offline. |
| JixyFAQ.html | Modulo NLP | Knowledge base interattiva con matching lessicale/semantico e suggerimenti dinamici. |

---

## Requisiti

- Un account Google Workspace o Google personale con accesso a Google Drive e Google Sheets.
- Permessi per distribuire Web App in Google Apps Script.

---

## Installazione e Configurazione

### 1. Creazione del Progetto Google Apps Script
1. Crea un nuovo foglio di calcolo su Google Sheets (es. Flash Assistant Database).
2. Dal menu superiore, seleziona **Estensioni** > **Apps Script**.
3. Rinomina il progetto in Flash Assistant.

### 2. Importazione dei File
Crea all'interno dell'editor Apps Script i seguenti file e incolla il relativo contenuto:
1. Code.gs (Script)
2. Index.html (HTML)
3. CSS.html (HTML)
4. JavaScript.html (HTML)
5. JixyFAQ.html (HTML)

### 3. Configurazione Parametri (Opzionale / Personalizzata)
In Code.gs, la costante SPREADSHEET_ID rileva automaticamente il foglio collegato (SpreadsheetApp.getActiveSpreadsheet().getId()).

Se intendi salvare gli screenshot e i file di feedback in cartelle Drive specifiche:
- Crea le cartelle su Google Drive e recuperane l'ID dall'URL.
- Inserisci gli ID nelle Proprietà Script (**Impostazioni progetto** > **Proprietà script**) con le chiavi:
  - IMAGE_FOLDER_ID: ID cartella Drive per gli allegati immagine dei ticket.
  - FEEDBACK_FOLDER_ID: ID cartella Drive per i file di feedback.
  - *Nota:* Se non specificate, il sistema salverà i file nella cartella principale di Google Drive senza bloccare il flusso.

### 4. Inizializzazione del Database
1. Nella barra degli strumenti dell'editor Apps Script, seleziona la funzione **setupSheets** dal menu a tendina delle funzioni.
2. Clicca su **Esegui**.
3. Concedi le autorizzazioni di accesso a Google Sheets e Google Drive richieste.
4. setupSheets creerà e formatterà automaticamente tutti i fogli necessari (Tickets, Config, Logs, Audit).

### 5. Distribuzione Web App
1. Clicca su **Distribuisci** > **Nuova distribuzione**.
2. Tipo: **Applicazione web**.
3. Configura:
   - **Descrizione:** Flash Assistant v1.0
   - **Esegui come:** *Utente che accede all'applicazione web* oppure *Io (tuo account)* a seconda delle tue policy.
   - **Chi ha accesso:** *Solo gli utenti dell'organizzazione* oppure *Chiunque*.
4. Clicca su **Distribuisci** e copia l'URL dell'applicazione web.

---

## Sicurezza e Privacy

Il codice è stato bonificato e predisposto per l'uso open-source:
- Nessun ID hardcoded o token sensibile.
- Architettura a privilegi minimi con gestione sicura degli allegati.
- Fallback di sicurezza in assenza di configurazioni Drive esterne.

---

## Autore

- **Vito Labarile** - *Progettazione, Architettura e Sviluppo*
