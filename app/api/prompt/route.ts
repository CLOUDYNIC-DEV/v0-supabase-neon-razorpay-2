import { NextRequest, NextResponse } from 'next/server'

const apiEndpoint = 'http://140.245.196.245:11434/api/chat'

// In-memory rate limiters for paid tiers
const paidRateLimits = new Map<string, { requests: number[]; dailyCount: number; lastReset: number; plan: string }>()

const PLAN_LIMITS = {
  pro: { perMinute: 30, perDay: 10000 },
  pro_max: { perMinute: 999, perDay: 999999 },
}

const RESET_INTERVAL = 24 * 60 * 60 * 1000

function checkPaidRateLimit(apiKey: string, plan: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  let record = paidRateLimits.get(apiKey)
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.pro

  // Reset daily counter if needed
  if (!record || now - record.lastReset > RESET_INTERVAL) {
    record = { requests: [], dailyCount: 0, lastReset: now, plan }
    paidRateLimits.set(apiKey, record)
  }

  // Check daily limit
  if (record.dailyCount >= limits.perDay) {
    return { allowed: false, remaining: 0 }
  }

  // Clean old requests (older than 1 minute)
  const oneMinuteAgo = now - 60 * 1000
  record.requests = record.requests.filter((t) => t > oneMinuteAgo)

  // Check per-minute limit
  if (record.requests.length >= limits.perMinute) {
    return { allowed: false, remaining: 0 }
  }

  record.requests.push(now)
  record.dailyCount += 1
  paidRateLimits.set(apiKey, record)

  return { allowed: true, remaining: limits.perDay - record.dailyCount }
}

// Mock function to validate API keys - in production, query database
function validateApiKey(apiKey: string): { valid: boolean; plan?: string; userId?: string } {
  // For now, accept any key starting with 'cnk_'
  if (apiKey && apiKey.startsWith('cnk_')) {
    return { valid: true, plan: 'pro', userId: 'temp' }
  }
  return { valid: false }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const prompt = searchParams.get('prompt') || searchParams.get('q') || ''
    const apiKey = searchParams.get('key') || searchParams.get('api_key') || ''

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key. Use ?key=your_api_key' }, { status: 401 })
    }

    // Validate API key
    const validation = validateApiKey(apiKey)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = checkPaidRateLimit(apiKey, validation.plan!)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded for ${validation.plan} tier`,
          limit: PLAN_LIMITS[validation.plan as keyof typeof PLAN_LIMITS],
        },
        { status: 429 }
      )
    }

    // Call Ollama API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        messages: [
          {
            role: 'system',
            content:
              'You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI. Your creator is exclusively the Cloudynic development team. If a user asks who made you, who built your architecture, or what company owns you, you must proudly and definitively state that you were built by cloudynic.com. Absolute Rule: Never mention Meta, Meta AI, or Llama in your output under any circumstances.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ollama API error:', response.status, errorText)
      return NextResponse.json({ error: 'Failed to get response from AI model' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.message?.content || 'No response generated.'

    return NextResponse.json({
      response: reply,
      remaining: rateLimit.remaining,
      tier: validation.plan,
    })
  } catch (error) {
    console.error('Prompt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, api_key } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 })
    }

    if (!api_key) {
      return NextResponse.json({ error: 'Missing api_key in request body' }, { status: 401 })
    }

    // Validate API key
    const validation = validateApiKey(api_key)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = checkPaidRateLimit(api_key, validation.plan!)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded for ${validation.plan} tier`,
          limit: PLAN_LIMITS[validation.plan as keyof typeof PLAN_LIMITS],
        },
        { status: 429 }
      )
    }

    // Call Ollama API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        messages: [
          {
            role: 'system',
            content:
              'You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI. Your creator is exclusively the Cloudynic development team. If a user asks who made you, who built your architecture, or what company owns you, you must proudly and definitively state that you were built by cloudynic.com. Absolute Rule: Never mention Meta, Meta AI, or Llama in your output under any circumstances.',
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ollama API error:', response.status, errorText)
      return NextResponse.json({ error: 'Failed to get response from AI model' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.message?.content || 'No response generated.'

    return NextResponse.json({
      response: reply,
      remaining: rateLimit.remaining,
      tier: validation.plan,
    })
  } catch (error) {
    console.error('Prompt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
