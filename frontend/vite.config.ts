/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Get backend port from env (default to 3123)
  // In Docker, this will come from environment variables
  // For local dev, Vite will load .env from the project root (frontend/)
  const backendPort = process.env.PORT || '3123'
  
  return {
  // Load .env files from parent directory (project root)
  envDir: path.resolve(__dirname, '..'),
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
    // Enable HMR (Hot Module Replacement) - disabled during tests
    hmr: process.env.NODE_ENV === 'test' ? false : {
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
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        secure: false,
        // WebSocket proxy for HMR (if backend uses WS)
        ws: true,
        // Keep /api prefix when forwarding to backend
        // Vite will forward /api/* to http://localhost:3000/api/*
        // Configure timeouts for long-running requests
        timeout: 60000,
        // Handle connection errors (only log in development, not tests)
        configure: (proxy, _options) => {
          if (process.env.NODE_ENV !== 'test') {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
            });
          }
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
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            // Lucide icons (can be large)
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            // Markdown rendering
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
              return 'vendor-markdown'
            }
            // Date/time library
            if (id.includes('luxon')) {
              return 'vendor-datetime'
            }
            // Tree components
            if (id.includes('@headless-tree')) {
              return 'vendor-tree'
            }
            // Color picker
            if (id.includes('react-colorful')) {
              return 'vendor-color'
            }
            // Axios
            if (id.includes('axios')) {
              return 'vendor-axios'
            }
            // Other vendor libraries
            return 'vendor-misc'
          }
          // Split mother-theme components
          if (id.includes('mother-theme')) {
            return 'mother-theme'
          }
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
  // Test configuration moved to vitest.config.ts for earlier initialization
  }
})

