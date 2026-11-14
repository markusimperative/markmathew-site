import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const previewUrl = 'http://127.0.0.1:8787';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  snapshotPathTemplate: './screenshots/{platform}/{arg}{ext}',
  updateSnapshots: 'none',
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 20 },
  },
  use: {
    baseURL: previewUrl,
    browserName: 'chromium',
    viewport: { width: 1912, height: 914 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    url: previewUrl,
    reuseExistingServer: false,
    stderr: 'ignore',
  },
});
