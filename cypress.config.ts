import { defineConfig } from 'cypress'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

function getDefaultRootKey() {
  const envKey = process.env.CYPRESS_ZIRI_PASSWORD
  if (envKey) return envKey

  const appData = process.env.APPDATA
  const cfgDir = process.platform === 'win32'
    ? (appData ? path.join(appData, 'ziri') : null)
    : path.join(os.homedir(), '.ziri')
  if (!cfgDir) return ''

  const file = path.join(cfgDir, '.ziri-root-key')
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
}

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 20000,
    chromeWebSecurity: false,
    env: {
      proxyUrl: process.env.CYPRESS_PROXY_URL || 'https://localhost:3100',
      ziriUsername: process.env.CYPRESS_ZIRI_USERNAME || 'ziri',
      ziriPassword: getDefaultRootKey()
    }
  }
})
