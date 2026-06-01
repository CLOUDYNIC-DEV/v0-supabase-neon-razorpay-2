import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for database operations
    const adminSupabase = getSupabaseAdmin()

    const { data: subscription, error } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error)
      return NextResponse.json({ subscription: null })
    }

    const planCosts: Record<string, number> = {
      free: 0,
      pro: 99,
      pro_max: 499,
    }

    return NextResponse.json({
      subscription: subscription ? {
        id: subscription.id,
        plan_type: subscription.plan_type,
        status: subscription.status,
        monthly_cost: planCosts[subscription.plan_type] || 0,
        currency: subscription.currency || 'INR',
        created_at: subscription.created_at,
        starts_at: subscription.starts_at,
        expires_at: subscription.expires_at,
        razorpay_order_id: subscription.razorpay_order_id,
        razorpay_payment_id: subscription.razorpay_payment_id,
      } : null,
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json({ subscription: null })
  }
}
