import { defineConfig } from 'wxt';
import { loadEnv } from 'vite';

// See https://wxt.dev/api/config.html
// `VITE_GOOGLE_CLIENT_ID` must be set in `.env` before building.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_');
    return {
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
