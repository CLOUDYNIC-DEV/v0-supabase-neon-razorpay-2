import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription, error } = await supabase
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
      pro: 1,
      pro_max: 9,
    }

    return NextResponse.json({
      subscription: subscription ? {
        plan_type: subscription.plan_type,
        status: subscription.status,
        monthly_cost: planCosts[subscription.plan_type] || 0,
        created_at: subscription.created_at,
        renewal_date: subscription.end_date,
        razorpay_order_id: subscription.razorpay_order_id,
        razorpay_payment_id: subscription.razorpay_payment_id,
      } : null,
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { subscription: null }
    )
  }
}
