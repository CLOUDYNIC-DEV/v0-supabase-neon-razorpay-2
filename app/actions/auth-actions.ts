'use server'

import { auth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { user, userProfile, apiUsage } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'

async function getUserId() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getUserProfile() {
  const userId = await getUserId()
  const db = getDb()
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
  })
  return profile
}

export async function getUser() {
  const userId = await getUserId()
  const db = getDb()
  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
  })
  return userRecord
}

export async function logApiUsage(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  tokensUsed?: number
) {
  try {
    const userId = await getUserId()
    const db = getDb()
    await db.insert(apiUsage).values({
      id: nanoid(),
      userId,
      endpoint,
      method,
      statusCode,
      responseTime,
      tokensUsed: tokensUsed || 0,
    })
  } catch (error) {
    console.error('[v0] Failed to log API usage:', error)
  }
}

export async function getApiUsageStats() {
  const userId = await getUserId()
  const db = getDb()
  const stats = await db.query.apiUsage.findMany({
    where: eq(apiUsage.userId, userId),
  })
  
  return {
    totalCalls: stats.length,
    averageResponseTime: stats.length > 0 
      ? Math.round(stats.reduce((sum: number, s: any) => sum + (s.responseTime || 0), 0) / stats.length)
      : 0,
    successRate: stats.length > 0
      ? Math.round((stats.filter((s: any) => s.statusCode === 200).length / stats.length) * 100)
      : 0,
    recentCalls: stats.slice(-10),
  }
}

export async function signOutUser() {
  await auth.api.signOut()
}
