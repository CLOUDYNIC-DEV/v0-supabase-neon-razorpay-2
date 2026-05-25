import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, getOrCreateUser } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - user not found' },
        { status: 401 },
      )
    }

    // Ensure user exists in public.users table
    await getOrCreateUser(user.id, user.email)

    // Get user's subscription to determine plan tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const planTier = subscription?.plan_type || 'free'

    // Generate new API key
    const apiKey = await generateApiKey()

    // Store in database
    const { data: newKey, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key: apiKey,
        name: `API Key ${new Date().toLocaleDateString()}`,
        plan_tier: planTier,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error storing API key:', error)
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      key: {
        id: newKey.id,
        api_key: newKey.key,
        key_name: newKey.name,
        created_at: newKey.created_at,
        is_active: newKey.is_active,
      },
    })
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 },
    )
  }
}
