import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'

export interface CapabilityCheckResult {
  supported: boolean
  error?: {
    code: 'PROVIDER_NOT_SUPPORTED' | 'MODEL_NOT_SUPPORTED' | 'ACTION_NOT_SUPPORTED'
    message: string
  }
}

type SupportedAction = 'completion' | 'embedding' | 'image_generation'

interface ModelPricingRow {
  provider: string
  model: string
  supported_actions: string | null
}

interface ImagePricingRow {
  provider: string
  model: string
}

export class ModelCapabilityService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  private normalizeAction(action: SupportedAction): SupportedAction {
    return action
  }

  private parseSupportedActions(value: string | null | undefined): SupportedAction[] {
    if (!value) return ['completion']
    return value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean) as SupportedAction[]
  }

  checkModelAction(provider: string, model: string, action: SupportedAction): CapabilityCheckResult {
    const normalizedAction = this.normalizeAction(action)

    if (normalizedAction === 'image_generation') {
      const imageRow = this.db.prepare(`
        SELECT provider, model
        FROM image_pricing
        WHERE provider = ? AND model = ?
        ORDER BY effective_from DESC
        LIMIT 1
      `).get(provider, model) as ImagePricingRow | undefined

      if (!imageRow) {
        return {
          supported: false,
          error: {
            code: 'ACTION_NOT_SUPPORTED',
            message: `Model '${model}' is not configured for image generation for provider '${provider}'.`,
          },
        }
      }

      return { supported: true }
    }

    const row = this.db.prepare(`
      SELECT provider, model, supported_actions
      FROM model_pricing
      WHERE provider = ? AND model = ?
      ORDER BY effective_from DESC
      LIMIT 1
    `).get(provider, model) as ModelPricingRow | undefined

    if (!row) {
      return {
        supported: false,
        error: {
          code: 'MODEL_NOT_SUPPORTED',
          message: `Model '${model}' is not configured for provider '${provider}'.`,
        },
      }
    }

    const actions = this.parseSupportedActions(row.supported_actions)

    if (!actions.includes(normalizedAction)) {
      return {
        supported: false,
        error: {
          code: 'ACTION_NOT_SUPPORTED',
          message: `Model '${model}' does not support action '${normalizedAction}'.`,
        },
      }
    }

    return { supported: true }
  }
}

export const modelCapabilityService = new ModelCapabilityService()

