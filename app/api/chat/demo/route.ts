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
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const currentCount = getDemoCount(ip)
    if (currentCount >= DEMO_LIMIT) {
      return NextResponse.json({ error: `Demo limit (${DEMO_LIMIT}/day)` }, { status: 429 })
    }

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const loadBalancer = getLoadBalancer()
    const selectedEndpoint = loadBalancer.getEndpoint()

    const response = await fetch(selectedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, built by cloudynic.com. No Meta, OpenAI, or Mistral connection.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    incrementDemoCount(ip)

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error: any) {
    console.error('[v0] Demo error:', error?.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
