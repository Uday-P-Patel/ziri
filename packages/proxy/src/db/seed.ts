import { getDatabase } from './index.js'
import { localSchemaStore } from '../services/local/local-schema-store.js'
import { localPolicyStore } from '../services/local/local-policy-store.js'
import { loadPolicyTemplates } from '../services/policy-template-service.js'
import { shouldUpdateSchema, getDefaultSchema } from '../services/schema-service.js'
import type * as cedarType from '@cedar-policy/cedar-wasm/nodejs'

function isCedarTextFormat(schemaData: string): boolean {
  return /^\s*(type\s+\w+|entity\s+\w+|action\s+)/m.test(schemaData.trim())
}

export async function seedDefaultSchema(): Promise<void> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT id, content FROM schema_policy WHERE obj_type = \'schema\' AND status = 1 LIMIT 1').get() as any
  
  if (existing) {
    const isCedarText = isCedarTextFormat(existing.content)
    
    if (!isCedarText) {
      console.log('[SEED] Schema exists in old JSON format, migrating to Cedar text...')
      console.log('[SEED] Converting existing JSON schema to Cedar text...')
      
      try {
        const jsonSchema = JSON.parse(existing.content)
        
        const cedar = await import('@cedar-policy/cedar-wasm/nodejs')
        const textConversion = cedar.schemaToText(jsonSchema as any)
        
        if (textConversion.type === 'failure') {
          const errors = textConversion.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
          console.error(`[SEED] Failed to convert JSON to Cedar text: ${errors}`)
          console.log('[SEED] Replacing with default Cedar text schema from file...')
        } else {
          const version = `v${Date.now()}`
          db.prepare(`
            UPDATE schema_policy 
            SET content = ?, version = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(textConversion.text, version, existing.id)
          console.log('[SEED] ✅ Schema migrated to Cedar text format')
          
          const comparison = await shouldUpdateSchema()
          
          if (comparison.shouldUpdate) {
            console.log('[SEED] Schema file differs from DB, updating...')
            await localSchemaStore.updateSchema(comparison.fileSchema)
            console.log('[SEED] ✅ Schema updated from file')
          } else {
            console.log('[SEED] Schema matches file, no update needed')
          }
          return
        }
      } catch (error: any) {
        console.error(`[SEED] Error migrating schema: ${error.message}`)
        console.log('[SEED] Replacing with default Cedar text schema from file...')
      }
    } else {
      const comparison = await shouldUpdateSchema()
      
      if (comparison.shouldUpdate) {
        console.log('[SEED] Schema file differs from DB, updating...')
        await localSchemaStore.updateSchema(comparison.fileSchema)
        console.log('[SEED] ✅ Schema updated from file')
      } else {
        console.log('[SEED] Schema matches file, no update needed')
      }
      return
    }
  }
  
  console.log('[SEED] No schema exists, seeding default schema from file...')
  
  const fileSchema = getDefaultSchema()
  await localSchemaStore.updateSchema(fileSchema)
  console.log('[SEED] ✅ Default Cedar text schema seeded from file')
}

export async function seedDefaultPolicy(): Promise<void> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT id FROM schema_policy WHERE obj_type = \'policy\' AND status = 1 LIMIT 1').get() as any
  
  if (existing) {
    console.log('[SEED] Policies already exist, skipping seed')
    return
  }
  
  console.log('[SEED] Seeding default policy...')
  
  const defaultPolicy = 'permit(principal, action, resource) when { principal.status == "active" };'
  const description = 'Default policy: Allow completion when user status is active'
  
  await localPolicyStore.createPolicy(defaultPolicy, description)
  console.log('[SEED] Default policy seeded')
}

export async function seedDefaults(): Promise<void> {
  await seedDefaultSchema()
  await seedDefaultPolicy()
  
  loadPolicyTemplates()
}
