# Google Calendar Export

A Chrome extension (Manifest V3) built with WXT + React + TypeScript that lets you export Google Calendar events directly to a Google Sheet. Pick a date in the popup, preview your events, then export them to a new spreadsheet or a new tab inside an existing one — all without a backend server. OAuth tokens are stored locally using `chrome.storage.local`, and all Google API calls are made directly from the extension.

---

## Prerequisites

- **Node.js v18+** and **npm**
- **Google Chrome** (the extension targets Chrome MV3)
- A **Google account** with access to Google Calendar, Sheets, and Drive

---

## Google Cloud Console Setup

### 1. Create a new project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown → **New Project**
3. Give it a name (e.g. `calendar-export`) and click **Create**

### 2. Enable the required APIs

In your new project, go to **APIs & Services → Library** and enable all three:

- **Google Calendar API**
- **Google Sheets API**
- **Google Drive API**

### 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in the required app name and user support email fields
4. On the **Scopes** step, add all three scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.readonly`
5. On the **Test users** step, add your own Google account as a test user
6. Complete the wizard and save

> **Note:** While the app is in "Testing" mode, only accounts listed as test users can sign in. Publishing requires Google's verification process, which is not needed for personal or development use.

### 4. Create OAuth 2.0 credentials

> ⚠️ **Important:** The application type must be **"Chrome Extension"**, NOT "Web Application". Choosing the wrong type is the most common setup mistake — `chrome.identity.getAuthToken` will silently fail or return errors if the type is wrong.

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Set **Application type** to **Chrome Extension**
3. For the **Application ID** field you need your extension's ID — **do the "Load the Extension" steps below first**, then come back and fill this in
4. Click **Create** and copy the **Client ID** (it looks like `123456789-abc...apps.googleusercontent.com`)

---

## Environment Setup

Copy the example env file and fill in your client ID:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

> The `VITE_` prefix is required — WXT (Vite) only exposes environment variables with this prefix to the client bundle.

---

## Install & Build

```bash
npm install
npm run build
```

This produces the extension in `.output/chrome-mv3/`.

---

## Load the Extension in Chrome

1. Open **chrome://extensions**
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the **`.output/chrome-mv3/`** folder inside this project
5. The extension card will appear — **copy the Extension ID** shown beneath the extension name (it looks like `abcdefghijklmnopabcdefghijklmnop`)

Now go back to the Google Cloud Console step you left open:

6. Open **APIs & Services → Credentials** and click your OAuth client
7. Paste the Extension ID into the **Application ID** field and click **Save**

Finally, rebuild so the correct client ID is baked into the manifest and reload the extension:

```bash
npm run build
```

8. Go back to **chrome://extensions** and click the **refresh icon** (↺) on the extension card

The extension is now wired to your OAuth credentials and ready to use.

---

## Development (Hot Reload)

```bash
npm run dev
```

WXT watches for file changes and rebuilds automatically. After each rebuild, click the **refresh icon** on the extension card at `chrome://extensions` to pick up the new build.

> UI changes in the popup reload instantly when the popup is re-opened. Background worker or manifest changes require a manual refresh of the extension card.

---

## Pinning the Extension ID

When you load an unpacked extension without a fixed `key`, Chrome assigns a random ID that changes every time you remove and re-add the extension. If your OAuth credentials break after a reinstall, this is why.

To get a stable ID across reinstalls, use `wxt zip` to produce a packaged `.crx`-style archive. The zipped build includes a generated `key` field in the manifest, which locks the ID. See the [WXT docs on extension key](https://wxt.dev/guide/key-file.html) for details on generating a key file and committing it to the project.

For day-to-day development — where you load the extension once and leave it — the random ID is fine as long as you don't remove the extension card.

---

## Usage

1. Click the extension icon in the Chrome toolbar
2. Click **Sign in with Google** and complete the OAuth flow
3. Pick a date using the date picker (defaults to today)
4. Your calendar events for that day are fetched and displayed in the table
5. Choose a destination:
   - **New spreadsheet** — creates a new Google Sheet in your Drive
   - **Add to existing spreadsheet** — pick a spreadsheet from the dropdown (populated from your Drive)
6. Click **Export** — a new tab named after the chosen date (e.g. `2025-07-14`) is created in the spreadsheet
7. Click **Open Sheet ↗** in the success banner to jump straight to the exported tab

To sign out, click the **Sign out** link in the footer of the popup.

---

## Project Structure

```
.
├── entrypoints/
│   ├── background.ts              # Service worker: OAuth token management
│   ├── popup/
│   │   ├── App.tsx                # Root component — auth gate (SignInView vs ExportView)
│   │   ├── main.tsx               # React entry point
│   │   ├── index.html             # Popup HTML shell (sets 400×600px dimensions)
│   │   ├── style.css              # Tailwind CSS import
│   │   ├── components/
│   │   │   ├── SignInView.tsx     # Sign-in screen
│   │   │   ├── ExportView.tsx     # Main UI: date picker, event table, export controls
│   │   │   └── EventTable.tsx     # Calendar events table
│   │   ├── utils/
│   │   │   ├── auth.ts            # getAuthToken() / signOut() — message helpers
│   │   │   ├── calendar.ts        # Google Calendar REST API wrapper
│   │   │   ├── drive.ts           # Google Drive REST API wrapper
│   │   │   ├── sheets.ts          # Google Sheets REST API wrapper
│   │   │   └── storage.ts         # chrome.storage.local helpers
│   │   └── types/
│   │       └── index.ts           # Shared TypeScript types (CalendarEvent, Spreadsheet)
├── .env.example                   # Environment variable template
├── wxt.config.ts                  # WXT config: manifest, permissions, OAuth scopes
├── postcss.config.mjs             # PostCSS config for Tailwind CSS
├── tsconfig.json
└── package.json
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start WXT in watch mode (hot reload) |
| `npm run build` | Production build → `.output/chrome-mv3/` |
| `npm run zip` | Package the extension as a distributable zip |
| `npm run compile` | TypeScript type-check without building |
