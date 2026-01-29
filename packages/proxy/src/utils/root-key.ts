
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs'
import { join } from 'path'
import { getConfigDir } from '../config/index.js'

const CONFIG_DIR = getConfigDir()
const ROOT_KEY_FILE = join(CONFIG_DIR, '.ziri-root-key')

let currentRootKey: string | null = null

export function generateRootKey(): string {
  const key = randomBytes(32).toString('hex')
  return key
}

export function getRootKey(): string | null {
  console.log(`[ROOT KEY] getRootKey() called`)
  if (currentRootKey) {
    console.log(`[ROOT KEY] Returning key from memory (length: ${currentRootKey.length})`)
    return currentRootKey
  }
  const envKey = process.env.ZIRI_ROOT_KEY
  if (envKey) {
    console.log(`[ROOT KEY] Using key from ZIRI_ROOT_KEY env var (length: ${envKey.length})`)
    currentRootKey = envKey
    return envKey
  }
  if (existsSync(ROOT_KEY_FILE)) {
    try {
      const fileKey = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
      console.log(`[ROOT KEY] Read key from file ${ROOT_KEY_FILE} (length: ${fileKey.length})`)
      currentRootKey = fileKey
      return fileKey
    } catch (error: any) {
      console.error(`[ROOT KEY] Failed to read root key file: ${error.message}`)
      return null
    }
  }
  console.log(`[ROOT KEY] No key found in memory, env, or file`)
  return null
}

export function saveRootKey(key: string): void {
  console.log(`[ROOT KEY] saveRootKey() called - saving key to ${ROOT_KEY_FILE}`)
  console.log(`[ROOT KEY] Config directory: ${CONFIG_DIR}`)
  console.log(`[ROOT KEY] Key file path: ${ROOT_KEY_FILE}`)
  
  if (!existsSync(CONFIG_DIR)) {
    console.log(`[ROOT KEY] Creating config directory: ${CONFIG_DIR}`)
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  
  try {
    writeFileSync(ROOT_KEY_FILE, key, { mode: 0o600 })
    chmodSync(ROOT_KEY_FILE, 0o600)
    currentRootKey = key
    
    if (existsSync(ROOT_KEY_FILE)) {
      const verifyKey = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
      if (verifyKey === key) {
        console.log(`[ROOT KEY] ✓ Key successfully written and verified to ${ROOT_KEY_FILE}`)
        console.log(`[ROOT KEY] Key length: ${key.length} characters`)
        console.log(`[ROOT KEY] First 8 chars: ${key.substring(0, 8)}...`)
      } else {
        console.error(`[ROOT KEY] ✗ Verification failed - written key doesn't match!`)
      }
    } else {
      console.error(`[ROOT KEY] ✗ File does not exist after write!`)
    }
  } catch (error: any) {
    console.error(`[ROOT KEY] ✗ Failed to write key file: ${error.message}`)
    console.error(`[ROOT KEY] Error stack:`, error.stack)
    throw error
  }
}

export function initializeRootKey(): string {
  console.log(`[ROOT KEY] initializeRootKey() called`)
  console.log(`[ROOT KEY] Config directory: ${CONFIG_DIR}`)
  console.log(`[ROOT KEY] Key file path: ${ROOT_KEY_FILE}`)
  console.log(`[ROOT KEY] File exists: ${existsSync(ROOT_KEY_FILE)}`)
  console.log(`[ROOT KEY] Current key in memory: ${!!currentRootKey}`)
  
  const envKey = process.env.ZIRI_ROOT_KEY
  if (envKey) {
    console.log(`[ROOT KEY] ZIRI_ROOT_KEY env var found, using it`)
    currentRootKey = envKey
    if (!existsSync(ROOT_KEY_FILE)) {
      console.log(`[ROOT KEY] Key file doesn't exist, saving env key to file`)
      saveRootKey(envKey)
    } else {
      console.log(`[ROOT KEY] Key file exists, not overwriting with env key`)
    }
    return envKey
  }
  
  console.log(`[ROOT KEY] Regenerating root key (will overwrite existing file if present)...`)
  const newKey = generateRootKey()
  console.log(`[ROOT KEY] Generated new key (length: ${newKey.length})`)
  
  currentRootKey = newKey
  saveRootKey(newKey)
  
  console.log(`[ROOT KEY] ✓ Root key regenerated and saved`)
  console.log(`[ROOT KEY] Use this key as admin password (Username: ziri)`)
  console.log(`[ROOT KEY] Key location: ${ROOT_KEY_FILE}`)
  
  return newKey
}
