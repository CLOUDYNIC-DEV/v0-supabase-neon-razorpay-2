'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/header'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        'Welcome to Cloudynic AI! I am your AI assistant. You have 3 free demo messages per IP address. Sign up to unlock unlimited usage with our affordable pricing plans.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageCount, setMessageCount] = useState(1)
  const [canChat, setCanChat] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !canChat) return

    const currentCount = messageCount
    if (currentCount >= 3) {
      setCanChat(false)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    const messageText = input
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
        }
        setMessages((prev) => [...prev, assistantMessage])
        const newCount = currentCount + 1
        setMessageCount(newCount)

        if (newCount >= 3) {
          setCanChat(false)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.error || 'An error occurred. Please try again.',
          },
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Failed to get a response. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1 className="text-6xl font-bold mb-6 leading-tight animate-fade-in-up">
              AFFORDABLE AI FOR ALL
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Powerful, customizable AI platform built for everyone. Simple API integration with flexible pricing. No hidden fees.
            </p>
            <div className="flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link
                href="/pricing"
                className="px-8 py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth hover:scale-105"
              >
                VIEW PRICING
              </Link>
              <Link
                href="/auth/sign-up"
                className="px-8 py-4 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-smooth hover:scale-105"
              >
                GET STARTED
              </Link>
            </div>
          </div>

          {/* Demo Chat */}
          <div className="border-4 border-foreground bg-card flex flex-col h-96 animate-pulse-slow">
            <div className="bg-foreground text-background p-4 font-bold border-b-2 border-foreground flex justify-between items-center">
              <span>DEMO CHAT ({messageCount}/3)</span>
              <span className="text-xs opacity-75">AI may make mistakes - verify before action</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-card/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 border-2 rounded-sm ${msg.role === 'user'
                      ? 'bg-foreground text-background border-foreground font-medium'
                      : 'bg-card text-foreground border-foreground shadow-sm'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {!canChat && messageCount >= 3 && (
              <div className="border-t-2 border-foreground p-4 bg-secondary">
                <p className="text-sm font-bold mb-3">Demo limit reached!</p>
                <Link
                  href="/auth/sign-up"
                  className="block w-full px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center"
                >
                  SIGN UP FOR UNLIMITED
                </Link>
              </div>
            )}

            {canChat && (
              <form onSubmit={handleSendMessage} className="border-t-2 border-foreground p-4 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={loading || !canChat}
                  className="flex-1 px-3 py-2 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !canChat}
                  className="px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50"
                >
                  {loading ? '...' : 'SEND'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card border-y-2 border-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold mb-12 text-center animate-fade-in-up">WHY CLOUDYNIC?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-foreground p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105">
              <h3 className="text-xl font-bold mb-3">AFFORDABLE</h3>
              <p className="text-muted-foreground">Start free with 100 requests per day. Scale with our Pro and Pro Max plans at just $1 and $5/month.</p>
            </div>
            <div className="border-2 border-foreground p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xl font-bold mb-3">CUSTOMIZABLE</h3>
              <p className="text-muted-foreground">Build exactly what you need with our flexible API. Full control over parameters and model behavior.</p>
            </div>
            <div className="border-2 border-foreground p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-xl font-bold mb-3">SIMPLE</h3>
              <p className="text-muted-foreground">RESTful API with clear documentation. Get started in minutes, not hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 border-t-4 border-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">CLOUDYNIC</h4>
              <p className="text-sm opacity-75">Affordable AI for everyone.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">PRODUCT</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <Link href="/pricing" className="hover:underline">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:underline">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">SUPPORT</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <a href="mailto:hello@cloudynic.com" className="hover:underline">
                    hello@cloudynic.com
                  </a>
                </li>
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">LEGAL</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <Link href="/terms" className="hover:underline">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:underline">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">LEGAL</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <a href="#" className="hover:underline">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background pt-8 text-center text-sm opacity-75">
            <p>&copy; 2026 CloudyNIC. Built with purpose.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
