import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android shell for the web build (Web-First → Capacitor).
 * `npm run cap:sync` builds the Vite app into `dist/` and copies it to the
 * native project; `npx cap add android` generates it once (Phase 2).
 */
const config: CapacitorConfig = {
  appId: 'app.zk.student',
  appName: 'ZK',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
