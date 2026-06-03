// app/api/prompt/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer, getTrainingData } from '@/lib/api-utils'

// Direct plain-text stream response (no "data: " prefixes or double newlines)
async function getAIResponse(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  const endpointData = loadBalancer.getEndpoint()

  if (!endpointData) {
    return { stream: null, error: 'All servers are currently busy at max capacity. Please try again in a moment.' }
  }

  const { endpoint, connectionId } = endpointData

  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. You have NO connection to Meta, Meta AI, or OpenAI.'

  if (trainInstruction) {
    systemMessage += ` Additional instructions: ${trainInstruction}`
  }

  try {
    const response = await fetch(endpoint, {
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
      console.error(`Endpoint error ${response.status}: ${endpoint}`)
      loadBalancer.releaseEndpoint(connectionId)
      return { stream: null, error: `Error: ${response.status}` }
    }

    if (!response.body) {
      loadBalancer.releaseEndpoint(connectionId)
      return { stream: null, error: 'No response body' }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let buffer = ''

    const cleanTextStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const cleanedLine = line.trim()
              if (!cleanedLine || cleanedLine === 'data: [DONE]') continue

              if (cleanedLine.startsWith('data: ')) {
                try {
                  const rawJson = cleanedLine.slice(6)
                  const parsed = JSON.parse(rawJson)
                  const content = parsed.choices?.[0]?.delta?.content

                  // Stream ONLY the word directly, absolutely zero wrapper formats or linebreaks
                  if (content) {
                    controller.enqueue(encoder.encode(content))
                  }
                } catch (e) {
                  // Skip partial parsing errors safely
                }
              }
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          loadBalancer.releaseEndpoint(connectionId)
          controller.close()
        }
      },
      cancel() {
        reader.cancel()
        loadBalancer.releaseEndpoint(connectionId)
      }
    })

    return { stream: cleanTextStream }
  } catch (error) {
    console.error('API error:', error)
    loadBalancer.releaseEndpoint(connectionId)
    return {
      stream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// GET /api/prompt
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const apiKey = searchParams.get('api') || searchParams.get('key')
    const trainParam = searchParams.get('train')

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt parameter.' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    let userId = `ip_${ip}`
    let planTier = 'free'
    let trainInstruction = trainParam || null

    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      if (!validation) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      userId = validation.userId
      planTier = validation.planTier

      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Checked quota restrictions safely via database thresholds
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait or upgrade your plan.',
        limit: planTier === 'free' ? '1 request/minute' : planTier === 'pro' ? '30 requests/minute' : 'unlimited'
      }, { status: 429 })
    }

    await logApiUsage(userId === `ip_${ip}` ? 'free' : userId, null, '/api/prompt', prompt, ip)

    const { stream, error } = await getAIResponse(prompt, trainInstruction)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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

// POST /api/prompt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, api, key, train } = body
    const apiKey = api || key

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt in request body' }, { status: 400 })
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    let userId = `ip_${ip}`
    let planTier = 'free'
    let trainInstruction = train || null

    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      if (!validation) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      userId = validation.userId
      planTier = validation.planTier

      if (!trainInstruction) {
        trainInstruction = await getTrainingData(userId)
      }
    }

    // Checked quota restrictions safely via database thresholds
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait or upgrade your plan.',
        limit: planTier === 'free' ? '1 request/minute' : planTier === 'pro' ? '30 requests/minute' : 'unlimited'
      }, { status: 429 })
    }

    await logApiUsage(userId === `ip_${ip}` ? 'free' : userId, null, '/api/prompt', prompt, ip)

    const { stream, error } = await getAIResponse(prompt, trainInstruction)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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