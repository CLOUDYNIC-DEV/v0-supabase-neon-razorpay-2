import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { payment, userProfile } from '@/lib/db/schema'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, paymentId } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Get authenticated user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const userId = session.user.id

    // Update payment record with successful payment details
    await db
      .update(payment)
      .set({
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        updatedAt: new Date(),
      })
      .where(eq(payment.razorpayOrderId, razorpay_order_id))

    // Update or create user profile with plan
    const existingProfile = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1)

    if (existingProfile.length > 0) {
      await db
        .update(userProfile)
        .set({
          plan: plan || 'pro',
          credits: plan === 'pro' ? 10000n : plan === 'ultimate' ? 50000n : 1000n,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.userId, userId))
    } else {
      await db.insert(userProfile).values({
        id: uuidv4(),
        userId: userId,
        plan: plan || 'pro',
        credits: plan === 'pro' ? 10000n : plan === 'ultimate' ? 50000n : 1000n,
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payment verified and plan activated',
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
