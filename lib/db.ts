import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './db/schema'

let pool: Pool | null = null
let db: ReturnType<typeof drizzle> | null = null

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

export function getDb() {
  if (!db) {
    const p = getPool()
    db = drizzle(p, { schema })
  }
  return db
}

export { getPool as pool, getDb as db }
