
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
  if (currentRootKey) {
    return currentRootKey
  }
  const envKey = process.env.ZIRI_ROOT_KEY
  if (envKey) {
    currentRootKey = envKey
    return envKey
  }
  if (existsSync(ROOT_KEY_FILE)) {
    try {
      const fileKey = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
      currentRootKey = fileKey
      return fileKey
    } catch (error: any) {
      console.error(`[ROOT KEY] Failed to read root key file: ${error.message}`)
      return null
    }
  }
  return null
}

export function saveRootKey(key: string): void {
  console.log(`[ROOT KEY] Config directory: ${CONFIG_DIR}`)
  console.log(`[ROOT KEY] Key file path: ${ROOT_KEY_FILE}`)
  
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  try {
    writeFileSync(ROOT_KEY_FILE, key, { mode: 0o600 })
    chmodSync(ROOT_KEY_FILE, 0o600)
    currentRootKey = key

    if (existsSync(ROOT_KEY_FILE)) {
      const verifyKey = readFileSync(ROOT_KEY_FILE, 'utf-8').trim()
      if (verifyKey !== key) {
        console.error('[ROOT KEY] Verification failed - written key does not match')
      }
    } else {
      console.error('[ROOT KEY] File does not exist after write')
    }
  } catch (error: any) {
    console.error(`[ROOT KEY] Failed to write key file: ${error.message}`)
    throw error
  }
}

export function initializeRootKey(): string {
  const envKey = process.env.ZIRI_ROOT_KEY
  if (envKey) {
    currentRootKey = envKey
    if (!existsSync(ROOT_KEY_FILE)) {
      saveRootKey(envKey)
    }
    return envKey
  }

  const newKey = generateRootKey()
  currentRootKey = newKey
  saveRootKey(newKey)
  return newKey
}
