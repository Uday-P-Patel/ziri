import { uniqueSuffix } from '../support/auth'

type DashboardRole = 'ziri' | 'admin' | 'viewer' | 'user_admin' | 'policy_admin'

function runCoreReadPagesForRole(role: DashboardRole) {
  cy.openPageViaSidebar('/', 'Dashboard')
  cy.openPageViaSidebar('/analytics', 'Analytics')
  cy.get('select:visible').first().select('7d')
  cy.contains('span', 'Last 7 days').should('be.visible')
  cy.openPageViaSidebar('/logs', 'Logs')
  cy.get('input[placeholder*="Search by user, model, or request ID"]').should('be.visible')
  cy.openPageViaSidebar('/schema', 'Schema')
  cy.get('#schema-tab-json').should('be.visible').click()
  cy.get('#schema-refresh').should('be.visible')
  cy.get('#schema-tab-cedar').should('be.visible').click()
  cy.get('#schema-refresh').should('be.visible')
}

function assertPoliciesReadOnly() {
  cy.openPageViaSidebar('/rules', 'Policies')
  cy.assertButtonHidden('#rules-create-trigger')
  cy.get('body').then(($body) => {
    const ai = $body.find('button').filter((_, el) => el.textContent?.includes('Create with AI'))
    if (ai.length) cy.wrap(ai.first()).should('not.be.visible')
    if ($body.find('button[title="Edit policy"]').length) cy.wrap($body.find('button[title="Edit policy"]').first()).should('not.be.visible')
    if ($body.find('button[title="Delete policy"]').length) cy.wrap($body.find('button[title="Delete policy"]').first()).should('not.be.visible')
  })
}

function assertUsersReadOnly() {
  cy.openPageViaSidebar('/users', 'Users')
  cy.get('input[placeholder*="Search by name, email, or user ID"]').should('be.visible')
  cy.assertButtonHidden('#users-create-trigger')
  cy.get('body').then(($body) => {
    if ($body.find('button[title="Reset Password"]').length) cy.wrap($body.find('button[title="Reset Password"]').first()).should('not.be.visible')
    if ($body.find('button[title="Delete User"]').length) cy.wrap($body.find('button[title="Delete User"]').first()).should('not.be.visible')
  })
}

function assertKeysReadOnly() {
  cy.openPageViaSidebar('/keys', 'API Keys')
  cy.assertButtonHidden('#keys-create-trigger')
  cy.get('body').then(($body) => {
    if ($body.find('button[title="Edit Key"]').length) cy.wrap($body.find('button[title="Edit Key"]').first()).should('not.be.visible')
    if ($body.find('button[title="Delete key"]').length) cy.wrap($body.find('button[title="Delete key"]').first()).should('not.be.visible')
  })
}

function assertRolesReadOnly() {
  cy.openPageViaSidebar('/settings/roles', 'Roles')
  cy.get('input[placeholder*="Search by role ID"]').should('be.visible')
  cy.get('body').then(($body) => {
    const createRole = $body.find('button').filter((_, el) => el.textContent?.trim().startsWith('Create Role'))
    if (createRole.length) cy.wrap(createRole.first()).should('not.be.visible')
    if ($body.find('button[title="Delete Role"]').length) cy.wrap($body.find('button[title="Delete Role"]').first()).should('not.be.visible')
  })
}

function assertProvidersReadOnly() {
  cy.openPageViaSidebar('/providers', 'LLM Providers')
  cy.assertButtonHidden('#providers-add-trigger')
  cy.get('body').then(($body) => {
    if ($body.find('button[title="Test"]').length) cy.wrap($body.find('button[title="Test"]').first()).should('not.be.visible')
    if ($body.find('[id^="providers-delete-"]').length) cy.wrap($body.find('[id^="providers-delete-"]').first()).should('not.be.visible')
  })
}

function runZiriUsersSeed(tag: string, emailTag: string) {
  cy.openPageViaSidebar('/users', 'Users')
  const withKeyEmail = `kickoff_key_${emailTag}@example.com`
  const withoutKeyEmail = `kickoff_nokey_${emailTag}@example.com`
  cy.get('#users-create-trigger,#users-create-trigger-empty,#users-create-trigger-table-empty').first().click()
  cy.typeModalInput('Create User', 'Email', withKeyEmail)
  cy.typeModalInput('Create User', 'Name', `Kickoff Key ${tag}`)
  cy.getModal('Create User').within(() => {
    cy.contains('label', 'Create API Key').parent().find('button[role="switch"]').first().then(($t) => {
      if (String($t.attr('aria-checked')) !== 'true') cy.wrap($t).click({ force: true })
    })
  })
  cy.clickModalButton('Create User', 'Create User')
  cy.contains('API Key Created', { timeout: 8000 }).then(() => {
    cy.getModal('API Key Created').within(() => cy.contains('button', 'Copy').first().click())
    cy.get('#users-api-key-done').click()
  })
  cy.contains('Generated Password', { timeout: 8000 }).then(() => {
    cy.getModal('Generated Password').within(() => cy.contains('button', 'Copy').first().click())
    cy.get('#users-password-close').click()
  })
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.get('#users-create-trigger,#users-create-trigger-empty,#users-create-trigger-table-empty').first().click()
  cy.typeModalInput('Create User', 'Email', withoutKeyEmail)
  cy.typeModalInput('Create User', 'Name', `Kickoff NoKey ${tag}`)
  cy.getModal('Create User').within(() => {
    cy.contains('label', 'Create API Key').parent().find('button[role="switch"]').first().then(($t) => {
      if (String($t.attr('aria-checked')) === 'true') cy.wrap($t).click({ force: true })
    })
  })
  cy.clickModalButton('Create User', 'Create User')
  cy.contains('Generated Password', { timeout: 8000 }).then(() => {
    cy.getModal('Generated Password').within(() => cy.contains('button', 'Copy').first().click())
    cy.get('#users-password-close').click()
  })
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.findTableRow(withoutKeyEmail, {
    searchInput: 'input[placeholder*="Search by name, email, or user ID"]',
    searchTerm: withoutKeyEmail,
    apiPattern: '**/api/users*'
  }).find('code').first().invoke('text').then((raw) => {
    const userId = String(raw || '').trim()
    expect(userId, 'seed userId').to.not.equal('')
    return userId
  }).as('seedUserId')

  cy.findTableRow(withKeyEmail, {
    searchInput: 'input[placeholder*="Search by name, email, or user ID"]',
    searchTerm: withKeyEmail,
    apiPattern: '**/api/users*'
  }).within(() => cy.get('button[title="Reset Password"]').click())
  cy.clickModalButton('Reset Password', 'Reset Password')
  cy.contains('Generated Password', { timeout: 8000 }).then(() => {
    cy.getModal('Generated Password').within(() => cy.contains('button', 'Copy').first().click())
    cy.get('#users-password-close').click()
  })
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

  cy.intercept('GET', '**/api/users*').as('usersQuery')
  cy.get('input[placeholder*="Search by name, email, or user ID"]').clear().type(withoutKeyEmail)
  cy.wait('@usersQuery').then((itc) => {
    expect(itc.request.url).to.include(encodeURIComponent(withoutKeyEmail))
    expect(itc.response?.statusCode).to.eq(200)
    expect(itc.response?.body).to.have.property('total')
  })
  cy.findTableRow(withoutKeyEmail, {
    searchInput: 'input[placeholder*="Search by name, email, or user ID"]',
    searchTerm: withoutKeyEmail,
    apiPattern: '**/api/users*'
  }).should('be.visible')
  cy.contains('th', 'Name').click()
  cy.wait('@usersQuery')
  cy.contains('th', 'Name').click()
  cy.wait('@usersQuery')
}

function runZiriKeysSeed(tag: string) {
  const emailTag = String(tag).replace(/-/g, '')
  const withoutKeyEmail = `kickoff_nokey_${emailTag}@example.com`
  const withKeyEmail = `kickoff_key_${emailTag}@example.com`
  cy.get('@seedUserId').then((seedUserId) => {
    const uid = String(seedUserId)
    cy.openPageViaSidebar('/keys', 'API Keys')
    cy.get('#keys-create-trigger,#keys-create-trigger-empty').first().click()
    cy.getModal('Create API Key').within(() => {
      cy.get('select:visible').last().select(uid)
    })
    cy.clickModalButton('Create API Key', 'Create Key')
    cy.getModal('API Key').within(() => {
      cy.get('button[title="Copy to clipboard"]').click()
    })
    cy.get('#keys-generated-done').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: 'input[placeholder*="Search by user ID, name, or email"]',
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/entities*'
    }).within(() => cy.get('button[title="Edit Key"]').click())
    cy.getModal('Edit API Key').within(() => cy.get('button[role="switch"]').first().click({ force: true }))
    cy.clickModalButton('Edit API Key', 'Update Key')
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: 'input[placeholder*="Search by user ID, name, or email"]',
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/entities*'
    }).contains('Disabled').should('be.visible')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: 'input[placeholder*="Search by user ID, name, or email"]',
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/entities*'
    }).within(() => cy.get('button[title="Edit Key"]').click())
    cy.clickModalButton('Edit API Key', 'Rotate Key')
    cy.getModal('API Key').within(() => cy.get('button[title="Copy to clipboard"]').click())
    cy.get('#keys-generated-done').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: 'input[placeholder*="Search by user ID, name, or email"]',
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/entities*'
    }).within(() => cy.get('button[title="Delete key"]').click({ force: true }))
    cy.get('#keys-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.openPageViaSidebar('/users', 'Users')
    cy.findTableRow(withoutKeyEmail, {
      searchInput: 'input[placeholder*="Search by name, email, or user ID"]',
      searchTerm: withoutKeyEmail,
      apiPattern: '**/api/users*'
    }).within(() => cy.get('button[title="Delete User"]').click({ force: true }))
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(withKeyEmail, {
      searchInput: 'input[placeholder*="Search by name, email, or user ID"]',
      searchTerm: withKeyEmail,
      apiPattern: '**/api/users*'
    }).within(() => cy.get('button[title="Delete User"]').click({ force: true }))
    cy.get('#users-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  })
}

function runZiriPoliciesSeed(tag: string) {
  cy.openPageViaSidebar('/rules', 'Policies')
  const policyId = `kickoff-policy-${tag}`
  cy.get('#rules-templates-trigger,#rules-templates-trigger-empty').first().click()
  cy.getModal('Policy Templates').within(() => cy.get('[id^="rules-template-use-"]').first().click())
  cy.typeModalInput('Create Policy', 'Policy ID (required)', policyId)
  const policyDesc = `kickoff ${tag}`
  cy.typeModalInput('Create Policy', 'Description', policyDesc)
  cy.clickModalButton('Create Policy', 'Create Policy')
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.findTableRow(policyId).should('be.visible')
  cy.findTableRow(policyId).within(() => cy.get('button[title="Edit policy"]').click())
  const policyDescUpdated = `kickoff updated ${tag}`
  cy.typeModalInput('Edit Policy', 'Description', policyDescUpdated)
  cy.getModal('Edit Policy').within(() => cy.get('input[type="checkbox"]').click({ force: true }))
  cy.clickModalButton('Edit Policy', 'Update Policy')
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.findTableRow(policyId).contains('Disabled').should('be.visible')
  cy.findTableRow(policyId).contains(policyDescUpdated).should('be.visible')
  cy.findTableRow(policyId).within(() => cy.get('button[title="Delete policy"]').click())
  cy.get('#rules-delete-confirm').click()
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
}

function runZiriProvidersSeed(tag: string) {
  cy.openPageViaSidebar('/providers', 'LLM Providers')
  const providerName = 'openrouter'
  const providerDisplay = 'OpenRouter'
  cy.get('body').then(($b) => {
    if ($b.text().includes(providerDisplay)) {
      cy.findTableRow(providerDisplay).within(() => cy.get(`#providers-delete-${providerName}`).click())
      cy.get('#providers-remove-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    }
  })
  cy.get('#providers-add-trigger,#providers-add-trigger-empty,#providers-add-trigger-table-empty').first().click()
  cy.getModal('Add Provider').within(() => {
    cy.get('select:visible').first().select(providerName)
    cy.get('input[type="password"]:visible').first().clear().type(`sk-kickoff-${tag}`, { log: false })
  })
  cy.get('#providers-add-submit').click()
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.findTableRow(providerDisplay).should('be.visible')
  cy.findTableRow(providerDisplay).within(() => cy.get(`#providers-test-${providerName}`).click())
  cy.findTableRow(providerDisplay).within(() => cy.get(`#providers-delete-${providerName}`).click())
  cy.get('#providers-remove-confirm').click()
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
}

function runZiriRolesSeed(tag: string) {
  cy.openPageViaSidebar('/settings/roles', 'Roles')
  const roleId = `kickoff_role_${tag}`
  cy.get('#roles-create-trigger,#roles-create-trigger-empty').first().click()
  cy.getModal('Create role').within(() => cy.get('input[placeholder*="editor"]').clear().type(roleId))
  cy.get('#roles-create-submit').click()
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
  cy.findTableRow(roleId, {
    searchInput: 'input[placeholder*="Search by role ID"]',
    searchTerm: roleId,
    apiPattern: '**/api/roles*'
  }).then(($tr) => {
    cy.wrap($tr).should('be.visible')
    cy.wrap($tr).within(() => cy.get('button[title="Delete Role"]').should('be.enabled').click({ force: true }))
  })
  cy.get('#roles-delete-confirm').should('be.enabled').click()
  cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
}

function runZiriConfigSeed(tag: string) {
  cy.openPageViaSidebar('/config', 'Configuration')
  const nextUrl = `https://example.com/kickoff-${tag}`
  const publicUrlInput = () => cy.contains('label', 'Public URL', { timeout: 30000 }).parent().find('input[type="url"]').first()
  publicUrlInput().clear().type(nextUrl)
  cy.get('#config-save').click()
  cy.get('#config-save').should('not.have.attr', 'disabled')
  cy.reload()
  cy.openPageViaSidebar('/config', 'Configuration')
  publicUrlInput().should('have.value', nextUrl)
  cy.get('#config-reset').click()
  publicUrlInput().should('have.value', '')
  cy.get('#emailEnabled').should('not.be.checked')
}

function runZiriSchemaSeed() {
  cy.openPageViaSidebar('/schema', 'Schema')
  cy.get('#schema-refresh').should('be.visible').click()
  cy.get('#schema-tab-json').click()
  cy.get('#schema-tab-json').should('exist')
  cy.contains('span', 'READ').should('be.visible')
  cy.get('#schema-refresh').click()
  cy.get('#schema-tab-cedar').click()
  cy.get('#schema-tab-cedar').should('exist')
  cy.contains('span', 'READ').should('be.visible')
  cy.contains('button', 'Simplified').click()
  cy.get('#schema-refresh').should('be.visible').click()
  cy.get('#schema-tab-json').click()
  cy.get('#schema-tab-cedar').click()
  cy.get('#schema-tab-json').click()
  cy.get('#schema-refresh').click()
}

describe('Full kickoff', () => {
  it('manual login then all page flows run automatically', () => {
    const tag = uniqueSuffix()
    const emailTag = String(tag).replace(/-/g, '')
    const ziriUser = String(Cypress.env('ziriUsername') || 'ziri')
    const ziriPass = String(Cypress.env('ziriPassword') || '')

    if (ziriPass && ziriPass.trim().length > 0) {
      cy.loginViaUi(ziriUser, ziriPass)
    } else {
      cy.waitForManualLogin()
    }

    runZiriUsersSeed(tag, emailTag)
    runZiriKeysSeed(tag)
    runZiriPoliciesSeed(tag)
    runZiriProvidersSeed(tag)
    runZiriRolesSeed(tag)
    runZiriConfigSeed(tag)
    runZiriSchemaSeed()

    cy.openPageViaSidebar('/settings/manage-users', 'Manage Users')
    const manageUsersSearch = 'input[placeholder*="Search by name, email, or user ID"]'
    const manageUsersApi = '**/api/dashboard-users*'
    const dashViewerEmail = `kickoff_viewer_${emailTag}@example.com`
    const dashUserAdminEmail = `kickoff_useradmin_${emailTag}@example.com`
    const dashPolicyAdminEmail = `kickoff_policyadmin_${emailTag}@example.com`
    const dashAdminEmail = `kickoff_admin_${emailTag}@example.com`

    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.contains('label', 'Email').parent().find('input').clear().type(dashViewerEmail)
      cy.contains('label', 'Name').parent().find('input').clear().type(`Kickoff Viewer ${tag}`)
      cy.get('select:visible').last().select('viewer')
    })
    cy.get('#manage-users-create-submit').click()
    cy.contains('Generated Password', { timeout: 8000 })
    cy.getModal('Generated Password').find('input[readonly]:visible').first().invoke('val').should('not.be.empty').then((v) => {
      cy.wrap(String(v || '').trim()).as('viewerPass')
    })
    cy.get('#manage-users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.contains('label', 'Email').parent().find('input').clear().type(dashUserAdminEmail)
      cy.contains('label', 'Name').parent().find('input').clear().type(`Kickoff UserAdmin ${tag}`)
      cy.get('select:visible').last().select('user_admin')
    })
    cy.get('#manage-users-create-submit').click()
    cy.contains('Generated Password', { timeout: 8000 })
    cy.getModal('Generated Password').find('input[readonly]:visible').first().invoke('val').should('not.be.empty').then((v) => {
      cy.wrap(String(v || '').trim()).as('userAdminPass')
    })
    cy.get('#manage-users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.contains('label', 'Email').parent().find('input').clear().type(dashPolicyAdminEmail)
      cy.contains('label', 'Name').parent().find('input').clear().type(`Kickoff PolicyAdmin ${tag}`)
      cy.get('select:visible').last().select('policy_admin')
    })
    cy.get('#manage-users-create-submit').click()
    cy.contains('Generated Password', { timeout: 8000 })
    cy.getModal('Generated Password').find('input[readonly]:visible').first().invoke('val').should('not.be.empty').then((v) => {
      cy.wrap(String(v || '').trim()).as('policyAdminPass')
    })
    cy.get('#manage-users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.contains('label', 'Email').parent().find('input').clear().type(dashAdminEmail)
      cy.contains('label', 'Name').parent().find('input').clear().type(`Kickoff Admin ${tag}`)
      cy.get('select:visible').last().select('admin')
    })
    cy.get('#manage-users-create-submit').click()
    cy.contains('Generated Password', { timeout: 8000 })
    cy.getModal('Generated Password').find('input[readonly]:visible').first().invoke('val').should('not.be.empty').then((v) => {
      cy.wrap(String(v || '').trim()).as('adminPass')
    })
    cy.get('#manage-users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.findTableRow(dashViewerEmail, { searchInput: manageUsersSearch, searchTerm: dashViewerEmail, apiPattern: manageUsersApi }).within(() => cy.get('button[title="Edit User"]').click())
    cy.getModal('Edit Dashboard User').within(() => {
      cy.contains('label', 'Name').parent().find('input').clear().type(`viewer updated ${tag}`)
    })
    cy.clickModalButton('Edit Dashboard User', 'Update User')
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
    cy.findTableRow(dashViewerEmail, { searchInput: manageUsersSearch, searchTerm: dashViewerEmail, apiPattern: manageUsersApi }).contains(`viewer updated ${tag}`).should('be.visible')

    cy.findTableRow(dashUserAdminEmail, { searchInput: manageUsersSearch, searchTerm: dashUserAdminEmail }).within(() => cy.get('button[title="Reset Password"]').click())
    cy.get('#manage-users-reset-confirm').click()
    cy.contains('Generated Password', { timeout: 8000 })
    cy.getModal('Generated Password').find('input[readonly]:visible').first().invoke('val').should('not.be.empty').then((v) => {
      cy.wrap(String(v || '').trim()).as('userAdminPass')
    })
    cy.get('#manage-users-password-close').click()
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

    cy.findTableRow(dashPolicyAdminEmail, {
      searchInput: manageUsersSearch,
      searchTerm: dashPolicyAdminEmail,
      apiPattern: manageUsersApi
    }).within(() => cy.get('button[title="Disable User"]').click({ force: true }))

    cy.findTableRow(dashPolicyAdminEmail, {
      searchInput: manageUsersSearch,
      searchTerm: dashPolicyAdminEmail
    }).contains('Disabled').should('be.visible')

    cy.findTableRow(dashPolicyAdminEmail, {
      searchInput: manageUsersSearch,
      searchTerm: dashPolicyAdminEmail
    }).within(() => cy.get('button[title="Enable User"]').click({ force: true }))

    cy.findTableRow(dashPolicyAdminEmail, {
      searchInput: manageUsersSearch,
      searchTerm: dashPolicyAdminEmail
    }).contains('Active').should('be.visible')

    cy.findTableRow('ziri', { searchInput: manageUsersSearch, searchTerm: 'ziri', apiPattern: manageUsersApi }).within(() => {
      cy.get('button[title="Edit User"]').should('not.exist')
      cy.get('button[title="Delete User"]').should('not.exist')
      cy.get('button[title="Disable User"]').should('not.exist')
      cy.get('button[title="Enable User"]').should('not.exist')
    })

    cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
    cy.getModal('Create Dashboard User').within(() => {
      cy.get('select:visible').last().find('option[value="admin"]').should('not.be.disabled')
    })
    cy.clickModalButton('Create Dashboard User', 'Cancel')
    cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

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
    cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
      .find('code').first().invoke('text').should('not.be.empty').then((raw) => {
        cy.wrap(String(raw || '').trim()).as('userAdminAccessUserId')
      })

    cy.openPageViaSidebar('/keys', 'API Keys')
    cy.get('input[placeholder*=\"Search by user ID, name, or email\"]').should('be.visible')
    cy.get('@userAdminAccessUserId').then((uid) => {
      const userId = String(uid as any)
      cy.get('#keys-create-trigger,#keys-create-trigger-empty').first().click()
      cy.getModal('Create API Key').within(() => {
        cy.get('select:visible').last().select(userId)
      })
      cy.clickModalButton('Create API Key', 'Create Key')
      cy.getModal('API Key').within(() => {
        cy.get('button[title="Copy to clipboard"]').click()
      })
      cy.get('#keys-generated-done').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')

      cy.contains('td,code', userId, { timeout: 20000 }).closest('tr').within(() => {
        cy.get('button[title="Edit Key"]').click()
      })
      cy.getModal('Edit API Key').within(() => {
        cy.get('button[role="switch"]').first().click({ force: true })
      })
      cy.clickModalButton('Edit API Key', 'Update Key')
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')

      cy.contains('td,code', userId, { timeout: 20000 }).closest('tr').within(() => {
        cy.get('button[title="Edit Key"]').click()
      })
      cy.clickModalButton('Edit API Key', 'Rotate Key')
      cy.getModal('API Key').within(() => {
        cy.get('button[title="Copy to clipboard"]').click()
      })
      cy.get('#keys-generated-done').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')

      cy.contains('td,code', userId, { timeout: 20000 }).closest('tr').within(() => {
        cy.get('button[title="Delete key"]').click({ force: true })
      })
      cy.get('#keys-delete-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
      cy.contains('td,code', userId).should('not.exist')
    })

    cy.openPageViaSidebar('/settings/roles', 'Roles')
    cy.get('input[placeholder*="Search by role ID"]').should('be.visible')
    const userAdminRoleId = `kickoff_role_uadmin_${emailTag}`
    cy.get('button').filter((_, el) => el.textContent?.trim().startsWith('Create Role')).first().click()
    cy.typeModalInput('Create role', 'Role ID', userAdminRoleId)
    cy.clickModalButton('Create role', 'Create')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', userAdminRoleId, { timeout: 20000 }).should('be.visible')

    cy.contains('td', userAdminRoleId).closest('tr').find('button[title="Delete Role"]').click({ force: true })
    cy.get('#roles-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', userAdminRoleId).should('not.exist')

    cy.openPageViaSidebar('/users', 'Users')
    cy.get('@userAdminAccessUserId').then((uid) => {
      const userId = String(uid as any)
      cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
        .find('button[title="Reset Password"]').click({ force: true })
      cy.get('#users-reset-confirm').click()
      cy.contains('Generated Password', { timeout: 8000 })
      cy.get('#users-password-close').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')

      cy.findTableRow(userAdminAccessEmail, { searchInput: usersSearch, searchTerm: userAdminAccessEmail, apiPattern: '**/api/users*' })
        .find('button[title="Delete User"]').click({ force: true })
      cy.get('#users-delete-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
      cy.contains('td', userAdminAccessEmail).should('not.exist')
    })
    cy.openPageViaSidebar('/providers', 'LLM Providers')
    cy.assertButtonHidden('#providers-add-trigger')
    cy.get('body').then(($body) => {
      if ($body.find('button[title="Test"]').length) cy.wrap($body.find('button[title="Test"]').first()).should('not.be.visible')
      if ($body.find('[id^="providers-delete-"]').length) cy.wrap($body.find('[id^="providers-delete-"]').first()).should('not.be.visible')
    })
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
      .find('button[title="Edit User"]').click({ force: true })
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

    cy.openPageViaSidebar('/settings/roles', 'Roles')
    cy.get('input[placeholder*="Search by role ID"]').should('be.visible')
    const adminRoleId = `kickoff_role_admin_${emailTag}`
    cy.get('button').filter((_, el) => el.textContent?.trim().startsWith('Create Role')).first().click()
    cy.typeModalInput('Create role', 'Role ID', adminRoleId)
    cy.clickModalButton('Create role', 'Create')
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', adminRoleId, { timeout: 20000 }).should('be.visible')

    cy.contains('td', adminRoleId).closest('tr').find('button[title="Delete Role"]').click({ force: true })
    cy.get('#roles-delete-confirm').click()
    cy.get('#ui-modal-backdrop', { timeout: 20000 }).should('not.exist')
    cy.contains('td', adminRoleId).should('not.exist')

    cy.openPageViaSidebar('/settings/internal-audit', 'Internal Audit Logs')
    cy.get('input[placeholder*="Search by user, action, or resource"]').should('be.visible')

    cy.openPageViaSidebar('/me', 'My Profile')
    cy.logoutViaUi()

    cy.waitForLoginPageReady()
    cy.loginViaUi(ziriUser, ziriPass, { skipEnsureLoggedOut: true })
    cy.openPageViaSidebar('/config', 'Configuration')
    cy.contains('label', 'Public URL', { timeout: 30000 }).should('be.visible')
    cy.get('#config-save').should('be.visible')
    cy.openPageViaSidebar('/settings/manage-users', 'Manage Users')
    for (const email of [dashViewerEmail, dashUserAdminEmail, dashPolicyAdminEmail, dashAdminEmail]) {
      cy.findTableRow(email, { searchInput: manageUsersSearch, searchTerm: email, apiPattern: manageUsersApi }).find('button[title="Delete User"]').click({ force: true })
      cy.get('#manage-users-delete-confirm').click()
      cy.get('#ui-modal-backdrop', { timeout: 30000 }).should('not.exist')
      cy.contains('td', email).should('not.exist')
    }
    cy.openPageViaSidebar('/settings/internal-audit', 'Internal Audit Logs')
    cy.get('input[placeholder*="Search by user, action, or resource"]').should('be.visible')

    cy.logoutViaUi()
  })
})
