import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RateLimitData {
  requests_count: number
  reset_date: string
  is_free_tier: boolean
}

async function checkRateLimit(identifier: string, isFree: boolean): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    let query = isFree ? supabase.from('cloudynic_usage').select('*').eq('is_free_tier', true).eq('ip_address', identifier).eq('reset_date', today) : supabase.from('cloudynic_usage').select('*').eq('user_id', identifier).eq('reset_date', today)

    const { data } = await query

    const LIMITS = {
      free_per_minute: 1,
      free_per_day: 100,
      pro_per_minute: 30,
      pro_per_day: 10000,
      pro_max_per_minute: 999,
      pro_max_per_day: 999999,
    }

    const limit = isFree ? LIMITS.free_per_day : LIMITS.pro_per_day

    if (!data || data.length === 0) {
      // First request today
      await supabase.from('cloudynic_usage').insert([
        {
          user_id: isFree ? null : identifier,
          ip_address: isFree ? identifier : null,
          requests_count: 1,
          reset_date: today,
          is_free_tier: isFree,
        },
      ])
      return { allowed: true, remaining: limit - 1, limit }
    }

    const record = data[0] as RateLimitData

    if (record.requests_count >= limit) {
      return { allowed: false, remaining: 0, limit }
    }

    // Update request count
    await supabase
      .from('cloudynic_usage')
      .update({ requests_count: record.requests_count + 1, updated_at: new Date().toISOString() })
      .eq('ip_address', isFree ? identifier : null)
      .eq('user_id', isFree ? null : identifier)
      .eq('reset_date', today)

    return { allowed: true, remaining: limit - record.requests_count - 1, limit }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true, remaining: -1, limit: -1 }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // Get client IP or API key
    const authHeader = req.headers.get('authorization')
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    let isFree = true
    let identifier = clientIp

    // Check if using API key (paid user)
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7)
      const supabase = await createClient()

      const { data } = await supabase.from('cloudynic_api_keys').select('user_id').eq('api_key', apiKey).eq('is_active', true).single()

      if (data) {
        isFree = false
        identifier = data.user_id

        // Update last used
        await supabase.from('cloudynic_api_keys').update({ last_used: new Date().toISOString() }).eq('api_key', apiKey)
      }
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(identifier, isFree)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: 0,
          limit: rateLimit.limit,
        },
        { status: 429 }
      )
    }

    // Call Ollama API
    const response = await fetch('http://140.245.196.245:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'neural-chat',
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    const data = await response.json()

    return NextResponse.json({
      reply: data.message?.content || 'No response',
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const message = searchParams.get('message')

    if (!message) {
      return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 })
    }

    // GET requests are always free tier (no auth)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp, true)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: 0,
          limit: rateLimit.limit,
        },
        { status: 429 }
      )
    }

    // Call Ollama API
    const response = await fetch('http://140.245.196.245:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'neural-chat',
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    const data = await response.json()

    return NextResponse.json({
      reply: data.message?.content || 'No response',
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
