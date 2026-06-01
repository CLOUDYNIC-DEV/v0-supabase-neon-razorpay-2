import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan) {
      return NextResponse.json({ error: 'Missing plan field' }, { status: 400 })
    }

    // Use admin client for database operations
    const adminSupabase = getSupabaseAdmin()

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Create new subscription (for free plan creation)
    const { data, error } = await adminSupabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan,
        status: 'active',
        amount: plan === 'free' ? 0 : plan === 'pro' ? 99 : 499,
        currency: 'INR',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    // Update user's plan type
    await adminSupabase
      .from('users')
      .update({ plan_type: plan, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
