#!/usr/bin/env node

/**
 * Simple HTTP server for style guide showcase
 * Serves the frontend directory on port 3001
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;
const FRONTEND_DIR = resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let filePath = req.url === '/' ? '/style-guide/index.html' : req.url;
  
  // Remove leading slash for file system operations
  filePath = filePath.replace(/^\/+/, '');
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const fullPath = join(FRONTEND_DIR, filePath);
  
  // Check if file exists
  if (!existsSync(fullPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
    return;
  }

  try {
    const content = readFileSync(fullPath);
    const ext = extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`\n✨ Style Guide Server running!`);
  console.log(`📍 http://localhost:${PORT}/style-guide/index.html`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});








