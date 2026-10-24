import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Repository Pages path will be used after v2 replaces the current app.
  base: './',
  build: { outDir: 'dist', sourcemap: true },
  // Vitest blanks plain CSS unless included; the token tests read tokens.css as text.
  test: { css: { include: [/tokens\.css/] } }
});
