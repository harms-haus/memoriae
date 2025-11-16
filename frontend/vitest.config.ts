import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Suppress WebSocket errors from Vite HMR during tests (runs before vite.config.ts)
const originalStderrWrite = process.stderr.write.bind(process.stderr)
const originalStdoutWrite = process.stdout.write.bind(process.stdout)

const shouldSuppress = (chunk: any): boolean => {
  if (typeof chunk === 'string') {
    return chunk.includes('WebSocket server error') || 
           chunk.includes('Port is already in use')
  }
  if (Buffer.isBuffer(chunk)) {
    const str = chunk.toString()
    return str.includes('WebSocket server error') || 
           str.includes('Port is already in use')
  }
  return false
}

process.stderr.write = (chunk: any, encoding?: any, cb?: any) => {
  if (shouldSuppress(chunk)) {
    return true
  }
  return originalStderrWrite(chunk, encoding, cb)
}

process.stdout.write = (chunk: any, encoding?: any, cb?: any) => {
  if (shouldSuppress(chunk)) {
    return true
  }
  return originalStdoutWrite(chunk, encoding, cb)
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mother': path.resolve(__dirname, '../mother-theme/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.integration.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '**/*.visual.test.{ts,tsx}'],
    logLevel: 'warn',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.integration.test.{ts,tsx}',
        '**/__tests__/**',
        'src/test/**',
        '**/index.ts',
        '**/*.config.{ts,js}',
      ],
    },
  },
})

