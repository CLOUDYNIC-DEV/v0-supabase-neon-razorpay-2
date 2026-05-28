import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer } from '@/lib/api-utils'

// Stream-based response with proper error handling
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  endpoint: string | null
  error?: string
}> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] HF Endpoint Fail [${response.status}]: ${selectedEndpoint}`, errorText)
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
      return {
        stream: null,
        endpoint: null,
        error: `Upstream error: ${response.status}`
      }
    }

    if (!response.body) {
      console.error('[v0] Empty stream body from endpoint:', selectedEndpoint)
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
      return {
        stream: null,
        endpoint: null,
        error: 'Empty response body'
      }
    }

    return {
      stream: response.body as ReadableStream,
      endpoint: selectedEndpoint,
    }
  } catch (error) {
    console.error('[v0] AI response error:', error)
    if (selectedEndpoint) {
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
    }
    return {
      stream: null,
      endpoint: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  let selectedEndpoint: string | null = null

  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const apiKey = searchParams.get('key')
    const train = searchParams.get('train')

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
      return new NextResponse(
        `Error: rate limit exceeded for ${planTier} plan`,
        {
          status: 429,
          headers: { 'Content-Type': 'text/plain' },
        },
      )
    }

    // Get streaming response
    const { stream, endpoint, error } = await getAIResponseStream(prompt, train)
    selectedEndpoint = endpoint

    if (error || !stream) {
      return new NextResponse(
        `Error: ${error || 'Failed to get response'}`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        },
      )
    }

    // Create transformer to wrap stream and release endpoint when done
    const transformer = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      async flush(controller) {
        getLoadBalancer().releaseEndpoint(selectedEndpoint!, true)
        console.log('[v0] V1 API GET stream completed and endpoint released')
      }
    })

    const transformedStream = stream.pipeThrough(transformer)

    // Log usage (async, don't wait)
    const responseTime = Date.now() - startTime
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

    return new NextResponse(transformedStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    if (selectedEndpoint) {
      getLoadBalancer().releaseEndpoint(selectedEndpoint, false)
    }

    return new NextResponse('Error: internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let selectedEndpoint: string | null = null

  try {
    const { prompt, key, train } = await req.json()

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

    // Get streaming response
    const { stream, endpoint, error } = await getAIResponseStream(prompt, train)
    selectedEndpoint = endpoint

    if (error || !stream) {
      return new NextResponse(
        JSON.stringify({ error: error || 'Failed to get response' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Create transformer to wrap stream and release endpoint when done
    const transformer = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      async flush(controller) {
        getLoadBalancer().releaseEndpoint(selectedEndpoint!, true)
        console.log('[v0] V1 API POST stream completed and endpoint released')
      }
    })

    const transformedStream = stream.pipeThrough(transformer)

    // Log usage (async, don't wait)
    const responseTime = Date.now() - startTime
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

    return new NextResponse(transformedStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    if (selectedEndpoint) {
      getLoadBalancer().releaseEndpoint(selectedEndpoint, false)
    }

    return new NextResponse(
      JSON.stringify({ error: 'internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
