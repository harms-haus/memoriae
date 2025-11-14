import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.integration.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.integration.test.ts',
        '**/__tests__/**',
        'src/test-setup.ts',
        '**/index.ts',
        '**/*.config.{ts,js}',
      ],
    },
  },
})

