import {
  type AccessLoginResponse,
  type DashboardLoginResponse,
  writeAdminAuthCookie,
  writeUserAuthCookie
} from './auth'

type DashboardRole = 'admin' | 'viewer' | 'user_admin' | 'policy_admin'

interface CreateDashboardUserPayload {
  email: string
  name: string
  role: DashboardRole
}

interface CreateAccessUserPayload {
  email: string
  name: string
  tenant?: string
  isAgent?: boolean
  limitRequestsPerMinute?: number
  createApiKey?: boolean
  roleId?: string
}

interface DashboardCreateResponse {
  user: {
    userId: string
    email: string
    role: DashboardRole
    status: number
    name: string
  }
  password?: string
  message?: string
}

interface AccessCreateResponse {
  user: {
    userId: string
    email: string
    status: number
    name: string
  }
  password?: string
  apiKey?: string
  emailSent?: boolean
  message?: string
}

interface RuntimeDashboardUser {
  email: string
  password: string
  role: DashboardRole
  userId?: string
}

function envMs(name: string, fallback: number): number {
  const raw = Number(Cypress.env(name))
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return raw
}

function envCount(name: string, fallback: number): number {
  const raw = Number(Cypress.env(name))
  if (!Number.isFinite(raw) || raw < 1) return fallback
  return Math.floor(raw)
}

function pageReadySelector(path: string): string | null {
  const p = path.split('?')[0]
  if (p === '/users') return 'table'
  if (p === '/keys') return 'table'
  if (p === '/providers') return 'table'
  if (p === '/rules') return 'table'
  if (p === '/settings/manage-users') return 'table'
  if (p === '/settings/roles') return 'table'
  return null
}

function proxyApi(path: string): string {
  const base = String(Cypress.env('proxyUrl') || 'https://localhost:3100').replace(/\/$/, '')
  return `${base}${path}`
}

declare global {
  namespace Cypress {
    interface Chainable {
      getModal(title: string): Chainable<JQuery<HTMLElement>>
      clickModalButton(title: string, buttonText: string): Chainable<void>
      typeModalInput(title: string, labelText: string, value: string, options?: { sensitive?: boolean }): Chainable<void>
      loginViaUi(username: string, password: string, options?: { skipEnsureLoggedOut?: boolean }): Chainable<void>
      logoutViaUi(): Chainable<void>
      ensureLoggedOut(): Chainable<void>
      waitForManualLogin(): Chainable<void>
      waitForLoginPageReady(): Chainable<void>
      saveRuntimeDashboardUser(key: string, user: RuntimeDashboardUser): Chainable<void>
      getRuntimeDashboardUser(key: string): Chainable<RuntimeDashboardUser>
      openPageAndAssertLoaded(path: string, title: string): Chainable<void>
      openPageViaSidebar(path: string, title: string): Chainable<void>
      loginAsDashboardUser(email: string, password: string): Chainable<void>
      loginAsZiri(): Chainable<void>
      loginAsAccessUser(userId: string, password: string): Chainable<void>
      createDashboardUserViaAPI(payload: CreateDashboardUserPayload): Chainable<DashboardCreateResponse>
      createAccessUserViaAPI(payload: CreateAccessUserPayload): Chainable<AccessCreateResponse>
      deleteDashboardUserViaAPI(userId: string): Chainable<void>
      interceptAuthzCheck(): Chainable<void>
      assertButtonHidden(selector: string): Chainable<void>
      assertForbiddenResponse(requestAlias: string): Chainable<void>
      getByTestId(id: string): Chainable<JQuery<HTMLElement>>
      findTableRow(cellText: string, options?: { searchInput?: string; searchTerm?: string; apiPattern?: string }): Chainable<JQuery<HTMLElement>>
    }
  }
}

function ensureUiContext() {
  cy.visit('/login')
}

function getRuntimeUsers(): Record<string, RuntimeDashboardUser> {
  return (Cypress.env('runtimeDashboardUsers') || {}) as Record<string, RuntimeDashboardUser>
}

function setAdminSession(payload: DashboardLoginResponse) {
  cy.request(proxyApi('/health')).then((health) => {
    const sessionId = health.body?.sessionId ?? null
    const adminAuth = writeAdminAuthCookie(payload, sessionId)
    cy.setCookie('admin-auth', adminAuth)
    cy.window().then((win) => {
      win.localStorage.setItem('admin-auth', adminAuth)
    })
    Cypress.env('ziriAccessToken', payload.accessToken)
    Cypress.env('ziriRefreshToken', payload.refreshToken)
  })
}

function setUserSession(payload: AccessLoginResponse) {
  const userAuth = writeUserAuthCookie(payload)
  cy.setCookie('user-auth', userAuth)
  cy.window().then((win) => {
    win.localStorage.setItem('user-auth', userAuth)
  })
}

function getAdminAccessToken(): Cypress.Chainable<string> {
  return cy.getCookie('admin-auth').then((cookie) => {
    expect(cookie?.value, 'admin-auth cookie').to.be.a('string')
    const parsed = JSON.parse(String(cookie!.value)) as { accessToken: string }
    expect(parsed.accessToken, 'access token').to.be.a('string').and.not.empty
    return parsed.accessToken
  })
}

Cypress.Commands.add('loginAsDashboardUser', (email: string, password: string) => {
  cy.session(
    ['dashboard', email, password],
    () => {
      ensureUiContext()
      cy.request<DashboardLoginResponse>({
        method: 'POST',
        url: proxyApi('/api/auth/admin/login'),
        body: {
          username: email,
          email,
          password
        }
      }).then((res) => {
        expect(res.status).to.eq(200)
        setAdminSession(res.body)
      })
    },
    {
      validate: () => {
        cy.getCookie('admin-auth').should('exist')
      }
    }
  )
})

Cypress.Commands.add('ensureLoggedOut', () => {
  const timeout = envMs('uiTimeoutMs', 20000)
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/login')
  cy.get('#username', { timeout }).should('be.visible')
})

Cypress.Commands.add('waitForManualLogin', () => {
  const timeout = envMs('manualLoginTimeoutMs', 60000)
  cy.visit('/login')
  cy.get('#username', { timeout: 5000 }).should('be.visible')
  cy.get('button[title="Logout"]', { timeout }).should('be.visible')
})

Cypress.Commands.add('waitForLoginPageReady', () => {
  const timeout = envMs('manualLoginTimeoutMs', 30000)
  cy.location('pathname', { timeout }).should('eq', '/login')
  cy.get('#username', { timeout }).should('be.visible').and('not.be.disabled')
  cy.contains('button', 'Sign in to Gateway').should('be.visible').and('not.be.disabled')
})

Cypress.Commands.add('loginViaUi', (username: string, password: string, options?: { skipEnsureLoggedOut?: boolean }) => {
  const timeout = envMs('uiTimeoutMs', 20000)
  const maxAttempts = envCount('loginMaxAttempts', 4)
  const retryDelay = envMs('loginRetryDelayMs', 10000)
  if (typeof username !== 'string' || !username.trim()) throw new Error('loginViaUi: username cannot be empty')
  if (typeof password !== 'string' || !password.trim()) throw new Error('loginViaUi: password cannot be empty')
  if (!options?.skipEnsureLoggedOut) cy.ensureLoggedOut()

  const attemptLogin = (attempt: number): void => {
    cy.location('pathname', { timeout }).then((p) => {
      const path = String(p)

      // already logged in: stop retrying
      if (path !== '/login') {
        cy.get('button[title="Logout"]', { timeout }).should('be.visible')
        return
      }

      // on login page: try to log in once
      cy.waitForLoginPageReady()
      cy.get('#username', { timeout }).clear().type(username)
      cy.get('#password', { timeout }).clear().type(password, { log: false })
      cy.contains('button', 'Sign in to Gateway').click()

      cy.location('pathname', { timeout }).then((p2) => {
        const path2 = String(p2)
        if (path2 === '/login') {
          if (attempt >= maxAttempts) {
            throw new Error('loginViaUi: failed to leave login page after max attempts')
          }
          cy.wait(retryDelay)
          attemptLogin(attempt + 1)
          return
        }
        cy.get('button[title="Logout"]', { timeout }).should('be.visible')
      })
    })
  }

  attemptLogin(1)
})

Cypress.Commands.add('logoutViaUi', () => {
  const timeout = envMs('uiTimeoutMs', 20000)
  cy.get('button[title="Logout"]').click()
  cy.location('pathname', { timeout }).should('eq', '/login')
  cy.get('#username', { timeout }).should('be.visible')
})

Cypress.Commands.add('saveRuntimeDashboardUser', (key: string, user: RuntimeDashboardUser) => {
  const all = getRuntimeUsers()
  all[key] = user
  Cypress.env('runtimeDashboardUsers', all)
})

Cypress.Commands.add('getRuntimeDashboardUser', (key: string) => {
  return cy.wrap(null).then(() => {
    const all = getRuntimeUsers()
    expect(all[key], `runtime dashboard user ${key}`).to.exist
    return all[key]
  })
})

Cypress.Commands.add('openPageAndAssertLoaded', (path: string, title: string) => {
  const timeout = envMs('pageLoadTimeoutMs', 20000)
  const attempts = envCount('pageLoadMaxAttempts', 3)
  const retryDelay = envMs('pageLoadRetryDelayMs', 800)

  const openAttempt = (attempt: number): void => {
    cy.visit(path, { retryOnNetworkFailure: true, retryOnStatusCodeFailure: true, timeout })
    cy.location('pathname', { timeout }).then((pathname) => {
      const atPath = String(pathname).includes(path)
      if (!atPath) {
        if (attempt >= attempts) {
          expect(String(pathname), `final path for ${path}`).to.include(path)
          return
        }
        cy.log(`retry page load ${attempt + 1}/${attempts}: ${path}`)
        cy.wait(retryDelay)
        openAttempt(attempt + 1)
        return
      }

      cy.contains('h1', title, { timeout }).should('be.visible')
      const readySelector = pageReadySelector(path)
      if (readySelector) {
        cy.get(readySelector, { timeout }).should('be.visible')
      }
    })
  }

  openAttempt(1)
})

Cypress.Commands.add('openPageViaSidebar', (path: string, title: string) => {
  const timeout = envMs('pageLoadTimeoutMs', 20000)
  const href = path === '/' ? '/' : path
  cy.get('aside').filter(':visible').find(`nav a[href="${href}"]`).filter(':visible').first().click({ timeout })
  cy.location('pathname', { timeout }).should((p) => {
    const pname = String(p)
    if (path === '/') expect(pname).to.eq('/')
    else expect(pname).to.include(path)
  })
  cy.contains('h1', title, { timeout }).should('be.visible')
  const readySelector = pageReadySelector(path)
  if (readySelector) {
    cy.get(readySelector, { timeout }).should('be.visible')
  }
})

Cypress.Commands.add('findTableRow', (cellText: string, options?: { searchInput?: string; searchTerm?: string; apiPattern?: string }) => {
  if (options?.searchInput && options?.searchTerm) {
    if (options?.apiPattern) {
      cy.intercept('GET', options.apiPattern).as('findTableRowApi')
    }
    cy.get(options.searchInput).then(($input) => {
      const el = $input[0] as HTMLInputElement
      el.value = options.searchTerm
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    if (options?.apiPattern) {
      cy.wait('@findTableRowApi', { timeout: 15000 })
    } else {
      cy.wait(1500)
    }
    return cy
      .contains('tbody td', cellText, { timeout: 20000 })
      .closest('tr')
      .then(($tr) => cy.wrap($tr as JQuery<HTMLElement>))
  }

  let pagesTried = 0

  const tryFind = (): Cypress.Chainable<JQuery<HTMLElement>> => {
    return cy.get('body').then(($body) => {
      const $cells = $body.find('tbody td')
      for (let i = 0; i < $cells.length; i++) {
        const $cell = $cells.eq(i)
        if ($cell.text().trim().includes(cellText)) {
          return cy.wrap($cell.closest('tr') as JQuery<HTMLElement>)
        }
      }
      const $next = $body.find('button').filter((_, el) => Cypress.$(el).text().trim() === 'Next').not('[disabled]')
      if ($next.length === 0) {
        throw new Error(`row containing "${cellText}" not found in table`)
      }
      if (pagesTried++ > 50) {
        throw new Error(`row containing "${cellText}" not found after traversing pages`)
      }
      cy.wrap($next.first()).click()
      cy.wait(600)
      return tryFind()
    }) as Cypress.Chainable<JQuery<HTMLElement>>
  }
  return tryFind()
})

Cypress.Commands.add('getModal', (title: string) => {
  return cy
    .get(`#ui-modal-panel[data-modal-title="${title}"]`, { timeout: 15000 })
    .should('be.visible')
})

Cypress.Commands.add('clickModalButton', (title: string, buttonText: string) => {
  cy.getModal(title).within(() => {
    cy.contains('button', new RegExp(`^\\s*${buttonText}\\s*$`)).click()
  })
})

Cypress.Commands.add('typeModalInput', (title: string, labelText: string, value: string, options?: { sensitive?: boolean }) => {
  cy.getModal(title).within(() => {
    const field = cy.contains('label', labelText).parent().find('input')
    if (options?.sensitive) {
      field.clear().type(value, { log: false })
      return
    }
    field.clear().type(value)
  })
})

Cypress.Commands.add('loginAsZiri', () => {
  const username = String(Cypress.env('ziriUsername') || 'ziri')
  const password = String(Cypress.env('ziriPassword') || '')
  expect(password, 'CYPRESS_ZIRI_PASSWORD is required').to.have.length.greaterThan(0)
  cy.loginAsDashboardUser(username, password)
})

Cypress.Commands.add('loginAsAccessUser', (userId: string, password: string) => {
  cy.session(
    ['access', userId, password],
    () => {
      ensureUiContext()
      cy.request<AccessLoginResponse>({
        method: 'POST',
        url: proxyApi('/api/auth/login'),
        body: {
          userId,
          password
        }
      }).then((res) => {
        expect(res.status).to.eq(200)
        setUserSession(res.body)
      })
    },
    {
      validate: () => {
        cy.getCookie('user-auth').should('exist')
      }
    }
  )
})

Cypress.Commands.add('createDashboardUserViaAPI', (payload: CreateDashboardUserPayload) => {
  cy.loginAsZiri()
  return getAdminAccessToken().then((token) => {
    return cy.request<DashboardCreateResponse>({
      method: 'POST',
      url: proxyApi('/api/dashboard-users'),
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    }).then((res) => {
      expect([200, 201]).to.include(res.status)
      return res.body
    })
  })
})

Cypress.Commands.add('createAccessUserViaAPI', (payload: CreateAccessUserPayload) => {
  cy.loginAsZiri()
  return getAdminAccessToken().then((token) => {
    return cy.request<AccessCreateResponse>({
      method: 'POST',
      url: proxyApi('/api/users'),
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        createApiKey: payload.createApiKey ?? false,
        isAgent: payload.isAgent ?? false,
        limitRequestsPerMinute: payload.limitRequestsPerMinute ?? 100,
        ...payload
      }
    }).then((res) => {
      expect([200, 201]).to.include(res.status)
      return res.body
    })
  })
})

Cypress.Commands.add('deleteDashboardUserViaAPI', (userId: string) => {
  cy.loginAsZiri()
  getAdminAccessToken().then((token) => {
    cy.request({
      method: 'DELETE',
      url: proxyApi(`/api/dashboard-users/${encodeURIComponent(userId)}`),
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    }).then((res) => {
      expect([200, 400, 404]).to.include(res.status)
    })
  })
})

Cypress.Commands.add('interceptAuthzCheck', () => {
  cy.intercept('POST', '**/api/authz/check-batch').as('authzCheckBatch')
  cy.intercept('POST', '**/api/authz/check').as('authzCheck')
})

Cypress.Commands.add('assertButtonHidden', (selector: string) => {
  cy.get('body').then(($body) => {
    const node = $body.find(selector)
    if (!node.length) {
      expect(node.length).to.eq(0)
      return
    }
    cy.wrap(node).should('not.be.visible')
  })
})

Cypress.Commands.add('assertForbiddenResponse', (requestAlias: string) => {
  const alias = requestAlias.startsWith('@') ? requestAlias : `@${requestAlias}`
  cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.eq(403)
    expect(interception.response?.body).to.have.property('error')
    expect(interception.response?.body).to.have.property('code')
  })
})

Cypress.Commands.add('getByTestId', (id: string) => {
  return cy.get(`[data-testid="${id}"]`)
})

export {}
