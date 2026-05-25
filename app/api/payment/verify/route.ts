import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save subscription to database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan,
        status: 'active',
        razorpay_order_id,
        razorpay_payment_id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    // Update user's plan type
    await supabase
      .from('users')
      .update({ plan_type: plan })
      .eq('id', user.id)

    // Generate an API key for the new subscription
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key: `sk_${crypto.randomBytes(24).toString('hex')}`,
        name: `${plan.toUpperCase()} Plan Key`,
        plan_tier: plan,
        is_active: true,
      })
      .select()
      .single()

    if (keyError) {
      console.error('Error creating API key:', keyError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
