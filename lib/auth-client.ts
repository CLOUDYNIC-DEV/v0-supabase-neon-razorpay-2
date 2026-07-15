'use client'

import { createAuthClient } from 'better-auth/react'
import { useMemo } from 'react'

// Lazy initialization - only happens on client after hydration
let _authClient: any = null

export function getAuthClient() {
  if (typeof window === 'undefined') {
    // Server-side fallback (shouldn't be used in production)
    return createAuthClient({
      baseURL: 'http://localhost:3000',
    })
  }

  if (!_authClient) {
    _authClient = createAuthClient({
      baseURL: window.location.origin,
    })
  }

  return _authClient
}

// Export the client directly (evaluates after hydration)
export const authClient = new Proxy(
  {},
  {
    get(target, prop) {
      return getAuthClient()[prop as string]
    },
  }
) as any

export const signUp = (options: any) => getAuthClient().signUp.email(options)
export const signIn = (options: any) => getAuthClient().signIn.email(options)
export const signOut = () => getAuthClient().signOut()
export const useSession = () => getAuthClient().useSession()
