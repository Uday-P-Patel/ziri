import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriConfigSeed,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Config page', () => {
  it('auto or manual login then Config page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { admin: dashAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriConfigSeed(tag)
    createFourDashboardUsers(tag, emailTag)

    cy.logoutViaUi()
    cy.waitForLoginPageReady()
    cy.get('@adminPass').then((adminPass) => {
      cy.loginViaUi(dashAdminEmail, (adminPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('admin')
    cy.openPageViaSidebar('/config', 'Configuration')
    cy.contains('label', 'Public URL', { timeout: 30000 }).should('be.visible')
    cy.get('#config-save').should('be.visible')
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    const ziriUser = String(Cypress.env('ziriUsername') || 'ziri')
    const ziriPass = String(Cypress.env('ziriPassword') || '')
    cy.waitForLoginPageReady()
    cy.loginViaUi(ziriUser, ziriPass, { skipEnsureLoggedOut: true })
    cy.openPageViaSidebar('/config', 'Configuration')
    cy.contains('label', 'Public URL', { timeout: 30000 }).should('be.visible')
    cy.get('#config-save').should('be.visible')
    deleteFourDashboardUsers(emailTag)
    cy.logoutViaUi()
  })
})
