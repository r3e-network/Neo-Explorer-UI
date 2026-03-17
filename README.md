# Neo Explorer UI

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/RookieCoderrr/Neo-Explorer-UI)
[![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js)](https://vuejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A modern blockchain explorer for the Neo ecosystem. Visualize Neo chain data from testnet, mainnet, or private networks with an Etherscan-inspired interface.

## ✨ Features

- **Block Explorer** - Browse blocks, transactions, and network statistics
- **Address Lookup** - View address balances, transaction history, and token holdings
- **Token Tracking** - NEP-17 tokens and NFT (NEP-11) gallery support
- **Contract Viewer** - Inspect smart contracts with source code verification
- **Developer Tools** - API documentation, contract verification, and dev utilities
- **NeoChat (P2P)** - Internal peer-to-peer chat with persistent history, unread tracking, and Supabase storage
- **Charts & Analytics** - Network statistics and historical data visualization
- **Multi-language** - Internationalization support (i18n)
- **Responsive Design** - Mobile-friendly with Tailwind CSS

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Vue 3.5 + Vue Router 4 |
| UI | Tailwind CSS + custom explorer components |
| API Client | Axios (JSON-RPC over HTTP) |
| Wallet | WalletConnect Sign Client |
| Charts | ECharts + Chart.js |
| Build | Vite 6 |
| Testing | Vitest + Vue Test Utils |

## 🔌 Backend Integration (neo3fura)

This explorer uses [neo3fura](https://github.com/neo-ngd/neo3fura) as its backend data provider.

### What is neo3fura?

neo3fura is a high-performance Neo N3 blockchain data indexer that provides:
- JSON-RPC API for querying blockchain data
- Real-time WebSocket subscriptions
- Indexed data for blocks, transactions, addresses, tokens, and contracts

### Configuration

The frontend connects to neo3fura via proxy configuration in `vite.config.js`:

```javascript
server: {
  proxy: {
    "/api/mainnet/primary": {
      target: "https://rpc.r3e.network",
      rewrite: () => "/mainnet",
    },
    "/api/testnet/primary": {
      target: "https://rpc.r3e.network",
      rewrite: () => "/testnet",
    },
    "/indexer/mainnet": {
      target: "https://api.n3index.dev",
      rewrite: (p) => p.replace(/^\/indexer\/mainnet/, "/indexer/mainnet"),
    },
    "/indexer/testnet": {
      target: "https://api.n3index.dev",
      rewrite: (p) => p.replace(/^\/indexer\/testnet/, "/indexer/testnet"),
    },
  },
}
```

Primary indexer route style:

- short form: `/indexer/{network}/...`
- compatibility form: `/indexer/v1/networks/{network}/...`

Examples:

- `/indexer/mainnet/status`
- `/indexer/testnet/status`
- `/indexer/mainnet/accounts/<address>/transactions`
- `/indexer/mainnet/contracts/<hash>/events`

### Switching Networks

| Network | RPC Endpoint | WebSocket |
|---------|--------------|-----------|
| Mainnet | `https://rpc.r3e.network/mainnet` (primary), with fallback only on failure | `wss://ws.r3e.network/mainnet` (primary) |
| Testnet | `https://rpc.r3e.network/testnet` (primary), with fallback only on failure | `wss://ws.r3e.network/testnet` (primary) |

### Service Layer

All neo3fura API calls are encapsulated in `src/services/`:

| Service | Description |
|---------|-------------|
| `blockService` | Block queries and pagination |
| `transactionService` | Transaction lookups |
| `accountService` | Address and balance info |
| `contractService` | Smart contract data |
| `tokenService` | NEP-17/NEP-11 tokens |
| `candidateService` | Consensus candidates |
| `statsService` | Dashboard statistics |
| `searchService` | Global search |
| `chatService` | Internal NeoChat API client |

## 💬 NeoChat

This repository now includes an internal NeoChat route and no longer depends on the old external NeoChat deep-link flow.

### Current v1 behavior

- 1:1 peer-to-peer chat only
- no group chat
- network-agnostic rooms
- one canonical room per sorted address pair, so `A ↔ B` is always the same room
- message history stored in Supabase
- unread tracking with `read_at` markers
- header notification badge and click-through into the relevant room

### Authentication model

- Users do **not** sign every message.
- Users complete a **one-time NeoChat login signature** to create a server-validated chat session.
- After that, the Vercel API trusts the session cookie for send/read/unread operations.

### Required setup

1. Apply the SQL schema in [chat_schema.sql](/home/neo/git/Neo-Explorer-UI/supabase/chat_schema.sql) to your Supabase project.
2. Add these environment variables to Vercel:
   - `CHAT_DATABASE_URL`
   - `CHAT_SESSION_SECRET`

### Current provider limitation

The v1 server-side verification flow expects a verifiable Neo public key from the wallet sign-in challenge. Neo-native providers are the intended path. WalletConnect/Neon may need a follow-up compatibility pass if their sign-message flow does not expose the public key needed for verification.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or 20+
- npm (lockfile included)

### Local Development

```bash
# Clone the repository
git clone https://github.com/r3e-network/Neo-Explorer-UI.git
cd Neo-Explorer-UI

# Create local env config
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:5173 in your browser.

### Docker Deployment

```bash
# Build and run with Docker
./run.sh

# Or manually:
npm run build
docker build -t neo-explorer-ui .
docker run -p 8080:80 neo-explorer-ui
```

### Vercel Deployment

This repository is Vercel-ready for SPA routing, with an in-app network switcher (Mainnet default, Testnet optional).

```bash
# Install dependencies
npm install

# Deploy (first time links project)
npx vercel

# Deploy production
npx vercel --prod
```

Optional build-time environment variable:

- `VITE_RPC_BASE_URL` (optional RPC base override; leave unset to use the in-app network switch, or point it at `/api/mainnet` / `/api/testnet` to stay network-aware)
- `VITE_MAINNET_RPC_PROXY_TARGET` / `VITE_TESTNET_RPC_PROXY_TARGET` (optional Vite dev proxy overrides)
- `VITE_MAINNET_BPI_PROXY_TARGET` / `VITE_TESTNET_BPI_PROXY_TARGET` (optional Vite dev BPI proxy overrides)
- `VITE_ENABLE_RPC_STARTUP_HEDGE` (optional; default `true`)

Vercel routing is defined in `vercel.json`:

- `/api/mainnet` → `https://rpc.r3e.network/mainnet`
- `/api/testnet` → `https://rpc.r3e.network/testnet`
- `/api` aliases to mainnet (backward compatible)
- SPA fallback (`/:path*` → `/index.html`)

## 📁 Project Structure

```
src/
├── assets/          # Static assets (images, fonts)
├── components/      # Reusable Vue components (70+)
├── composables/     # Vue 3 composition API hooks
├── constants/       # Application constants
├── directives/      # Custom Vue directives
├── lang/            # i18n translation files
├── layout/          # Layout components
├── plugins/         # Vue plugins configuration
├── router/          # Vue Router configuration
├── services/        # API service modules (9)
├── store/           # Vuex store modules
├── styles/          # Global styles
├── utils/           # Utility functions
└── views/           # Page components (72)
```

## 📖 Documentation

- [Development Guide](./docs/DEVELOPMENT.md) - Setup, coding standards, and contribution guidelines
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run lint-fix` | Fix linting issues |
| `npm run validate:rpc` | Validate frontend RPC usage against backend APIs/docs |
| `npm run validate:rpc:strict` | Validate RPC consistency and fail on any doc gaps |
| `npm run validate:rpc:sync-docs` | Generate/refresh backend doc stubs for allowlisted methods |
| `npm run qa` | Lint + test + build (frontend only) |
| `npm run qa:full` | Lint + test + RPC consistency + build |
| `npm test` | Run unit tests |

`validate:rpc` supports:
- `BACKEND_ROOT=/path/to/neo3fura`
- `FAIL_ON_FRONTEND_DOC_GAPS=1` (missing doc file, method mismatch, frontend method documented only by autogenerated placeholder docs, or frontend method mapped to reserved compatibility docs)
- `FAIL_ON_BACKEND_UNDOCUMENTED=1`
- `WRITE_MISSING_BACKEND_DOCS=1`
- `REFRESH_AUTOGENERATED_BACKEND_DOCS=1`

`validate:rpc` always fails when frontend methods are missing in:
- backend API allowlist
- backend handler set (`neo3fura_http/biz/api`)

`validate:rpc` also validates the Developer API docs catalog in `src/constants/rpcApiDocs.mjs` and fails on:
- structural drift (duplicate methods/categories, passthrough type mismatch)
- catalog methods that are not referenced by frontend RPC usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Neo Official Website](https://neo.org/)
- [Neo Documentation](https://docs.neo.org/)
- [Neon.js SDK](https://github.com/CityOfZion/neon-js)
