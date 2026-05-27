import { NextRequest, NextResponse } from 'next/server'

// Raw endpoints array directly inside the route
const ENDPOINTS = [
  "https://darkmindforever-server.hf.space/v1/chat/completions",
  "https://darkmindforever-server2.hf.space/v1/chat/completions",
  "https://darkmindforever-server3.hf.space/v1/chat/completions",
  "https://darkmindforever-server4.hf.space/v1/chat/completions",
  "https://darkmindforever-server5.hf.space/v1/chat/completions",
  "https://darkmindforever-server6.hf.space/v1/chat/completions"
]

// Global counter to cleanly round-robin balance requests
let currentEndpointIndex = 0

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

    // Select endpoint and increment index for the next request
    const selectedEndpoint = ENDPOINTS[currentEndpointIndex]
    currentEndpointIndex = (currentEndpointIndex + 1) % ENDPOINTS.length

    // Call Hugging Face Direct with Streaming
    const response = await fetch(selectedEndpoint, {
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
        stream: true, // Request SSE stream format directly from HF
      }),
    })

    if (!response.ok) {
      console.error(`HF Endpoint ${selectedEndpoint} failed with status ${response.status}`)
      return NextResponse.json({ error: 'Upstream Provider Error' }, { status: 500 })
    }

    incrementDemoCount(ip)

    // Pass the raw byte stream directly into the browser client
    return new NextResponse(response.body, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error) {
    console.error('Direct Route streaming error:', error)
    return NextResponse.json({ error: 'Internal Server Error Pipeline' }, { status: 500 })
  }
}
