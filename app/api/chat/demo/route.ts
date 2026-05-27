import { NextRequest, NextResponse } from 'next/server'

const ENDPOINTS = [
  "https://darkmindforever-server.hf.space/v1/chat/completions",
  "https://darkmindforever-server2.hf.space/v1/chat/completions",
  "https://darkmindforever-server3.hf.space/v1/chat/completions",
  "https://darkmindforever-server4.hf.space/v1/chat/completions",
  "https://darkmindforever-server5.hf.space/v1/chat/completions",
  "https://darkmindforever-server6.hf.space/v1/chat/completions"
]

let currentEndpointIndex = 0

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

    const selectedEndpoint = ENDPOINTS[currentEndpointIndex]
    currentEndpointIndex = (currentEndpointIndex + 1) % ENDPOINTS.length

    // Hugging Face standard configuration
    const response = await fetch(selectedEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // OPTIONAL: If your spaces are private or rate-limited, uncomment the line below and add your HF Token
        // 'Authorization': `Bearer ${process.env.HF_ACCESS_TOKEN}` 
      },
      body: JSON.stringify({
        model: 'tgi', // Hugging Face Text Generation Inference spaces usually look for 'tgi' or ignore the parameter entirely
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
      console.error(`HF Endpoint Fail [${response.status}]:`, errorText);
      return NextResponse.json({ error: `Upstream Space Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'Empty stream body from Hugging Face' }, { status: 500 })
    }

    incrementDemoCount(ip)

    // Convert the Node Web Stream seamlessly to prevent Next.js from throwing a 500
    const stream = response.body as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error: any) {
    console.error('Direct Route streaming error:', error)
    return NextResponse.json({ error: `Pipeline Error: ${error?.message || error}` }, { status: 500 })
  }
}
