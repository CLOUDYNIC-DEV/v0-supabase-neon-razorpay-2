'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [planType, setPlanType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndGetData = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/auth/login')
        return
      }

      setUser(data.user)

      try {
        const subResponse = await fetch('/api/subscription/get')
        const subData = await subResponse.json()
        if (subData.subscription) {
          setPlanType(subData.subscription.plan_type)
        }

        const keyResponse = await fetch('/api/keys/list')
        const keyData = await keyResponse.json()
        if (keyData.keys && keyData.keys.length > 0) {
          setApiKey(keyData.keys[0].api_key)
        } else {
          // Generate new key if none exists
          const genResponse = await fetch('/api/keys/generate', { method: 'POST' })
          const genData = await genResponse.json()
          if (genData.key) {
            setApiKey(genData.key)
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
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

  const setupInstructions = `
# CloudyNIC AI - Setup Instructions

## Your API Key
${apiKey}

## Using the API

### Free Plan
Use the free endpoint without authentication:
\`\`\`
GET https://cloudynic.com/prompt?message=Hello
\`\`\`

**Rate Limits:**
- 1 request per minute
- 100 requests per day

### Paid Plans (Pro & Pro Max)
Use your API key for authentication:
\`\`\`
POST https://cloudynic.com/api/chat
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "message": "Your message here"
}
\`\`\`

## Integration Example

\`\`\`javascript
const apiKey = '${apiKey}';

async function askCloudyNIC(message) {
  const response = await fetch('https://cloudynic.com/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  
  return response.json();
}
\`\`\`

## Support
Email: hello@cloudynic.com
  `.trim()

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="border-4 border-foreground p-8 mb-8">
          <h1 className="text-4xl font-bold mb-4">✓ PAYMENT SUCCESSFUL</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Welcome to CloudyNIC AI! Your {planType.toUpperCase()} plan is now active.
          </p>

          <div className="bg-card border-2 border-foreground p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">YOUR API KEY</h2>
            <div className="bg-foreground text-background p-4 font-mono text-sm break-all mb-4">
              {apiKey}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey)
                alert('API key copied to clipboard!')
              }}
              className="px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
            >
              COPY API KEY
            </button>
          </div>

          <div className="border-2 border-foreground p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">SETUP INSTRUCTIONS</h2>
            <pre className="bg-card p-4 overflow-x-auto text-sm mb-4 max-h-80 overflow-y-auto">
              <code>{setupInstructions}</code>
            </pre>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-6 py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center"
            >
              GO TO DASHBOARD
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-4 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-center"
            >
              BACK TO HOME
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">PLAN: {planType.toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground">
              {planType === 'free' && 'Perfect for testing. 100 requests per day.'}
              {planType === 'pro' && 'Great for projects. 10K requests per day.'}
              {planType === 'pro_max' && 'Unlimited access for production.'}
            </p>
          </div>

          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">RATE LIMITS</h3>
            <p className="text-sm text-muted-foreground">
              {planType === 'free' && '1 request per minute'}
              {planType === 'pro' && '30 requests per minute'}
              {planType === 'pro_max' && 'Unlimited'}
            </p>
          </div>

          <div className="border-2 border-foreground p-6">
            <h3 className="text-lg font-bold mb-2">SUPPORT</h3>
            <p className="text-sm">
              <a href="mailto:hello@cloudynic.com" className="text-foreground underline">
                hello@cloudynic.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
