'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Header from '@/components/header'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await authClient.getSession()

        if (!data?.session?.user) {
          router.push('/sign-in')
          return
        }

        setSession(data.session)

        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfile(profileData.profile)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/')
  }

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

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {session?.user?.name || session?.user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-sm sm:text-base"
          >
            SIGN OUT
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Plan Card */}
          <div className="border-4 border-foreground p-6">
            <h2 className="text-lg font-bold mb-4">CURRENT PLAN</h2>
            <div className="mb-4">
              <p className="text-3xl font-bold capitalize">
                {profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'ultimate' ? 'Pro Max' : 'Free'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {profile?.plan === 'pro' && '₹199/month - 10,000 requests/day'}
                {profile?.plan === 'ultimate' && '₹999/month - Unlimited requests'}
                {profile?.plan === 'free' && 'Free tier - 100 requests/day'}
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-block px-4 py-2 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-sm"
            >
              UPGRADE PLAN
            </Link>
          </div>

          {/* Credits Card */}
          <div className="border-4 border-foreground p-6">
            <h2 className="text-lg font-bold mb-4">CREDITS</h2>
            <div className="mb-4">
              <p className="text-3xl font-bold">{profile?.credits?.toLocaleString() || 0}</p>
              <p className="text-sm text-muted-foreground mt-2">Available credits</p>
            </div>
            <div className="w-full bg-card border-2 border-foreground h-2 overflow-hidden">
              <div
                className="bg-foreground h-full transition-all"
                style={{
                  width: `${Math.min(100, ((profile?.credits || 0) / 10000) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* API Calls Card */}
          <div className="border-4 border-foreground p-6">
            <h2 className="text-lg font-bold mb-4">API CALLS</h2>
            <div className="mb-4">
              <p className="text-3xl font-bold">{profile?.apiCalls?.toLocaleString() || 0}</p>
              <p className="text-sm text-muted-foreground mt-2">Total API calls used</p>
            </div>
            <Link
              href="/pricing"
              className="inline-block px-4 py-2 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-sm"
            >
              VIEW DOCS
            </Link>
          </div>
        </div>

        {/* Account Settings */}
        <div className="border-4 border-foreground p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6">ACCOUNT SETTINGS</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold">Email Address</p>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
            </div>
            <div className="border-t border-foreground pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold">Full Name</p>
                <p className="text-sm text-muted-foreground">{session?.user?.name || 'Not set'}</p>
              </div>
            </div>
            <div className="border-t border-foreground pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/pricing"
            className="border-2 border-foreground p-4 text-center font-bold hover:bg-foreground hover:text-background transition-all text-sm sm:text-base"
          >
            PRICING
          </Link>
          <Link
            href="/payment-success"
            className="border-2 border-foreground p-4 text-center font-bold hover:bg-foreground hover:text-background transition-all text-sm sm:text-base"
          >
            API SETUP
          </Link>
          <a
            href="mailto:hello@cloudynic.com"
            className="border-2 border-foreground p-4 text-center font-bold hover:bg-foreground hover:text-background transition-all text-sm sm:text-base"
          >
            SUPPORT
          </a>
          <Link
            href="/"
            className="border-2 border-foreground p-4 text-center font-bold hover:bg-foreground hover:text-background transition-all text-sm sm:text-base"
          >
            HOME
          </Link>
        </div>
      </div>
    </main>
  )
}
