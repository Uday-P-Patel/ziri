export interface GatewayConfig {
 
    mode?: 'local' | 'live'
    
 
    server?: {
        host?: string
        port?: number
    }
    publicUrl?: string
    
 
    email?: {
        enabled?: boolean
        provider?: 'smtp' | 'sendgrid' | 'manual'
        smtp?: {
            host: string
            port: number
            secure?: boolean
            auth: {
                user: string
                pass: string
            }
        }
        sendgrid?: {
            apiKey: string
        }
        from?: string
    }
    
 
    projectId?: string
    orgId?: string
    clientId?: string
    clientSecret?: string
    pdpUrl?: string
    proxyUrl?: string
    port?: number
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    masterKey?: string
}

export const defaultConfig: GatewayConfig = {
    mode: 'local',
    server: {
        host: '127.0.0.1',
        port: 3100
    },
    publicUrl: '',
    email: {
        enabled: false,
        provider: 'manual'
    },
    proxyUrl: '',
    port: 3100,
    logLevel: 'info',
    masterKey: ''
}
