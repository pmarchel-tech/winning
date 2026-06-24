import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.winning.app',
  appName: 'WINNING',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
