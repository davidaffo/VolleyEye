import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { staticAssetsPlugin } from './build/static-assets-plugin.mjs';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/VolleyEye/' : '/',
  publicDir: false,
  plugins: [react(), staticAssetsPlugin()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  server: { port: 3000 }
}));
