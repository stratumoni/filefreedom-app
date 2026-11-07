import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
  // Local runs use Chromium. CI sets ALL_BROWSERS=1 to add Firefox and WebKit (Safari engine).
  projects: process.env.ALL_BROWSERS
    ? [
        { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
        { name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
        { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
        { name: 'phone-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 }, hasTouch: false, isMobile: undefined } },
        { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
        { name: 'phone-webkit', use: { ...devices['iPhone 14'] } },
      ]
    : [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
        { name: 'phone', use: { ...devices['Pixel 7'] } },
      ],
});
