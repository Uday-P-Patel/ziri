import './commands'

beforeEach(() => {
  cy.viewport(1440, 900)
})

Cypress.on('uncaught:exception', (err) => {
  const msg = String(err?.message || '')
  if (msg.includes("Cannot read properties of undefined (reading 'matched')")) return false
  if (msg.includes("Cannot read properties of undefined (reading 'left')")) return false
  return true
})
