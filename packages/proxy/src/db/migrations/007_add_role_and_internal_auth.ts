import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {

  const cols = db.prepare('PRAGMA table_info(auth)').all() as { name: string }[]
  const hasRole = cols.some(c => c.name === 'role')
  const isFirstRun = !hasRole
  
  if (!hasRole) {
    db.exec('ALTER TABLE auth ADD COLUMN role TEXT')
  }
  


  const ziriUser = db.prepare('SELECT * FROM auth WHERE id = ?').get('ziri') as any
  if (ziriUser) {


    if (isFirstRun || !ziriUser.role) {
      db.prepare('UPDATE auth SET role = ? WHERE id = ?').run('admin', 'ziri')
    }
  }
  


  if (hasRole) {
    if (isFirstRun) {

      db.prepare('UPDATE auth SET role = NULL WHERE id != ?').run('ziri')
    } else {

      try {
        db.prepare('UPDATE auth SET role = NULL WHERE id != ? AND (role IS NULL OR role = "")').run('ziri')
      } catch (error: any) {
        console.warn('[MIGRATION 007] Could not update access user roles:', error.message)
      }
    }
  }
  

  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_entities (
      etype TEXT NOT NULL,
      eid TEXT NOT NULL,
      ejson TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (etype, eid)
    )
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_entities_status ON internal_entities(status)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_entities_etype ON internal_entities(etype)
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_schema_policy (
      id TEXT PRIMARY KEY,
      obj_type TEXT NOT NULL CHECK (obj_type IN ('schema', 'policy')),
      version TEXT,
      content TEXT NOT NULL,
      description TEXT,
      status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_obj_type ON internal_schema_policy(obj_type)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_status ON internal_schema_policy(status)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_version ON internal_schema_policy(version)
  `)
  
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_schema_policy_unique_schema 
    ON internal_schema_policy(obj_type) WHERE obj_type = 'schema'
  `)
}

export function down(db: Database.Database): void {


  db.prepare('UPDATE auth SET role = NULL').run()
  db.exec('DROP TABLE IF EXISTS internal_schema_policy')
  db.exec('DROP TABLE IF EXISTS internal_entities')
}
