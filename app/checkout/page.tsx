'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/header'

const PLANS = {
  free: { name: 'Free', price: 0, requests_per_minute: 1, requests_per_day: 100 },
  pro: { name: 'Pro', price: 1.99, requests_per_minute: 30, requests_per_day: 10000 },
  pro_max: { name: 'Pro Max', price: 9.99, requests_per_minute: 999, requests_per_day: 999999 },
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  const planId = (searchParams.get('plan') as keyof typeof PLANS) || 'pro'
  const plan = PLANS[planId]

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/auth/login')
      } else {
        setUser(data.user)
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handlePayment = async () => {
    if (plan.price === 0) {
      // Free plan - no payment needed
      await saveFreeSubscription()
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
          amount: plan.price,
          user_id: user.id,
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
        amount: Math.round(plan.price * 100),
        currency: 'USD',
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
                user_id: user.id,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok) {
              router.push('/payment-success')
            } else {
              setError(verifyData.error || 'Payment verification failed')
            }
          } catch (err) {
            setError('Error verifying payment')
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#000000',
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      setError('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const saveFreeSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'free',
          user_id: user.id,
        }),
      })

      if (response.ok) {
        router.push('/payment-success')
      } else {
        setError('Failed to create subscription')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold mb-12">CHECKOUT</h1>

        <div className="border-4 border-foreground p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{plan.name} Plan</h2>
            <div className="text-5xl font-bold mb-2">
              ${plan.price}
              <span className="text-xl text-muted-foreground">/month</span>
            </div>
            <div className="space-y-2 text-muted-foreground mb-8">
              <p>Requests per minute: {plan.requests_per_minute}</p>
              <p>Requests per day: {plan.requests_per_day}</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive text-white p-4 mb-6 border-2 border-destructive">
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-8 py-4 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : plan.price === 0 ? 'GET FREE PLAN' : 'PAY $' + plan.price}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </main>
  )
}
