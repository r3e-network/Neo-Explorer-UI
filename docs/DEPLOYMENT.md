# Deployment Guide

This guide covers production deployment options for Neo Explorer UI.

## Build for Production

```bash
# Install dependencies
yarn install

# Build optimized bundle
yarn build
```

The build output will be in the `dist/` directory.

## Deployment Options

### Option 1: Docker (Recommended)

#### Quick Start

```bash
./run.sh
```

#### Manual Docker Build

```bash
# Build the application
yarn build

# Build Docker image
docker build -t neo-explorer-ui .

# Run container
docker run -d -p 8080:80 --name neo-explorer neo-explorer-ui
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  neo-explorer:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

### Option 2: Static Hosting

The `dist/` folder can be deployed to any static hosting service:

- **Nginx** - Copy to `/var/www/html`
- **Apache** - Copy to `/var/www/html`
- **Vercel** - `vercel deploy dist`
- **Netlify** - Drag & drop `dist` folder
- **GitHub Pages** - Push to `gh-pages` branch

### Option 3: Nginx Manual Setup

#### Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### Configure Nginx

Copy the provided `default.conf` or create custom config:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/neo-explorer;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

#### Deploy Files

```bash
# Copy build files
sudo cp -r dist/* /var/www/neo-explorer/

# Set permissions
sudo chown -R www-data:www-data /var/www/neo-explorer

# Restart Nginx
sudo systemctl restart nginx
```

## Environment Variables

Configure via `.env` before building:

| Variable | Description | Default |
|----------|-------------|---------|
| `VUE_APP_API_URL` | Backend API endpoint | - |
| `VUE_APP_NETWORK` | Network (mainnet/testnet) | testnet |

## SSL/HTTPS Setup

For production, use Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Health Checks

Verify deployment:

```bash
# Check if site is accessible
curl -I http://localhost:8080

# Check Nginx status
sudo systemctl status nginx
```

## Troubleshooting

**404 on page refresh**: Ensure Nginx `try_files` is configured for SPA routing.

**Assets not loading**: Check file permissions and paths in Nginx config.

**CORS errors**: Configure backend API to allow your domain.
