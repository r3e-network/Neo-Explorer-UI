# Neo Explorer UI

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/RookieCoderrr/Neo-Explorer-UI)
[![Vue](https://img.shields.io/badge/Vue-3.0-4FC08D?logo=vue.js)](https://vuejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A modern blockchain explorer for the Neo ecosystem. Visualize Neo chain data from testnet, mainnet, or private networks with an Etherscan-inspired interface.

## ✨ Features

- **Block Explorer** - Browse blocks, transactions, and network statistics
- **Address Lookup** - View address balances, transaction history, and token holdings
- **Token Tracking** - NEP-17 tokens and NFT (NEP-11) gallery support
- **Contract Viewer** - Inspect smart contracts with source code verification
- **Developer Tools** - API documentation, contract verification, and dev utilities
- **Charts & Analytics** - Network statistics and historical data visualization
- **Multi-language** - Internationalization support (i18n)
- **Responsive Design** - Mobile-friendly with Tailwind CSS

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Vue 3 + Vue Router 4 + Vuex 4 |
| UI | Element Plus + Bootstrap Vue + Tailwind CSS |
| Blockchain | @cityofzion/neon-js |
| Charts | ECharts + Chart.js |
| Build | Vue CLI 5 + Webpack |
| Testing | Vitest + Vue Test Utils |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (Node 24 requires `--openssl-legacy-provider`)
- Yarn or npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/RookieCoderrr/Neo-Explorer-UI.git
cd Neo-Explorer-UI

# Install dependencies
yarn install

# Start development server
yarn serve
```

Visit http://localhost:8080 in your browser.

### Docker Deployment

```bash
# Build and run with Docker
./run.sh

# Or manually:
yarn build
docker build -t neo-explorer-ui .
docker run -p 8080:80 neo-explorer-ui
```

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
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `yarn serve` | Start development server |
| `yarn build` | Build for production |
| `yarn lint` | Run ESLint |
| `yarn lint-fix` | Fix linting issues |
| `yarn test` | Run unit tests |

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
