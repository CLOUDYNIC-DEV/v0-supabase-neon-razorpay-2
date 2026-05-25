'use client'

import Link from 'next/link'

export default function SignUpSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 border-4 border-foreground text-center">
        <div className="mb-8">
          <div className="text-6xl font-bold mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">ACCOUNT CREATED</h1>
          <p className="text-sm text-muted-foreground">Check your email to confirm your account</p>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm leading-relaxed">
            We&apos;ve sent a confirmation email to your address. Click the link in the email to verify your account and get started with CloudyNIC AI.
          </p>
        </div>

        <Link
          href="/auth/login"
          className="block px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
        >
          BACK TO LOGIN
        </Link>
      </div>
    </div>
  )
}
