// app/api/v1/prompt/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, checkRateLimit, logApiUsage, getLoadBalancer, getTrainingData } from '@/lib/api-utils'

// Direct stream-based response
async function getAIResponseStream(prompt: string, trainInstruction?: string | null): Promise<{
  stream: ReadableStream | null
  error?: string
}> {
  const loadBalancer = getLoadBalancer()
  const endpointData = loadBalancer.getEndpoint()

  // Handle case where all endpoints are at max capacity (10 active connections each)
  if (!endpointData) {
    return { stream: null, error: 'All servers are currently busy at max capacity. Please try again in a moment.' }
  }

  // Properly pull the properties out of the object
  const { endpoint, connectionId } = endpointData

  // Standard core system message
  let systemMessage = 'You are Cloudynic AI, built and trained by cloudynic.com. You have NO connection to Meta, Meta AI, or OpenAI. State clearly you were built by cloudynic.com.'

  if (trainInstruction) {
    systemMessage += ` Additional instructions: ${trainInstruction}`
  }

  try {
    // Notice we now pass the extracted string variable 'endpoint' instead of the object
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tgi',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error(`Endpoint error ${response.status}: ${endpoint}`)
      // Release connection immediately if the downstream server errored out
      loadBalancer.releaseEndpoint(connectionId)
      return { stream: null, error: `Error: ${response.status}` }
    }

    if (!response.body) {
      loadBalancer.releaseEndpoint(connectionId)
      return { stream: null, error: 'No response body' }
    }

    // Intercept the stream so we can release the connection id only when the user finishes downloading the stream
    const originalStream = response.body
    const transformStream = new TransformStream({
      flush() {
        // Triggers cleanly when the stream ends successfully
        loadBalancer.releaseEndpoint(connectionId)
      },
      cancel() {
        // Triggers if the user cancels/closes their browser tab early
        loadBalancer.releaseEndpoint(connectionId)
      }
    })

    return { stream: originalStream.pipeThrough(transformStream) }
  } catch (error) {
    console.error('API error:', error)
    // Make sure to release the endpoint reservation if things crash mid-flight
    loadBalancer.releaseEndpoint(connectionId)
    return {
      stream: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Keep the rest of your file (GET and POST handlers) exactly the same!