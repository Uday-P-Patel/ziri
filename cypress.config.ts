import { defineConfig } from 'cypress'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve('cypress.env.json')
let fileEnv: Record<string, any> = {}
if (existsSync(envPath)) {
  try {
    fileEnv = JSON.parse(readFileSync(envPath, 'utf8')) as Record<string, any>
  } catch {
    fileEnv = {}
  }
}

const gatewayFromFile = String(fileEnv.CYPRESS_GATEWAY_URL || fileEnv.CYPRESS_BASE_URL || '').trim()
const gatewayFromEnv = String(process.env.CYPRESS_GATEWAY_URL || process.env.CYPRESS_BASE_URL || '').trim()
const gatewayUrl = gatewayFromFile || gatewayFromEnv || 'https://localhost:3000'

const ziriUserFromFile = String(fileEnv.CYPRESS_ZIRI_USERNAME || '').trim()
const ziriUserFromEnv = String(process.env.CYPRESS_ZIRI_USERNAME || '').trim()
const ziriUsername = ziriUserFromFile || ziriUserFromEnv || 'ziri'

const ziriPassFromFile = String(fileEnv.CYPRESS_ZIRI_ROOT_KEY || '').trim()
const ziriPassFromEnv = String(process.env.CYPRESS_ZIRI_ROOT_KEY || '').trim()
const ziriPassword = ziriPassFromFile || ziriPassFromEnv || ''

export default defineConfig({
  e2e: {
    baseUrl: gatewayUrl,
    specPattern: 'packages/ui/cypress/e2e/**/*.cy.ts',
    supportFile: 'packages/ui/cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    chromeWebSecurity: false,
    env: {
      proxyUrl: gatewayUrl,
      ziriUsername,
      ziriPassword
    }
  }
})
