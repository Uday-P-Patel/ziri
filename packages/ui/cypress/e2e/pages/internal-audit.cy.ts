import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Internal Audit page', () => {
  it('auto or manual login then Internal Audit page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { admin: dashAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    createFourDashboardUsers(tag, emailTag)

    cy.logoutViaUi()
    cy.waitForLoginPageReady()
    cy.get('@adminPass').then((adminPass) => {
      cy.loginViaUi(dashAdminEmail, (adminPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('admin')
    cy.openPageViaSidebar('/settings/internal-audit', 'Internal Audit Logs')
    cy.get('input[placeholder*="Search by user, action, or resource"]').should('be.visible')
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    const ziriUser = String(Cypress.env('ziriUsername') || 'ziri')
    const ziriPass = String(Cypress.env('ziriPassword') || '')
    cy.waitForLoginPageReady()
    cy.loginViaUi(ziriUser, ziriPass, { skipEnsureLoggedOut: true })
    cy.openPageViaSidebar('/settings/internal-audit', 'Internal Audit Logs')
    cy.get('input[placeholder*="Search by user, action, or resource"]').should('be.visible')
    deleteFourDashboardUsers(emailTag)
    cy.logoutViaUi()
  })
})
