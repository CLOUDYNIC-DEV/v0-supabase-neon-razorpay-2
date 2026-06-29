import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

// CRITICAL FOR VERCEL: Increases the serverless timeout limit to prevent function cuts during live search execution
export const maxDuration = 30; 

async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const config = getLoadBalancer().getEndpoint()

  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        // Targeting the robust 2506 enterprise build
        model: 'mistral-small-2506', 
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        // Activates native internet browsing features on the 2506 architecture
        tools: [
          { type: 'web_search' } 
        ],
        temperature: 0.15, // Mistral recommended lower temperature for optimal tool-call processing
        max_tokens: config.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      return { stream: null, error: `Mistral Cluster Error Code: ${response.status}` }
    }

    // Transform stream: Extracts clean output strings, cutting structural array noise
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
            } catch (e) { /* skip legacy fragment formats */ }
          }
        }
      }
    })

    return { stream: response.body.pipeThrough(transformStream) }
  } catch (error) {
    return { stream: null, error: error instanceof Error ? error.message : 'Unknown connection fault' }
  }
}

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

    if (!prompt) return NextResponse.json({ error: 'missing prompt' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!(await checkRateLimit(ip, 'free'))) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
    }

    const { stream, error } = await getAIResponseStream(prompt, train)
    if (error || !stream) return NextResponse.json({ error }, { status: 503 })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export const GET = POST
