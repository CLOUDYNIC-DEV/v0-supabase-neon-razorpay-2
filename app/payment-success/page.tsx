'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Header from '@/components/header'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndGetData = async () => {
      try {
        const { data } = await authClient.getSession()

        if (!data?.session?.user) {
          router.push('/sign-in')
          return
        }

        setSession(data.session)

        // Fetch user profile
        try {
          const profileResponse = await fetch('/api/user/profile')
          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            setProfile(profileData.profile)
          }
        } catch (err) {
          console.error('Error fetching profile:', err)
        }

        // Generate or fetch API key
        try {
          const keyResponse = await fetch('/api/user/api-key', { method: 'POST' })
          if (keyResponse.ok) {
            const keyData = await keyResponse.json()
            setApiKey(keyData.key)
          }
        } catch (err) {
          console.error('Error generating API key:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndGetData()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-2xl font-bold">LOADING...</p>
        </div>
      </main>
    )
  }

  const planName = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'ultimate' ? 'Pro Max' : 'Free'

  const setupInstructions = `
# CloudyNIC AI - Setup Instructions

## Your API Key
${apiKey}

## Using the API

### JavaScript Example
const apiKey = '${apiKey}';

async function askCloudyNIC(prompt) {
  const response = await fetch('https://cloudynic.com/api/v1/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      prompt: prompt,
      key: apiKey 
    })
  });
  
  const data = await response.json();
  console.log(data.response);
}

### cURL Example
curl -X POST https://cloudynic.com/api/v1/prompt \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Your question", "key": "${apiKey}"}'

### Python Example
import requests

api_key = '${apiKey}'
response = requests.post(
    'https://cloudynic.com/api/v1/prompt',
    json={'prompt': 'Hello', 'key': api_key}
)
print(response.json())

## Rate Limits by Plan
Pro: 10,000 requests/day, 30 req/min
Pro Max: Unlimited requests
  `.trim()

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="border-4 border-foreground p-6 sm:p-8 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">✓ PAYMENT SUCCESSFUL</h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8">
            Welcome to CloudyNIC AI! Your {planName} plan is now active.
          </p>

          <div className="bg-card border-2 border-foreground p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-bold mb-4">YOUR API KEY</h2>
            <div className="bg-foreground text-background p-4 font-mono text-xs sm:text-sm break-all mb-4 overflow-x-auto">
              <span id="api-key-text">{apiKey || 'Generating...'}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  if (apiKey) {
                    navigator.clipboard.writeText(apiKey)
                    const btn = event?.target as HTMLButtonElement
                    const originalText = btn.textContent
                    btn.textContent = '✓ COPIED!'
                    setTimeout(() => {
                      btn.textContent = originalText
                    }, 2000)
                  }
                }}
                disabled={!apiKey}
                className="px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50 text-xs sm:text-sm"
              >
                COPY API KEY
              </button>
            </div>
          </div>

          <div className="border-2 border-foreground p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-bold mb-4">SETUP INSTRUCTIONS</h2>
            <pre className="bg-card p-4 overflow-x-auto text-xs sm:text-sm mb-4 max-h-80 overflow-y-auto font-mono">
              <code>{setupInstructions}</code>
            </pre>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-6 py-3 sm:py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-sm sm:text-base"
            >
              GO TO DASHBOARD
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-3 sm:py-4 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-center text-sm sm:text-base"
            >
              BACK TO HOME
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">PLAN: {planName.toUpperCase()}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {profile?.plan === 'pro' && 'Perfect for production. 10K requests per day.'}
              {profile?.plan === 'ultimate' && 'Unlimited access for enterprise.'}
            </p>
          </div>

          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">CREDITS</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {profile?.credits?.toLocaleString() || '0'} credits available
            </p>
          </div>

          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">SUPPORT</h3>
            <p className="text-xs sm:text-sm">
              <a href="mailto:hello@cloudynic.com" className="text-foreground underline hover:no-underline">
                hello@cloudynic.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
