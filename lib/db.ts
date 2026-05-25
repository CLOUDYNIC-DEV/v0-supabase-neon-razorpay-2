import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export interface Subscription {
  id: string
  user_id: string
  plan_type: 'free' | 'pro' | 'pro_max'
  status: string
  razorpay_order_id?: string
  razorpay_payment_id?: string
  monthly_cost: number
  created_at: string
  updated_at: string
  renewal_date?: string
}

export interface ApiKey {
  id: string
  user_id: string
  api_key: string
  key_name: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export interface Usage {
  id: string
  user_id?: string
  ip_address?: string
  requests_count: number
  reset_date: string
  is_free_tier: boolean
  created_at: string
  updated_at: string
}

// Initialize tables
export async function initializeTables() {
  try {
    // Create subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS cloudynic_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('free', 'pro', 'pro_max')),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        monthly_cost DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        renewal_date TIMESTAMP WITH TIME ZONE
      )
    `

    // Create API keys table
    await sql`
      CREATE TABLE IF NOT EXISTS cloudynic_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
        api_key VARCHAR(255) NOT NULL UNIQUE,
        key_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      )
    `

    // Create usage table
    await sql`
      CREATE TABLE IF NOT EXISTS cloudynic_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES neon_auth.user(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        requests_count INTEGER DEFAULT 0,
        reset_date DATE NOT NULL,
        is_free_tier BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, reset_date),
        UNIQUE(ip_address, reset_date)
      )
    `

    // Create demo chats table
    await sql`
      CREATE TABLE IF NOT EXISTS cloudynic_demo_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address VARCHAR(45) NOT NULL,
        message_count INTEGER DEFAULT 1,
        reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, reset_date)
      )
    `

    console.log('Tables initialized successfully')
  } catch (error) {
    console.error('Error initializing tables:', error)
  }
}

// Subscription operations
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const result = await sql`
    SELECT * FROM cloudynic_subscriptions WHERE user_id = ${userId}
  `
  return result.length > 0 ? (result[0] as Subscription) : null
}

export async function createSubscription(userId: string, planType: string): Promise<Subscription> {
  const monthlyPrice = planType === 'free' ? 0 : planType === 'pro' ? 1 : 5
  const result = await sql`
    INSERT INTO cloudynic_subscriptions (user_id, plan_type, monthly_cost)
    VALUES (${userId}, ${planType}, ${monthlyPrice})
    RETURNING *
  `
  return result[0] as Subscription
}

export async function updateSubscription(subscriptionId: string, data: Partial<Subscription>): Promise<Subscription> {
  const updates: string[] = []
  const values: any[] = []
  let paramCount = 1

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id') {
      updates.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  })

  values.push(subscriptionId)

  const query = `
    UPDATE cloudynic_subscriptions
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount}
    RETURNING *
  `

  const result = await sql(query, values)
  return result[0] as Subscription
}

// API Key operations
export async function generateApiKey(userId: string, keyName: string): Promise<string> {
  const apiKey = `cloudynic_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  await sql`
    INSERT INTO cloudynic_api_keys (user_id, api_key, key_name)
    VALUES (${userId}, ${apiKey}, ${keyName})
  `
  return apiKey
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await sql`
    SELECT * FROM cloudynic_api_keys WHERE user_id = ${userId} AND is_active = true
    ORDER BY created_at DESC
  `
  return result as ApiKey[]
}

export async function getApiKeyInfo(apiKey: string): Promise<ApiKey | null> {
  const result = await sql`
    SELECT * FROM cloudynic_api_keys WHERE api_key = ${apiKey}
  `
  return result.length > 0 ? (result[0] as ApiKey) : null
}

// Usage tracking
export async function trackUsage(userId: string | null, ipAddress: string, today: string): Promise<number> {
  const resetDate = new Date(today).toISOString().split('T')[0]

  if (userId) {
    await sql`
      INSERT INTO cloudynic_usage (user_id, reset_date, requests_count, is_free_tier)
      VALUES (${userId}, ${resetDate}, 1, false)
      ON CONFLICT (user_id, reset_date) DO UPDATE
      SET requests_count = cloudynic_usage.requests_count + 1
    `
    const result = await sql`
      SELECT requests_count FROM cloudynic_usage WHERE user_id = ${userId} AND reset_date = ${resetDate}
    `
    return (result[0] as any).requests_count
  } else {
    await sql`
      INSERT INTO cloudynic_usage (ip_address, reset_date, requests_count, is_free_tier)
      VALUES (${ipAddress}, ${resetDate}, 1, true)
      ON CONFLICT (ip_address, reset_date) DO UPDATE
      SET requests_count = cloudynic_usage.requests_count + 1
    `
    const result = await sql`
      SELECT requests_count FROM cloudynic_usage WHERE ip_address = ${ipAddress} AND reset_date = ${resetDate}
    `
    return (result[0] as any).requests_count
  }
}

export async function getDailyUsage(userId: string | null, ipAddress: string, today: string): Promise<number> {
  const resetDate = new Date(today).toISOString().split('T')[0]

  if (userId) {
    const result = await sql`
      SELECT requests_count FROM cloudynic_usage WHERE user_id = ${userId} AND reset_date = ${resetDate}
    `
    return result.length > 0 ? (result[0] as any).requests_count : 0
  } else {
    const result = await sql`
      SELECT requests_count FROM cloudynic_usage WHERE ip_address = ${ipAddress} AND reset_date = ${resetDate}
    `
    return result.length > 0 ? (result[0] as any).requests_count : 0
  }
}

// Demo chat tracking
export async function trackDemoChat(ipAddress: string): Promise<number> {
  const resetDate = new Date().toISOString().split('T')[0]

  await sql`
    INSERT INTO cloudynic_demo_chats (ip_address, reset_date, message_count)
    VALUES (${ipAddress}, ${resetDate}, 1)
    ON CONFLICT (ip_address, reset_date) DO UPDATE
    SET message_count = cloudynic_demo_chats.message_count + 1
  `

  const result = await sql`
    SELECT message_count FROM cloudynic_demo_chats WHERE ip_address = ${ipAddress} AND reset_date = ${resetDate}
  `
  return (result[0] as any).message_count
}

export async function getDemoChatCount(ipAddress: string): Promise<number> {
  const resetDate = new Date().toISOString().split('T')[0]

  const result = await sql`
    SELECT message_count FROM cloudynic_demo_chats WHERE ip_address = ${ipAddress} AND reset_date = ${resetDate}
  `
  return result.length > 0 ? (result[0] as any).message_count : 0
}
