import { uniqueSuffix } from '../support/auth'

type DashRole = 'admin' | 'viewer' | 'user_admin' | 'policy_admin'

interface SeededDashUser {
  userId: string
  email: string
  role: DashRole
  password: string | undefined
}

function adminToken(): Cypress.Chainable<string> {
  return cy.getCookie('admin-auth').then((cookie) => {
    const data = JSON.parse(String(cookie?.value || '{}')) as { accessToken?: string }
    expect(data.accessToken).to.be.a('string').and.not.empty
    return String(data.accessToken)
  })
}

function seedDashUser(role: DashRole, tag: string): Cypress.Chainable<SeededDashUser> {
  const email = `${role}-${tag}@example.com`
  const name = `${role}-${tag}`
  return cy.createDashboardUserViaAPI({ email, name, role }).then((created) => {
    return {
      userId: created.user.userId,
      email,
      role,
      password: created.password
    }
  })
}

function deleteDashUser(userId: string) {
  cy.deleteDashboardUserViaAPI(userId)
}

describe('Manage Users security invariants', () => {
  it('Layer 1 check-batch runs on page load', () => {
    const tag = uniqueSuffix()
    let nonZiri: SeededDashUser

    seedDashUser('admin', `subadmin-${tag}`).then((u) => {
      nonZiri = u
      expect(nonZiri.password, 'non-ziri admin password required').to.be.a('string').and.not.empty
      cy.loginAsDashboardUser(nonZiri.email, String(nonZiri.password))
      cy.interceptAuthzCheck()
      cy.visit('/settings/manage-users')
      cy.wait('@authzCheckBatch').then((itc) => {
        expect(itc.response?.statusCode).to.eq(200)
        expect(itc.request.body.actions).to.be.an('array')
      })
    }).then(() => {
      deleteDashUser(nonZiri.userId)
    })
  })

  it('non-ziri admin cannot create admin user (Layer 2 pre-check)', () => {
    const tag = uniqueSuffix()
    let nonZiri: SeededDashUser

    seedDashUser('admin', `subadmin-create-${tag}`).then((u) => {
      nonZiri = u
      expect(nonZiri.password, 'non-ziri admin password required').to.be.a('string').and.not.empty

      cy.loginAsDashboardUser(nonZiri.email, String(nonZiri.password))
      cy.interceptAuthzCheck()
      cy.intercept('POST', '**/api/dashboard-users').as('createDashboardUser')

      cy.visit('/settings/manage-users')
      cy.get('#manage-users-create-trigger,#manage-users-create-trigger-empty,#manage-users-create-trigger-table-empty').first().click()
      cy.getModal('Create Dashboard User').within(() => {
        cy.get('input[type="email"]:visible').first().clear().type(`blocked-admin-${tag}@example.com`)
        cy.contains('label', 'Name').parent().find('input').clear().type(`Blocked Admin ${tag}`)
        cy.get('select:visible').last().select('admin')
      })
      cy.clickModalButton('Create Dashboard User', 'Create User')

      cy.wait('@authzCheck').then((itc) => {
        expect(itc.request.body.action).to.eq('create_admin_dashboard_user')
        expect(itc.response?.statusCode).to.eq(200)
        expect(itc.response?.body?.allowed).to.eq(false)
      })

      cy.get('@createDashboardUser.all').should('have.length', 0)
      cy.contains('Only ziri can create admin dashboard users').should('be.visible')
    }).then(() => {
      deleteDashUser(nonZiri.userId)
    })
  })

  it('non-ziri admin cannot promote, delete admin, reset admin password, or delete ziri (Layer 3)', () => {
    const tag = uniqueSuffix()
    let nonZiri: SeededDashUser
    let viewer: SeededDashUser
    let adminTarget: SeededDashUser
    let token = ''

    seedDashUser('admin', `subadmin-rbac-${tag}`).then((u) => {
      nonZiri = u
      expect(nonZiri.password, 'non-ziri admin password required').to.be.a('string').and.not.empty
      return seedDashUser('viewer', `viewer-rbac-${tag}`)
    }).then((u) => {
      viewer = u
      return seedDashUser('admin', `admin-target-${tag}`)
    }).then((u) => {
      adminTarget = u
      cy.request({
        method: 'POST',
        url: '/api/auth/admin/login',
        body: {
          username: nonZiri.email,
          email: nonZiri.email,
          password: nonZiri.password
        }
      }).then((res) => {
        expect(res.status).to.eq(200)
        token = res.body.accessToken
      })
    }).then(() => {
      cy.request({
        method: 'PUT',
        url: `/api/dashboard-users/${encodeURIComponent(viewer.userId)}`,
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` },
        body: { role: 'admin' }
      }).then((res) => {
        expect(res.status).to.eq(403)
        expect(res.body.code).to.eq('ADMIN_ONLY_ACTION')
      })

      cy.request({
        method: 'DELETE',
        url: `/api/dashboard-users/${encodeURIComponent(adminTarget.userId)}`,
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        expect(res.status).to.eq(403)
        expect(res.body.code).to.eq('ADMIN_ONLY_ACTION')
      })

      cy.request({
        method: 'POST',
        url: `/api/dashboard-users/${encodeURIComponent(adminTarget.userId)}/reset-password`,
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        expect(res.status).to.eq(403)
        expect(res.body.code).to.eq('ADMIN_ONLY_ACTION')
      })

      cy.request({
        method: 'DELETE',
        url: '/api/dashboard-users/ziri',
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        expect(res.status).to.eq(403)
      })
    }).then(() => {
      deleteDashUser(viewer.userId)
      deleteDashUser(adminTarget.userId)
      deleteDashUser(nonZiri.userId)
    })
  })

  it('self-modification controls are hidden and API disable-self is blocked', () => {
    const tag = uniqueSuffix()
    let nonZiri: SeededDashUser

    seedDashUser('admin', `self-guard-${tag}`).then((u) => {
      nonZiri = u
      expect(nonZiri.password, 'non-ziri admin password required').to.be.a('string').and.not.empty

      cy.loginAsDashboardUser(nonZiri.email, String(nonZiri.password))
      cy.visit('/settings/manage-users')

      cy.contains('td,code', nonZiri.userId)
        .parents('tr')
        .within(() => {
          cy.get('button[title="Edit User"]').should('not.exist')
          cy.get('button[title="Delete User"]').should('not.exist')
          cy.get('button[title="Disable User"]').should('not.exist')
          cy.get('button[title="Enable User"]').should('not.exist')
        })

      adminToken().then((token) => {
        cy.request({
          method: 'POST',
          url: `/api/dashboard-users/${encodeURIComponent(nonZiri.userId)}/disable`,
          failOnStatusCode: false,
          headers: { Authorization: `Bearer ${token}` }
        }).then((res) => {
          expect(res.status).to.eq(403)
          expect(res.body.code).to.eq('SELF_MODIFICATION_FORBIDDEN')
        })
      })
    }).then(() => {
      deleteDashUser(nonZiri.userId)
    })
  })

  it('disabled dashboard user API key is blocked with DASHBOARD_USER_DISABLED', () => {
    const tag = uniqueSuffix()
    let user: SeededDashUser
    let apiKey = ''

    seedDashUser('viewer', `disabled-key-${tag}`).then((u) => {
      user = u
      cy.loginAsZiri()
      return adminToken()
    }).then((token) => {
      cy.request({
        method: 'POST',
        url: '/api/keys',
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: user.userId }
      }).then((createKey) => {
        expect([200, 201]).to.include(createKey.status)
        apiKey = createKey.body.apiKey
      })

      cy.request({
        method: 'POST',
        url: `/api/dashboard-users/${encodeURIComponent(user.userId)}/disable`,
        headers: { Authorization: `Bearer ${token}` }
      }).its('status').should('eq', 200)
    }).then(() => {
      const proxyUrl = String(Cypress.env('proxyUrl') || 'http://127.0.0.1:3100')
      cy.request({
        method: 'POST',
        url: `${proxyUrl}/api/chat/completions`,
        failOnStatusCode: false,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hello' }]
        }
      }).then((res) => {
        expect(res.status).to.eq(403)
        expect(res.body.code).to.eq('DASHBOARD_USER_DISABLED')
      })
    }).then(() => {
      deleteDashUser(user.userId)
    })
  })
})
