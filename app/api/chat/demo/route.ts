import { NextRequest, NextResponse } from 'next/server'

// Configuration constants
const GROQ_API_KEY = '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'
const GROQ_MODEL = 'llama-3.1-8b-instant'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// 1. Daily global demo limits per IP (as per your original structure)
const demoLimits = new Map<string, { count: number; resetTime: number }>()
const DEMO_LIMIT = 3
const RESET_INTERVAL = 24 * 60 * 60 * 1000 

// 2. Strict RPM Rate Limiter (30 requests per minute max across the server)
// Keeps trace of request timestamps to enforce a rolling window
let globalRequestTimestamps: number[] = []
const MAX_RPM = 30
const ONE_MINUTE_MS = 60 * 1000

function checkAndTrackRateLimit(): boolean {
  const now = Date.now()
  // Clean up timestamps older than 1 minute
  globalRequestTimestamps = globalRequestTimestamps.filter(timestamp => now - timestamp < ONE_MINUTE_MS)
  
  if (globalRequestTimestamps.length >= MAX_RPM) {
    return false // Rate limit exceeded
  }
  
  globalRequestTimestamps.push(now)
  return true
}

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
    // Check global RPM threshold first before processing anything else
    if (!checkAndTrackRateLimit()) {
      return NextResponse.json(
        { error: 'server is busy atmax load' }, 
        { status: 503 }
      )
    }

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

    // Call Groq API with streaming and highly constrained token guardrails
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI by cloudynic.com. Be extremely concise. Keep answers short.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
        // Drastically cuts down generation to save tokens and maintain blazing fast latency
        max_completion_tokens: 500, 
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Groq] API Error [${response.status}]:`, errorText)
      return NextResponse.json({ error: `Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      console.error('[Groq] Empty response body received.')
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
    console.error('[Groq] Demo route error:', error?.message || error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
