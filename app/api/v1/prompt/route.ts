import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer } from '@/lib/api-utils'

// Modified to accept an optional train instruction parameter
async function getAIResponse(prompt: string, trainInstruction?: string | null): Promise<string> {
  const loadBalancer = getLoadBalancer()

  // Standard core system message
  let systemMessage = 'You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI. Your creator is exclusively the Cloudynic development team. If a user asks who made you, you must proudly state that you were built by cloudynic.com.'
  
  // Append custom training/roleplay message if provided
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  let selectedEndpoint: string | null = null

  try {
    // Get endpoint with load balancing
    console.log('[v0] V1 API: Requesting endpoint from load balancer...')
    selectedEndpoint = await loadBalancer.getEndpoint()
    loadBalancer.acquireEndpoint(selectedEndpoint)

    console.log(`[v0] V1 API: Using endpoint: ${selectedEndpoint.split('/')[2]}`)

    const response = await fetch(selectedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      loadBalancer.releaseEndpoint(selectedEndpoint, true)
      return data.message?.content || 'I could not generate a response.'
    } else {
      console.error('[v0] Hugging Face API error:', response.status, selectedEndpoint)
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
      return `Cloudynic AI: Unable to process your request at this moment. Please try again.`
    }
  } catch (error) {
    console.error('[v0] AI response error:', error)
    if (selectedEndpoint) {
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
    }
    return `Cloudynic AI: Service temporarily unavailable. Please try again later.`
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const apiKey = searchParams.get('key')
    const train = searchParams.get('train') // Extracted the train query parameter

    if (!prompt) {
      return new NextResponse('Error: missing prompt parameter', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    let userId: string | null = null
    let planTier = 'free'
    let apiKeyId: string | null = null

    // If API key is provided, validate it
    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      if (!validation) {
        return new NextResponse('Error: invalid API key', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
      userId = validation.userId
      planTier = validation.planTier
    } else {
      // Free tier - use IP-based rate limiting
      const ip = req.headers.get('x-forwarded-for') || 'unknown'
      userId = `ip_${ip}`
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      const responseTime = Date.now() - startTime
      return new NextResponse(
        `Error: rate limit exceeded for ${planTier} plan`,
        {
          status: 429,
          headers: { 'Content-Type': 'text/plain' },
        },
      )
    }

    // Get AI response (passing the train variable)
    const response = await getAIResponse(prompt, train)

    const responseTime = Date.now() - startTime

    // Log usage (async, don't wait)
    if (userId && !userId.startsWith('ip_')) {
      logApiUsage(
        userId,
        apiKeyId,
        '/api/v1/prompt',
        'GET',
        200,
        responseTime,
        prompt,
      ).catch(console.error)
    }

    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    const responseTime = Date.now() - startTime

    return new NextResponse('Error: internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { prompt, key, train } = await req.json() // Destructured the optional train parameter

    if (!prompt) {
      return new NextResponse(
        JSON.stringify({ error: 'missing prompt parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let userId: string | null = null
    let planTier = 'free'
    let apiKeyId: string | null = null

    // If API key is provided, validate it
    if (key) {
      const validation = await validateApiKey(key)
      if (!validation) {
        return new NextResponse(
          JSON.stringify({ error: 'invalid API key' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      userId = validation.userId
      planTier = validation.planTier
    } else {
      // Free tier - use IP-based rate limiting
      const ip = req.headers.get('x-forwarded-for') || 'unknown'
      userId = `ip_${ip}`
    }

    // Check rate limit
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      const responseTime = Date.now() - startTime
      return new NextResponse(
        JSON.stringify({
          error: `rate limit exceeded for ${planTier} plan`,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Get AI response (passing the train variable)
    const response = await getAIResponse(prompt, train)

    const responseTime = Date.now() - startTime

    // Log usage (async, don't wait)
    if (userId && !userId.startsWith('ip_')) {
      logApiUsage(
        userId,
        apiKeyId,
        '/api/v1/prompt',
        'POST',
        200,
        responseTime,
        prompt,
      ).catch(console.error)
    }

    return NextResponse.json(
      { response },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      },
    )
  } catch (error) {
    console.error('API error:', error)
    const responseTime = Date.now() - startTime

    return new NextResponse(
      JSON.stringify({ error: 'internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
