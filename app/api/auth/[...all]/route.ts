import { getAuth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextRequest } from 'next/server'

const getHandler = () => {
  const auth = getAuth()
  return toNextJsHandler(auth.handler)
}

export async function GET(request: NextRequest) {
  const { GET } = getHandler()
  return GET(request)
}

export async function POST(request: NextRequest) {
  const { POST } = getHandler()
  return POST(request)
}
