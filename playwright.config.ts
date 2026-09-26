import { defineConfig, devices } from '@playwright/test'

// Testa o site estático (pasta out/), igual ao que vai para o Cloudflare Pages
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // O runner do GitHub não tem GPU e o Chrome não liga mais a WebGL por software sozinho:
    // sem esta flag o site cai no modo sem 3D e os testes do mapa falham
    launchOptions: process.env.CI ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'pnpm exec serve out -l 4173 --no-clipboard', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
})
