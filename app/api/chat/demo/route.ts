import { NextRequest, NextResponse } from 'next/server'

// ⚡ FORCE EDGE RUNTIME: Zero cold starts, maximum execution efficiency
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Mistral API Configurations
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'rQPiPMqnCrndUmbgjYWRd3ncypR5SJXSa'
const MISTRAL_MODEL = 'ministral-3b-2512' // Switch to 'ministral-3b-latest' if using the on-device tier
const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions'

// 1. Daily User Demo Rate Limits (In-memory storage for Edge)
const demoLimits = new Map<string, { count: number; resetTime: number }>()
const DEMO_LIMIT = 10000 // Your massive daily limit per user/IP
const RESET_INTERVAL = 86400000 // 24 Hours in milliseconds

// 2. Strict RPM Rate Limiter (Protects your account from hitting Mistral's 30 RPM ceiling)
let globalRequestTimestamps: number[] = []
const MAX_RPM = 30
const ONE_MINUTE_MS = 60000

function checkAndTrackRateLimit(now: number): boolean {
  // Clear out request timestamps older than 60 seconds
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

  // 1. Instant Global Account Shield (Don't break Mistral's 30 RPM limit)
  if (!checkAndTrackRateLimit(now)) {
    return NextResponse.json({ error: 'Server is at maximum capacity. Try again in a few seconds.' }, { status: 429 })
  }

  try {
    // 2. Fast IP extraction for tracking
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const currentCount = getDemoCount(ip, now)
    if (currentCount >= DEMO_LIMIT) {
      return NextResponse.json({ error: `Daily limit reached (${DEMO_LIMIT}/day).` }, { status: 429 })
    }

    // 3. Extract request payload
    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // 4. Hit Mistral API directly with Streaming Enabled
    const response = await fetch(MISTRAL_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are strictly named as Cloudynic AI. No mistral AI. Be ultra-concise. Answer in 1 sentence or less.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
        max_tokens: 150, // Limits maximum completion cost per request
        temperature: 0.2, // Fast, deterministic outputs
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'Empty payload received' }, { status: 500 })
    }

    // 5. Commit token allocation count to memory
    incrementDemoCount(ip, now)

    // 6. Direct Stream Pipe (Bypasses intermediate decoding bottlenecks)
    return new NextResponse(response.body, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error: any) {
    console.error('[Mistral] Execution Error:', error?.message || error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
