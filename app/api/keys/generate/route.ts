import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory API key storage (in production, use database)
const apiKeys = new Map<string, { key: string; name: string; created: number; userId: string }>()

function generateApiKey(): string {
  return `cnk_${crypto.randomBytes(32).toString('hex')}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const keyName = body.key_name || `API Key ${new Date().toLocaleDateString()}`
    const userId = body.user_id || `user_${crypto.randomBytes(8).toString('hex')}`

    const newApiKey = generateApiKey()
    const createdAt = Date.now()

    // Store in memory
    apiKeys.set(newApiKey, {
      key: newApiKey,
      name: keyName,
      created: createdAt,
      userId,
    })

    const keyData = {
      id: crypto.randomBytes(16).toString('hex'),
      api_key: newApiKey,
      key_name: keyName,
      created_at: new Date(createdAt).toISOString(),
      is_active: true,
    }

    return NextResponse.json({
      key: keyData,
      message: 'API key generated successfully. Save it somewhere safe! Use it with: /api/prompt?key=YOUR_KEY&prompt=YOUR_PROMPT',
      usage: {
        free_get: '/api/free-prompt?prompt=hello',
        paid_get: '/api/prompt?key=YOUR_API_KEY&prompt=hello',
        paid_post: 'POST /api/prompt with {prompt: string, api_key: string}',
      },
    })
  } catch (error) {
    console.error('API key generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.nextUrl.searchParams.get('key')

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
    }

    const keyRecord = apiKeys.get(apiKey)

    if (!keyRecord) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({
      key_name: keyRecord.name,
      created_at: new Date(keyRecord.created).toISOString(),
      is_active: true,
    })
  } catch (error) {
    console.error('API key lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
