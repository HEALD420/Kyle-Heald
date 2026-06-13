// Etsy Agent HQ — zero-framework Node server.
//   npm start  →  http://localhost:3000
// API:
//   GET  /api/state                 full dashboard snapshot
//   GET  /api/events                SSE stream of agent activity
//   POST /api/agents/:id/toggle     flip one agent on/off
//   POST /api/agents/all?enabled=1  deploy or pause the whole army

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createStore } = require('./src/store');
const { Engine } = require('./src/agents');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

const store = createStore();
const engine = new Engine(store);
engine.start();

const sseClients = new Set();
engine.onEvent((event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(payload);
});

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/state') {
    return json(res, 200, engine.snapshot());
  }

  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/agents/all') {
    engine.setAll(url.searchParams.get('enabled') === '1');
    return json(res, 200, { ok: true });
  }

  const toggle = url.pathname.match(/^\/api\/agents\/([a-z]+)\/toggle$/);
  if (req.method === 'POST' && toggle) {
    const agent = engine.agents.find((a) => a.id === toggle[1]);
    if (!agent) return json(res, 404, { error: 'no such agent' });
    engine.setAgentEnabled(agent.id, !agent.enabled);
    return json(res, 200, { ok: true, enabled: agent.enabled });
  }

  serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`\n  🏰 Etsy Agent HQ is live → http://localhost:${PORT}`);
  console.log(`  🤖 8 agents deployed${process.env.ANTHROPIC_API_KEY ? ' (Claude copywriting: ON)' : ' (template mode — set ANTHROPIC_API_KEY for AI copy)'}\n`);
});
