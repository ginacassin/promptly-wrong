'use strict';
/**
 * Promptly Wrong backend: HTTP (images, QR, health) + WebSocket game API.
 * Stateless per replica when REDIS_URL is set; in-memory single instance otherwise.
 *
 * Routes are matched by suffix, so the API works at the root, under /api, or under any
 * path prefix whether or not the reverse proxy strips it:
 *   GET  .../healthz            GET .../qr.svg?u=<url>
 *   GET  .../img/<CODE>/<id>    WS  .../ws
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const G = require('./game');
const { MemoryStore } = require('./store/memory');
const { RedisStore } = require('./store/redis');

const PORT = Number(process.env.PORT || 3000);
const REDIS_URL = process.env.REDIS_URL || '';
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_HOURS || 6) * 3600_000;
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : null; // dev only: also serve the frontend
const MAX_IMG_BYTES = 4 * 1024 * 1024;
const INSTANCE = process.env.HOSTNAME || crypto.randomBytes(3).toString('hex');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const send = (ws, obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

async function main() {
  const store = REDIS_URL ? await RedisStore.connect(REDIS_URL, { ttlMs: ROOM_TTL_MS }) : new MemoryStore({ ttlMs: ROOM_TTL_MS });
  /** sockets connected to THIS replica, by room code */
  const local = new Map();
  const attach = (code, ws) => {
    if (!local.has(code)) local.set(code, new Set());
    local.get(code).add(ws);
  };
  const detach = (code, ws) => {
    const s = local.get(code);
    if (s) { s.delete(ws); if (!s.size) local.delete(code); }
  };

  /** Push the current room state to every socket of that room on this replica. */
  async function fanout(code) {
    const set = local.get(code);
    if (!set || !set.size) return;
    const room = await store.get(code);
    const now = Date.now();
    for (const ws of set) {
      if (!room) { send(ws, { t: 'error', code: 'no_room' }); continue; }
      if (ws.ctx.role === 'host') send(ws, G.hostView(room, now));
      else {
        const view = G.playerView(room, ws.ctx.playerId, now);
        if (view) send(ws, view);
        else { send(ws, { t: 'error', code: 'kicked' }); detach(code, ws); ws.ctx = null; ws.close(); }
      }
    }
  }
  await store.onChange((code) => fanout(code).catch((e) => console.error('fanout', e)));

  /** Mutate a room atomically and announce the change to all replicas. fn returns false for "no change". */
  async function mutate(code, fn) {
    const out = await store.update(code, (room) => {
      const r = fn(room);
      return r === false ? { changed: false } : { changed: true, value: r };
    });
    if (out && out.res.changed) await store.publish(code);
    return out;
  }

  // ------------------------------------------------------------------ HTTP
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const url = new URL(req.url, 'http://x');
      const p = url.pathname;
      let m;

      if (/(^|\/)healthz$/.test(p)) {
        const ok = await store.ping().catch(() => false);
        res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok, store: store.kind, instance: INSTANCE }));
      }

      if ((m = /(?:^|\/)img\/([A-Z]{4})\/([a-f0-9]{10})$/.exec(p))) {
        const img = await store.getImage(m[1], m[2]);
        if (!img) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': img.type, 'Cache-Control': 'private, max-age=21600, immutable' });
        return res.end(img.buf);
      }

      if (/(^|\/)qr\.svg$/.test(p)) {
        const text = (url.searchParams.get('u') || '').slice(0, 300);
        if (!/^https?:\/\//.test(text)) { res.writeHead(400); return res.end(); }
        const svg = await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
        return res.end(svg);
      }

      if (STATIC_DIR) return serveStatic(p, res);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (e) {
      console.error('http', e);
      res.writeHead(500);
      res.end();
    }
  });

  function serveStatic(p, res) {
    if (p.endsWith('/config.js')) {
      res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-cache' });
      return res.end('window.PW_CONFIG = { apiBase: "api/" };\n');
    }
    let file = path.normalize(path.join(STATIC_DIR, p === '/' ? 'index.html' : p));
    if (!file.startsWith(STATIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(STATIC_DIR, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  }

  // ------------------------------------------------------------------ WebSocket
  const wss = new WebSocketServer({ noServer: true, maxPayload: 6 * 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (!/(^|\/)ws$/.test(new URL(req.url, 'http://x').pathname)) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.conn = crypto.randomBytes(6).toString('hex');
    ws.ctx = null; // {role, code, playerId?}
    ws.bucket = { tokens: 20, at: Date.now() };
    ws.on('pong', () => (ws.isAlive = true));
    ws.on('message', (raw) => {
      // simple rate limit: 20 msgs burst, refill 10/s
      const b = ws.bucket, now = Date.now();
      b.tokens = Math.min(20, b.tokens + ((now - b.at) / 1000) * 10);
      b.at = now;
      if (b.tokens < 1) return send(ws, { t: 'error', code: 'slow_down' });
      b.tokens -= 1;
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      handle(ws, msg).catch((e) => { console.error('handler', e); send(ws, { t: 'error', code: 'server' }); });
    });
    ws.on('close', () => {
      const c = ws.ctx;
      if (!c) return;
      detach(c.code, ws);
      if (c.role === 'player') mutate(c.code, (room) => G.disconnect(room, c.playerId, ws.conn)).catch(() => {});
    });
  });

  async function handle(ws, msg) {
    const now = Date.now();
    switch (msg.t) {
      case 'host_create': {
        let room;
        for (let i = 0; i < 20; i++) {
          room = G.createRoom({ code: G.newCode(), players: msg.players, rounds: msg.rounds, timer: msg.timer });
          if (await store.create(room)) break;
          room = null;
        }
        if (!room) return send(ws, { t: 'error', code: 'server' });
        ws.ctx = { role: 'host', code: room.code };
        attach(room.code, ws);
        send(ws, { t: 'host_ok', code: room.code, token: room.hostToken });
        return send(ws, G.hostView(room, now));
      }
      case 'host_resume': {
        const code = String(msg.code || '').toUpperCase();
        const room = await store.get(code);
        if (!room || room.hostToken !== msg.token) return send(ws, { t: 'error', code: 'no_room' });
        if (ws.ctx) detach(ws.ctx.code, ws);
        ws.ctx = { role: 'host', code };
        attach(code, ws);
        send(ws, { t: 'host_ok', code, token: room.hostToken });
        return send(ws, G.hostView(room, now));
      }
      case 'join': {
        const code = String(msg.code || '').toUpperCase().slice(0, 4);
        const out = await store.update(code, (room) => {
          const r = G.join(room, { name: msg.name, token: msg.token, conn: ws.conn });
          return r.err ? { changed: false, err: r.err } : { changed: true, player: r.player };
        });
        if (!out) return send(ws, { t: 'error', code: 'no_room' });
        if (out.res.err) return send(ws, { t: 'error', code: out.res.err });
        if (ws.ctx) detach(ws.ctx.code, ws);
        ws.ctx = { role: 'player', code, playerId: out.res.player.id };
        attach(code, ws);
        send(ws, { t: 'join_ok', code, token: out.res.player.token });
        await store.publish(code);
        return;
      }
      default:
    }

    const c = ws.ctx;
    if (!c) return;

    if (c.role === 'player') {
      if (msg.t !== 'submit') return;
      const room = await store.get(c.code);
      if (!room) return send(ws, { t: 'error', code: 'no_room' });
      const payload = {};
      if (G.expectedKind(room) === 'image') {
        const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(msg.data || ''));
        if (!m) return send(ws, { t: 'error', code: 'bad_image' });
        const buf = Buffer.from(m[2], 'base64');
        if (!buf.length || buf.length > MAX_IMG_BYTES) return send(ws, { t: 'error', code: 'bad_image' });
        payload.img = G.rid(10);
        await store.putImage(c.code, payload.img, buf, m[1]);
      } else payload.text = msg.data;
      let err = null;
      await mutate(c.code, (r) => {
        err = G.submit(r, c.playerId, payload, Date.now());
        return err ? false : true;
      });
      if (err) send(ws, { t: 'error', code: err });
      return;
    }

    // host-only commands
    const ops = {
      config: (r) => G.configure(r, msg),
      kick: (r) => G.kick(r, msg.id),
      start: (r) => G.start(r, Date.now()),
      skip: (r) => G.advance(r, Date.now(), true),
      reveal_done: (r) => G.revealDone(r),
      again: (r) => G.again(r),
    };
    if (!ops[msg.t]) return;
    const out = await mutate(c.code, ops[msg.t]);
    if (!out) return send(ws, { t: 'error', code: 'no_room' });
    if (msg.t === 'again' && out.res.changed) store.dropImages(c.code);
  }

  // ------------------------------------------------------------------ timers + keepalive
  const timerTick = setInterval(async () => {
    try {
      for (const code of await store.due(Date.now() - 300)) {
        const out = await mutate(code, (r) => (G.timeUp(r, Date.now()) ? G.advance(r, Date.now(), true) : false));
        if (!out) await store.forgetDeadline(code);
      }
    } catch (e) {
      console.error('timer', e.message);
    }
  }, 1000);

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  server.listen(PORT, () => console.log(`Promptly Wrong backend ${INSTANCE} on :${PORT} (store=${store.kind}${STATIC_DIR ? ', static=' + STATIC_DIR : ''})`));

  const shutdown = async () => {
    clearInterval(timerTick);
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.close(1012, 'restarting'); // clients reconnect to another replica
    server.close();
    await store.close();
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
