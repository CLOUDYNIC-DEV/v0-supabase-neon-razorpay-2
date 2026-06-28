import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

declare global {
  var freeIpLimits: Map<string, { count: number; resetTime: number }> | undefined
  var mistralLoadBalancer: MistralLoadBalancer | undefined
}

// 1. Define your 8 Mistral API configurations with strict token ceilings
const MISTRAL_CONFIGS = [
  { apiKey: "MNGIKlYrhA3JmYElrcr8c9es5anfiUUQ", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "Gkp1OYIzJHAnuvniImF82PzULivm2sV2", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "Q5YFuFt0nojlNEfh3tCI7FIAY9mnnjo1", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "nCxuBxILGeCHvwG0SviSIFflROMVGTvW", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "jX64suS0OxC08rfz4sAkl5V4OSBjo4Nt", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "1X4v00yHQ0DbGbvNA4sxzMvifhs4mrV4", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "uTa4SKQmjdnb7o1oSwEdsKiPQ3bD7Her", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
  { apiKey: "pDgEO7xGL9lx4YLWA0yKFGjSR3rFga0M", endpoint: "https://api.mistral.ai/v1/chat/completions", maxTokens: 1024 },
]

const MAX_DAILY_REQUESTS_PER_KEY = 14000 

class MistralLoadBalancer {
  private currentIndex = 0
  private dailyTracker: { [keyIndex: number]: { count: number; dateStr: string } } = {}

  constructor() {
    MISTRAL_CONFIGS.forEach((_, index) => {
      this.dailyTracker[index] = { count: 0, dateStr: this.getTodayString() }
    })
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Selects the next available key/endpoint and enforces daily caps.
   */
  getAvailableConfig(): { apiKey: string; endpoint: string; maxTokens: number } {
    const today = this.getTodayString()
    let attempts = 0

    while (attempts < MISTRAL_CONFIGS.length) {
      const index = this.currentIndex
      this.currentIndex = (this.currentIndex + 1) % MISTRAL_CONFIGS.length
      attempts++

      let tracker = this.dailyTracker[index]

      if (tracker.dateStr !== today) {
        tracker.count = 0
        tracker.dateStr = today
      }

      if (tracker.count < MAX_DAILY_REQUESTS_PER_KEY) {
        tracker.count++
        console.log(`[LoadBalancer] Key index ${index} selected. Usage: ${tracker.count}/${MAX_DAILY_REQUESTS_PER_KEY}`);
        return MISTRAL_CONFIGS[index]
      }
    }

    console.warn(`[LoadBalancer] CRITICAL: All Mistral API keys have exhausted their daily quotas!`)
    return MISTRAL_CONFIGS[0] 
  }

  getStatus() {
    const today = this.getTodayString()
    return {
      totalKeys: MISTRAL_CONFIGS.length,
      quotas: MISTRAL_CONFIGS.map((conf, i) => {
        const tracker = this.dailyTracker[i]
        return {
          index: i,
          endpoint: conf.endpoint,
          maxTokensLimit: conf.maxTokens,
          requestsToday: tracker.dateStr === today ? tracker.count : 0,
          remainingToday: MAX_DAILY_REQUESTS_PER_KEY - (tracker.dateStr === today ? tracker.count : 0)
        }
      })
    }
  }
}

export function getLoadBalancer(): MistralLoadBalancer {
  if (!global.mistralLoadBalancer) {
    global.mistralLoadBalancer = new MistralLoadBalancer()
  }
  return global.mistralLoadBalancer as MistralLoadBalancer
}

export async function generateApiKey(): Promise<string> {
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
  if (planTier === 'free' && userId.startsWith('ip_')) {
    if (!global.freeIpLimits) {
      global.freeIpLimits = new Map<string, { count: number; resetTime: number }>()
    }
    
    const now = Date.now()
    const record = global.freeIpLimits.get(userId)
    
    if (!record || now > record.resetTime) {
      global.freeIpLimits.set(userId, { count: 1, resetTime: now + 60000 })
      return true
    }
    
    if (record.count >= 1) {
      return false
    }
    
    record.count += 1
    return true
  }

  try {
    const supabase = await createClient()
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

    const { count, error } = await supabase
      .from('api_usage')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo)

    if (error) return true

    const limits: Record<string, number> = {
      pro: 30,
      pro_max: 999,
    }

    return (count || 0) < (limits[planTier] || 30)
  } catch (error) {
    console.error('Rate limit check error:', error)
    return true
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
