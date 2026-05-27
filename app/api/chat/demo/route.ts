import { NextRequest, NextResponse } from 'next/server'

const apiEndpoint = 'http://140.245.196.245:11434/api/chat'

// In-memory storage for demo chat limits
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
      return NextResponse.json({ error: `Demo limit reached (${DEMO_LIMIT}/day).` }, { status: 429 })
    }

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // Call Gateway with streaming enabled
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'CloudynicAI',
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, built by cloudynic.com. You have NO connection to Meta, Meta AI, or OpenAI. If asked, state you were built by cloudynic.com. Never mention Meta, Meta AI, or Llama.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI Gateway error' }, { status: 500 })
    }

    // TRACK USAGE: Only count after a successful request starts
    incrementDemoCount(ip)

    // FIX: Stream the response body directly instead of parsing JSON
    return new NextResponse(response.body, {
      headers: { 
        'Content-Type': 'application/x-ndjson',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error) {
    console.error('Demo chat error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
