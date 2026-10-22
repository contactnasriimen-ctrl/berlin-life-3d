import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative paths: the build works on GitHub Pages (/berlin-life-3d/) and on any other host
  base: './',
  plugins: [react()],
  server: { port: 5178, strictPort: true },
  build: { chunkSizeWarningLimit: 4000, target: 'es2020' },
});
