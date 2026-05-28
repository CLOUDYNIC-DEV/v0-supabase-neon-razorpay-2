import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

declare global {
  var freeIpLimits: Map<string, { count: number; resetTime: number }> | undefined
  var endpointLoadBalancer: EndpointLoadBalancer | undefined
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

class SimpleLoadBalancer {
  private currentIndex = 0
  private requestCount = 0

  getEndpoint(): string {
    const endpoint = ENDPOINTS[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % ENDPOINTS.length
    this.requestCount++
    console.log(`[v0] Using endpoint ${this.currentIndex}: ${endpoint.split('/')[2]}`)
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

export function getLoadBalancer(): SimpleLoadBalancer {
  if (!global.endpointLoadBalancer) {
    global.endpointLoadBalancer = new SimpleLoadBalancer()
  }
  return global.endpointLoadBalancer as SimpleLoadBalancer
}

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
  // For free tier (IP-based), use in-memory tracking
  if (planTier === 'free' && userId.startsWith('ip_')) {
    // Check in-memory free tier limit (1 per minute per IP)
    if (!global.freeIpLimits) {
      global.freeIpLimits = new Map<string, { count: number; resetTime: number }>()
    }
    
    const now = Date.now()
    const record = global.freeIpLimits.get(userId)
    
    if (!record || now > record.resetTime) {
      // Reset counter
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
    const supabase = await createClient()

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
