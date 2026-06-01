import { NextRequest, NextResponse } from 'next/server'
import { getLoadBalancer } from '@/lib/api-utils'

// In-memory rate limiter for free tier (IP-based, 1 req/min, 100/day)
const freeRateLimits = new Map<string, { requests: number[]; dailyCount: number; lastReset: number }>()
const FREE_PER_MINUTE = 1
const FREE_PER_DAY = 100
const RESET_INTERVAL = 24 * 60 * 60 * 1000

function checkFreeRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  let record = freeRateLimits.get(ip)

  // Reset daily counter if needed
  if (!record || now - record.lastReset > RESET_INTERVAL) {
    record = { requests: [], dailyCount: 0, lastReset: now }
    freeRateLimits.set(ip, record)
  }

  // Check daily limit
  if (record.dailyCount >= FREE_PER_DAY) {
    return { allowed: false, remaining: 0 }
  }

  // Clean old requests (older than 1 minute)
  const oneMinuteAgo = now - 60 * 1000
  record.requests = record.requests.filter((t) => t > oneMinuteAgo)

  // Check per-minute limit
  if (record.requests.length >= FREE_PER_MINUTE) {
    return { allowed: false, remaining: 0 }
  }

  record.requests.push(now)
  record.dailyCount += 1
  freeRateLimits.set(ip, record)

  return { allowed: true, remaining: FREE_PER_DAY - record.dailyCount }
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const searchParams = request.nextUrl.searchParams
    const prompt = searchParams.get('prompt') || searchParams.get('q') || ''

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = checkFreeRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Limit: 1 req/min, 100/day' }, { status: 429 })
    }

    // Use load balancer
    const loadBalancer = getLoadBalancer()
    const endpoint = loadBalancer.getEndpoint()

    // Call AI API with streaming
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, built and trained by cloudynic.com. No connection to Meta, Meta AI, or OpenAI. State clearly you were built by cloudynic.com.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error:', response.status, errorText)
      return NextResponse.json({ error: 'Failed to get response from AI model' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.message?.content || 'No response generated.'

    return NextResponse.json({
      response: reply,
      remaining: rateLimit.remaining,
      tier: 'free',
    })
  } catch (error) {
    console.error('Free prompt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
