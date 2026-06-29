import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getLoadBalancer } from '@/lib/api-utils'

// A lightweight helper to get real-time Google/Bing search snippets via a fast provider (e.g., Tavily, Brave, or SearXNG)
async function fetchRealTimeContext(query: string): Promise<string> {
  try {
    // Replace this with your preferred search engine API call
    const res = await fetch(`https://api.tavily.com/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY, // Add this token to your Vercel/Render env
        query: query,
        max_results: 3
      })
    })
    
    if (!res.ok) return ''
    const data = await res.json()
    // Map out the results to clean snippets for your 3B model context
    return data.results.map((r: any) => `Source: ${r.title}\nContent: ${r.content}`).join('\n\n')
  } catch (err) {
    console.error('[Web Search Error]: Fallback to default knowledge base.', err)
    return ''
  }
}

async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const config = getLoadBalancer().getEndpoint()

  // Base Cloudynic customization message
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com.'
  if (trainInstruction) {
    systemMessage += ` ${trainInstruction}`
  }

  // Check if the prompt requires fresh, real-time data
  const basicSearchTriggers = ['weather', 'news', 'today', 'latest', '2026', 'who is', 'current']
  const needsSearch = basicSearchTriggers.some(trigger => prompt.toLowerCase().includes(trigger))

  if (needsSearch) {
    console.log(`[Cloudynic AI] Querying real-time context for: "${prompt}"`)
    const liveSnippets = await fetchRealTimeContext(prompt)
    if (liveSnippets) {
      systemMessage += `\n\n[REAL-TIME CONTEXT DATA]\nUse this fresh search data from the live web to accurately answer the user's prompt:\n${liveSnippets}`
    }
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'ministral-3b-2512', // Your exact edge-tier 3B model identifier
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      return { stream: null, error: `Mistral API cluster error: ${response.status}` }
    }

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        text.split('\n').forEach(line => {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.replace('data: ', ''))
              const content = json.choices[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch (e) {}
          }
        })
      }
    })

    return { stream: response.body.pipeThrough(transformStream) }
  } catch (error) {
    return { stream: null, error: error instanceof Error ? error.message : 'Unknown Mistral connection error' }
  }
}

// Unified Endpoint Execution
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
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export const GET = POST
