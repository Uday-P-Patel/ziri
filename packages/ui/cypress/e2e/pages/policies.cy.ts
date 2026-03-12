import { uniqueSuffix } from '../../support/auth'
import {
  ensureZiriLogin,
  createFourDashboardUsers,
  deleteFourDashboardUsers,
  dashEmails,
  runZiriPoliciesSeed,
  assertPoliciesReadOnly,
  assertUsersReadOnly,
  assertKeysReadOnly,
  assertRolesReadOnly,
  assertProvidersReadOnly,
  runCoreReadPagesForRole
} from './kickoff-helpers'

describe('Policies (Rules) page', () => {
  it('auto or manual login then Policies page flows', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const { viewer: dashViewerEmail, userAdmin: dashUserAdminEmail, policyAdmin: dashPolicyAdminEmail } = dashEmails(emailTag)

    ensureZiriLogin()
    runZiriPoliciesSeed(tag)
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
    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    cy.waitForLoginPageReady()
    cy.get('@policyAdminPass').then((policyAdminPass) => {
      cy.loginViaUi(dashPolicyAdminEmail, (policyAdminPass as unknown) as string, { skipEnsureLoggedOut: true })
    })
    runCoreReadPagesForRole('policy_admin')
    cy.openPageViaSidebar('/rules', 'Policies')
    cy.get('input[placeholder*="Search policies"]').should('be.visible')
    const policyAdminPolicyId = `kickoff-policy-admin-${emailTag}`
    cy.get('#rules-templates-trigger,#rules-templates-trigger-empty').first().click()
    cy.getModal('Policy Templates').within(() => {
      cy.get('[id^="rules-template-use-"]').first().click()
    })
    cy.typeModalInput('Create Policy', 'Policy ID (required)', policyAdminPolicyId)
    cy.typeModalInput('Create Policy', 'Description', `policy admin created ${tag}`)
    cy.clickModalButton('Create Policy', 'Create Policy')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', policyAdminPolicyId, { timeout: 20000 }).should('be.visible')
    cy.contains('td', policyAdminPolicyId).closest('tr').find('button[title="Edit policy"]').click({ force: true })
    cy.typeModalInput('Edit Policy', 'Description', `policy admin updated ${tag}`)
    cy.clickModalButton('Edit Policy', 'Update Policy')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', policyAdminPolicyId).closest('tr').contains(`policy admin updated ${tag}`).should('be.visible')
    cy.contains('td', policyAdminPolicyId).closest('tr').find('button[title="Delete policy"]').click({ force: true })
    cy.get('#rules-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', policyAdminPolicyId).should('not.exist')
    assertUsersReadOnly()
    assertKeysReadOnly()
    assertRolesReadOnly()
    assertProvidersReadOnly()
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
