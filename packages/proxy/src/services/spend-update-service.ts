 

import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import { createDecimalValue, type CedarDecimalValue } from '../utils/cedar.js'

interface UserKeyEntity {
  uid: {
    type: 'UserKey'
    id: string
  }
  attrs: {
    current_daily_spend: CedarDecimalValue | string
    current_monthly_spend: CedarDecimalValue | string
    last_daily_reset: string
    last_monthly_reset: string
    status: string
    user: {
      __entity: {
        type: 'User'
        id: string
      }
    }
    [key: string]: any
  }
  parents: any[]
}

export class SpendUpdateService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

   
  async addSpend(userKeyId: string, cost: number): Promise<void> {
 
 
    const entityStmt = this.db.prepare(`
      SELECT ejson FROM entities 
      WHERE etype = 'UserKey' AND eid = ?
    `)
    const entityRow = entityStmt.get(userKeyId) as { ejson: string } | undefined

    if (!entityRow) {
      throw new Error(`UserKey entity not found: ${userKeyId}`)
    }

    const entity: UserKeyEntity = JSON.parse(entityRow.ejson)
    const userId = entity.attrs.user?.__entity?.id

    if (!userId) {
      throw new Error(`UserKey entity missing user reference: ${userKeyId}`)
    }

 
    const executionKeys = this.db.prepare(`
      SELECT id FROM user_agent_keys WHERE auth_id = ? AND status IN ('active', 'disabled')
    `).all(userId) as { id: string }[]

    const executionKeyIds = executionKeys.map(k => k.id)

    if (executionKeyIds.length === 0) {
      console.warn(`[SPEND_UPDATE] No execution keys found for user ${userId}`)
      return
    }

 
    const lastDailyResetStr = entity.attrs.last_daily_reset
    const lastMonthlyResetStr = entity.attrs.last_monthly_reset

 
    const now = new Date()
    let dailyStartISO: string
    if (lastDailyResetStr) {
      const lastDailyReset = new Date(lastDailyResetStr)
 
      const resetDate = new Date(Date.UTC(
        lastDailyReset.getUTCFullYear(),
        lastDailyReset.getUTCMonth(),
        lastDailyReset.getUTCDate()
      ))
      dailyStartISO = resetDate.toISOString()
    } else {
 
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      dailyStartISO = todayStart.toISOString()
    }

 
    let monthlyStartISO: string
    if (lastMonthlyResetStr) {
      const lastMonthlyReset = new Date(lastMonthlyResetStr)
 
      const resetMonth = new Date(Date.UTC(
        lastMonthlyReset.getUTCFullYear(),
        lastMonthlyReset.getUTCMonth(),
        1
      ))
      monthlyStartISO = resetMonth.toISOString()
    } else {
 
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      monthlyStartISO = monthStart.toISOString()
    }

 
    const placeholders = executionKeyIds.map(() => '?').join(',')
    
 
    const dailySpendResult = this.db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total
      FROM cost_tracking
      WHERE execution_key IN (${placeholders})
        AND request_timestamp >= ?
        AND status = 'completed'
    `).get(...executionKeyIds, dailyStartISO) as { total: number }

 
    const monthlySpendResult = this.db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total
      FROM cost_tracking
      WHERE execution_key IN (${placeholders})
        AND request_timestamp >= ?
        AND status = 'completed'
    `).get(...executionKeyIds, monthlyStartISO) as { total: number }

    const dailySpendFullPrecision = dailySpendResult.total || 0
    const monthlySpendFullPrecision = monthlySpendResult.total || 0

    const dailySpendRounded = parseFloat(dailySpendFullPrecision.toFixed(4))
    const monthlySpendRounded = parseFloat(monthlySpendFullPrecision.toFixed(4))

    entity.attrs.current_daily_spend = createDecimalValue(dailySpendRounded.toFixed(4))
    entity.attrs.current_monthly_spend = createDecimalValue(monthlySpendRounded.toFixed(4))

 
    const updateStmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `)

    const result = updateStmt.run(JSON.stringify(entity), userKeyId)
    
 
    const verifyStmt = this.db.prepare(`
      SELECT ejson FROM entities 
      WHERE etype = 'UserKey' AND eid = ?
    `)
    const verifyRow = verifyStmt.get(userKeyId) as { ejson: string } | undefined
    if (verifyRow) {

    }
  }

}

 
export const spendUpdateService = new SpendUpdateService()
