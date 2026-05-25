import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, user_id } = await req.json()

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Save subscription to database
    const supabase = await createClient()
    const { error } = await supabase
      .from('cloudynic_subscriptions')
      .insert([
        {
          user_id,
          plan_type: plan,
          status: 'active',
          razorpay_order_id,
          razorpay_payment_id,
          monthly_cost: plan === 'pro' ? 100 : plan === 'pro_max' ? 500 : 0,
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ])

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
