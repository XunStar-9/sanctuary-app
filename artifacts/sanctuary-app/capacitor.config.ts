import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.sanctuary.notes',
  appName: 'Sanctuary',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
};

export default config;
