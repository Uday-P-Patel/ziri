import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriProvidersSeed,
  assertProvidersReadOnly,
  assertPoliciesReadOnly,
  assertUsersReadOnly,
  assertKeysReadOnly,
  assertRolesReadOnly,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Providers page', () => {
  it('auto or manual login then Providers page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { viewer: dashViewerEmail, userAdmin: dashUserAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriProvidersSeed(tag)
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
    cy.openPageViaSidebar('/users', 'Users')
    cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
      .find('button[title="Delete User"]')
      .click({ force: true })
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.openPageViaSidebar('/providers', 'LLM Providers')
    cy.assertButtonHidden('#providers-add-trigger')
    cy.get('body').then(($body) => {
      if ($body.find('button[title="Test"]').length) cy.wrap($body.find('button[title="Test"]').first()).should('not.be.visible')
      if ($body.find('[id^="providers-delete-"]').length) cy.wrap($body.find('[id^="providers-delete-"]').first()).should('not.be.visible')
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
