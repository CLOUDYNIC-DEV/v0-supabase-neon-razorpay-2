'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/header'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
}

interface Subscription {
  plan_type: 'free' | 'pro' | 'pro_max'
  status: string
  monthly_cost: number
  created_at: string
  renewal_date: string | null
}

interface ApiKey {
  id: string
  api_key: string
  key_name: string
  created_at: string
  is_active: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user as unknown as User)

      // Fetch subscription
      try {
        const response = await fetch('/api/subscription/get', {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setSubscription(data.subscription)
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err)
      }

      // Fetch API keys
      try {
        const response = await fetch('/api/keys/list', {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setApiKeys(data.keys || [])
        }
      } catch (err) {
        console.error('Failed to fetch API keys:', err)
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleGenerateKey = async () => {
    setGeneratingKey(true)
    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setApiKeys((prev) => [...prev, data.key])
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate key')
      }
    } catch (err) {
      setError('Failed to generate API key')
      console.error(err)
    } finally {
      setGeneratingKey(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <p className="text-center text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-2">DASHBOARD</h1>
            <p className="text-muted-foreground">Welcome, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all"
          >
            LOGOUT
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-destructive border-2 border-destructive">
            <p className="text-destructive-foreground font-bold">{error}</p>
          </div>
        )}

        {/* Current Plan Section */}
        <div className="mb-12 border-4 border-foreground p-8">
          <h2 className="text-3xl font-bold mb-6">CURRENT PLAN</h2>

          {subscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b-2 border-foreground pb-4">
                <span className="text-xl font-bold">Plan Type:</span>
                <span className="text-xl font-bold uppercase">{subscription.plan_type}</span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-foreground pb-4">
                <span className="text-xl font-bold">Status:</span>
                <span className="text-xl uppercase">{subscription.status}</span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-foreground pb-4">
                <span className="text-xl font-bold">Monthly Cost:</span>
                <span className="text-xl font-bold">${subscription.monthly_cost}/month</span>
              </div>
              {subscription.renewal_date && (
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Renewal Date:</span>
                  <span className="text-xl">
                    {new Date(subscription.renewal_date).toLocaleDateString()}
                  </span>
                </div>
              )}

              <Link
                href="/pricing"
                className="block mt-8 px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center"
              >
                UPGRADE PLAN
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg mb-6">You don&apos;t have a plan yet.</p>
              <Link
                href="/pricing"
                className="inline-block px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
              >
                CHOOSE A PLAN
              </Link>
            </div>
          )}
        </div>

        {/* API Keys Section */}
        <div className="border-4 border-foreground p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">API KEYS</h2>
            <button
              onClick={handleGenerateKey}
              disabled={generatingKey}
              className="px-6 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50"
            >
              {generatingKey ? 'GENERATING...' : 'GENERATE NEW KEY'}
            </button>
          </div>

          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border-2 border-foreground p-4 bg-card"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-muted-foreground mb-1">
                        {key.key_name || 'Unnamed Key'}
                      </p>
                      <p className="font-mono text-xs break-all bg-background p-2 border border-foreground mb-2">
                        {key.api_key}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(key.api_key)
                          const btn = event?.target as HTMLButtonElement
                          const originalText = btn.textContent
                          btn.textContent = '✓ COPIED'
                          setTimeout(() => {
                            btn.textContent = originalText
                          }, 1500)
                        }}
                        className="text-xs px-2 py-1 border border-foreground hover:bg-foreground hover:text-background transition-all"
                      >
                        COPY
                      </button>
                    </div>
                    <span
                      className={`px-3 py-1 font-bold text-xs whitespace-nowrap border-2 border-foreground ${
                        key.is_active
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {key.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mb-6">No API keys generated yet.</p>
          )}

          {/* Setup Instructions */}
          <div className="mt-8 border-t-2 border-foreground pt-8">
            <h3 className="text-2xl font-bold mb-4">SETUP INSTRUCTIONS</h3>
            <div className="bg-card border-2 border-foreground p-6 space-y-6">
              <div>
                <p className="font-bold mb-2">API ENDPOINT:</p>
                <p className="text-sm font-mono bg-background p-3 border border-foreground break-all">
                  https://cloudynic.com/api/v1/prompt
                </p>
              </div>

              <div>
                <p className="font-bold mb-2">GET REQUEST (Simple):</p>
                <code className="text-xs bg-background p-3 border border-foreground block overflow-x-auto">
                  {`GET https://cloudynic.com/api/v1/prompt?prompt=hello&key=YOUR_API_KEY`}
                </code>
              </div>

              <div>
                <p className="font-bold mb-2">POST REQUEST (JSON):</p>
                <code className="text-xs bg-background p-3 border border-foreground block overflow-x-auto">
                  {`curl -X POST https://cloudynic.com/api/v1/prompt \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Your question", "key": "YOUR_API_KEY"}'`}
                </code>
              </div>

              <div>
                <p className="font-bold mb-2">RATE LIMITS:</p>
                <ul className="text-sm space-y-2 ml-4 list-disc">
                  <li>Free: 1 request/minute, 100 requests/day (IP-based)</li>
                  <li>Pro: 30 requests/minute, 10,000 requests/day</li>
                  <li>Pro Max: Unlimited requests</li>
                </ul>
              </div>

              <div>
                <p className="font-bold mb-2">JAVASCRIPT EXAMPLE:</p>
                <code className="text-xs bg-background p-3 border border-foreground block overflow-x-auto">
                  {`const response = await fetch('https://cloudynic.com/api/v1/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Your question', key: 'YOUR_API_KEY' })
});
const data = await response.json();
console.log(data.response);`}
                </code>
              </div>

              <div>
                <p className="font-bold mb-2">FREE TIER (NO KEY NEEDED):</p>
                <code className="text-xs bg-background p-3 border border-foreground block overflow-x-auto">
                  {`GET https://cloudynic.com/api/v1/prompt?prompt=hello`}
                </code>
                <p className="text-xs text-muted-foreground mt-2">Rate limited to 1 request/minute per IP address</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
