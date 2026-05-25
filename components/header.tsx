'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboard = pathname?.startsWith('/dashboard')

  if (isAuthPage || isDashboard) return null

  return (
    <header className="sticky top-0 z-50 bg-background border-b-2 border-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-foreground hover:underline">
            CLOUDYNIC
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-bold hover:underline">
              HOME
            </Link>
            <Link href="/pricing" className="text-sm font-bold hover:underline">
              PRICING
            </Link>
            <Link href="/about" className="text-sm font-bold hover:underline">
              ABOUT
            </Link>
            <a href="mailto:hello@cloudynic.com" className="text-sm font-bold hover:underline">
              SUPPORT
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-all"
                    >
                      DASHBOARD
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="px-4 py-2 text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-all"
                    >
                      LOGIN
                    </Link>
                    <Link
                      href="/auth/sign-up"
                      className="px-4 py-2 text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
                    >
                      SIGN UP
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
