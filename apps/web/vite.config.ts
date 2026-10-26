import { defineConfig, type Plugin } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Stamps each page with its commit, so the release check can confirm what is live. Local builds say "dev". */
function commitMeta(commit: string): Plugin {
  return {
    name: 'hordemind-commit',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'hordemind-commit', content: commit }, injectTo: 'head' }]
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), commitMeta(loadEnv(mode, '.', 'GITHUB_SHA').GITHUB_SHA || 'dev')],
  // Repository Pages path will be used after v2 replaces the current app.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    // kit.html is the component gallery: built so CI can test it, never linked from the app.
    rolldownOptions: { input: { main: 'index.html', kit: 'kit.html' } }
  },
  // Vitest skips CSS it does not include; the token tests read stylesheets as text.
  test: { css: { include: [/tokens\.css/, /\.module\.css/] } }
}));
