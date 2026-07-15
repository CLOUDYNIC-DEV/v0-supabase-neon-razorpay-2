'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Header from '@/components/header'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await authClient.getSession()
      if (data?.session?.user) {
        const plan = searchParams.get('plan')
        if (plan) {
          router.push(`/checkout?plan=${plan}`)
        } else {
          router.push('/dashboard')
        }
      } else {
        setLoading(false)
      }
    }
    checkSession()
  }, [router, searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await authClient.signUp.email({
        email,
        password,
        name: name || email,
      })

      const plan = searchParams.get('plan')
      if (plan) {
        router.push(`/checkout?plan=${plan}`)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md border-4 border-foreground p-6 sm:p-8">
          <h1 className="text-3xl font-bold mb-2">CREATE ACCOUNT</h1>
          <p className="text-muted-foreground mb-8">Join Cloudynic AI today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-foreground focus:outline-none bg-background text-foreground placeholder-muted-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-foreground focus:outline-none bg-background text-foreground placeholder-muted-foreground"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border-2 border-foreground focus:outline-none bg-background text-foreground placeholder-muted-foreground"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-background border-2 border-red-500 text-red-500 p-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50"
            >
              {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-foreground font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-foreground text-center text-xs text-muted-foreground">
            <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </main>
  )
}
