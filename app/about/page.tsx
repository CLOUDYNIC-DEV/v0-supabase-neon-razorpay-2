'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-16 animate-fade-in-up">
          <h1 className="text-5xl font-bold mb-6">ABOUT CLOUDYNIC</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Cloudynic is building the future of accessible AI. We believe powerful AI should be affordable, customizable, and easy to use for everyone.
          </p>
        </div>

        {/* Leadership Section */}
        <div className="mb-20 border-4 border-foreground p-12 bg-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-3xl font-bold mb-12">LEADERSHIP</h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="border-2 border-foreground p-8 hover:shadow-lg transition-smooth hover:scale-105 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-2xl font-bold mb-2">ASHWIN</h3>
              <p className="text-sm text-muted-foreground mb-4 font-bold">FOUNDER & OWNER</p>
              <p className="leading-relaxed mb-4">
                Ashwin started Cloudynic with a vision to democratize AI technology. With years of experience in building scalable systems, Ashwin leads the company&apos;s strategic direction and ensures our platform remains affordable and accessible to all.
              </p>
              <p className="text-muted-foreground text-sm">
                Passionate about open-source and community-driven development.
              </p>
            </div>

            <div className="border-2 border-foreground p-8 hover:shadow-lg transition-smooth hover:scale-105 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-2xl font-bold mb-2">ADHARSH</h3>
              <p className="text-sm text-muted-foreground mb-4 font-bold">CEO</p>
              <p className="leading-relaxed mb-4">
                Adharsh brings extensive experience from leading multiple tech ventures. As CEO, Adharsh drives product innovation and business growth while maintaining Cloudynic&apos;s core mission of making AI affordable and accessible.
              </p>
              <p className="text-muted-foreground text-sm">
                Focus on customer success and sustainable growth.
              </p>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-3xl font-bold mb-8">OUR STORY</h2>
          <div className="space-y-6 text-lg leading-relaxed">
            <p>
              Cloudynic was born from a simple observation: powerful AI models exist, but accessing them shouldn&apos;t require breaking the bank or dealing with complex setups. Ashwin and Adharsh saw an opportunity to change that.
            </p>
            <p>
              Starting as a side project to explore LLM APIs, Cloudynic quickly evolved into a conviction that the future of AI requires democratization. We decided to build a platform that combines affordability with simplicity, allowing developers, startups, and enterprises to harness AI without the traditional barriers.
            </p>
            <p>
              Today, Cloudynic serves thousands of users across the globe. Our commitment remains unchanged: provide the best AI access at the best price, with the best support. We&apos;re not here to lock anyone in with expensive plans or confusing pricing. We&apos;re here to empower you to build with AI.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-12">OUR VALUES</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border-4 border-foreground p-8">
              <h3 className="text-xl font-bold mb-3">AFFORDABILITY</h3>
              <p className="text-muted-foreground">
                AI shouldn&apos;t be expensive. We price our plans to be accessible to everyone, from hobbyists to enterprises.
              </p>
            </div>
            <div className="border-4 border-foreground p-8">
              <h3 className="text-xl font-bold mb-3">SIMPLICITY</h3>
              <p className="text-muted-foreground">
                Complex APIs hurt developers. Our REST API is straightforward, well-documented, and easy to integrate.
              </p>
            </div>
            <div className="border-4 border-foreground p-8">
              <h3 className="text-xl font-bold mb-3">TRANSPARENCY</h3>
              <p className="text-muted-foreground">
                No hidden fees. No surprise charges. What you see is what you pay. Full transparency in everything we do.
              </p>
            </div>
            <div className="border-4 border-foreground p-8">
              <h3 className="text-xl font-bold mb-3">CUSTOMIZATION</h3>
              <p className="text-muted-foreground">
                Every project is unique. We provide flexible API options so you can build exactly what you need.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border-4 border-foreground p-12 bg-card text-center">
          <h2 className="text-3xl font-bold mb-6">READY TO BUILD WITH US?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of developers building the future with CloudyNIC AI.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-block px-8 py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
          >
            GET STARTED FREE
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-20 pt-12 border-t-4 border-foreground text-center">
          <h3 className="text-2xl font-bold mb-4">HAVE QUESTIONS?</h3>
          <p className="text-lg mb-6">
            We&apos;d love to hear from you. Reach out anytime.
          </p>
          <a
            href="mailto:hello@cloudynic.com"
            className="inline-block px-8 py-4 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all"
          >
            hello@cloudynic.com
          </a>
        </div>
      </section>
    </main>
  )
}
