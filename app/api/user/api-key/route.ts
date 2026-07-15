import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { headers } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// Assuming you have an api_key table, update the schema path accordingly
// For now, we'll generate and return keys without storing (or you can extend schema)

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a secure API key
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`

    // In a real implementation, store this in the database
    // For now, return the generated key
    // You can extend the schema with an api_keys table if needed

    return NextResponse.json(
      { 
        key: apiKey,
        message: 'API key generated successfully. Store it securely.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
}
