import { defaultCedarTextSchema } from '../authorization/cedar-schema.js'
import { getDatabase } from '../db/index.js'

let cachedSchema: string | null = null

export function loadDefaultSchema(): string {
  if (cachedSchema) {
    return cachedSchema
  }

  try {
    cachedSchema = defaultCedarTextSchema.trim()
    console.log('[SCHEMA SERVICE] Loaded default Cedar schema from file')
    return cachedSchema
  } catch (error: any) {
    console.error('[SCHEMA SERVICE] Failed to load schema:', error.message)
    throw error
  }
}

export function getDefaultSchema(): string {
  return loadDefaultSchema()
}

function normalizeSchema(schema: string): string {
  return schema.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export async function compareSchemas(fileSchema: string, dbSchema: string): Promise<boolean> {
  const normalizedFile = normalizeSchema(fileSchema)
  const normalizedDb = normalizeSchema(dbSchema)
  return normalizedFile === normalizedDb
}

export async function getCurrentDbSchema(): Promise<string | null> {
  const db = getDatabase()
  
  const row = db.prepare(`
    SELECT content 
    FROM schema_policy 
    WHERE obj_type = 'schema' AND status = 1
    ORDER BY updated_at DESC 
    LIMIT 1
  `).get() as any
  
  if (!row) {
    return null
  }
  
  return row.content
}

export async function shouldUpdateSchema(): Promise<{ shouldUpdate: boolean; fileSchema: string; dbSchema: string | null }> {
  const fileSchema = getDefaultSchema()
  const dbSchema = await getCurrentDbSchema()
  
  if (!dbSchema) {
    return { shouldUpdate: true, fileSchema, dbSchema: null }
  }
  
  const isSame = await compareSchemas(fileSchema, dbSchema)
  
  return {
    shouldUpdate: !isSame,
    fileSchema,
    dbSchema
  }
}
