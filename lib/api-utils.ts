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

const MAX_CONNECTIONS_PER_ENDPOINT = 10
const TOTAL_CAPACITY = ENDPOINTS.length * MAX_CONNECTIONS_PER_ENDPOINT // 120 users

interface EndpointStats {
  url: string
  activeConnections: number
  totalRequests: number
  isAvailable: boolean
}

interface EndpointLoadBalancer {
  getEndpoint(): { endpoint: string; connectionId: string } | null
  releaseEndpoint(connectionId: string): void
  getStatus(): {
    totalEndpoints: number
    maxConnectionsPerEndpoint: number
    totalCapacity: number
    activeConnections: number
    availableSlots: number
    totalRequests: number
    endpoints: EndpointStats[]
  }
}

class ConnectionTrackingLoadBalancer implements EndpointLoadBalancer {
  private connections: Map<string, number> = new Map() // connectionId -> endpointIndex
  private endpointConnections: number[] // activeConnections per endpoint
  private endpointRequests: number[] // total requests per endpoint
  private totalRequests = 0

  constructor() {
    this.endpointConnections = new Array(ENDPOINTS.length).fill(0)
    this.endpointRequests = new Array(ENDPOINTS.length).fill(0)
  }

  getEndpoint(): { endpoint: string; connectionId: string } | null {
    // Find the endpoint with the least connections that's not at max
    let bestIndex = -1
    let minConnections = MAX_CONNECTIONS_PER_ENDPOINT + 1

    for (let i = 0; i < ENDPOINTS.length; i++) {
      if (this.endpointConnections[i] < MAX_CONNECTIONS_PER_ENDPOINT && 
          this.endpointConnections[i] < minConnections) {
        minConnections = this.endpointConnections[i]
        bestIndex = i
      }
    }

    // All endpoints are at max capacity
    if (bestIndex === -1) {
      return null
    }

    // Generate unique connection ID
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Track the connection
    this.connections.set(connectionId, bestIndex)
    this.endpointConnections[bestIndex]++
    this.endpointRequests[bestIndex]++
    this.totalRequests++

    return {
      endpoint: ENDPOINTS[bestIndex],
      connectionId
    }
  }

  releaseEndpoint(connectionId: string): void {
    const endpointIndex = this.connections.get(connectionId)
    if (endpointIndex !== undefined) {
      this.endpointConnections[endpointIndex] = Math.max(0, this.endpointConnections[endpointIndex] - 1)
      this.connections.delete(connectionId)
    }
  }

  getStatus() {
    const activeConnections = this.endpointConnections.reduce((sum, c) => sum + c, 0)
    
    return {
      totalEndpoints: ENDPOINTS.length,
      maxConnectionsPerEndpoint: MAX_CONNECTIONS_PER_ENDPOINT,
      totalCapacity: TOTAL_CAPACITY,
      activeConnections,
      availableSlots: TOTAL_CAPACITY - activeConnections,
      totalRequests: this.totalRequests,
      endpoints: ENDPOINTS.map((url, i) => ({
        url: url.split('/')[2],
        activeConnections: this.endpointConnections[i],
        totalRequests: this.endpointRequests[i],
        isAvailable: this.endpointConnections[i] < MAX_CONNECTIONS_PER_ENDPOINT
      }))
    }
  }
}

export function getLoadBalancer(): EndpointLoadBalancer {
  if (!global.endpointLoadBalancer) {
    global.endpointLoadBalancer = new ConnectionTrackingLoadBalancer()
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
