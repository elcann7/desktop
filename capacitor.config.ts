import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fun.tryliner.app',
  appName: 'Liner',
  webDir: 'dist',
  server: {
    iosScheme: 'ionic'
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
