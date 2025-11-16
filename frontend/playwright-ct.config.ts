import { defineConfig, devices } from '@playwright/experimental-ct-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright Component Testing Configuration
 * 
 * This config enables visual regression testing and component testing.
 * Run tests with: npm run test:visual
 * Run visual tests only: npm run test:visual
 * Update snapshots: npm run test:visual:update
 */
export default defineConfig({
  testDir: './src',
  testMatch: /.*\.visual\.test\.(ts|tsx)$/,
  
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000,
    /**
     * Threshold for screenshot comparison (0-1)
     * 0.2 = 20% of pixels can differ before failing
     */
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Use multiple workers for faster execution (CI uses 1 for stability) */
  workers: process.env.CI ? 1 : 4,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Global setup file - loaded once before all tests */
  globalSetup: undefined, // We'll handle setup in ctViteConfig instead

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',
    
    /* Component template directory - can help with module resolution */
    ctTemplateDir: path.resolve(__dirname, './src'),

    /* Configure Vite for component bundling */
    ctViteConfig: {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@mother': path.resolve(__dirname, '../mother-theme/src'),
          // Use absolute path with preserveSymlinks to ensure single instance
          '@test-utils': path.resolve(__dirname, './src/test/visual-setup.tsx'),
        },
        dedupe: ['react', 'react-dom'],
        // Preserve symlinks to help with module resolution
        preserveSymlinks: false,
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
        // Exclude visual-setup from pre-bundling to prevent duplicate evaluation
        exclude: [
          path.resolve(__dirname, './src/test/visual-setup.tsx'),
          './src/test/visual-setup.tsx',
          'src/test/visual-setup.tsx',
        ],
        // Force re-optimization to ensure proper deduplication
        force: true,
      },
      // Use esbuild to handle the module differently
      esbuild: {
        // Don't minify test utilities to help with debugging
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: false,
      },
      build: {
        rollupOptions: {
          // Externalize visual-setup to prevent bundling issues
          external: (id) => {
            // Don't externalize - we want it bundled, just once
            return false;
          },
          output: {
            // Use a function to ensure visual-setup is in a single chunk
            manualChunks: (id) => {
              // Put visual-setup in its own chunk
              if (id.includes('visual-setup') || id.includes('test/visual-setup')) {
                return 'test-utils';
              }
              // Vendor chunks
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                return 'vendor';
              }
            },
            // Ensure proper chunk naming
            chunkFileNames: (chunkInfo) => {
              if (chunkInfo.name === 'test-utils') {
                return 'test-utils.js';
              }
              return 'chunks/[name]-[hash].js';
            },
          },
        },
      },
      css: {
        // Ensure theme CSS is loaded in tests
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});

