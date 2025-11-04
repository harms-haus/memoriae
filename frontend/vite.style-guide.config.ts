/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite config specifically for the style guide
export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],
  root: resolve(__dirname, 'style-guide'),
  server: {
    port: 3001,
    host: true,
    strictPort: false,
  },
  build: {
    outDir: resolve(__dirname, 'dist/style-guide'),
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'style-guide/index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

