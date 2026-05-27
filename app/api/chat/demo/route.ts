import { NextRequest, NextResponse } from 'next/server'
import { getLoadBalancer } from '@/lib/api-utils'

const demoLimits = new Map<string, { count: number; resetTime: number }>()
const DEMO_LIMIT = 3
const RESET_INTERVAL = 24 * 60 * 60 * 1000 

function getDemoCount(ip: string): number {
  const now = Date.now()
  const record = demoLimits.get(ip)
  if (!record || now > record.resetTime) {
    demoLimits.set(ip, { count: 0, resetTime: now + RESET_INTERVAL })
    return 0
  }
  return record.count
}

function incrementDemoCount(ip: string): void {
  const record = demoLimits.get(ip) || { count: 0, resetTime: Date.now() + RESET_INTERVAL }
  record.count += 1
  demoLimits.set(ip, record)
}

export async function POST(request: NextRequest) {
  let selectedEndpoint: string | null = null
  const loadBalancer = getLoadBalancer()

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const currentCount = getDemoCount(ip)
    if (currentCount >= DEMO_LIMIT) {
      return NextResponse.json({ error: `Demo limit reached (${DEMO_LIMIT}/day).` }, { status: 429 })
    }

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // Get endpoint with load balancing and queue
    console.log('[v0] Demo chat: Requesting endpoint from load balancer...')
    selectedEndpoint = await loadBalancer.getEndpoint()
    loadBalancer.acquireEndpoint(selectedEndpoint)

    console.log(`[v0] Demo chat: Using endpoint: ${selectedEndpoint.split('/')[2]}`)

    // Hugging Face standard configuration
    const response = await fetch(selectedEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, built and trained by cloudynic.com. You have NO connection to Meta, Meta AI, or OpenAI. State clearly that you were built by cloudynic.com. Never mention Meta, Meta AI, or Llama.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[v0] HF Endpoint Fail [${response.status}]: ${selectedEndpoint}`, errorText);
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
      return NextResponse.json({ error: `Upstream Space Error: ${response.status}. ${this.queue.length > 0 ? 'In queue' : 'Retrying'}` }, { status: response.status })
    }

    if (!response.body) {
      console.error('[v0] Empty stream body from endpoint:', selectedEndpoint)
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
      return NextResponse.json({ error: 'Empty stream body from Hugging Face' }, { status: 500 })
    }

    incrementDemoCount(ip)

    // Create a passthrough stream that releases endpoint when done
    if (response.body) {
      const transformer = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk)
        },
        async flush(controller) {
          loadBalancer.releaseEndpoint(selectedEndpoint!, true)
          console.log('[v0] Demo stream completed and endpoint released')
        }
      })

      const stream = response.body.pipeThrough(transformer)

      return new NextResponse(stream, {
        headers: { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
        }
      })
    }

    loadBalancer.releaseEndpoint(selectedEndpoint, false)
    return NextResponse.json({ error: 'Failed to get response body' }, { status: 500 })

  } catch (error: any) {
    console.error('[v0] Demo route streaming error:', error?.message || error)
    if (selectedEndpoint) {
      loadBalancer.releaseEndpoint(selectedEndpoint, false)
    }
    return NextResponse.json({ error: `Pipeline Error: ${error?.message || error}` }, { status: 500 })
  }
}
