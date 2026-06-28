import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const config = getLoadBalancer().getAvailableConfig()

  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  if (trainInstruction) systemMessage += ` ${trainInstruction}`

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'ministral-8b-latest',
        messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok || !response.body) return { stream: null, error: 'API Error' }

    // Transform the stream to extract ONLY text content
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
            } catch (e) { /* ignore malformed lines */ }
          }
        }
      }
    })

    return { stream: response.body.pipeThrough(transformStream) }
  } catch (error) {
    return { stream: null, error: 'Request failed' }
  }
}

export async function POST(req: NextRequest) {
  const { prompt, train } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'missing prompt' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!(await checkRateLimit(ip, 'free'))) {
    return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
  }

  const { stream, error } = await getAIResponseStream(prompt, train)
  if (error || !stream) return NextResponse.json({ error }, { status: 503 })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
