'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function Pricing() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">PRICING PLANS</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="border-4 border-foreground p-8 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">FREE</h2>
            <p className="text-muted-foreground mb-6">For testing and small projects</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>100 requests/day</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>1 req/minute rate limit</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>API access</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Basic support</span>
              </li>
              <li className="flex gap-3">
                <span className="text-muted-foreground">✗</span>
                <span className="text-muted-foreground">Priority support</span>
              </li>
              <li className="flex gap-3">
                <span className="text-muted-foreground">✗</span>
                <span className="text-muted-foreground">Custom model</span>
              </li>
            </ul>

            <Link
              href="/auth/sign-up"
              className="w-full px-6 py-3 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-center"
            >
              GET STARTED
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="border-4 border-foreground p-8 flex flex-col bg-card ring-2 ring-foreground ring-offset-0">
            <div className="mb-4 inline-block bg-foreground text-background px-3 py-1 w-fit font-bold text-sm">
              POPULAR
            </div>
            <h2 className="text-2xl font-bold mb-2">PRO</h2>
            <p className="text-muted-foreground mb-6">For growing applications</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">$1</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>10,000 requests/day</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>30 req/minute rate limit</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>API access</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Priority email support</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Usage analytics</span>
              </li>
              <li className="flex gap-3">
                <span className="text-muted-foreground">✗</span>
                <span className="text-muted-foreground">Custom model</span>
              </li>
            </ul>

            <Link
              href="/auth/sign-up"
              className="w-full px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center"
            >
              UPGRADE TO PRO
            </Link>
          </div>

          {/* Pro Max Plan */}
          <div className="border-4 border-foreground p-8 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">PRO MAX</h2>
            <p className="text-muted-foreground mb-6">For enterprise needs</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">$5</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Unlimited requests</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Unlimited rate limit</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>API access</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>24/7 priority support</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Advanced analytics</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">✓</span>
                <span>Custom model support</span>
              </li>
            </ul>

            <Link
              href="/auth/sign-up"
              className="w-full px-6 py-3 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-center"
            >
              UPGRADE TO PRO MAX
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 border-t-4 border-foreground pt-16">
          <h2 className="text-4xl font-bold mb-12 text-center">FAQ</h2>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="border-2 border-foreground p-6">
              <h3 className="font-bold mb-2">Can I change my plan?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="border-2 border-foreground p-6">
              <h3 className="font-bold mb-2">What happens when I reach my daily limit?</h3>
              <p className="text-muted-foreground">
                You&apos;ll receive a 429 (Too Many Requests) error. Limits reset daily at midnight UTC.
              </p>
            </div>
            <div className="border-2 border-foreground p-6">
              <h3 className="font-bold mb-2">Is there a setup fee?</h3>
              <p className="text-muted-foreground">
                No hidden fees. You only pay what&apos;s listed. Cancel anytime.
              </p>
            </div>
            <div className="border-2 border-foreground p-6">
              <h3 className="font-bold mb-2">Do you offer custom pricing?</h3>
              <p className="text-muted-foreground">
                For enterprise needs, contact us at hello@cloudynic.com for custom pricing options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
