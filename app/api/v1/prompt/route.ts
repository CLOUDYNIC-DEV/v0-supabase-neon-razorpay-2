import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

// Stream-based response: Mistral Cluster Optimized
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  // Access the load-balanced cluster config
  const config = getLoadBalancer().getAvailableConfig()

  // Cloudynic Customization
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}` // Authenticate with specific cluster key
      },
      body: JSON.stringify({
        model: 'ministral-8b-latest', // Standardized model identifier
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens, // Enforces 1024 limit
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      return { stream: null, error: `Mistral API returned status: ${response.status}` }
    }

    // Transform stream: Extracts only the 'content' string, discards JSON metadata
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        text.split('\n').forEach(line => {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.replace('data: ', ''))
              const content = json.choices[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch (e) { /* Ignore non-JSON chunks */ }
          }
        })
      }
    })

    return { stream: response.body.pipeThrough(transformStream) }
  } catch (error) {
    return { 
      stream: null, 
      error: error instanceof Error ? error.message : 'Unknown Mistral error' 
    }
  }
}

// Unified Handler for GET and POST
export async function POST(req: NextRequest) {
  try {
    const { prompt, train } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'missing prompt' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!(await checkRateLimit(ip, 'free'))) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) return NextResponse.json({ error }, { status: 503 })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Clean text streaming
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export const GET = POST
