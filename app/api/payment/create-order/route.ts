import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Razorpay credentials not configured' },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const { plan, amount, user_id } = await req.json()

    if (!plan || !amount || !user_id) {
      return NextResponse.json({ error: 'Missing required fields: plan, amount, user_id' }, { status: 400 })
    }

    // Validate plan type
    if (!['pro', 'pro_max'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan type. Must be pro or pro_max' }, { status: 400 })
    }

    // Create order (amount in paise for INR)
    const receipt = `${user_id.substring(0, 15)}-${Date.now()}`.substring(0, 40)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        plan,
        user_id,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
