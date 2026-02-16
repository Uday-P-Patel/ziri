import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import { createDecimalValue, parseDecimal, type CedarDecimalValue } from '../utils/cedar.js'

interface UserKeyEntity {
  uid: {
    type: 'UserKey'
    id: string
  }
  attrs: {
    current_daily_spend?: CedarDecimalValue | string
    current_monthly_spend?: CedarDecimalValue | string
    last_daily_reset?: string
    last_monthly_reset?: string
    [key: string]: any
  }
  parents: any[]
}

export interface SpendReservationResult {
  updatedEntity: UserKeyEntity
  reservedDailySpend: number
  reservedMonthlySpend: number
  currentDailySpendFullPrecision: number
  currentMonthlySpendFullPrecision: number
}

export class SpendReservationService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  async reserveEstimatedSpend(
    userKeyEntity: UserKeyEntity,
    userKeyId: string,
    estimatedCost: number
  ): Promise<SpendReservationResult> {
    const attrs = userKeyEntity.attrs

    const currentDailySpendFullPrecision = parseDecimal(attrs.current_daily_spend)
    const currentMonthlySpendFullPrecision = parseDecimal(attrs.current_monthly_spend)

    const reservedDailySpend = currentDailySpendFullPrecision + estimatedCost
    const reservedMonthlySpend = currentMonthlySpendFullPrecision + estimatedCost

    const toFour = (value: number): CedarDecimalValue =>
      createDecimalValue(value.toFixed(4))

    const updatedEntity: UserKeyEntity = {
      ...userKeyEntity,
      attrs: {
        ...userKeyEntity.attrs,
        current_daily_spend: toFour(reservedDailySpend),
        current_monthly_spend: toFour(reservedMonthlySpend),
      },
    }

    const updateStmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `)
    updateStmt.run(JSON.stringify(updatedEntity), userKeyId)

    return {
      updatedEntity,
      reservedDailySpend,
      reservedMonthlySpend,
      currentDailySpendFullPrecision,
      currentMonthlySpendFullPrecision,
    }
  }

  async releaseReservedSpend(userKeyId: string, amountToRelease: number): Promise<void> {
    if (amountToRelease <= 0) return
    const entityStmt = this.db.prepare(`
      SELECT ejson FROM entities WHERE etype = 'UserKey' AND eid = ?
    `)
    const row = entityStmt.get(userKeyId) as { ejson: string } | undefined
    if (!row) return
    const entity: UserKeyEntity = JSON.parse(row.ejson)
    const currentDaily = parseDecimal(entity.attrs.current_daily_spend)
    const currentMonthly = parseDecimal(entity.attrs.current_monthly_spend)
    const newDaily = Math.max(0, currentDaily - amountToRelease)
    const newMonthly = Math.max(0, currentMonthly - amountToRelease)
    const toFour = (value: number) => createDecimalValue(value.toFixed(4))
    const updatedEntity: UserKeyEntity = {
      ...entity,
      attrs: {
        ...entity.attrs,
        current_daily_spend: toFour(newDaily),
        current_monthly_spend: toFour(newMonthly),
      },
    }
    this.db.prepare(`
      UPDATE entities SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `).run(JSON.stringify(updatedEntity), userKeyId)
  }
}

export const spendReservationService = new SpendReservationService()

