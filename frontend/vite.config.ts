/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mother': path.resolve(__dirname, '../mother-theme/src'),
    },
  },
  plugins: [
    react({
      // Enable Fast Refresh / HMR
      fastRefresh: true,
    }),
  ],
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    strictPort: false, // Try next available port if 5173 is taken
    // Enable HMR (Hot Module Replacement)
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    // Watch for file changes
    watch: {
      usePolling: false, // Use native file watching (faster)
      // Watch backend files for changes (triggers reload if API changes)
      ignored: ['!**/node_modules/**', '!**/.git/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // WebSocket proxy for HMR (if backend uses WS)
        ws: true,
        // Keep /api prefix when forwarding to backend
        // Vite will forward /api/* to http://localhost:3000/api/*
        // Configure timeouts for long-running requests
        timeout: 60000,
        // Handle connection errors
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
          });
        },
      },
    },
  },
  // Build configuration
  build: {
    // Enable source maps for better debugging
    sourcemap: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          axios: ['axios'],
        },
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios'],
    // Exclude from pre-bundling (will be loaded on demand)
    exclude: [],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.integration.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
  },
})

