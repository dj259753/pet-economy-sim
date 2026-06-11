import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.resolve(root, 'public/config.snapshot.json');

function saveConfigPlugin(): Plugin {
  return {
    name: 'save-config',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/save-config' || req.method !== 'POST') {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString();
            JSON.parse(body);
            fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
            fs.writeFileSync(snapshotPath, body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), saveConfigPlugin()],
});
