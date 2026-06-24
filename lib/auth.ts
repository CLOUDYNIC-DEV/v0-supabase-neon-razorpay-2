import { betterAuth } from 'better-auth'
import { getPool } from './db'

let authInstance: any = null

function getBaseURL() {
  return process.env.BETTER_AUTH_URL
    ? `https://${process.env.BETTER_AUTH_URL}`
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL || 'http://localhost:3000'
}

function getTrustedOrigins() {
  const baseURL = getBaseURL()
  return [
    baseURL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.V0_RUNTIME_URL,
  ].filter(Boolean) as string[]
}

export function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      database: getPool(),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: getBaseURL(),
      trustedOrigins: getTrustedOrigins(),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
      },
      advanced: {
        defaultCookieAttributes: process.env.NODE_ENV === 'development' ? {
          sameSite: 'none',
          secure: true,
        } : undefined,
      },
    })
  }
  return authInstance
}

export const auth = new Proxy({} as any, {
  get(target, prop) {
    return getAuth()[prop]
  },
})
