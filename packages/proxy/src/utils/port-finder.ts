import { createServer, type Server } from 'net'

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer()
    const timeout = setTimeout(() => {
      server.close()
      resolve(false)
    }, 1000)
    server.once('listening', () => {
      clearTimeout(timeout)
      server.once('close', () => resolve(true))
      server.close()
    })
    server.once('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout)
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false)
      } else {
        resolve(false)
      }
    })
    server.listen(port, '127.0.0.1')
  })
}


export async function findFreePort(startPort: number, maxAttempts: number = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
  }
  throw new Error(`Could not find available port starting from ${startPort} after ${maxAttempts} attempts`)
}
