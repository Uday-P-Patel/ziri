import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  try {
    db.exec(`
      ALTER TABLE model_pricing
      ADD COLUMN supported_actions TEXT NOT NULL DEFAULT 'completion'
    `)
  } catch (error: any) {
    if (!String(error.message || '').includes('duplicate column name')) {
      throw error
    }
  }

  try {
    db.exec(`
      ALTER TABLE cost_tracking
      ADD COLUMN action TEXT DEFAULT 'completion'
    `)
  } catch (error: any) {
    if (!String(error.message || '').includes('duplicate column name')) {
      throw error
    }
  }

  try {
    db.exec(`
      ALTER TABLE cost_tracking
      ADD COLUMN num_images INTEGER
    `)
  } catch (error: any) {
    if (!String(error.message || '').includes('duplicate column name')) {
      throw error
    }
  }

  try {
    db.exec(`
      ALTER TABLE cost_tracking
      ADD COLUMN image_quality TEXT
    `)
  } catch (error: any) {
    if (!String(error.message || '').includes('duplicate column name')) {
      throw error
    }
  }

  try {
    db.exec(`
      ALTER TABLE cost_tracking
      ADD COLUMN image_size TEXT
    `)
  } catch (error: any) {
    if (!String(error.message || '').includes('duplicate column name')) {
      throw error
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS image_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      quality TEXT NOT NULL,
      size TEXT NOT NULL,
      price_per_image REAL NOT NULL,
      max_images_per_request INTEGER DEFAULT 1,
      effective_from TEXT NOT NULL DEFAULT (datetime('now')),
      effective_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, model, quality, size)
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_image_pricing_provider_model
    ON image_pricing(provider, model)
  `)
}

export function down(db: Database.Database): void {
  db.exec(`DROP TABLE IF EXISTS image_pricing`)
}

