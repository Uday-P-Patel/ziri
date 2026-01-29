import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(auth)').all() as { name: string }[]
  const hasDept = cols.some(c => c.name === 'dept')
  if (hasDept) {
    db.exec('ALTER TABLE auth RENAME COLUMN dept TO "group"')
  }
}

export function down(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(auth)').all() as { name: string }[]
  const hasGroup = cols.some(c => c.name === 'group')
  if (hasGroup) {
    db.exec('ALTER TABLE auth RENAME COLUMN "group" TO dept')
  }
}
