import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

// Stream-based response: Mistral Cluster Optimized
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  // Gracefully calls the load balancer
  const config = getLoadBalancer().getAvailableConfig()

  // Standard Cloudynic custom instruction
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}` // Pass dynamic bearer key
      },
      body: JSON.stringify({
        model: 'ministral-8b-latest',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens, // Enforces 1024 limit natively
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      return { stream: null, error: `Mistral API returned error status: ${response.status}` }
    }

    // Transform stream: Extracts clean text content, strips away raw chunk JSON junk
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.replace('data: ', ''))
              const content = json.choices[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch (e) { /* Catch & skip partial JSON breaks smoothly */ }
          }
        }
      }
    })

    return { stream: response.body.pipeThrough(transformStream) }
  } catch (error) {
    return { 
      stream: null, 
      error: error instanceof Error ? error.message : 'Unknown Mistral connection issue' 
    }
  }
}

// Unified Execution for GET and POST Requests
export async function POST(req: NextRequest) {
  try {
    let prompt = ''
    let train = null

    if (req.method === 'POST') {
      const body = await req.json()
      prompt = body.prompt
      train = body.train
    } else {
      const searchParams = req.nextUrl.searchParams
      prompt = searchParams.get('prompt') || ''
      train = searchParams.get('train')
    }

    if (!prompt) {
      return NextResponse.json({ error: 'missing prompt' }, { status: 400 })
    }

    // Basic rate limit check (IP-based)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const canProceed = await checkRateLimit(ip, 'free')
    if (!canProceed) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) {
      return NextResponse.json({ error: error || 'Failed to initialize response stream' }, { status: 503 })
    }

    // Send down clean text tokens directly to the client
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[Cloudynic API] Handler Error:', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export const GET = POST
