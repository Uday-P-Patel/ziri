import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriRolesSeed,
  assertRolesReadOnly,
  assertPoliciesReadOnly,
  assertUsersReadOnly,
  assertKeysReadOnly,
  assertProvidersReadOnly,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Roles page', () => {
  it('auto or manual login then Roles page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { viewer: dashViewerEmail, userAdmin: dashUserAdminEmail, admin: dashAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriRolesSeed(tag)
    createFourDashboardUsers(tag, emailTag)

    cy.logoutViaUi()
    cy.waitForLoginPageReady()
    cy.get('@viewerPass').then((viewerPass) => {
      cy.loginViaUi(dashViewerEmail, (viewerPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('viewer')
    assertPoliciesReadOnly()
    assertUsersReadOnly()
    assertKeysReadOnly()
    assertRolesReadOnly()
    assertProvidersReadOnly()
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    cy.waitForLoginPageReady()
    cy.get('@userAdminPass').then((userAdminPass) => {
      cy.loginViaUi(dashUserAdminEmail, (userAdminPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('user_admin')
    assertPoliciesReadOnly()
    cy.openPageViaSidebar('/users', 'Users')
    const userAdminAccessEmail = `kickoff_uadmin_access_${emailTag}@example.com`
    const usersSearch = 'input[placeholder*="Search by name, email, or user ID"]'
    cy.get(usersSearch).should('be.visible')
    cy.get('#users-create-trigger,#users-create-trigger-empty,#users-create-trigger-table-empty').first().click()
    cy.typeModalInput('Create User', 'Email', userAdminAccessEmail)
    cy.typeModalInput('Create User', 'Name', `Kickoff UserAdmin Access ${tag}`)
    cy.getModal('Create User').within(() => {
      cy.contains('label', 'Create API Key').parent().find('button[role="switch"]').first().then(($t) => {
        if (String($t.attr('aria-checked')) === 'true') cy.wrap($t).click({ force: true })
      })
    })
    cy.clickModalButton('Create User', 'Create User')
    cy.contains('Generated Password', { timeout: 8000 })
    cy.get('#users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.openPageViaSidebar('/keys', 'API Keys')
    cy.openPageViaSidebar('/settings/roles', 'Roles')
    cy.get('input[placeholder*="Search by role ID"]').should('be.visible')
    const userAdminRoleId = `kickoff_role_uadmin_${emailTag}`
    cy.get('button')
      .filter((_, el) => el.textContent?.trim().startsWith('Create Role'))
      .first()
      .click()
    cy.typeModalInput('Create role', 'Role ID', userAdminRoleId)
    cy.clickModalButton('Create role', 'Create')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', userAdminRoleId, { timeout: 20000 }).should('be.visible')
    cy.contains('td', userAdminRoleId).closest('tr').find('button[title="Delete Role"]').click({ force: true })
    cy.get('#roles-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', userAdminRoleId).should('not.exist')
    cy.openPageViaSidebar('/users', 'Users')
    cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
      .find('button[title="Delete User"]')
      .click({ force: true })
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.openPageViaSidebar('/providers', 'LLM Providers')
    cy.assertButtonHidden('#providers-add-trigger')
    cy.openPageViaSidebar('/me', 'My Profile')
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
    cy.openPageViaSidebar('/settings/roles', 'Roles')
    cy.get('input[placeholder*="Search by role ID"]').should('be.visible')
    const adminRoleId = `kickoff_role_admin_${emailTag}`
    cy.get('button')
      .filter((_, el) => el.textContent?.trim().startsWith('Create Role'))
      .first()
      .click()
    cy.typeModalInput('Create role', 'Role ID', adminRoleId)
    cy.clickModalButton('Create role', 'Create')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', adminRoleId, { timeout: 20000 }).should('be.visible')
    cy.contains('td', adminRoleId).closest('tr').find('button[title="Delete Role"]').click({ force: true })
    cy.get('#roles-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', adminRoleId).should('not.exist')
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
