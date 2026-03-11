export interface SessionTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface DashboardUserSession {
  userId: string
  email: string
  role: string
  name: string
}

export interface DashboardLoginResponse extends SessionTokens {
  user: DashboardUserSession
}

export interface AccessLoginResponse extends SessionTokens {
  user: {
    userId: string
    email: string
    role: string
    name: string
  }
}

function getCookieExpiry(expiresInSeconds: number): string {
  return new Date(Date.now() + (expiresInSeconds - 60) * 1000).toISOString()
}

export function writeAdminAuthCookie(payload: DashboardLoginResponse, serverSessionId: string | null): string {
  return JSON.stringify({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    tokenExpiry: getCookieExpiry(payload.expiresIn),
    user: payload.user,
    serverSessionId
  })
}

export function writeUserAuthCookie(payload: AccessLoginResponse): string {
  return JSON.stringify({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    tokenExpiry: getCookieExpiry(payload.expiresIn),
    user: payload.user
  })
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
