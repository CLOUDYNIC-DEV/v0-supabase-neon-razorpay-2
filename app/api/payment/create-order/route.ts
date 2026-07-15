import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { headers } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { payment } from '@/lib/db/schema'

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Razorpay credentials not configured' },
        { status: 500 }
      )
    }

    // Get authenticated user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const { plan, amount } = await req.json()

    if (!plan || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create order (amount in cents/paise for INR, or cents for USD)
    // Receipt must be max 40 characters
    const receipt = `${session.user.id.substring(0, 15)}-${Date.now()}`.substring(0, 40)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        plan,
        userId: session.user.id,
      },
    })

    // Store payment record in Neon
    const db = getDb()
    const paymentId = uuidv4()
    
    await db.insert(payment).values({
      id: paymentId,
      userId: session.user.id,
      amount: Math.round(amount * 100),
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.id,
      plan: plan,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      paymentId: paymentId,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
