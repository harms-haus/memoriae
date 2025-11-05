# Development Container Setup

This guide explains how to use the development container for local debugging and development.

## Quick Start

### Using Podman (Recommended)

```bash
# Build the development image
podman build -f docker/Dockerfile.dev -t memoriae-dev:latest .

# Run the development container
podman run -d \
  --name memoriae-dev \
  -p 3000:3000 \
  -p 5173:5173 \
  -p 9229:9229 \
  -v $(pwd)/backend:/app/backend:rw \
  -v $(pwd)/frontend:/app/frontend:rw \
  -v memoriae-postgres-data:/var/lib/postgresql/14/main \
  -v memoriae-redis-data:/var/lib/redis \
  -v /app/backend/node_modules \
  -v /app/frontend/node_modules \
  -e NODE_ENV=development \
  -e DATABASE_URL=postgresql://memoriae:memoriae@localhost:5432/memoriae \
  -e REDIS_URL=redis://localhost:6379 \
  -e JWT_SECRET=dev-secret-change-in-production \
  memoriae-dev:latest
```

### Using Docker Compose (Easier)

```bash
# Build and start
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker/docker-compose.dev.yml down
```

## Features

### Hot Reload
- **Backend**: Uses `tsx watch` - automatically restarts when you change backend files
- **Frontend**: Uses Vite dev server - instant hot module replacement (HMR)
- **Source Code**: Mounted as volumes, so changes are immediately reflected

### Debugging
- **Node.js Debugging**: Port 9229 exposed for attaching debuggers
  - VS Code: Use "Attach to Node Process" configuration
  - Chrome DevTools: `chrome://inspect`
- **Source Maps**: Enabled for both frontend and backend

### Services
All services run in the same container:
- **Backend**: http://localhost:3000 (with hot reload)
- **Frontend**: http://localhost:5173 (Vite dev server)
- **PostgreSQL**: localhost:5432 (optional external access)
- **Redis**: localhost:6379 (optional external access)

## VS Code Debugging Setup

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "address": "localhost",
      "port": 9229,
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app/backend",
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Then:
1. Start the container
2. Set breakpoints in your code
3. Press F5 to attach the debugger

## Environment Variables

Create a `.env.dev` file or set environment variables:

```bash
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_API_URL=https://openrouter.ai/api/v1
FRONTEND_URL=http://localhost:5173
```

## Running Migrations

Migrations run automatically on container startup. To run manually:

```bash
# Inside the container
podman exec -it memoriae-dev bash
cd /app/backend
npm run migrate
```

## Viewing Logs

```bash
# All services
podman logs -f memoriae-dev

# Specific service (via supervisorctl)
podman exec -it memoriae-dev supervisorctl tail -f backend
podman exec -it memoriae-dev supervisorctl tail -f frontend
```

## Managing Services

```bash
# Check service status
podman exec -it memoriae-dev supervisorctl status

# Restart a service
podman exec -it memoriae-dev supervisorctl restart backend
podman exec -it memoriae-dev supervisorctl restart frontend

# Stop a service
podman exec -it memoriae-dev supervisorctl stop backend
```

## Troubleshooting

### Port Already in Use
If ports 3000, 5173, or 9229 are already in use:
- Change the port mappings in the run command
- Or stop the conflicting service

### Node Modules Not Found
The container uses volume mounts that exclude `node_modules`. The container's node_modules are used. If you add new dependencies:
```bash
# Rebuild the container
podman build -f docker/Dockerfile.dev -t memoriae-dev:latest .
```

### Database Connection Issues
Ensure PostgreSQL is running:
```bash
podman exec -it memoriae-dev supervisorctl status postgresql
```

### Hot Reload Not Working
- Check that volumes are mounted correctly
- Verify file permissions
- Ensure the services are running (check supervisorctl status)

## Differences from Production

| Feature | Development | Production |
|---------|-------------|------------|
| Build | No build, source mounted | Built and copied |
| Backend | `tsx watch` (hot reload) | `node dist/index.js` |
| Frontend | Vite dev server | Static files served by Express |
| Debugging | Port 9229 exposed | No debugging port |
| Source Maps | Enabled | Enabled |
| Dependencies | All (including dev) | Production only |

## Tips

1. **Use VS Code Dev Containers**: You can also use VS Code's Dev Containers extension for an even better experience
2. **Database Persistence**: Data persists in named volumes, so you won't lose data when restarting
3. **Quick Restart**: Use `supervisorctl restart <service>` instead of restarting the whole container
4. **Watch Logs**: Keep a terminal open with `podman logs -f memoriae-dev` to see all output

