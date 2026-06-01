import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer, getTrainingData } from '@/lib/api-utils'

// Direct stream-based response (no queue)
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  const selectedEndpoint = loadBalancer.getEndpoint()

  // Standard core system message
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. You have NO connection to Meta, Meta AI, or OpenAI. State clearly you were built by cloudynic.com.'
  
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
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error(`Endpoint error ${response.status}: ${selectedEndpoint}`)
      return { stream: null, error: `Error: ${response.status}` }
    }

    if (!response.body) {
      return { stream: null, error: 'No response body' }
    }

    return { stream: response.body as ReadableStream }
  } catch (error) {
    console.error('API error:', error)
    return {
      stream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// GET /api/v1/prompt?prompt=hello&api=sk_xxx&train=custom_instructions
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const apiKey = searchParams.get('api') || searchParams.get('key') // Support both 'api' and 'key'
    const trainParam = searchParams.get('train')

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter. Usage: /api/v1/prompt?prompt=hello' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
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

      // If no train param provided, try to get user's saved training data
      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait or upgrade your plan.',
        limit: planTier === 'free' ? '1 request/minute' : planTier === 'pro' ? '30 requests/minute' : 'unlimited'
      }, { status: 429 })
    }

    // Log API usage
    await logApiUsage(userId === `ip_${ip}` ? 'free' : userId, null, '/api/v1/prompt', prompt, ip)

    // Get AI response stream
    const { stream, error } = await getAIResponseStream(prompt, trainInstruction)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Plan': planTier,
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/prompt with JSON body { prompt, api, train }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, api, key, train } = body
    const apiKey = api || key // Support both 'api' and 'key'

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
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

      // If no train param provided, try to get user's saved training data
      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait or upgrade your plan.',
        limit: planTier === 'free' ? '1 request/minute' : planTier === 'pro' ? '30 requests/minute' : 'unlimited'
      }, { status: 429 })
    }

    // Log API usage
    await logApiUsage(userId === `ip_${ip}` ? 'free' : userId, null, '/api/v1/prompt', prompt, ip)

    // Get AI response stream
    const { stream, error } = await getAIResponseStream(prompt, trainInstruction)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Plan': planTier,
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
