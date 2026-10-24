import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Repository Pages path will be used after v2 replaces the current app.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    // kit.html is the component gallery: built so CI can test it, never linked from the app.
    rollupOptions: { input: { main: 'index.html', kit: 'kit.html' } }
  },
  // Vitest skips CSS it does not include; the token tests read stylesheets as text.
  test: { css: { include: [/tokens\.css/, /\.module\.css/] } }
});
