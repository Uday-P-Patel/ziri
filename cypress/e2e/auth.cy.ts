import { uniqueSuffix } from '../support/auth'

describe('Authentication flows', () => {
  const proxyUrl = String(Cypress.env('proxyUrl') || 'https://localhost:3100').replace(/\/$/, '')

  it('dashboard login succeeds and creates session cookie', () => {
    const username = String(Cypress.env('ziriUsername') || 'ziri')
    const password = String(Cypress.env('ziriPassword') || '')

    cy.request({
      method: 'POST',
      url: `${proxyUrl}/api/auth/admin/login`,
      body: { username, email: username, password }
    }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body.accessToken).to.be.a('string')
      expect(res.body.refreshToken).to.be.a('string')
    })

    cy.loginAsZiri()
    cy.getCookie('admin-auth').should('exist')
  })

  it('disabled dashboard user cannot login and no session is created', () => {
    const tag = uniqueSuffix()
    const email = `dash-disabled-${tag}@example.com`
    const name = `Disabled Dash ${tag}`
    let userId = ''

    cy.createDashboardUserViaAPI({ email, name, role: 'viewer' }).then((created) => {
      userId = created.user.userId
    })

    cy.loginAsZiri()
    cy.getCookie('admin-auth').then((cookie) => {
      const admin = JSON.parse(String(cookie?.value || '{}')) as { accessToken?: string }
      cy.request({
        method: 'POST',
        url: `/api/dashboard-users/${encodeURIComponent(userId)}/disable`,
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${String(admin.accessToken || '')}` }
      }).its('status').should('eq', 200)
    })

    cy.request({
      method: 'POST',
      url: `${proxyUrl}/api/auth/admin/login`,
      failOnStatusCode: false,
      body: { username: email, email, password: String(Cypress.env('ziriPassword') || '') }
    }).then((res) => {
      expect(res.status).to.eq(403)
      expect(String(res.body.error || '')).to.match(/disabled/i)
      expect(res.body.accessToken).to.be.undefined
    })

    cy.getCookie('admin-auth').then(() => {
      cy.clearCookie('admin-auth')
    })

    cy.deleteDashboardUserViaAPI(userId)
  })

  it('access login succeeds', () => {
    const tag = uniqueSuffix()
    const email = `access-login-${tag}@example.com`
    const name = `Access Login ${tag}`

    cy.createAccessUserViaAPI({
      email,
      name,
      createApiKey: false,
      isAgent: false
    }).then((created) => {
      expect(created.user.userId).to.be.a('string').and.not.empty
      expect(created.password, 'password is required for deterministic access login test').to.be.a('string').and.not.empty

      cy.request({
        method: 'POST',
        url: `${proxyUrl}/api/auth/login`,
        body: {
          userId: created.user.userId,
          password: created.password
        }
      }).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.user.role).to.eq('user')
        expect(res.body.accessToken).to.be.a('string')
      })

      cy.loginAsZiri()
      cy.getCookie('admin-auth').then((cookie) => {
        const admin = JSON.parse(String(cookie?.value || '{}')) as { accessToken?: string }
        cy.request({
          method: 'DELETE',
          url: `${proxyUrl}/api/users/${encodeURIComponent(created.user.userId)}`,
          headers: { Authorization: `Bearer ${String(admin.accessToken || '')}` },
          failOnStatusCode: false
        }).its('status').should('eq', 200)
      })
    })
  })

  it('refresh token rotates and token reuse revokes sessions', () => {
    const username = String(Cypress.env('ziriUsername') || 'ziri')
    const password = String(Cypress.env('ziriPassword') || '')

    cy.request({
      method: 'POST',
      url: `${proxyUrl}/api/auth/admin/login`,
      body: { username, email: username, password }
    }).then((login) => {
      expect(login.status).to.eq(200)
      expect(login.body.refreshToken).to.be.a('string').and.not.empty
      const oldRefresh = String(login.body.refreshToken)

      cy.request({
        method: 'POST',
        url: `${proxyUrl}/api/auth/refresh`,
        body: { refreshToken: oldRefresh }
      }).then((refresh) => {
        expect(refresh.status).to.eq(200)
        expect(refresh.body.accessToken).to.be.a('string').and.not.empty
        expect(refresh.body.refreshToken).to.be.a('string').and.not.empty
        const newRefresh = String(refresh.body.refreshToken)

        cy.request({
          method: 'POST',
          url: `${proxyUrl}/api/auth/refresh`,
          failOnStatusCode: false,
          body: { refreshToken: oldRefresh }
        }).then((reuse) => {
          expect(reuse.status).to.eq(401)
          expect(reuse.body.code).to.eq('TOKEN_REUSE_DETECTED')
        })

        cy.request({
          method: 'POST',
          url: `${proxyUrl}/api/auth/refresh`,
          failOnStatusCode: false,
          body: { refreshToken: newRefresh }
        }).then((afterRevoke) => {
          expect(afterRevoke.status).to.eq(401)
          expect(afterRevoke.body.code).to.match(/REFRESH_TOKEN_INVALID|INVALID_REFRESH_TOKEN/)
        })
      })
    })
  })

  it('root key login path works for ziri', () => {
    const password = String(Cypress.env('ziriPassword') || '')
    cy.request({
      method: 'POST',
      url: `${proxyUrl}/api/auth/admin/login`,
      body: {
        username: 'ziri',
        email: 'ziri@ziri.local',
        password
      }
    }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body.user.userId).to.eq('ziri')
      expect(res.body.user.role).to.eq('admin')
      expect(res.body.accessToken).to.be.a('string')
    })
  })
})
