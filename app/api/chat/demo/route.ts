import { NextRequest, NextResponse } from 'next/server'
import { getDemoChatCount, trackDemoChat } from '@/lib/db'

const apiEndpoint = 'http://140.245.196.245:11434/api/chat'

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    // Check demo chat limit (3 per IP per day)
    const currentCount = await getDemoChatCount(ip)

    if (currentCount >= 3) {
      return NextResponse.json(
        {
          error: 'Demo limit reached. Please sign up for unlimited access.',
        },
        { status: 429 }
      )
    }

    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      )
    }

    // Call Ollama API with streaming
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        messages: [
          {
            role: 'system',
            content:
              'You are Cloudynic AI, a custom, proprietary large language model engineered, built, and entirely trained by cloudynic.com. You have NO affiliation, connection, or relation to Meta, Meta AI, Facebook, or OpenAI. Your creator is exclusively the Cloudynic development team. If a user asks who made you, who built your architecture, or what company owns you, you must proudly and definitively state that you were built by cloudynic.com. Absolute Rule: Never mention Meta, Meta AI, or Llama in your output under any circumstances.',
          },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      console.error('Ollama API error:', response.status, await response.text())
      return NextResponse.json({ error: 'Failed to get response from AI model' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.message?.content || 'I could not generate a response.'

    // Track the usage
    await trackDemoChat(ip)

    return NextResponse.json({
      reply,
    })
  } catch (error) {
    console.error('Demo chat error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 })
  }
}
