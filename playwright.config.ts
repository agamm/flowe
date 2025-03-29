import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for e2e tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Look for test files in the e2e-tests directory
  testDir: './e2e-tests',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Run local dev server and ensure it's ready before tests start
  webServer: {
    command: 'cd flowe-cli && npm run dev',
    url: 'http://localhost:27182',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60000, // Give server 60s to start
  },
  
  // Set timeout for tests
  timeout: 30000,
  
  // Use baseURL so we can use relative URLs in our tests
  use: {
    baseURL: 'http://localhost:27182',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Enable API testing capabilities
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },
}); 