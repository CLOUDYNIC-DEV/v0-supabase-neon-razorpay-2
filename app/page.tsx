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
        'Welcome to Cloudynic AI! I am your AI assistant. You have 3 free demo messages. Sign up to unlock unlimited usage with our affordable pricing plans.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageCount, setMessageCount] = useState(1)
  const [canChat, setCanChat] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Don't auto-scroll the page - let user control scroll
  // This prevents the page from jumping when messages arrive

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

      if (!response.ok) {
        const errorData = await response.json()
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: errorData.error || 'An error occurred. Please try again.',
          },
        ])
        return
      }

      // Handle streaming response (SSE format)
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        const assistantMessageId = (Date.now() + 1).toString()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
          },
        ])

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6)
                if (jsonStr.trim()) {
                  try {
                    const jsonData = JSON.parse(jsonStr)
                    if (jsonData.choices?.[0]?.delta?.content) {
                      fullContent += jsonData.choices[0].delta.content
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: fullContent }
                            : msg
                        )
                      )
                    }
                  } catch (e) {
                    // Skip parsing errors for individual chunks
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        const newCount = currentCount + 1
        setMessageCount(newCount)

        if (newCount >= 3) {
          setCanChat(false)
        }
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="animate-fade-in-up order-2 md:order-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight animate-fade-in-up text-balance">
              AFFORDABLE AI FOR ALL
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed animate-fade-in-up text-balance" style={{ animationDelay: '0.1s' }}>
              Launch Your Own ChatGPT like AI app with Unlimited user requests for Just $9
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link
                href="/pricing"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-smooth hover:scale-105 text-center text-sm sm:text-base"
              >
                VIEW PRICING
              </Link>
              <Link
                href="/auth/sign-up"
                className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-smooth hover:scale-105 text-center text-sm sm:text-base"
              >
                GET STARTED
              </Link>
            </div>
          </div>

          {/* Demo Chat */}
          <div className="border-4 border-foreground bg-card flex flex-col h-80 sm:h-96 animate-pulse-slow order-1 md:order-2" style={{ maxHeight: '24rem' }}>
            <div className="bg-foreground text-background p-3 sm:p-4 font-bold border-b-2 border-foreground flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
              <span className="text-sm sm:text-base">DEMO CHAT ({messageCount}/3)</span>
              <span className="text-xs opacity-75 text-balance">AI may make mistakes</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-card/50 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up px-1`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-sm ${msg.role === 'user'
                      ? 'bg-foreground text-background border-foreground font-medium'
                      : 'bg-card text-foreground border-foreground shadow-sm'
                      }`}
                  >
                    <p className="text-xs sm:text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {!canChat && messageCount >= 3 && (
              <div className="border-t-2 border-foreground p-3 sm:p-4 bg-secondary">
                <p className="text-xs sm:text-sm font-bold mb-3">Demo limit reached!</p>
                <Link
                  href="/auth/sign-up"
                  className="block w-full px-3 sm:px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-xs sm:text-sm"
                >
                  SIGN UP FOR UNLIMITED
                </Link>
              </div>
            )}

            {canChat && (
              <form onSubmit={handleSendMessage} className="border-t-2 border-foreground p-2 sm:p-3 flex gap-1 sm:gap-2 items-center overflow-hidden">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type message..."
                  disabled={loading || !canChat}
                  className="flex-1 min-w-0 px-2 sm:px-3 py-2 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50 text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !canChat}
                  className="flex-shrink-0 px-2 sm:px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50 text-xs sm:text-sm"
                  title="Send message"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center animate-fade-in-up text-balance">WHY CLOUDYNIC?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="border-2 border-foreground p-4 sm:p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Unlimited Power</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Scale with our Unlimited Pro Max plan at just $9/month.</p>
            </div>
            <div className="border-2 border-foreground p-4 sm:p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg sm:text-xl font-bold mb-3">CUSTOMIZABLE</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Build exactly what you need with our flexible API. Full control over parameters and model behavior.</p>
            </div>
            <div className="border-2 border-foreground p-4 sm:p-6 animate-fade-in-up hover:shadow-lg transition-smooth hover:scale-105" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-lg sm:text-xl font-bold mb-3">SIMPLE</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">RESTful API with clear documentation. Get started in minutes, not hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 sm:py-12 border-t-4 border-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-sm sm:text-base">CLOUDYNIC</h4>
              <p className="text-xs sm:text-sm opacity-75">Affordable AI for everyone.</p>
            </div>
            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-sm sm:text-base">PRODUCT</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm opacity-75">
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
              <h4 className="font-bold mb-2 sm:mb-4 text-sm sm:text-base">SUPPORT</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm opacity-75">
                <li>
                  <a href="mailto:hello@cloudynic.com" className="hover:underline break-all">
                    hello@cloudynic.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-sm sm:text-base">LEGAL</h4>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm opacity-75">
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
          </div>
          <div className="border-t border-background pt-6 sm:pt-8 text-center text-xs sm:text-sm opacity-75">
            <p>&copy; 2026 Cloudynic. Built with purpose.</p>
          </div>
        </div>
      </footer>
    </main >
  )
}
