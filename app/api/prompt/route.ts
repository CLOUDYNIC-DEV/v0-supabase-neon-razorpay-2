import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer, getTrainingData } from '@/lib/api-utils'

// Plan limits
const PLAN_LIMITS = {
  free: { perMinute: 1, perDay: 100 },
  pro: { perMinute: 30, perDay: 10000 },
  pro_max: { perMinute: 999, perDay: 999999 },
}

// Direct API call (no streaming)
async function getAIResponse(prompt: string, trainInstruction?: string | null): Promise<{
  response: string | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  const selectedEndpoint = loadBalancer.getEndpoint()

  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. No connection to Meta, Meta AI, or OpenAI. State you were built by cloudynic.com.'
  
  if (trainInstruction) {
    systemMessage += ` Additional instructions: ${trainInstruction}`
  }

  try {
    const response = await fetch(selectedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      console.error(`Endpoint error ${response.status}: ${selectedEndpoint}`)
      return { response: null, error: `Error: ${response.status}` }
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.message?.content || 'No response generated.'

    return { response: reply }
  } catch (error) {
    console.error('API error:', error)
    return {
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// GET /api/prompt?prompt=hello&key=sk_xxx&train=custom
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const prompt = searchParams.get('prompt') || searchParams.get('q') || ''
    const apiKey = searchParams.get('key') || searchParams.get('api') || searchParams.get('api_key') || ''
    const trainParam = searchParams.get('train')

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 })
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    let userId = `ip_${ip}`
    let planTier = 'free'
    let trainInstruction = trainParam || null

    // Validate API key if provided
    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      if (!validation) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      userId = validation.userId
      planTier = validation.planTier

      // Get user's training data if not provided
      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      const limits = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free
      return NextResponse.json({
        error: `Rate limit exceeded for ${planTier} tier`,
        limit: limits,
      }, { status: 429 })
    }

    // Log API usage
    await logApiUsage(userId.startsWith('ip_') ? 'free' : userId, null, '/api/prompt', prompt, ip)

    // Get AI response
    const { response, error } = await getAIResponse(prompt, trainInstruction)
    if (error || !response) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 500 })
    }

    return NextResponse.json({
      response,
      tier: planTier,
    })
  } catch (error) {
    console.error('Prompt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/prompt with JSON body { prompt, api_key, train }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, api_key, key, api, train } = body
    const apiKey = api_key || key || api || ''

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 })
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    let userId = `ip_${ip}`
    let planTier = 'free'
    let trainInstruction = train || null

    // Validate API key if provided
    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      if (!validation) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      userId = validation.userId
      planTier = validation.planTier

      // Get user's training data if not provided
      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      const limits = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free
      return NextResponse.json({
        error: `Rate limit exceeded for ${planTier} tier`,
        limit: limits,
      }, { status: 429 })
    }

    // Log API usage
    await logApiUsage(userId.startsWith('ip_') ? 'free' : userId, null, '/api/prompt', prompt, ip)

    // Get AI response
    const { response, error } = await getAIResponse(prompt, trainInstruction)
    if (error || !response) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 500 })
    }

    return NextResponse.json({
      response,
      tier: planTier,
    })
  } catch (error) {
    console.error('Prompt API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
