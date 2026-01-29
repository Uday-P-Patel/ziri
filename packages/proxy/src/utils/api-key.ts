 

import { createHash } from 'crypto'
import { randomBytes } from 'crypto'

 
export function generateApiKey(userId: string): string {
  const hash = randomBytes(8).toString('hex')
  return `ziri-${userId}-${hash}`
}

 
export function extractUserIdFromApiKey(apiKey: string): string | null {
  if (!apiKey.startsWith('ziri-')) {
    return null
  }
  const withoutPrefix = apiKey.substring(5)
  const lastHyphenIndex = withoutPrefix.lastIndexOf('-')
  if (lastHyphenIndex === -1 || lastHyphenIndex === 0) {
    return null
  }
  const userId = withoutPrefix.substring(0, lastHyphenIndex)
  const hashPart = withoutPrefix.substring(lastHyphenIndex + 1)
  if (hashPart.length !== 16 || !/^[0-9a-f]+$/.test(hashPart)) {
    return null
  }
  return userId
}

 
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey.startsWith('ziri-')) return false
  const withoutPrefix = apiKey.substring(5)
  const lastHyphen = withoutPrefix.lastIndexOf('-')
  if (lastHyphen === -1) return false
  const hashPart = withoutPrefix.substring(lastHyphen + 1)
  return hashPart.length === 16 && /^[0-9a-f]+$/.test(hashPart)
}

 
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}
