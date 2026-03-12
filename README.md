> **WARNING: This project is a work in progress.** Features may be incomplete, APIs may change without notice, and you will likely encounter bugs. Use at your own risk and please report any issues you find.

# ZIRI

An open-source LLM gateway that enforces policies, rate limits, and spend caps on every request—without changing your code.

## Core Capabilities

- **Providers**: OpenAI, Anthropic, Google Gemini, xAI Grok, Mistral, DeepSeek, Kimi (Moonshot), Qwen (DashScope), OpenRouter, Vertex AI, plus any OpenAI-compatible custom provider.
- **Controls**: Cedar-based authorization, AI-assisted policy generation, custom roles, per-key rate limits, and API key lifecycle management.
- **Visibility**: Cost tracking, audit logs for policy decisions and admin actions, real-time dashboards via SSE, and health checks.
- **Operations**: Web admin UI, SMTP/SendGrid/Mailgun/SES/Resend notifications, and a lightweight SDK for application integration.

Deploy the proxy on a laptop, VM, or container host, then share the proxy URL with your applications or teams. Clients can call ZIRI over HTTP or through the SDK.

## How You Use ZIRI

At a high level:

1. **Run the proxy** using the official Docker image (usually via Docker Compose)
2. **Log in to the admin UI** with the root key (written to `.ziri-root-key` in the config directory; not printed to logs)
3. **Configure a provider** (e.g., OpenAI API key)
4. **Create a user**, which automatically gets an API key
5. **Give the API key and proxy URL** to your application or team
6. **Make requests** to `/api/chat/completions`, `/api/embeddings`, or `/api/images` through ZIRI

The sections below show this end to end.

## Quick Start (Docker)

1. Create `docker-compose.yml`:

   ```yaml
   services:
     proxy:
       image: ziri/proxy:latest
       ports:
         - "3100:3100"
       volumes:
         - ziri-data:/data
       environment:
         - CONFIG_DIR=/data
         - PORT=3100
         - HOST=0.0.0.0
       restart: unless-stopped

   volumes:
     ziri-data:
   ```

2. Start the stack:

   ```bash
   docker compose up -d
   ```

3. Grab the root key from `/data/.ziri-root-key` (or set `ZIRI_ROOT_KEY` to use a fixed key). The key is never printed to logs.
4. To wipe data during development, run `cd packages/proxy && node scripts/drop-tables.js [--reset-root-key]` and restart the container.

### Admin Login

- URL: `http://localhost:3100`
- Username/email: `ziri` or `ziri@ziri.local`
- Password: value stored in `.ziri-root-key` or `ZIRI_ROOT_KEY`

The UI lets you add providers, define Cedar policies, create users, manage keys/roles, view logs and costs, and review internal audit trails.

### First-Time Setup

1. **Add a provider** under `Providers → Add Provider`; supply the provider `name` (e.g., `openai`) plus its API key.
2. **Create a user** in `Users`, which auto-generates credentials and keys.
3. **Retrieve the key** in `Keys`; copy it immediately because it is shown once.
4. **Author a Cedar rule** in `Rules`. Example:

   ```cedar
   permit (
       principal,
       action == Action::"completion",
       resource
   )
   when {
       principal.status == "active"
   };
   ```

5. **Call the proxy** using curl or the SDK.

## Making Requests Through ZIRI

With the proxy running and an API key ready:

```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ziri-your-api-key-here" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, ZIRI!"}
    ]
  }'
```

If your policy allows the request and the provider is configured correctly, you will see a normal chat completion response. The decision, cost, and metadata will be recorded in the audit logs and can be viewed in the UI.

Health check:

```bash
curl http://localhost:3100/health
```

## Node.js SDK (`@ziri/sdk`)

```bash
npm install @ziri/sdk
```

```ts
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'ziri-your-api-key-here',
  proxyUrl: 'http://localhost:3100'
})

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello, ZIRI!' }
  ]
})

console.log(response.choices[0].message.content)
```

Embeddings and image generation are exposed with the same proxy URL. See the SDK docs for a complete API reference.

## Supported Providers

| Provider | Display Name |
|----------|--------------|
| `openai` | OpenAI |
| `anthropic` | Anthropic |
| `google` | Google (Gemini) |
| `xai` | xAI (Grok) |
| `mistral` | Mistral |
| `moonshot` | Kimi (Moonshot) |
| `deepseek` | DeepSeek |
| `dashscope` | Qwen (DashScope) |
| `openrouter` | OpenRouter |
| `vertex_ai` | Vertex AI (Google Cloud) |

Provide any OpenAI-compatible base URL to onboard custom providers.

## Configuration Overview

Configure the proxy via environment variables, a `config.json` stored inside the config directory (the Docker volume by default), and optional email settings in the UI (`Config → Email`).

- Keep persistent data under `CONFIG_DIR=/data` so everything lives inside the `ziri-data` volume.
- Store secrets in `.env` next to `docker-compose.yml`:

  ```bash
  # .env
  ROOT_KEY=your-root-key
  ENCRYPTION_KEY=your-encryption-key
  ```

  ```yaml
  environment:
    - CONFIG_DIR=/data
    - PORT=3100
    - HOST=0.0.0.0
    - ZIRI_ROOT_KEY=${ROOT_KEY}
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
  ```

Refer to the docs for the full configuration matrix.

## Cypress E2E (Full Kickoff Flow)

There is a single, end‑to‑end Cypress spec (under the UI package) that exercises the UI by role (`ziri` admin, viewer, user_admin, policy_admin) and validates page access and actions:

- Spec: `packages/ui/cypress/e2e/full-kickoff.cy.ts`
- Runner script: `scripts/e2e-hybrid.mjs`

### One‑time setup

From the repo root:

```bash
npm install
```

Make sure you can run the dev stack locally:

```bash
npm run dev
```

This starts:

- UI on `https://localhost:3000`
- Proxy on `https://localhost:3100`

### Environment for tests

Use a fixed root key so admin login is stable across restarts, and wire it into Cypress (PowerShell example):

```powershell
$env:CYPRESS_ZIRI_USERNAME = "ziri"
$env:CYPRESS_ZIRI_ROOT_KEY = $env:ZIRI_ROOT_KEY
$env:CYPRESS_GATEWAY_URL = "https://localhost:3000" # or "http://localhost:3000"
```

The Cypress runner script (`scripts/e2e-hybrid.mjs`) also sets:

- `NODE_TLS_REJECT_UNAUTHORIZED=0`
- `CYPRESS_GATEWAY_URL` (defaults to `https://localhost:3000` if not set)

### Running the full kickoff test

1. In **Terminal A**, start the dev servers:

   ```bash
   npm run dev
   ```

2. In **Terminal B**, run one of:

   - Headless run of all E2E specs:

     ```bash
     npm run e2e:hybrid
     ```

   - Headless run of **only** the full‑kickoff flow:

     ```bash
     npm run e2e:kickoff
     ```

   - Interactive run of only the full‑kickoff flow (recommended while tuning tests):

     ```bash
     npm run e2e:kickoff:open
     ```

The full‑kickoff spec will:

- If `CYPRESS_ZIRI_ROOT_KEY` is set, automatically log in as `ziri` via the UI (with a few guarded retries to handle the login page becoming responsive), then run the flow.
- If `CYPRESS_ZIRI_ROOT_KEY` is **not** set, pause at the login screen (`cy.waitForManualLogin()`) so you can log in as `ziri` manually in the Cypress browser.
- After the initial login, the spec will:
  - Create dashboard users for each role and capture their generated passwords.
  - Log in as each role (viewer, user_admin, policy_admin, admin, ziri) and click through all pages that role can see.
  - Assert that write actions are available when allowed, and hidden/forbidden when not allowed.

All other page‑specific Cypress specs under `cypress/e2e/pages/*.cy.ts` are optional; the full‑kickoff flow does not depend on them.

## TLS / HTTPS Configuration

TLS is optional. Without certificates the proxy runs over HTTP as usual, but any PEM certificate (mkcert, Let's Encrypt, corporate CA) works.

### Local mkcert Setup

1. Install [mkcert](https://github.com/FiloSottile/mkcert).
2. Generate certificates:

   ```bash
   mkcert -install
   mkdir -p certs
   mkcert -key-file ./certs/key.pem -cert-file ./certs/cert.pem localhost 127.0.0.1
   cp "$(mkcert -CAROOT)/rootCA.pem" ./certs/rootCA.pem
   ```

3. Update `%APPDATA%\ziri\config.json` (Windows) or `~/.ziri/config.json` (macOS/Linux):

   ```json
   {
     "ssl": {
       "enabled": true,
       "cert": "/absolute/path/to/certs/cert.pem",
       "key": "/absolute/path/to/certs/key.pem"
     }
   }
   ```

4. Run `npm run dev`; the frontend detects the certs and swaps to HTTPS.

You can also set `SSL_ENABLED`, `SSL_CERT_PATH`, and `SSL_KEY_PATH` in the environment.

### Docker + TLS

```yaml
services:
  proxy:
    image: ziri/proxy:latest
    ports:
      - "3100:3100"
    volumes:
      - ziri-data:/data
      - ./certs:/certs:ro
    environment:
      - CONFIG_DIR=/data
      - HOST=0.0.0.0
      - SSL_ENABLED=true
      - SSL_CERT_PATH=/certs/cert.pem
      - SSL_KEY_PATH=/certs/key.pem
    restart: unless-stopped

volumes:
  ziri-data:
```

For public deployments, terminate TLS with nginx, Caddy, or another reverse proxy in front of ZIRI.

### Troubleshooting

- **"fetch failed" in dev mode**: copy `rootCA.pem` into `certs/`.
- **Browser warns about certs**: re-run `mkcert -install` and restart the browser.
- **Proxy falls back to HTTP**: confirm certificate paths in `config.json` are absolute and readable.

Disable TLS by removing the `ssl` block or setting `"enabled": false`.

## Development

- Requirements: Node.js 20+ and npm.
- Setup:

  ```bash
  git clone https://github.com/zstrikehq/ziri.git
  cd ziri
  npm install
  ```

- Scripts:

  ```bash
  npm run dev        # proxy + UI
  npm run dev:proxy  # proxy only
  npm run dev:ui     # UI only
  npm run build      # full build
  npm run build:ui
  npm run build:proxy
  npm run cypress:open
  npm run cypress:run
  npm run e2e:open   # starts app + opens Cypress
  npm run e2e:run    # starts app + runs Cypress headless
  npm run e2e:hybrid       # runs hybrid suite headless (run dev first)
  npm run e2e:hybrid:open  # opens Cypress UI to watch tests run in browser
  npm run e2e:kickoff:open # one spec: manual login, then all flows run automatically
  (cd docs && npm run dev)  # documentation
  ```