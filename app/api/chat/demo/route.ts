import { NextRequest, NextResponse } from 'next/server'
import { getLoadBalancer } from '@/lib/api-utils'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// In-memory fallback for demo limits
const demoLimits = new Map<string, { count: number; resetTime: number }>()
const DEMO_LIMIT = 3
const RESET_INTERVAL = 24 * 60 * 60 * 1000

// Get Supabase admin client (optional - fallback to in-memory if not configured)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

function getDemoCount(ip: string): number {
  const now = Date.now()
  const record = demoLimits.get(ip)
  if (!record || now > record.resetTime) {
    demoLimits.set(ip, { count: 0, resetTime: now + RESET_INTERVAL })
    return 0
  }
  return record.count
}

function incrementDemoCount(ip: string): void {
  const record = demoLimits.get(ip) || { count: 0, resetTime: Date.now() + RESET_INTERVAL }
  record.count += 1
  demoLimits.set(ip, record)
}

export async function POST(request: NextRequest) {
  const loadBalancer = getLoadBalancer()
  const endpointData = loadBalancer.getEndpoint()

  // 1. If load balancer is maxed out, reject request immediately
  if (!endpointData) {
    return NextResponse.json({ error: 'All servers are currently busy at max capacity. Please try again in a moment.' }, { status: 503 })
  }

  // 2. Safely destructure properties
  const { endpoint, connectionId } = endpointData

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const ip = clientIp.split(',')[0].trim()

    const currentCount = getDemoCount(ip)
    if (currentCount >= DEMO_LIMIT) {
      loadBalancer.releaseEndpoint(connectionId) // Clean up slot before leaving!
      return NextResponse.json({ error: `Demo limit reached (${DEMO_LIMIT}/day). Sign up for unlimited access!` }, { status: 429 })
    }

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      loadBalancer.releaseEndpoint(connectionId) // Clean up slot before leaving!
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          {
            role: 'system',
            content: 'You are Cloudynic AI, built and trained by cloudynic.com. No Meta, Meta AI, or OpenAI connection. State you were built by cloudynic.com.',
          },
          { role: 'user', content: message },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Endpoint error [${response.status}]: ${endpoint}`, errorText)
      loadBalancer.releaseEndpoint(connectionId) // Clean up slot on failure!
      return NextResponse.json({ error: `Error: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      console.error('Empty response body:', endpoint)
      loadBalancer.releaseEndpoint(connectionId) // Clean up slot on failure!
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    incrementDemoCount(ip)

    // Try to log to Supabase (non-blocking)
    const supabase = getSupabaseAdmin()
    if (supabase) {
      supabase.from('api_usage').insert({
        endpoint: '/api/chat/demo',
        prompt: message.substring(0, 500),
        ip_address: ip,
      }).then(() => { }).catch(() => { })
    }

    // Intercept stream endings to release the active connection tracking seamlessly
    const originalStream = response.body
    const transformStream = new TransformStream({
      flush() {
        loadBalancer.releaseEndpoint(connectionId)
      },
      cancel() {
        loadBalancer.releaseEndpoint(connectionId)
      }
    })

    return new NextResponse(originalStream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Remaining-Limit': (DEMO_LIMIT - (currentCount + 1)).toString()
      }
    })

  } catch (error: any) {
    console.error('Demo error:', error?.message || error)
    loadBalancer.releaseEndpoint(connectionId) // Critical fallback cleanup
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}