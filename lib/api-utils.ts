import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

declare global {
  var freeIpLimits: Map<string, { count: number; resetTime: number }> | undefined
  var endpointLoadBalancer: EndpointLoadBalancer | undefined
}

// Initialize Supabase admin client for API operations (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// Simple Round-Robin Load Balancer
const ENDPOINTS = [
  // DarkMind Forever servers
  "https://darkmindforever-server.hf.space/v1/chat/completions",
  "https://darkmindforever-server2.hf.space/v1/chat/completions",
  "https://darkmindforever-server3.hf.space/v1/chat/completions",
  "https://darkmindforever-server4.hf.space/v1/chat/completions",
  "https://darkmindforever-server5.hf.space/v1/chat/completions",
  "https://darkmindforever-server6.hf.space/v1/chat/completions",
  // ResearchQ servers
  "http://researchq-server.hf.space/v1/chat/completions",
  "http://researchq-server1.hf.space/v1/chat/completions",
  "http://researchq-server2.hf.space/v1/chat/completions",
  "http://researchq-server3.hf.space/v1/chat/completions",
  "http://researchq-server4.hf.space/v1/chat/completions",
  "http://researchq-server5.hf.space/v1/chat/completions"
]

interface EndpointLoadBalancer {
  getEndpoint(): string
  getStatus(): {
    totalEndpoints: number
    totalRequests: number
    currentIndex: number
    endpoints: { index: number; url: string; endpoint: string }[]
  }
}

class SimpleLoadBalancer implements EndpointLoadBalancer {
  private currentIndex = 0
  private requestCount = 0

  getEndpoint(): string {
    const endpoint = ENDPOINTS[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % ENDPOINTS.length
    this.requestCount++
    return endpoint
  }

  getStatus() {
    return {
      totalEndpoints: ENDPOINTS.length,
      totalRequests: this.requestCount,
      currentIndex: this.currentIndex,
      endpoints: ENDPOINTS.map((url, i) => ({
        index: i,
        url: url.split('/')[2],
        endpoint: url
      }))
    }
  }
}

export function getLoadBalancer(): EndpointLoadBalancer {
  if (!global.endpointLoadBalancer) {
    global.endpointLoadBalancer = new SimpleLoadBalancer()
  }
  return global.endpointLoadBalancer as EndpointLoadBalancer
}

export async function generateApiKey(): Promise<string> {
  return `sk_${crypto.randomBytes(24).toString('hex')}`
}

export async function validateApiKey(
  apiKey: string,
): Promise<{ userId: string; planTier: string } | null> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey)

    // Get user's plan type
    const { data: userData } = await supabase
      .from('users')
      .select('plan_type')
      .eq('id', data.user_id)
      .single()

    return {
      userId: data.user_id,
      planTier: userData?.plan_type || 'free',
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return null
  }
}

export async function checkRateLimit(
  userId: string,
  planTier: string,
): Promise<boolean> {
  // For free tier (IP-based), use in-memory tracking
  if (planTier === 'free' && userId.startsWith('ip_')) {
    if (!global.freeIpLimits) {
      global.freeIpLimits = new Map<string, { count: number; resetTime: number }>()
    }
    
    const now = Date.now()
    const record = global.freeIpLimits.get(userId)
    
    if (!record || now > record.resetTime) {
      // Reset counter - 1 request per minute for free
      global.freeIpLimits.set(userId, { count: 1, resetTime: now + 60000 })
      return true
    }
    
    if (record.count >= 1) {
      return false
    }
    
    record.count += 1
    return true
  }

  // For authenticated users (pro/pro_max), check database
  try {
    const supabase = getSupabaseAdmin()

    // Get usage in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

    const { count, error } = await supabase
      .from('api_usage')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo)

    if (error) return true // Allow if database error

    // Rate limits per tier
    const limits: Record<string, number> = {
      free: 1,
      pro: 30,
      pro_max: 999999, // Effectively unlimited
    }

    return (count || 0) < (limits[planTier] || 30)
  } catch (error) {
    console.error('Rate limit check error:', error)
    return true // Allow if error occurs
  }
}

export async function logApiUsage(
  userId: string,
  apiKeyId: string | null,
  endpoint: string,
  prompt?: string,
  ipAddress?: string,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    await supabase.from('api_usage').insert({
      user_id: userId === 'free' ? null : userId,
      api_key_id: apiKeyId,
      endpoint,
      prompt,
      ip_address: ipAddress,
    })
  } catch (error) {
    console.error('Error logging API usage:', error)
  }
}

export async function getOrCreateUser(
  userId: string,
  email: string,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

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
  } catch (error) {
    console.error('Error in getOrCreateUser:', error)
  }
}

export async function getUserPlan(userId: string): Promise<string> {
  try {
    const supabase = getSupabaseAdmin()

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
  } catch (error) {
    console.error('Error getting user plan:', error)
    return 'free'
  }
}

// Get training data for a user
export async function getTrainingData(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('training_data')
      .select('content')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.content
  } catch (error) {
    console.error('Error getting training data:', error)
    return null
  }
}
