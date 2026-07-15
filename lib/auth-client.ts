'use client'

import { createAuthClient } from 'better-auth/react'

const getBaseURL = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'
  }
  
  // Use window.location.origin on client - always valid
  return window.location.origin
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signUp, signIn, signOut, useSession } = authClient
