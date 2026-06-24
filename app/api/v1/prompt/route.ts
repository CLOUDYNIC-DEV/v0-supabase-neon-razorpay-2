import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'
import { auth } from '@/lib/auth'

// Stream-based response with simple round-robin
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  const selectedEndpoint = loadBalancer.getEndpoint()

  // Standard core system message
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
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
      console.error(`[v0] Endpoint error ${response.status}: ${selectedEndpoint}`)
      return { stream: null, error: `Error: ${response.status}` }
    }

    if (!response.body) {
      return { stream: null, error: 'No response body' }
    }

    return { stream: response.body as ReadableStream }
  } catch (error) {
    console.error('[v0] API error:', error)
    return {
      stream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    const searchParams = req.nextUrl.searchParams
    const prompt = searchParams.get('prompt')
    const train = searchParams.get('train')

    if (!prompt) {
      return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
    }

    // Get session from Better Auth
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id || 'anonymous'

    // Check rate limit
    const planTier = session?.user ? 'pro' : 'free'
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    // Log usage asynchronously
    if (session?.user?.id) {
      const responseTime = Date.now() - startTime
      import('@/app/actions/auth-actions').then(mod => {
        mod.logApiUsage('/api/v1/prompt', 'GET', 200, responseTime).catch(e => console.error('[v0] Logging error:', e))
      })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    const { prompt, train } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
    }

    // Get session from Better Auth
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id || 'anonymous'

    // Check rate limit
    const planTier = session?.user ? 'pro' : 'free'
    const canProceed = await checkRateLimit(userId, planTier)
    if (!canProceed) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to get response' }, { status: 503 })
    }

    // Log usage asynchronously
    if (session?.user?.id) {
      const responseTime = Date.now() - startTime
      import('@/app/actions/auth-actions').then(mod => {
        mod.logApiUsage('/api/v1/prompt', 'POST', 200, responseTime).catch(e => console.error('[v0] Logging error:', e))
      })
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
