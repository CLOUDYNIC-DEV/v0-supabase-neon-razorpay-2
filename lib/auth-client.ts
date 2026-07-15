'use client'

import { createAuthClient } from 'better-auth/react'

const getBaseURL = () => {
  // Only access window on client side
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }
  // Fallback for server-side calls (shouldn't happen with 'use client')
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signUp, signIn, signOut, useSession } = authClient
