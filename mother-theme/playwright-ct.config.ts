import { defineConfig, devices } from '@playwright/experimental-ct-react';
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright Component Testing Configuration
 * 
 * This config enables visual regression testing and component testing.
 * Run tests with: npm run test:ct
 * Run visual tests only: npm run test:visual
 */
export default defineConfig({
  testDir: './src',
  testMatch: /.*\.ct\.(ts|tsx)$/,
  
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

  /* Use multiple workers for faster execution (CI uses 1 for stability)
   * Note: Toast.ct.tsx is temporarily skipped due to bundling issue
   */
  workers: process.env.CI ? 1 : 4,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Global setup file - loads theme CSS before all tests */
  globalSetup: undefined, // We'll handle CSS in ctViteConfig

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',

    /* Configure Vite for component bundling */
    ctViteConfig: {
      plugins: [react()],
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

