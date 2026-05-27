import { NextRequest, NextResponse } from 'next/server'
import { getLoadBalancer } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const loadBalancer = getLoadBalancer()
    const status = loadBalancer.getStatus()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      loadBalancer: status,
      message: `Running with ${status.totalEndpoints} endpoints. Queue size: ${status.queueSize}`
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
