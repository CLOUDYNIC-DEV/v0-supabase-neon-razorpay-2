import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

// Stream-based response adapted for your 8x Mistral Cluster
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  
  // Destructure the key, URL configuration, and strict 1024 max token limit
  const config = loadBalancer.getAvailableConfig()

  // Standard core system message
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}` // Pass the load-balanced key
      },
      body: JSON.stringify({
        model: 'mistral-tiny', // Update this string to your preferred model tier (e.g., open-mistral-7b, mistral-small-latest)
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens, // Enforces the strict 1024 token limit cleanly
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error(`[Mistral Cluster] Endpoint error ${response.status} using key instance context`)
      return { stream: null, error: `Error: ${response.status}` }
    }

    if (!response.body) {
      return { stream: null, error: 'No response body' }
    }

    return { stream: response.body as ReadableStream }
  } catch (error) {
    console.error('[Mistral Cluster] API error:', error)
    return {
      stream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const train = searchParams.get('train')

    if (!prompt) {
      return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
    }

    // Basic rate limit check (IP-based)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const canProceed = await checkRateLimit(ip, 'free')
    if (!canProceed) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[Mistral Route] API error:', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, train } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
    }

    // Basic rate limit check (IP-based)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const canProceed = await checkRateLimit(ip, 'free')
    if (!canProceed) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[Mistral Route] API error:', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
