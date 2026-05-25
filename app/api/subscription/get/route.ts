import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@neondatabase/serverless'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbSql = sql(process.env.DATABASE_URL!)
    const subscriptions = await dbSql`
      SELECT * FROM cloudynic_subscriptions 
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptions.length === 0) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({
      subscription: subscriptions[0],
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
