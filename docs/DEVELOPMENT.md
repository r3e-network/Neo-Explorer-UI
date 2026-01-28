# Development Guide

This guide covers the development setup, coding standards, and best practices for Neo Explorer UI.

## Prerequisites

### Required Software

- **Node.js** 18.x or higher
- **Yarn** 1.22+ (recommended) or npm 8+
- **Git** 2.30+

### Node.js 24 Compatibility

Node.js 24 requires the OpenSSL legacy provider flag due to webpack 4 dependencies:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

Or add to your shell profile (`~/.bashrc` or `~/.zshrc`).

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/RookieCoderrr/Neo-Explorer-UI.git
cd Neo-Explorer-UI
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
VUE_APP_API_URL=https://api.example.com
VUE_APP_NETWORK=testnet
```

### 3. Start Development Server

```bash
yarn serve
```

The app will be available at `http://localhost:8080` with hot-reload enabled.

## Project Architecture

### Directory Structure

```
src/
├── components/      # Reusable UI components
│   ├── common/      # Shared components (buttons, cards, etc.)
│   ├── charts/      # Chart components
│   └── tables/      # Table components
├── composables/     # Vue 3 Composition API hooks
├── services/        # API service layer
├── store/           # Vuex state management
├── utils/           # Utility functions
└── views/           # Page-level components
```

### Key Patterns

1. **Composition API** - Use `<script setup>` for new components
2. **Service Layer** - All API calls go through `/services`
3. **Vuex Modules** - State organized by feature domain
4. **Utility Functions** - Pure functions in `/utils` for reusability

## Coding Standards

### Vue Components

```vue
<template>
  <div class="component-name">
    <!-- Template content -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  title: String
})

// Emits
const emit = defineEmits(['update'])

// Reactive state
const count = ref(0)

// Computed
const doubled = computed(() => count.value * 2)
</script>

<style scoped>
.component-name {
  /* Scoped styles */
}
</style>
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `BlockDetail.vue` |
| Composables | camelCase with `use` prefix | `useBlockData.js` |
| Services | camelCase | `blockService.js` |
| Utils | camelCase | `formatAddress.js` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS` |

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add block detail page
fix: resolve address lookup error
docs: update README
refactor: simplify transaction parser
test: add unit tests for utils
```

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Watch mode for development
yarn test:watch

# Generate coverage report
yarn test:coverage
```

### Writing Tests

Tests are located in `/tests` mirroring the `src` structure:

```javascript
// tests/utils/format.spec.js
import { describe, it, expect } from 'vitest'
import { formatAddress } from '@/utils/format'

describe('formatAddress', () => {
  it('should truncate long addresses', () => {
    const address = 'NXV7ZhHiyM1aHXwpVsRZC6BwNFP2jghXAq'
    expect(formatAddress(address)).toBe('NXV7Zh...hXAq')
  })
})
```

## Linting

```bash
# Check for issues
yarn lint

# Auto-fix issues
yarn lint-fix
```

ESLint is configured with Vue 3 and Prettier integration.

## Troubleshooting

### Common Issues

**1. OpenSSL Error on Node 24**
```
Error: error:0308010C:digital envelope routines::unsupported
```
Solution: `export NODE_OPTIONS=--openssl-legacy-provider`

**2. Port Already in Use**
```bash
# Find and kill process on port 8080
lsof -i :8080
kill -9 <PID>
```

**3. Dependencies Not Found**
```bash
rm -rf node_modules yarn.lock
yarn install
```

## IDE Setup

### VS Code Extensions

- Volar (Vue Language Features)
- ESLint
- Prettier
- Tailwind CSS IntelliSense

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "vue"]
}
```
