'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-5xl font-bold mb-12 border-b-4 border-foreground pb-6">
          PRIVACY POLICY
        </h1>

        <div className="space-y-8 text-foreground">
          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">1. DATA PROTECTION COMMITMENT</h2>
            <p className="leading-relaxed">
              CloudyNIC takes your privacy seriously. We implement industry-standard security measures to protect your personal data, API keys, passwords, and usage information.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">2. WHAT DATA WE COLLECT</h2>
            <p className="mb-3 leading-relaxed">We collect:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Email address and account credentials (password hashed with bcrypt)</li>
              <li>API usage statistics and request logs (stripped of sensitive content)</li>
              <li>Subscription and payment information (handled via Razorpay)</li>
              <li>Device IP address for rate limiting and fraud prevention</li>
              <li>Error logs for debugging (without storing user input)</li>
            </ul>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">3. API KEY & PASSWORD SECURITY</h2>
            <div className="bg-secondary border-2 border-foreground p-4 mb-4">
              <p className="font-bold mb-2">🔐 API Keys & Passwords are:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Stored using industry-standard encryption</li>
                <li>Never logged in plain text</li>
                <li>Protected from unauthorized access</li>
                <li>Only accessible to your account</li>
                <li>Can be regenerated or revoked anytime</li>
              </ul>
            </div>
            <p className="leading-relaxed">
              <strong>Your responsibility:</strong> Never share your API keys or passwords. Treat them as secrets. If compromised, regenerate them immediately from your dashboard.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">4. COOKIE & SESSION SECURITY</h2>
            <div className="bg-secondary border-2 border-foreground p-4 mb-4">
              <p className="font-bold mb-2">🍪 Your Cookies are:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>HttpOnly (cannot be accessed by JavaScript)</li>
                <li>Secure (only transmitted over HTTPS)</li>
                <li>SameSite restricted (prevents CSRF attacks)</li>
                <li>Short-lived (expire after inactivity)</li>
                <li>Never shared with third parties</li>
              </ul>
            </div>
            <p className="leading-relaxed">
              We do NOT sell, share, or misuse your cookie data. Sessions are encrypted and managed securely by Supabase Auth.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">5. DATA USAGE</h2>
            <p className="mb-3 leading-relaxed">We use your data ONLY for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Providing the CloudyNIC AI service</li>
              <li>Processing payments and subscriptions</li>
              <li>Rate limiting and fraud prevention</li>
              <li>Improving service quality and reliability</li>
              <li>Communicating important updates</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              <strong>We NEVER:</strong> Sell user data, use it for advertising, share with third parties (except Razorpay for payments), or train AI models on your API queries.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">6. THIRD-PARTY SERVICES</h2>
            <p className="mb-3 leading-relaxed">We use:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Razorpay</strong> - Payment processing</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Each service has its own privacy policy. We recommend reviewing them. These services are bound by data processing agreements and cannot use your data for other purposes.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">7. DATA RETENTION</h2>
            <p className="leading-relaxed">
              We retain personal data only as long as necessary. You can request data deletion anytime. API usage logs are retained for 90 days for billing and rate limiting purposes.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">8. YOUR RIGHTS</h2>
            <p className="mb-3 leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access your personal data</li>
              <li>Request corrections or deletions</li>
              <li>Export your data</li>
              <li>Revoke API keys and sessions</li>
              <li>Contact us with privacy concerns</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Email: <a href="mailto:hello@cloudynic.com" className="underline font-bold">hello@cloudynic.com</a>
            </p>
          </div>

          <div className="bg-secondary border-2 border-foreground p-6 my-8">
            <p className="font-bold text-lg mb-2">🛡️ SECURITY GUARANTEE</p>
            <p className="text-sm leading-relaxed">
              CloudyNIC uses encryption (SSL/TLS), secure password hashing (bcrypt), and industry-best practices for data protection. However, no system is 100% secure. If you suspect a security breach, contact us immediately at hello@cloudynic.com.
            </p>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Last updated: May 2026</p>
            <Link href="/" className="px-6 py-3 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all">
              BACK TO HOME
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
