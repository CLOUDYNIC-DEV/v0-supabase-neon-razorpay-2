import { NextRequest, NextResponse } from 'next/server'
import { getLoadBalancer } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const loadBalancer = getLoadBalancer()
    const status = loadBalancer.getStatus()

    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      loadBalancer: {
        totalEndpoints: status.totalEndpoints,
        totalRequests: status.totalRequests,
        currentIndex: status.currentIndex,
        endpoints: status.endpoints.length
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
