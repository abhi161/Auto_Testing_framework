import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const activeProject = process.env.TEST_PROJECT || 'ftc';
const projectRoot = path.join(__dirname, 'projects', activeProject);

dotenv.config({ path: path.join(projectRoot, '.env') });

// Only wire up storageState once the shared Azure AD session has actually been captured
// (tests/helpers/auth.helper.ts writes this after first login). Projects/tests with no
// login flow (e.g. public demo sites) must not fail just because it doesn't exist yet.
const authStatePath = path.join(projectRoot, 'auth-state.json');
const storageState = fs.existsSync(authStatePath) ? authStatePath : undefined;

export default defineConfig({
  testDir: path.join(projectRoot, 'tests'),
  // Keep run artifacts (screenshots, traces) inside the active project so the bridge can serve
  // them per-project and nothing leaks across applications.
  outputDir: path.join(projectRoot, 'test-results'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(projectRoot, 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(projectRoot, 'test-results.json') }],
  ],
  use: {
    baseURL: process.env.TEST_URL,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    // Visual evidence for the UI: capture a screenshot for EVERY test (pass or fail), not just
    // failures, so the Evidence tab can show proof of what the agent verified. Traces are kept
    // on failure for deep debugging (downloadable from the UI).
    trace: 'retain-on-failure',
    screenshot: 'on',
    storageState,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--start-maximized'] } },
    },
  ],
});
