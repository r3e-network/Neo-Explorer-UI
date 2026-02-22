# Deployment Guide

This guide covers production deployment options for Neo Explorer UI, with Vercel as the primary path.

## Build for Production

```bash
# Install dependencies
npm install

# Build optimized bundle
npm run build
```

The build output is generated in `dist/`.

## Deployment Options

### Option 1: Vercel (Recommended)

This repository includes a `vercel.json` configuration ready for Vue SPA deployment with network switching support:

- Builds with `npm run build`
- Serves static output from `dist/`
- Rewrites `/api/mainnet` to `http://198.244.215.132:1927`
- Rewrites `/api/testnet` to `http://198.244.215.132:1926`
- Keeps `/api` as a backward-compatible alias to mainnet
- Falls back all non-file SPA routes to `/index.html`

The UI network dropdown (header utility bar) controls which RPC base path is used at runtime:

- **Default**: Mainnet
- **Alternative**: Testnet
- **Persistence**: Stored in browser localStorage

#### Deploy with Vercel CLI

```bash
# Install once
npm i -g vercel

# From project root (first run links the project)
vercel

# Production deployment
vercel --prod
```

#### Deploy via Git Integration

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the repo in the Vercel dashboard.
3. Confirm project settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables if needed (see below).
5. Deploy.

### Option 2: Docker

#### Quick Start

```bash
./run.sh
```

#### Manual Docker Build

```bash
# Build the application
npm run build

# Build Docker image
docker build -t neo-explorer-ui .

# Run container
docker run -d -p 8080:80 --name neo-explorer neo-explorer-ui
```

### Option 3: Nginx Static Hosting

The `dist/` folder can be deployed to static servers such as Nginx/Apache.

#### Configure Nginx

Use SPA fallback routing:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/neo-explorer;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

#### Deploy Files

```bash
sudo cp -r dist/* /var/www/neo-explorer/
sudo chown -R www-data:www-data /var/www/neo-explorer
sudo systemctl restart nginx
```

## Environment Variables

Configure build-time variables in `.env`, `.env.production`, or Vercel project settings.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RPC_BASE_URL` | Optional fixed RPC base URL. Leave unset to follow UI network switch. | unset |
| `VITE_MAINNET_RPC_PROXY_TARGET` | Optional Vite dev proxy target for `/api/mainnet`. | `http://198.244.215.132:1927` |
| `VITE_TESTNET_RPC_PROXY_TARGET` | Optional Vite dev proxy target for `/api/testnet`. | `http://198.244.215.132:1926` |
| `VITE_MAINNET_BPI_PROXY_TARGET` | Optional Vite dev proxy target for `/bpi/mainnet`. | `http://198.244.215.132:1927` |
| `VITE_TESTNET_BPI_PROXY_TARGET` | Optional Vite dev proxy target for `/bpi/testnet`. | `http://198.244.215.132:1926` |

Notes:

- If `VITE_RPC_BASE_URL` is set to a custom value (e.g. external URL), it overrides the runtime switch.
- Keep it unset to use Mainnet/Testnet switching in UI.

## Health Checks

Verify deployment quickly:

```bash
# App entry
curl -I https://your-domain.example/

# SPA route fallback (should return index.html, not 404)
curl -I https://your-domain.example/blocks/1

# Mainnet RPC proxy endpoint
curl -X POST https://your-domain.example/api/mainnet \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getversion","params":{}}'

# Testnet RPC proxy endpoint
curl -X POST https://your-domain.example/api/testnet \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getversion","params":{}}'
```

## Troubleshooting

**404 on page refresh (Vercel/Nginx)**
- Ensure SPA fallback is configured (`/(.*) -> /index.html` on Vercel, `try_files` on Nginx).

**RPC calls fail on Vercel**
- Confirm `vercel.json` exists in repo root.
- Verify `/api/mainnet` and `/api/testnet` rewrites are present.
- Check Vercel deployment logs for routing issues.

**Network switch appears unchanged**
- Confirm browser localStorage is enabled.
- After switching network, page reloads and should fetch from the new endpoint.

**Assets not loading**
- Verify build output is `dist` and Vercel Output Directory is `dist`.
