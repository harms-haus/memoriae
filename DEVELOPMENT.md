# Development Setup - Hot Reload Configuration

This document explains how hot reloading works in the Memoriae project for both frontend and backend.

## Frontend Hot Reload (Vite)

The frontend uses **Vite** with React Fast Refresh enabled. Changes to React components and files in `frontend/src/` will automatically hot-reload in the browser without a full page refresh.

### Configuration

- **HMR (Hot Module Replacement)**: Enabled with WebSocket on port 5173
- **Fast Refresh**: React components update instantly when you save
- **Proxy**: All `/api/*` requests are proxied to `http://localhost:3000/api/*`

### How It Works

1. Save a file in `frontend/src/`
2. Vite detects the change
3. Only the changed module is updated
4. React Fast Refresh updates the component without losing state

### Testing Hot Reload

```bash
# Start frontend dev server
cd frontend
npm run dev
```

Make a change to any component and watch it update instantly in the browser.

## Backend Hot Reload (tsx watch)

The backend uses **tsx watch** to automatically restart the server when code changes.

### Configuration

- **Watch Mode**: Automatically watches all files in `backend/src/`
- **Auto Restart**: Server restarts on any TypeScript/JavaScript file change
- **TypeScript**: Compiles TypeScript on-the-fly (no build step needed)

### How It Works

1. Save a file in `backend/src/`
2. tsx detects the change
3. Server automatically restarts
4. New code is loaded (connection to DB/Redis is re-established)

### Testing Hot Reload

```bash
# Start backend dev server
cd backend
npm run dev
```

Make a change to any backend file and watch the server restart in the terminal.

## Full Stack Development

When running both frontend and backend:

1. **Backend changes**: Server restarts, frontend automatically reconnects
2. **Frontend changes**: Browser updates instantly via HMR
3. **API changes**: Frontend proxy handles reconnection automatically

### Using run.sh Script

The `run.sh` script starts both services with proper logging:

```bash
./run.sh
```

This will:
- Build both frontend and backend
- Run tests
- Start backend with `tsx watch` (auto-reload)
- Start frontend with Vite (HMR)
- Show combined logs with colored prefixes

## Troubleshooting

### Frontend not reloading?

1. Check browser console for HMR connection errors
2. Verify Vite dev server is running on port 5173
3. Try hard refresh (Ctrl+Shift+R) or clear browser cache
4. Check `frontend/vite.config.ts` HMR configuration

### Backend not reloading?

1. Check terminal for tsx watch errors
2. Verify `tsx` is installed: `npm list tsx` in backend directory
3. Check file permissions (tsx needs read access)
4. Verify you're editing files in `backend/src/` directory

### Proxy issues?

1. Check backend is running on port 3000
2. Verify proxy configuration in `frontend/vite.config.ts`
3. Check browser network tab for failed `/api/*` requests
4. Ensure backend CORS is configured to allow frontend origin

## File Watching

### Frontend watches:
- `frontend/src/**/*.{ts,tsx,js,jsx,css,json}`
- Excludes: `node_modules`, `.git`

### Backend watches:
- `backend/src/**/*.{ts,js}`
- Excludes: `node_modules`, `dist`, `.git`

## Performance Tips

1. **Don't edit files in `dist/`** - They're generated and will be overwritten
2. **Use TypeScript properly** - Catch errors before runtime
3. **Keep file sizes reasonable** - Large files slow down HMR
4. **Avoid circular dependencies** - Can break HMR in React

## Advanced Configuration

### Customizing Vite HMR

Edit `frontend/vite.config.ts`:

```typescript
server: {
  hmr: {
    overlay: true, // Show error overlay
    protocol: 'ws',
    port: 5173,
  },
}
```

### Customizing tsx watch

You can add watch options in `backend/package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts"
  }
}
```

### Watching additional directories

If you need to watch files outside `src/`, modify the watch configuration in the respective config files.
