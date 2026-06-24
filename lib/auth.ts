import { betterAuth } from 'better-auth'
import { pool } from './db'

const baseURL = process.env.BETTER_AUTH_URL
  ? `https://${process.env.BETTER_AUTH_URL}`
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL || 'http://localhost:3000'

const trustedOrigins = [
  baseURL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.V0_RUNTIME_URL,
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: process.env.NODE_ENV === 'development' ? {
      sameSite: 'none',
      secure: true,
    } : undefined,
  },
})
