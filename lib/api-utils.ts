import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function generateApiKey(): Promise<string> {
  // Generate a 32-character API key
  return `sk_${crypto.randomBytes(24).toString('hex')}`
}

export async function validateApiKey(
  apiKey: string,
): Promise<{ userId: string; planTier: string } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, plan_tier, is_active')
    .eq('key', apiKey)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key', apiKey)

  return {
    userId: data.user_id,
    planTier: data.plan_tier,
  }
}

export async function checkRateLimit(
  userId: string,
  planTier: string,
): Promise<boolean> {
  const supabase = await createClient()

  // Get usage in the last minute
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

  const { count, error } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo)

  if (error) return false

  // Rate limits per tier
  const limits: Record<string, number> = {
    free: 1,
    pro: 30,
    pro_max: 999999, // Effectively unlimited
  }

  return (count || 0) < (limits[planTier] || 1)
}

export async function logApiUsage(
  userId: string,
  apiKeyId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  prompt?: string,
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('api_usage').insert({
    user_id: userId,
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    prompt,
  })
}

export async function getOrCreateUser(
  userId: string,
  email: string,
): Promise<void> {
  const supabase = await createClient()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    await supabase.from('users').insert({
      id: userId,
      email,
      plan_type: 'free',
    })
  }
}

export async function getUserPlan(userId: string): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_type')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return 'free'
  }

  return data.plan_type
}
