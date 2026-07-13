import { defineConfig } from 'wxt';
import { loadEnv } from 'vite';

// See https://wxt.dev/api/config.html
// `VITE_GOOGLE_CLIENT_ID` must be set in `.env` before building.
// `VITE_EXTENSION_KEY` must be set in `.env` to pin the extension ID across reloads.
// To generate: chrome://extensions → Pack Extension → point at .output/chrome-mv3/ → copy
// the contents of the generated .pem file (excluding the header/footer lines) into VITE_EXTENSION_KEY.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_');
    return {
      // Pinning the key ensures the extension ID never changes between reloads.
      // Without this, Chrome may assign a new ID on each unpacked reload, breaking OAuth.
      ...(env.VITE_EXTENSION_KEY ? { key: env.VITE_EXTENSION_KEY } : {}),
      permissions: ['identity', 'storage'],
      host_permissions: ['https://www.googleapis.com/*', 'https://accounts.google.com/*'],
      oauth2: {
        client_id: env.VITE_GOOGLE_CLIENT_ID,
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
      },
    };
  },
});
