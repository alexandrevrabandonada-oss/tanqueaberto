import { defineConfig, devices } from "@playwright/test";

const testUrl = process.env.PLAYWRIGHT_TEST_URL || "http://localhost:3000";
const useWebServer = !process.env.PLAYWRIGHT_NO_WEB_SERVER;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: testUrl,
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  ...(useWebServer
    ? {
        webServer: {
          command: "npm run start",
          url: testUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }
    : {}),
});
