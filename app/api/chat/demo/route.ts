import { NextRequest, NextResponse } from 'next/server'
import { getDemoChatCount, trackDemoChat } from '@/lib/db'

const OLLAMA_API = 'http://140.245.196.245:11434/api/chat'

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

    // Call Ollama API
    const ollamaResponse = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        stream: false,
      }),
    })

    if (!ollamaResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get response from AI model' },
        { status: 500 }
      )
    }

    const ollamaData = await ollamaResponse.json()
    const reply = ollamaData.message?.content || 'I could not generate a response.'

    // Track the usage
    await trackDemoChat(ip)

    return NextResponse.json({
      reply,
    })
  } catch (error) {
    console.error('Demo chat error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
