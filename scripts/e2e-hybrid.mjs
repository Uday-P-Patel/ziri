import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const uiRoot = join(root, 'packages', 'ui')

const KICKOFF_SPEC = 'packages/ui/cypress/e2e/full-kickoff.cy.ts'

// When not in --kickoff mode, run the core specs that still exist.
const SPECS = [
  'packages/ui/cypress/e2e/auth.cy.ts',
  'packages/ui/cypress/e2e/manage-users.cy.ts',
  'packages/ui/cypress/e2e/full-kickoff.cy.ts'
]

const env = {
  ...process.env,
  NODE_TLS_REJECT_UNAUTHORIZED: '0',
  CYPRESS_GATEWAY_URL: process.env.CYPRESS_GATEWAY_URL || 'https://localhost:3000'
}

function runCypress(specs, open = false) {
  return new Promise((resolve, reject) => {
    const args = open
      ? ['cypress', 'open', '--e2e']
      : ['cypress', 'run', '--spec', specs.join(',')]
    const cypress = spawn('npx', args, {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: true
    })
    cypress.on('close', code => (code === 0 ? resolve() : reject(new Error(`cypress exit ${code}`))))
  })
}

async function main() {
  const open = process.argv.includes('--open')
  const kickoff = process.argv.includes('--kickoff')
  const specs = kickoff ? [KICKOFF_SPEC] : SPECS
  await runCypress(specs, open)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
