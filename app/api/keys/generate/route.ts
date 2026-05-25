import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@neondatabase/serverless'
import crypto from 'crypto'

function generateApiKey(): string {
  return `cnk_${crypto.randomBytes(32).toString('hex')}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const keyName = body.key_name || `API Key ${new Date().toLocaleDateString()}`

    const newApiKey = generateApiKey()
    const dbSql = sql(process.env.DATABASE_URL!)

    const result = await dbSql`
      INSERT INTO cloudynic_api_keys (user_id, api_key, key_name, is_active)
      VALUES (${user.id}, ${newApiKey}, ${keyName}, true)
      RETURNING id, api_key, key_name, created_at, is_active
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      key: result[0],
      message: 'API key generated successfully. Save it somewhere safe!',
    })
  } catch (error) {
    console.error('API key generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
