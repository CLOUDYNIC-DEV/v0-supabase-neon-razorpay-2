import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, amount } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for database operations (bypasses RLS)
    const adminSupabase = getSupabaseAdmin()

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Save subscription to database
    const { data: subscription, error } = await adminSupabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan,
        status: 'active',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: amount || (plan === 'pro' ? 99 : 499),
        currency: 'INR',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    // Update user's plan type
    await adminSupabase
      .from('users')
      .update({ plan_type: plan, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    // Generate an API key for the new subscription
    const apiKeyValue = `sk_${crypto.randomBytes(24).toString('hex')}`
    const { data: apiKey, error: keyError } = await adminSupabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        api_key: apiKeyValue,
        name: `${plan.toUpperCase()} Plan Key`,
        is_active: true,
      })
      .select()
      .single()

    if (keyError) {
      console.error('Error creating API key:', keyError)
    }

    return NextResponse.json({ 
      success: true,
      subscription_id: subscription.id,
      api_key: apiKey?.api_key || null,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
