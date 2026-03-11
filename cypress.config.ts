import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_GATEWAY_URL || process.env.CYPRESS_BASE_URL || 'https://localhost:3000',
    specPattern: 'packages/ui/cypress/e2e/**/*.cy.ts',
    supportFile: 'packages/ui/cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    chromeWebSecurity: false,
    env: {
      proxyUrl: process.env.CYPRESS_GATEWAY_URL || process.env.CYPRESS_BASE_URL || 'https://localhost:3000',
      ziriUsername: process.env.CYPRESS_ZIRI_USERNAME || 'ziri',
      ziriPassword: process.env.CYPRESS_ZIRI_ROOT_KEY || ''
    }
  }
})
