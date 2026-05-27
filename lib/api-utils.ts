import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

declare global {
  var freeIpLimits: Map<string, { count: number; resetTime: number }> | undefined
  var endpointLoadBalancer: EndpointLoadBalancer | undefined
}

// Load Balancer with Queue System
const ENDPOINTS = [
  "https://darkmindforever-server.hf.space/v1/chat/completions",
  "https://darkmindforever-server2.hf.space/v1/chat/completions",
  "https://darkmindforever-server3.hf.space/v1/chat/completions",
  "https://darkmindforever-server4.hf.space/v1/chat/completions",
  "https://darkmindforever-server5.hf.space/v1/chat/completions",
  "https://darkmindforever-server6.hf.space/v1/chat/completions"
]

const MAX_USERS_PER_ENDPOINT = 10
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
const REQUEST_TIMEOUT = 120000 // 2 minutes

interface EndpointStatus {
  url: string
  activeUsers: number
  healthy: boolean
  lastHealthCheck: number
  totalRequests: number
  failedRequests: number
}

interface QueuedRequest {
  id: string
  resolve: (endpoint: string) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

class EndpointLoadBalancer {
  private endpoints: Map<string, EndpointStatus>
  private queue: QueuedRequest[] = []
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.endpoints = new Map()
    ENDPOINTS.forEach(url => {
      this.endpoints.set(url, {
        url,
        activeUsers: 0,
        healthy: true,
        lastHealthCheck: Date.now(),
        totalRequests: 0,
        failedRequests: 0
      })
    })
    this.startHealthChecks()
  }

  private startHealthChecks() {
    if (this.healthCheckInterval) return
    
    this.healthCheckInterval = setInterval(() => {
      this.checkEndpointHealth()
    }, HEALTH_CHECK_INTERVAL)
  }

  private async checkEndpointHealth() {
    for (const [url, status] of this.endpoints) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'tgi',
            messages: [{ role: 'user', content: 'ping' }],
            stream: false,
          }),
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        status.healthy = response.ok
      } catch (error) {
        status.healthy = false
      }
      status.lastHealthCheck = Date.now()
    }
  }

  async getEndpoint(): Promise<string> {
    // Find available endpoint
    const available = this.getAvailableEndpoint()
    if (available) {
      return available
    }

    // All endpoints at capacity, add to queue
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36)
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(r => r.id === id)
        if (index > -1) {
          this.queue.splice(index, 1)
        }
        reject(new Error('Queue timeout: No available endpoints after 2 minutes'))
      }, REQUEST_TIMEOUT)

      const queuedRequest: QueuedRequest = {
        id,
        resolve,
        reject,
        timeout
      }

      this.queue.push(queuedRequest)
      console.log(`[v0] Request queued. Queue size: ${this.queue.length}`)
    })
  }

  private getAvailableEndpoint(): string | null {
    // Sort by health and active users
    const sorted = Array.from(this.endpoints.values())
      .filter(ep => ep.healthy)
      .sort((a, b) => a.activeUsers - b.activeUsers)

    for (const endpoint of sorted) {
      if (endpoint.activeUsers < MAX_USERS_PER_ENDPOINT) {
        return endpoint.url
      }
    }

    return null
  }

  acquireEndpoint(url: string) {
    const status = this.endpoints.get(url)
    if (status) {
      status.activeUsers++
      status.totalRequests++
      console.log(`[v0] Endpoint acquired: ${url.split('/')[2]} | Active: ${status.activeUsers}/${MAX_USERS_PER_ENDPOINT}`)
    }
  }

  releaseEndpoint(url: string, success: boolean = true) {
    const status = this.endpoints.get(url)
    if (status) {
      status.activeUsers = Math.max(0, status.activeUsers - 1)
      if (!success) {
        status.failedRequests++
      }

      // Process queue
      if (this.queue.length > 0) {
        const available = this.getAvailableEndpoint()
        if (available) {
          const queued = this.queue.shift()
          if (queued) {
            clearTimeout(queued.timeout)
            queued.resolve(available)
          }
        }
      }

      console.log(`[v0] Endpoint released: ${url.split('/')[2]} | Active: ${status.activeUsers}/${MAX_USERS_PER_ENDPOINT} | Queue: ${this.queue.length}`)
    }
  }

  getStatus() {
    const statusArray = Array.from(this.endpoints.values()).map(ep => ({
      endpoint: ep.url.split('/')[2],
      activeUsers: ep.activeUsers,
      healthy: ep.healthy,
      totalRequests: ep.totalRequests,
      failedRequests: ep.failedRequests
    }))

    return {
      endpoints: statusArray,
      queueSize: this.queue.length,
      totalEndpoints: ENDPOINTS.length
    }
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    this.queue.forEach(r => clearTimeout(r.timeout))
    this.queue = []
  }
}

export function getLoadBalancer(): EndpointLoadBalancer {
  if (!global.endpointLoadBalancer) {
    global.endpointLoadBalancer = new EndpointLoadBalancer()
  }
  return global.endpointLoadBalancer
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
