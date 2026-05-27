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

      loading && setLoading(false)
    }

    checkAuth()
  }, [router, loading])

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-balance">DASHBOARD</h1>
            <p className="text-xs sm:text-sm text-muted-foreground break-all">Welcome, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 sm:px-6 py-2 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-xs sm:text-sm whitespace-nowrap"
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
        <div className="mb-8 sm:mb-12 border-4 border-foreground p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">CURRENT PLAN</h2>

          {subscription ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-foreground pb-3 sm:pb-4 gap-2 sm:gap-0">
                <span className="text-sm sm:text-base font-bold">Plan Type:</span>
                <span className="text-sm sm:text-base font-bold uppercase">{subscription.plan_type}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-foreground pb-3 sm:pb-4 gap-2 sm:gap-0">
                <span className="text-sm sm:text-base font-bold">Status:</span>
                <span className="text-sm sm:text-base uppercase">{subscription.status}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-foreground pb-3 sm:pb-4 gap-2 sm:gap-0">
                <span className="text-sm sm:text-base font-bold">Monthly Cost:</span>
                <span className="text-sm sm:text-base font-bold">${subscription.monthly_cost}/month</span>
              </div>
              {subscription.renewal_date && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                  <span className="text-sm sm:text-base font-bold">Renewal Date:</span>
                  <span className="text-sm sm:text-base">
                    {new Date(subscription.renewal_date).toLocaleDateString()}
                  </span>
                </div>
              )}

              <Link
                href="/pricing"
                className="block mt-6 sm:mt-8 px-4 sm:px-6 py-2 sm:py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-xs sm:text-sm"
              >
                UPGRADE PLAN
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs sm:text-sm md:text-base mb-4 sm:mb-6">You don&apos;t have a plan yet.</p>
              <Link
                href="/pricing"
                className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-xs sm:text-sm"
              >
                CHOOSE A PLAN
              </Link>
            </div>
          )}
        </div>

        {/* API Keys Section */}
        <div className="border-4 border-foreground p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">API KEYS</h2>

          {apiKeys.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border-2 border-foreground p-3 sm:p-4 bg-card"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-muted-foreground mb-1 break-all">
                        {key.key_name || 'Unnamed Key'}
                      </p>
                      <p className="font-mono text-xs break-all bg-background p-2 border border-foreground mb-2 overflow-x-auto">
                        {key.api_key}
                      </p>
                      <button
                        onClick={(e) => {
                          navigator.clipboard.writeText(key.api_key)
                          const btn = e.currentTarget
                          const originalText = btn.textContent
                          btn.textContent = '✓ COPIED'
                          setTimeout(() => {
                            btn.textContent = originalText
                          }, 1500)
                        }}
                        className="text-xs px-2 py-1 border border-foreground hover:bg-foreground hover:text-background transition-all font-bold"
                      >
                        COPY
                      </button>
                    </div>
                    <span
                      className={`px-2 sm:px-3 py-1 font-bold text-xs whitespace-nowrap border-2 border-foreground ${
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

          {/* Core Technical Reference Block */}
          <div className="mt-8 border-t-2 border-foreground pt-8">
            <h3 className="text-xl font-bold mb-4">TECHNICAL SPECIFICATIONS</h3>
            <div className="bg-card border-2 border-foreground p-4 space-y-4">
              <div>
                <p className="font-bold text-xs mb-1">API ENDPOINT:</p>
                <p className="text-xs font-mono bg-background p-2 border border-foreground break-all">
                  https://cloudynic.com/api/v1/prompt
                </p>
              </div>
              <div>
                <p className="font-bold text-xs mb-1">RATE LIMITS:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc text-muted-foreground">
                  <li><strong className="text-foreground">Free:</strong> 1 req/min, 100 req/day (IP-based)</li>
                  <li><strong className="text-foreground">Pro:</strong> 30 req/min, 10,000 req/day</li>
                  <li><strong className="text-foreground">Pro Max:</strong> Unlimited usage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* New 1-Click Complete Setup Deployment Manual */}
        <div className="border-4 border-foreground p-4 sm:p-6 md:p-8 bg-card">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">DEPLOY YOUR CHAT APP AND EARN WITH ADS.</h2>
          <div className="space-y-6 text-sm">
            
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">1</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-1">Fork the Official Repository</p>
                <p className="text-muted-foreground mb-3">Sign up or log in to your account at GitHub. Then, visit the official source repository and click the <strong>"Fork"</strong> button in the top-right to copy it into your own account.</p>
                <a 
                  href="https://github.com/CLOUDYNIC-DEV/AI-APP" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-bold px-3 py-1.5 border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-all"
                >
                  VISIT REPOSITORY ↗
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">2</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-1">Configure Your Back-End Variables</p>
                <p className="text-muted-foreground mb-3">Inside your newly forked repository, navigate to and edit the file located at <code className="bg-background px-1 border font-mono text-xs">netlify/functions/chat.js</code>. You can edit these configurations on that code to make it yours.</p>
                <pre className="text-xs bg-background p-3 border border-foreground font-mono overflow-x-auto whitespace-pre block leading-relaxed">
{`// CHAT API CONFIGURATION
const API_KEY = "YOUR_API_KEY_HERE"; // Copy an active key from the section above
const TRAIN_TEXT = "Your Custom Training System Context Instructions";
const APP_NAME = "Your Premium AI Brand Name";

// ADSENSE MONETIZATION CONFIGURATION
const ADSENSE_PUBLISHER_ID = "ca-pub-XXXXXXXXXXXXXXXX"; // Your real AdSense Pub ID
const TOP_BANNER_AD_SLOT   = "1234567890";            // Your top layout ad unit slot
const BOTTOM_BOX_AD_SLOT   = "0987654321";            // Your bottom layout ad unit slot`}
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">3</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-1">Deploy Live to Netlify</p>
                <p className="text-muted-foreground mb-2">Go to <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-foreground">Netlify.com</a> and sign up or sign in using your <strong>GitHub account</strong>. Click <strong>"Add new site"</strong>, choose <strong>"Import an existing project"</strong>, select your newly forked repository, and click <strong>"Deploy"</strong>.</p>
                <p className="text-xs text-muted-foreground bg-background p-2 border border-dashed border-foreground"> Boom! Your dynamic, chat web app infrastructure initializes instantly and goes live. Now you can access it using the URL highlighted. </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">4</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-1">Production Domain &amp; Monetization Approval</p>
                <ul className="list-disc ml-4 space-y-2 text-muted-foreground">
                  <li><strong>Custom Branding:</strong> Inside your site dashboard on Netlify, access your <strong>Domain Configuration</strong> settings to point the platform to your custom domain if you own one.</li>
                  <li><strong>Activate Monetization Earnings:</strong> Sign up for an account at <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-foreground">Google AdSense</a>. Once your custom domain is approved by Google, fill out your unique publisher variable blocks in step 2. Ad units will launch automatically to begin gathering ad revenue stream earnings. And you are totally done.</li>
                  <li>Now you can sit on your sofa and rest while the app is earning without any work. Enjoy your earnings.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
