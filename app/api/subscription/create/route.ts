import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { plan, user_id } = await req.json()

    if (!plan || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete existing subscriptions for this user
    await supabase.from('cloudynic_subscriptions').delete().eq('user_id', user_id)

    // Create new subscription
    const { data, error } = await supabase
      .from('cloudynic_subscriptions')
      .insert([
        {
          user_id,
          plan_type: plan,
          status: 'active',
          monthly_cost: 0,
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    return NextResponse.json({ subscription: data?.[0] })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
