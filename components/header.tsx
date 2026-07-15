'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await authClient.getSession()
        setUser(data?.session?.user || null)
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboard = pathname?.startsWith('/dashboard')

  if (isAuthPage || isDashboard) return null

  return (
    <header className="sticky top-0 z-50 bg-background border-b-2 border-foreground animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-foreground hover:scale-105 transition-transform">
            CLOUDYNIC
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              HOME
            </Link>
            <Link href="/pricing" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              PRICING
            </Link>
            <Link href="/about" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              ABOUT
            </Link>
            <Link href="/terms" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              TERMS
            </Link>
            <Link href="/privacy" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              PRIVACY
            </Link>
            <a href="mailto:hello@cloudynic.com" className="text-xs lg:text-sm font-bold hover:underline transition-smooth">
              SUPPORT
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
                    >
                      DASHBOARD
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
                    >
                      SIGN IN
                    </Link>
                    <Link
                      href="/sign-up"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth"
                    >
                      SIGN UP
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="block px-4 py-2 text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      SIGN IN
                    </Link>
                    <Link
                      href="/sign-up"
                      className="block px-4 py-2 text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      SIGN UP
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden flex flex-col gap-1.5 px-2 py-2 border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
          >
            <div className="w-5 h-0.5 bg-foreground"></div>
            <div className="w-5 h-0.5 bg-foreground"></div>
            <div className="w-5 h-0.5 bg-foreground"></div>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t-2 border-foreground pb-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              HOME
            </Link>
            <Link
              href="/pricing"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              PRICING
            </Link>
            <Link
              href="/about"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              ABOUT
            </Link>
            <Link
              href="/terms"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              TERMS
            </Link>
            <Link
              href="/privacy"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
              onClick={() => setMobileMenuOpen(false)}
            >
              PRIVACY
            </Link>
            <a
              href="mailto:hello@cloudynic.com"
              className="block px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-smooth"
            >
              SUPPORT
            </a>
            <div className="border-t-2 border-foreground pt-2 space-y-2">
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        DASHBOARD
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout()
                          setMobileMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth"
                      >
                        LOGOUT
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        className="block px-4 py-2 text-sm font-bold border-2 border-foreground hover:bg-foreground hover:text-background transition-smooth"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        LOGIN
                      </Link>
                      <Link
                        href="/auth/sign-up"
                        className="block px-4 py-2 text-sm font-bold bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        SIGN UP
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
