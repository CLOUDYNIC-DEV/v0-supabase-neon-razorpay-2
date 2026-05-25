'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'An authentication error occurred'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 border-4 border-destructive">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive">ERROR</h1>
          <p className="text-sm text-muted-foreground">Authentication failed</p>
        </div>

        <div className="mb-6 p-4 border-2 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>

        <Link
          href="/auth/login"
          className="block px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center"
        >
          BACK TO LOGIN
        </Link>
      </div>
    </div>
  )
}
