import { NextRequest, NextResponse } from 'next/server'

// ⚡ CRITICAL FOR SPEED: Force Edge Runtime to minimize cold starts and function overhead
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Configuration constants
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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'
const GROQ_MODEL = 'llama-3.1-8b-instant'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// 1. Daily global demo limits per IP
const demoLimits = new Map<string, { count: number; resetTime: number }>()
const DEMO_LIMIT = 3
const RESET_INTERVAL = 86400000 // 24 * 60 * 60 * 1000 

// 2. Strict RPM Rate Limiter (30 requests per minute max across the server)
let globalRequestTimestamps: number[] = []
const MAX_RPM = 30
const ONE_MINUTE_MS = 60000

function checkAndTrackRateLimit(now: number): boolean {
  // Clean up timestamps older than 1 minute
  globalRequestTimestamps = globalRequestTimestamps.filter(timestamp => now - timestamp < ONE_MINUTE_MS)
  
  if (globalRequestTimestamps.length >= MAX_RPM) {
    return false 
  }
  
  globalRequestTimestamps.push(now)
  return true
}

function getDemoCount(ip: string, now: number): number {
  const record = demoLimits.get(ip)
  if (!record || now > record.resetTime) {
    demoLimits.set(ip, { count: 0, resetTime: now + RESET_INTERVAL })
    return 0
  }
  return record.count
}

function incrementDemoCount(ip: string, now: number): void {
  const record = demoLimits.get(ip) || { count: 0, resetTime: now + RESET_INTERVAL }
  record.count += 1
  demoLimits.set(ip, record)
}

export async function POST(request: NextRequest) {
  const now = Date.now()

  // 1. Instant Global RPM Check
  if (!checkAndTrackRateLimit(now)) {
    return NextResponse.json({ error: 'server is busy atmax load' }, { status: 503 })
  }

  try {
    // 2. Fast IP extraction
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const currentCount = getDemoCount(ip, now)
    if (currentCount >= DEMO_LIMIT) {
      return NextResponse.json({ error: `Demo limit reached (${DEMO_LIMIT}/day).` }, { status: 429 })
    }

    // 3. Extract JSON payload quickly
    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // 4. Fire fetch immediately (Edge environment reuses TCP connections automatically)
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
            content: 'You are Cloudynic AI. Be ultra-concise. Answer in 1 sentence or less.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
        // Dropping max tokens even lower reduces internal processing overhead
        max_completion_tokens: 150, 
        temperature: 0.2, // Lower temperature speeds up token selection slightly
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    incrementDemoCount(ip, now)

    // 5. Instantly pipe the raw stream directly to the client without decoding/re-encoding
    return new NextResponse(response.body, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error: any) {
    console.error('[Groq] Demo error:', error?.message || error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
