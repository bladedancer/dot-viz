import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8080',
        headless: true,
    },
    webServer: {
        command: 'npm run build && npm start',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
