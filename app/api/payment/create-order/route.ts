import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const { plan, amount, user_id } = await req.json()

    if (!plan || !amount || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create order (amount in cents for USD)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'USD',
      receipt: `${user_id}-${Date.now()}`,
      notes: {
        plan,
        user_id,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
