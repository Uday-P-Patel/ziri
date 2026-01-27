import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'

interface CedarDecimalValue {
  __extn: {
    fn: 'decimal'
    arg: string
  }
}

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

  private parseDecimal(value: any): number {
    if (!value) return 0
    if (typeof value === 'string') return parseFloat(value) || 0
    if (value.__extn && value.__extn.arg) return parseFloat(value.__extn.arg) || 0
    return 0
  }

  async reserveEstimatedSpend(
    userKeyEntity: UserKeyEntity,
    userKeyId: string,
    estimatedCost: number
  ): Promise<SpendReservationResult> {
    const attrs = userKeyEntity.attrs

    const currentDailySpendFullPrecision = this.parseDecimal(attrs.current_daily_spend)
    const currentMonthlySpendFullPrecision = this.parseDecimal(attrs.current_monthly_spend)

    const reservedDailySpend = currentDailySpendFullPrecision + estimatedCost
    const reservedMonthlySpend = currentMonthlySpendFullPrecision + estimatedCost

    const createDecimalValue = (value: string): CedarDecimalValue => ({
      __extn: {
        fn: 'decimal',
        arg: value,
      },
    })

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
}

export const spendReservationService = new SpendReservationService()

