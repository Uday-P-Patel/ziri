import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriSchemaSeed,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Schema page', () => {
  it('auto or manual login then Schema page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { viewer: dashViewerEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriSchemaSeed()
    createFourDashboardUsers(tag, emailTag)

    cy.logoutViaUi()
    cy.waitForLoginPageReady()
    cy.get('@viewerPass').then((viewerPass) => {
      cy.loginViaUi(dashViewerEmail, (viewerPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('viewer')
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    const ziriUser = String(Cypress.env('ziriUsername') || 'ziri')
    const ziriPass = String(Cypress.env('ziriPassword') || '')
    cy.waitForLoginPageReady()
    cy.loginViaUi(ziriUser, ziriPass, { skipEnsureLoggedOut: true })
    deleteFourDashboardUsers(emailTag)
    cy.logoutViaUi()
  })
})
