import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Repository Pages path will be used after v2 replaces the current app.
  base: './',
  build: { outDir: 'dist', sourcemap: true }
});
