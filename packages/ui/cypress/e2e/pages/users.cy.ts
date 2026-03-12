import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriUsersSeed,
  assertUsersReadOnly,
  assertPoliciesReadOnly,
  assertKeysReadOnly,
  assertRolesReadOnly,
  assertProvidersReadOnly,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Users page', () => {
  it('auto or manual login then Users page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const withKeyEmail = `kickoff_key_${emailTag}@example.com`
    const withoutKeyEmail = `kickoff_nokey_${emailTag}@example.com`
    const usersSearch = 'input[placeholder*="Search by name, email, or user ID"]'
    const { viewer: dashViewerEmail, userAdmin: dashUserAdminEmail, policyAdmin: dashPolicyAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriUsersSeed(tag, emailTag)
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
    cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
      .find('code')
      .first()
      .invoke('text')
      .should('not.be.empty')
      .then((raw) => {
        cy.wrap(String(raw || '').trim()).as('userAdminAccessUserId')
      })

    cy.openPageViaSidebar('/keys', 'API Keys')
    cy.get('input[placeholder*="Search by user ID, name, or email"]').should('be.visible')
    cy.get('@userAdminAccessUserId').then((uid) => {
      const userId = String(uid)
      cy.get('#keys-create-trigger,#keys-create-trigger-empty').first().click()
      cy.getModal('Create API Key').within(() => {
        cy.get('select:visible').last().select(userId)
      })
      cy.clickModalButton('Create API Key', 'Create Key')
      cy.getModal('API Key').within(() => cy.get('button[title="Copy to clipboard"]').click())
      cy.get('#keys-generated-done').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
      cy.contains('td,code', userId, { timeout: 20000 })
        .closest('tr')
        .within(() => cy.get('button[title="Edit Key"]').click())
      cy.getModal('Edit API Key').within(() => cy.get('button[role="switch"]').first().click({ force: true }))
      cy.clickModalButton('Edit API Key', 'Update Key')
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
      cy.contains('td,code', userId, { timeout: 20000 })
        .closest('tr')
        .within(() => cy.get('button[title="Edit Key"]').click())
      cy.clickModalButton('Edit API Key', 'Rotate Key')
      cy.getModal('API Key').within(() => cy.get('button[title="Copy to clipboard"]').click())
      cy.get('#keys-generated-done').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
      cy.contains('td,code', userId, { timeout: 20000 })
        .closest('tr')
        .within(() => cy.get('button[title="Delete key"]').click({ force: true }))
      cy.get('#keys-delete-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
      cy.contains('td,code', userId).should('not.exist')
    })

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
    cy.get('@userAdminAccessUserId').then(() => {
      cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
        .find('button[title="Reset Password"]')
        .click({ force: true })
      cy.get('#users-reset-confirm').click()
      cy.contains('Generated Password', { timeout: 8000 })
      cy.get('#users-password-close').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
      cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
        .find('button[title="Delete User"]')
        .click({ force: true })
      cy.get('#users-delete-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
      cy.contains('td', userAdminAccessEmail).should('not.exist')
    })
    cy.openPageViaSidebar('/providers', 'LLM Providers')
    cy.assertButtonHidden('#providers-add-trigger')
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    cy.waitForLoginPageReady()
    cy.get('@policyAdminPass').then((policyAdminPass) => {
      cy.loginViaUi(dashPolicyAdminEmail, (policyAdminPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('policy_admin')
    cy.openPageViaSidebar('/rules', 'Policies')
    cy.get('input[placeholder*="Search policies"]').should('be.visible')
    assertUsersReadOnly()
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    const ziriUser = String(Cypress.env('ziriUsername') || 'ziri')
    const ziriPass = String(Cypress.env('ziriPassword') || '')
    cy.waitForLoginPageReady()
    cy.loginViaUi(ziriUser, ziriPass, { skipEnsureLoggedOut: true })
    cy.openPageViaSidebar('/users', 'Users')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: usersSearch,
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/users*'
    })
      .within(() => cy.get('button[title="Delete User"]').click({ force: true }))
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(withKeyEmail, {
      searchInput: usersSearch,
      searchTerm: withKeyEmail,
      apiPattern: '**/api/users*'
    })
      .within(() => cy.get('button[title="Delete User"]').click({ force: true }))
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    deleteFourDashboardUsers(emailTag)
    cy.logoutViaUi()
  })
})
