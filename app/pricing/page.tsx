'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function Pricing() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-balance">PRICING PLANS</h1>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground text-balance">
            Choose the plan that fits your needs. Non-refundable payments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Free Plan */}
          <div className="border-4 border-foreground p-4 sm:p-6 md:p-8 flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">FREE</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">For testing and small projects</p>

            <div className="mb-4 sm:mb-6">
              <span className="text-3xl sm:text-4xl font-bold">$0</span>
              <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">100 requests/day</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">1 req/min limit</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">API access</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">Basic support</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="text-muted-foreground flex-shrink-0">✗</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Priority support</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="text-muted-foreground flex-shrink-0">✗</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Custom model</span>
              </li>
            </ul>

            <Link
              href="/auth/sign-up"
              className="w-full px-4 sm:px-6 py-2 sm:py-3 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-center animate-fade-in-up text-xs sm:text-sm"
            >
              GET STARTED FREE
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="border-4 border-foreground p-4 sm:p-6 md:p-8 flex flex-col bg-card ring-2 ring-foreground ring-offset-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">PRO</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">For growing companies</p>

            <div className="mb-4 sm:mb-6">
              <span className="text-3xl sm:text-4xl font-bold">$1.99</span>
              <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">10,000 requests/day</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">30 req/min limit</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">API access</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">Priority support</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="text-muted-foreground flex-shrink-0">✗</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Custom model</span>
              </li>
            </ul>

            <Link
              href="/checkout?plan=pro"
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-xs sm:text-sm"
            >
              CHOOSE PRO
            </Link>
          </div>

          {/* Pro Max Plan */}
          <div className="border-4 border-foreground p-4 sm:p-6 md:p-8 flex flex-col animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="mb-3 sm:mb-4 inline-block bg-foreground text-background px-2 sm:px-3 py-1 w-fit font-bold text-xs sm:text-sm">
              POPULAR
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">PRO MAX</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">For large scale</p>

            <div className="mb-4 sm:mb-6">
              <span className="text-3xl sm:text-4xl font-bold">$9.99</span>
              <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">Unlimited requests</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">Unlimited rate limit</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">API access</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">24/7 support</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold flex-shrink-0">✓</span>
                <span className="text-xs sm:text-sm">Custom models</span>
              </li>
            </ul>

            <Link
              href="/checkout?plan=pro_max"
              className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-xs sm:text-sm"
            >
              CHOOSE PRO MAX
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 sm:mt-16 md:mt-20 border-t-4 border-foreground pt-8 sm:pt-12 md:pt-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center text-balance">FAQ</h2>
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
            <div className="border-2 border-foreground p-4 sm:p-6">
              <h3 className="font-bold mb-2 text-sm sm:text-base">What happens when I reach my daily limit?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                You&apos;ll receive a 429 (Too Many Requests) error. Limits reset daily at midnight UTC.
              </p>
            </div>
            <div className="border-2 border-foreground p-4 sm:p-6">
              <h3 className="font-bold mb-2 text-sm sm:text-base">Is there a setup fee?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No hidden fees. You only pay what&apos;s listed.
              </p>
            </div>
            <div className="border-2 border-foreground p-4 sm:p-6">
              <h3 className="font-bold mb-2 text-sm sm:text-base">Do you offer custom pricing?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                For enterprise needs, contact us at hello@cloudynic.com for custom pricing options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
