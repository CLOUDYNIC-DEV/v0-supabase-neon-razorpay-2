'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-5xl font-bold mb-12 border-b-4 border-foreground pb-6">
          TERMS OF SERVICE
        </h1>

        <div className="space-y-8 text-foreground">
          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">1. DISCLAIMER - AI GENERATED CONTENT</h2>
            <p className="mb-4 leading-relaxed">
              CloudyNIC AI uses artificial intelligence models to generate responses. AI outputs may contain errors, inaccuracies, biases, or harmful content. Users are solely responsible for verifying any information before taking action based on our AI responses.
            </p>
            <p className="leading-relaxed">
              <strong>DO NOT rely on CloudyNIC AI for:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Medical or legal advice</li>
              <li>Financial decisions</li>
              <li>Safety-critical applications</li>
              <li>Any content requiring human verification</li>
            </ul>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">2. USER RESPONSIBILITIES</h2>
            <p className="leading-relaxed">
              Users are responsible for verifying all output from CloudyNIC AI before implementation. The service is provided "AS IS" without any warranties or guarantees of accuracy, completeness, or usefulness.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">3. ACCEPTABLE USE POLICY</h2>
            <p className="mb-3 leading-relaxed">Users agree NOT to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the API for illegal activities</li>
              <li>Generate malicious, harmful, or offensive content</li>
              <li>Attempt to reverse-engineer or access unauthorized features</li>
              <li>Resell API access without permission</li>
              <li>Exceed rate limits or attempt DoS attacks</li>
            </ul>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">4. LIMITATION OF LIABILITY</h2>
            <p className="leading-relaxed">
              CloudyNIC is not liable for any damages, losses, or consequences arising from the use of our service, including but not limited to: financial losses, data loss, business interruption, or indirect damages.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">5. SERVICE AVAILABILITY</h2>
            <p className="leading-relaxed">
              We provide the service on a best-effort basis. CloudyNIC may experience downtime, rate limiting, or service interruptions without liability. We reserve the right to modify or discontinue the service with notice.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">6. INTELLECTUAL PROPERTY</h2>
            <p className="leading-relaxed">
              The CloudyNIC platform and underlying AI models are proprietary. Users retain rights to their input data but grant CloudyNIC a license to process it. Generated content may be similar to existing works due to training data.
            </p>
          </div>

          <div className="border-l-4 border-foreground pl-6">
            <h2 className="text-2xl font-bold mb-3">7. TERMINATION</h2>
            <p className="leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms or abuse the service.
            </p>
          </div>

          <div className="bg-secondary border-2 border-foreground p-6 my-8">
            <p className="font-bold text-lg mb-2">⚠️ IMPORTANT LEGAL DISCLAIMER</p>
            <p className="text-sm leading-relaxed">
              By using CloudyNIC AI, you acknowledge and accept that you use this service entirely at your own risk. Always verify AI-generated content independently. CloudyNIC cannot and should not be used for professional advice in legal, medical, financial, or safety-critical domains. In case of any doubt, consult with qualified human professionals.
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
