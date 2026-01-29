export interface UserSDKConfig {
  apiKey: string
  proxyUrl?: string
}

export class UserSDK {
  private config: UserSDKConfig
  private userId: string

  constructor(config: UserSDKConfig) {
    let finalConfig = { ...config }
    
    if (!finalConfig.proxyUrl) {
      finalConfig.proxyUrl = process.env.ZIRI_PROXY_URL || 'http://localhost:3100'
    }
    
 
    if (!finalConfig.apiKey) {
      throw new Error('apiKey is required')
    }
    
    if (!finalConfig.proxyUrl) {
      throw new Error('proxyUrl is required. Provide in config or set ZIRI_PROXY_URL env var')
    }
    
 
    this.validateApiKey(finalConfig.apiKey)
    
 
    this.userId = this.extractUserId(finalConfig.apiKey)
    
    this.config = finalConfig
  }

  private validateApiKey(apiKey: string): void {
    if (!apiKey.startsWith('ziri-')) {
      throw new Error('Invalid API key format. Expected format: ziri-{userId}-{hash}')
    }
  }

  private extractUserId(apiKey: string): string {
    const withoutPrefix = apiKey.substring(5)
    const lastHyphen = withoutPrefix.lastIndexOf('-')
    if (lastHyphen === -1 || lastHyphen === 0) {
      throw new Error('Invalid API key format')
    }
    return withoutPrefix.substring(0, lastHyphen)
  }


   
  async chatCompletions(params: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
    ipAddress?: string
    context?: Record<string, any>
    [key: string]: any
  }): Promise<any> {
 
    const response = await fetch(`${this.config.proxyUrl}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify({
        provider: params.provider,
        model: params.model,
        messages: params.messages,
        ...Object.fromEntries(
          Object.entries(params).filter(([key]) => 
            !['provider', 'ipAddress', 'context'].includes(key)
          )
        )
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Request failed: ${response.status} ${error}`)
    }
    
    return response.json()
  }

   
  getUserId(): string {
    return this.userId
  }

  async embeddings(params: {
    provider: string
    model: string
    input: string | string[] | Array<string | number[]>
    [key: string]: any
  }): Promise<any> {
    const response = await fetch(`${this.config.proxyUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify({
        provider: params.provider,
        model: params.model,
        input: params.input,
        ...Object.fromEntries(
          Object.entries(params).filter(([key]) =>
            !['provider', 'model', 'input'].includes(key)
          )
        )
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Request failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  async images(params: {
    provider: string
    model: string
    prompt: string
    n?: number
    size?: string
    quality?: string
    response_format?: 'url' | 'b64_json'
    [key: string]: any
  }): Promise<any> {
    const response = await fetch(`${this.config.proxyUrl}/api/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify({
        provider: params.provider,
        model: params.model,
        prompt: params.prompt,
        n: params.n,
        size: params.size,
        quality: params.quality,
        response_format: params.response_format,
        ...Object.fromEntries(
          Object.entries(params).filter(([key]) =>
            !['provider', 'model', 'prompt', 'n', 'size', 'quality', 'response_format'].includes(key)
          )
        )
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Request failed: ${response.status} ${error}`)
    }

    return response.json()
  }
}
