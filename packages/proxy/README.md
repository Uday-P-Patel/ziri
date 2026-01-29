# @ziri/proxy

**ZIRI Proxy Server** - Complete admin package with proxy server, CLI, UI, and all management tools bundled together.

## ✨ Features

- **All-in-One Package** - Proxy server, CLI, UI, config, and auth-plugin bundled
- **CLI Tool** - Command-line interface for starting and managing the server
- **Bundled UI** - Management interface included (served automatically)
- **Local & Live Modes** - SQLite (local) or backend API (live) support
- **Zero External Admin Dependencies** - Everything needed for admins in one package

## 📦 Installation

```bash
npm install @ziri/proxy
```

## 🚀 Quick Start

### Using the CLI

After installation, the `ziri` CLI is available:

```bash
# Start the server
ziri start

# Start on custom port
ziri start --port 3100 --host localhost

# View help
ziri --help
```

### Programmatic Usage

```javascript
import { startServer } from '@ziri/proxy'

const { port, url } = await startServer()
console.log(`Server running at ${url}`)
```

## 📖 CLI Commands

### `start`

Start the proxy server with bundled UI.

```bash
ziri start [options]

Options:
  -p, --port <port>    Port to run on (default: 3100, auto-finds free port if in use)
  -h, --host <host>    Host to bind to (default: localhost)
```

**Examples:**
```bash
ziri start
ziri start --port 3100
ziri start --port 3100 --host 0.0.0.0
```

### `config`

Manage configuration (if implemented).

## 🎯 First Run

On first run, the server will:

1. **Generate a root key** - Written to `.ziri-root-key` in the config directory (not printed to logs). Use it as the admin password. Set `ZIRI_ROOT_KEY` for a fixed key.
2. **Initialize database** - Created at:
   - **Windows**: `%APPDATA%\ziri\proxy.db`
   - **macOS/Linux**: `~/.ziri/proxy.db`
3. **Create admin user**:
   - **User ID**: `ziri`
   - **Password**: Same as root key
   - **Email**: `ziri@ziri.local`

## 🌐 Access Points

Once started, the server provides:

- **UI**: `http://localhost:3100` (or your configured port)
- **API**: `http://localhost:3100/api/*`
- **Health Check**: `http://localhost:3100/health`

## 📁 Package Structure

```
@ziri/proxy/
├── dist/
│   ├── cli/
│   │   └── cli.js          # CLI executable
│   ├── ui/                  # Bundled UI assets
│   │   ├── index.html
│   │   └── _nuxt/          # UI assets
│   ├── server.js            # Server implementation
│   └── ...
├── src/
│   ├── cli/                 # CLI commands
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── db/                  # Database schema & migrations
│   └── server.ts            # Server setup
└── package.json
```

## 🔧 Configuration

Configuration is stored at:
- **Windows**: `%APPDATA%\ziri\config.json`
- **macOS/Linux**: `~/.ziri/config.json`

Default configuration:
```json
{
  "mode": "local",
  "server": {
    "host": "127.0.0.1",
    "port": 3100
  },
  "publicUrl": "",
  "email": {
    "enabled": false
  }
}
```

Update configuration via the UI's **Config** page or by editing the config file.

## 🛠️ Development

### Building

```bash
# Build proxy (includes UI build and copy)
npm run build

# Build proxy only (assumes UI already built)
npm run build:proxy

# Build UI separately (for development)
npm run build:ui
```

### Running in Development

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## 📦 What's Included

This package bundles:

- ✅ **Proxy Server** - Express server with API routes
- ✅ **CLI Tool** - `ziri` command-line interface
- ✅ **Management UI** - Nuxt-based web interface (bundled as static assets)
- ✅ **Config Module** - Configuration management (`@ziri/config`)
- ✅ **Auth Plugin** - Authentication provider (`@ziri/auth-plugin`)

## 🔐 Security

- **Root Key**: Generated on first run (written to `.ziri-root-key`), used for admin authentication
- **API Keys**: Stored as hashes in database
- **Provider Keys**: Encrypted before storage
- **Passwords**: Hashed using bcrypt

## 📝 Environment Variables

- `PORT` - Server port (default: 3100)
- `HOST` - Server host (default: localhost)
- `ZIRI_ROOT_KEY` - Root key for admin auth (optional; if unset, key is written to `.ziri-root-key`)
- `ZS_AI_ENCRYPTION_KEY` - Encryption key for sensitive data (optional, auto-generated)
- `NODE_ENV` - Environment (`development` or `production`)

## 🐛 Troubleshooting

### Port Already in Use

The server automatically finds the next available port if the configured port is in use.

### UI Not Loading

1. Ensure UI was built: `npm run build:ui`
2. Check that `dist/ui` directory exists
3. Check server logs for UI path resolution

### Database Issues

To start completely fresh (drop all tables; schema and admin user will be recreated on next start):

```bash
node scripts/drop-tables.js
```

Add `--reset-root-key` to also remove `.ziri-root-key` so a new root key is generated. Then start the proxy again.

To only delete the database file manually:
- **Windows**: `%APPDATA%\ziri\proxy.db`
- **macOS/Linux**: `~/.ziri/proxy.db`

## 📄 License

MIT
