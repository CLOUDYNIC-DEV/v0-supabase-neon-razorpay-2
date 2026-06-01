import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer, getTrainingData } from '@/lib/api-utils'

// In-memory rate limiter for free tier
const freeRateLimits = new Map<string, { count: number; resetTime: number }>()

function checkFreeTierLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = freeRateLimits.get(ip)
  const FREE_PER_DAY = 100

  if (!record || now > record.resetTime) {
    freeRateLimits.set(ip, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 })
    return { allowed: true, remaining: FREE_PER_DAY - 1 }
  }

  if (record.count >= FREE_PER_DAY) {
    return { allowed: false, remaining: 0 }
  }

  record.count += 1
  return { allowed: true, remaining: FREE_PER_DAY - record.count }
}

export async function POST(req: NextRequest) {
  try {
    const { message, train } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    let isFree = true
    let userId = `ip_${ip}`
    let planTier = 'free'
    let trainInstruction = train || null

    // Check if using API key (paid user)
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7)
      const validation = await validateApiKey(apiKey)
      
      if (validation) {
        isFree = false
        userId = validation.userId
        planTier = validation.planTier

        if (!trainInstruction) {
          trainInstruction = await getTrainingData(userId)
        }
      }
    }

    // Check rate limit
    if (isFree) {
      const rateLimit = checkFreeTierLimit(ip)
      if (!rateLimit.allowed) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded', 
          remaining: 0 
        }, { status: 429 })
      }
    } else {
      const canProceed = await checkRateLimit(userId, planTier)
      if (!canProceed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
    }

    // Use load balancer
    const loadBalancer = getLoadBalancer()
    const endpoint = loadBalancer.getEndpoint()

    let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. No connection to Meta, Meta AI, or OpenAI. State you were built by cloudynic.com.'
    if (trainInstruction) {
      systemMessage += ` Additional instructions: ${trainInstruction}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.message?.content || 'No response'

    // Log usage
    await logApiUsage(isFree ? 'free' : userId, null, '/api/chat/prompt', message, ip)

    return NextResponse.json({
      reply,
      tier: planTier,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const message = searchParams.get('message') || searchParams.get('prompt')
    const train = searchParams.get('train')

    if (!message) {
      return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    // Check rate limit
    const rateLimit = checkFreeTierLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        remaining: 0 
      }, { status: 429 })
    }

    // Use load balancer
    const loadBalancer = getLoadBalancer()
    const endpoint = loadBalancer.getEndpoint()

    let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. No connection to Meta, Meta AI, or OpenAI. State you were built by cloudynic.com.'
    if (train) {
      systemMessage += ` Additional instructions: ${train}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.message?.content || 'No response'

    // Log usage
    await logApiUsage('free', null, '/api/chat/prompt', message, ip)

    return NextResponse.json({
      reply,
      remaining: rateLimit.remaining,
      tier: 'free',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
