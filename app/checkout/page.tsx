'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Header from '@/components/header'
import Link from 'next/link'

const PLANS = {
  pro: { name: 'Pro', price: 199, requestsPerDay: 10000, description: 'Perfect for small projects' },
  pro_max: { name: 'Pro Max', price: 999, requestsPerDay: 'Unlimited', description: 'Best for production apps' },
}

declare global {
  interface Window {
    Razorpay: any
  }
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState('')

  const planId = (searchParams.get('plan') as keyof typeof PLANS) || 'pro'
  const plan = PLANS[planId]

  useEffect(() => {
    const getSession = async () => {
      const { data } = await authClient.getSession()
      if (!data?.session?.user) {
        router.push('/sign-in')
      } else {
        setSession(data.session)
      }
    }
    getSession()
  }, [router])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handlePayment = async () => {
    if (!session?.user) {
      setError('Session expired. Please sign in again.')
      router.push('/sign-in')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create order on backend
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          amount: plan.price / 100, // Convert paise to rupees
        }),
      })

      const orderData = await response.json()

      if (!response.ok) {
        setError(orderData.error || 'Failed to create order')
        setLoading(false)
        return
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: plan.price,
        currency: 'INR',
        name: 'Cloudynic AI',
        description: `${plan.name} Plan Subscription`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok) {
              router.push('/payment-success')
            } else {
              setError(verifyData.error || 'Payment verification failed')
              setLoading(false)
            }
          } catch (err: any) {
            setError(err.message || 'Error verifying payment')
            setLoading(false)
          }
        },
        prefill: {
          email: session?.user?.email || '',
          name: session?.user?.name || '',
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err: any) {
      setError(err.message || 'Failed to process payment')
      setLoading(false)
    }
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full border-4 border-foreground p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">CHECKOUT</h1>

        <div className="border-4 border-foreground p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{plan.name} Plan</h2>
            <div className="text-4xl sm:text-5xl font-bold mb-2">
              ₹{plan.price}
              <span className="text-lg sm:text-xl text-muted-foreground">/month</span>
            </div>
            <p className="text-muted-foreground mb-4">{plan.description}</p>
            <div className="space-y-2 text-muted-foreground mb-8">
              <p>✓ {typeof plan.requestsPerDay === 'number' ? `${plan.requestsPerDay.toLocaleString()} requests/day` : 'Unlimited requests'}</p>
              <p>✓ Priority support</p>
              <p>✓ API access</p>
            </div>
          </div>

          {error && (
            <div className="bg-background border-2 border-red-500 text-red-500 p-4 mb-6 text-sm sm:text-base">
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-6 sm:px-8 py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? 'PROCESSING...' : `PAY ₹${plan.price}`}
          </button>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
            Secure payment powered by Razorpay
          </p>

          <div className="mt-8 pt-8 border-t border-foreground">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground text-sm">
              ← Back to pricing
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
