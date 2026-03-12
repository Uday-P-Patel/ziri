import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runCoreReadPagesForRole,
  manageUsersSearch,
  manageUsersApi
} from './kickoff-helpers'

describe('Manage Users page', () => {
  it('auto or manual login then Manage Users page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { viewer: dashViewerEmail, admin: dashAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
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
    cy.openPageViaSidebar('/settings/manage-users', 'Manage Users')
    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.get('select:visible').last().find('option[value="admin"]').should('be.disabled')
    })
    cy.get('#manage-users-create-cancel').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.findTableRow(dashViewerEmail, { searchInput: manageUsersSearch, searchTerm: dashViewerEmail, apiPattern: manageUsersApi })
      .find('button[title="Edit User"]')
      .click({ force: true })
    cy.getModal('Edit Dashboard User').within(() => {
      cy.get('select:visible').last().find('option[value="admin"]').should('be.disabled')
    })
    cy.get('#manage-users-edit-cancel').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.findTableRow('ziri', { searchInput: manageUsersSearch, searchTerm: 'ziri', apiPattern: manageUsersApi }).within(() => {
      cy.get('button[title="Edit User"]').should('not.exist')
      cy.get('button[title="Delete User"]').should('not.exist')
      cy.get('button[title="Disable User"]').should('not.exist')
      cy.get('button[title="Enable User"]').should('not.exist')
      cy.get('button[title="Reset Password"]').should('not.exist')
    })

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
