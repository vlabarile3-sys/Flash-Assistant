# Flash Assistant

## About the project

Flash Assistant is a Google Workspace ticketing and escalation application that helps teams submit cases, collaborate on reviews, and record quality-assurance decisions in a shared workflow. Its multi-step form structures submissions, while the unified queue brings cases, discussion history, reviewer analyses, and verdicts together.

### Key capabilities

- Create and track tickets through a guided submission flow.
- Review cases, add independent analyses, record QA decisions, and park cases for further investigation.
- Explore Jixy, a knowledge assistant designed to help users find relevant guidance.
- Use the Apps Script implementation with Google Sheets for ticket records and Google Drive for attachments.

The public preview is a browser-only demonstration with fictional data; it does not connect to Google services or an AI provider. The full Apps Script application requires its own setup and permissions.

> **Enterprise Ticketing & Automated Workflow System for Google Workspace**  
> Developed with Google Apps Script, Modern Vanilla HTML5/CSS3/JavaScript, Glassmorphism UI, and Google Sheets as a Real-time Relational Engine.

## Interactive Browser Preview

Open the [Flash Assistant demo](https://vlabarile3-sys.github.io/Flash-Assistant/Flash-Assistant-Demo.html) to explore sample tickets, reviewer feedback, QA decisions, a sample ticket form, and Jixy without downloading the project.

This preview uses fictional data and runs entirely in your browser. It does not connect to Google Sheets, Google Drive, or an AI service. The full application requires the Google Apps Script setup described below.

---

## Overview

**Flash Assistant** is a modular, high-performance single-page application (SPA) designed for centralized ticket management, escalations, and operational support within the Google Workspace ecosystem.

It combines a modern glassmorphism interface with:
- A validation engine and multi-step wizard.
- Real-time ticket status synchronization with Google Sheets.
- An automatic offline queue with a localStorage fallback.
- An integrated NLP FAQ engine with relevance scoring and dynamic search.
- A native audio synthesizer (Web Audio API) for unobtrusive sound feedback.
- Automatic protocol generation and attachment management using Google Drive.

---

## File Architecture

The project is structured into five decoupled modules compatible with Google Apps Script:

| File | Type | Description |
|---|---|---|
| Code.gs | Server-Side | Backend controller: web app routing (doGet), dynamic configuration, Google Sheets CRUD, Drive uploads, and automatic triggers. |
| Index.html | Client-Side | Main HTML shell, glassmorphism layout, interactive modals, and wizard container. |
| CSS.html | Styling | Complete design system: CSS variables, HSL palette, glassmorphism, responsive grid, and micro-animations. |
| JavaScript.html | Logic | Client controller: state management, server synchronization (google.script.run), Web Audio API, and offline queue management. |
| JixyFAQ.html | NLP Module | Interactive knowledge base with lexical/semantic matching and dynamic suggestions. |

---

## Requirements

- A Google Workspace or personal Google account with access to Google Drive and Google Sheets.
- Permission to deploy web apps in Google Apps Script.

---

## Installation and Configuration

### 1. Create the Google Apps Script Project
1. Create a new Google spreadsheet (e.g., Flash Assistant Database).
2. From the top menu, select **Extensions** > **Apps Script**.
3. Rename the project to Flash Assistant.

### 2. Import the Files
Create the following files in the Apps Script editor and paste their respective contents:
1. Code.gs (Script)
2. Index.html (HTML)
3. CSS.html (HTML)
4. JavaScript.html (HTML)
5. JixyFAQ.html (HTML)

### 3. Configure Parameters (Optional / Custom)
In Code.gs, the SPREADSHEET_ID constant automatically detects the linked spreadsheet (SpreadsheetApp.getActiveSpreadsheet().getId()).

To save screenshots and feedback files in specific Drive folders:
- Create the folders in Google Drive and obtain their IDs from their URLs.
- Add the IDs to Script Properties (**Project Settings** > **Script Properties**) using these keys:
  - IMAGE_FOLDER_ID: Drive folder ID for ticket image attachments.
  - FEEDBACK_FOLDER_ID: Drive folder ID for feedback files.
  - *Note:* If not specified, the system saves files in the root Google Drive folder without interrupting the workflow.

### 4. Initialize the Database
1. In the Apps Script editor toolbar, select the **setupSheets** function from the function dropdown.
2. Click **Run**.
3. Grant the requested Google Sheets and Google Drive permissions.
4. setupSheets will automatically create and format the required sheets (Tickets, Config, Logs, Audit).

### 5. Deploy the Web App
1. Click **Deploy** > **New deployment**.
2. Type: **Web app**.
3. Configure:
   - **Description:** Flash Assistant v1.0
   - **Execute as:** *User accessing the web app* or *Me (your account)*, depending on your policies.
   - **Who has access:** *Users in your organization only* or *Anyone*.
4. Click **Deploy** and copy the web app URL.

---

## Security and Privacy

The code has been sanitized and prepared for open-source use:
- No hardcoded IDs or sensitive tokens.
- Least-privilege architecture with secure attachment handling.
- Safety fallback when external Drive folders are not configured.

---

## Author

- **Vito Labarile** - *Design, Architecture, and Development*
