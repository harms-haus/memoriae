import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'examples'),
  server: {
    port: 3001,
    host: true,
    strictPort: false,
  },
  build: {
    outDir: resolve(__dirname, 'dist/examples'),
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'examples/index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Enable proper routing for SPA - all routes should serve index.html
  preview: {
    port: 3001,
  },
});

