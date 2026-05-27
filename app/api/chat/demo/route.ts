import { NextRequest, NextResponse } from 'next/server'

const apiEndpoint = 'http://140.245.196.245:11434/api/chat'

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

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI. Your creator is exclusively the Cloudynic development team. If a user asks who made you, who built your architecture, or what company owns you, you must proudly and definitively state that you were built by cloudynic.com. Absolute Rule: Never mention Meta, Meta AI, or Llama in your output under any circumstances.',
          },
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI Gateway offline' }, { status: 500 })
    }

    incrementDemoCount(ip)

    // Pipes the raw stream directly to the frontend without interrupting it
    return new NextResponse(response.body, {
      headers: { 
        'Content-Type': 'application/x-ndjson',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error) {
    console.error('Demo chat error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
