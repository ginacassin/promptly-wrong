'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT || 3000);
// Optional: if the app is exposed under a path (e.g. bots.rabbia.net/promptlywrong) and the
// proxy does NOT strip it, set BASE_PATH=/promptlywrong. If the proxy strips it, leave empty.
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const PUB = path.join(__dirname, 'public');

const MAX_PLAYERS = 12;
const MIN_PLAYERS = 3;
const MAX_TEXT = 120;
// Seconds per phase when the timer is on
const DUR = { prompt: 60, image: 150, guess: 60 };
const MAX_IMG_BYTES = 4 * 1024 * 1024;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/** @type {Map<string, any>} */
const rooms = new Map();

// ---------- helpers ----------
const rid = (n = 8) => crypto.randomBytes(n).toString('hex').slice(0, n);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O ambiguity handled below
function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || a)));
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
const cleanText = (s) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, MAX_TEXT);

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function createRoom(players, rounds, timer) {
  const room = {
    code: newCode(),
    hostToken: rid(16),
    hostWs: null,
    phase: 'lobby', // lobby | round | reveal | end
    expected: clamp(players, MIN_PLAYERS, MAX_PLAYERS),
    rounds: clamp(rounds, 3, MAX_PLAYERS),
    timerOn: timer !== false,
    deadline: null,
    timer: null,
    players: [], // {id, name, token, ws, hue}
    N: 0,
    round: 0,
    chains: [],
    subs: new Set(), // player ids that submitted this round
    images: new Map(),
    last: Date.now(),
  };
  room.rounds = Math.min(room.rounds, room.expected);
  rooms.set(room.code, room);
  return room;
}

// Round r, chain c is handled by player (c + r) % N  <=>  player p handles chain (p - r) mod N.
// r === 0: write prompt (text). Odd r: image from text. Even r >= 2: guess text from image.
const outType = (r) => (r === 0 ? 'prompt' : r % 2 === 1 ? 'image' : 'guess');
const chainOf = (room, p, r) => (((p - r) % room.N) + room.N) % room.N;

function startGame(room) {
  room.N = room.players.length;
  room.rounds = Math.max(3, Math.min(room.rounds, room.N));
  room.chains = room.players.map((p) => ({ owner: p.id, steps: [] }));
  room.round = 0;
  room.phase = 'round';
  startRound(room);
}

function startRound(room) {
  room.subs = new Set();
  clearTimeout(room.timer);
  room.deadline = null;
  if (room.phase === 'round' && room.timerOn) {
    const ms = DUR[outType(room.round)] * 1000;
    room.deadline = Date.now() + ms;
    room.timer = setTimeout(() => {
      if (room.phase !== 'round') return;
      maybeAdvance(room, true);
      broadcast(room);
    }, ms + 300);
  }
}

function submit(room, player, msg) {
  if (room.phase !== 'round' || room.subs.has(player.id)) return 'bad_state';
  const r = room.round;
  const idx = room.players.indexOf(player);
  const chain = room.chains[chainOf(room, idx, r)];
  const type = outType(r);
  const step = { type, by: player.id, text: null, img: null };
  if (type === 'image') {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(msg.data || ''));
    if (!m) return 'bad_image';
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length || buf.length > MAX_IMG_BYTES) return 'bad_image';
    const id = rid(10);
    room.images.set(id, { buf, type: m[1] });
    step.img = id;
  } else {
    const text = cleanText(msg.data);
    if (!text) return 'bad_text';
    step.text = text;
  }
  chain.steps[r] = step;
  room.subs.add(player.id);
  maybeAdvance(room);
  return null;
}

function maybeAdvance(room, force = false) {
  if (room.phase !== 'round') return;
  if (!force && room.subs.size < room.N) return;
  // Fill missing steps (skipped / disconnected players)
  room.players.forEach((p, idx) => {
    if (room.subs.has(p.id)) return;
    const chain = room.chains[chainOf(room, idx, room.round)];
    chain.steps[room.round] = { type: outType(room.round), by: p.id, text: null, img: null };
  });
  room.round += 1;
  if (room.round >= room.rounds) room.phase = 'reveal';
  startRound(room);
}

// ---------- state serialization ----------
const hueOf = (room, id) => {
  const i = room.players.findIndex((p) => p.id === id);
  return Math.round((Math.max(i, 0) * 137.5) % 360);
};
const nameOf = (room, id) => (room.players.find((p) => p.id === id) || {}).name || '?';
const imgUrl = (room, id) => (id ? `img/${room.code}/${id}` : null);

function serChains(room) {
  return room.chains.map((ch) => ({
    owner: nameOf(room, ch.owner),
    steps: ch.steps.map((s) => ({
      type: s.type,
      author: nameOf(room, s.by),
      hue: hueOf(room, s.by),
      text: s.text,
      img: imgUrl(room, s.img),
    })),
  }));
}


// ---------- scoring ----------
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** 0..1 similarity between two texts (word overlap + character edit distance). */
function sim(a, b) {
  a = norm(a);
  b = norm(b);
  if (!a || !b) return 0;
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const ed = 1 - lev(a, b) / Math.max(a.length, b.length);
  return 0.5 * jac + 0.5 * ed;
}

function scoreboard(room) {
  const pts = new Map(room.players.map((p) => [p.id, 0]));
  const drifts = [];
  for (const ch of room.chains) {
    const st = ch.steps;
    for (let i = 1; i < st.length; i++) {
      if (st[i].type === 'guess' && st[i].text != null && st[i - 2] && st[i - 2].text != null) {
        const v = Math.round(sim(st[i - 2].text, st[i].text) * 100);
        pts.set(st[i].by, (pts.get(st[i].by) || 0) + v);
        // the image maker between the two texts shares the credit
        if (st[i - 1] && pts.has(st[i - 1].by)) pts.set(st[i - 1].by, pts.get(st[i - 1].by) + v);
      }
    }
    const first = st[0] && st[0].text;
    let last = null;
    for (let i = st.length - 1; i >= 0; i--) if (st[i].type !== 'image' && st[i].text != null) { last = st[i].text; break; }
    if (first != null && last != null && st.length > 1) drifts.push(Math.round((1 - sim(first, last)) * 100));
  }
  const board = room.players
    .map((p) => ({ name: p.name, hue: hueOf(room, p.id), pts: pts.get(p.id) || 0 }))
    .sort((a, b) => b.pts - a.pts);
  const drift = drifts.length ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length) : null;
  return { board, drift };
}

function pubPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    hue: hueOf(room, p.id),
    connected: !!(p.ws && p.ws.readyState === 1),
    done: room.phase === 'round' && room.subs.has(p.id),
  }));
}

function hostState(room) {
  return {
    t: 'host_state',
    code: room.code,
    phase: room.phase,
    expected: room.expected,
    rounds: room.rounds,
    round: room.round,
    N: room.N,
    timerOn: room.timerOn,
    timeLeft: room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
    players: pubPlayers(room),
    chains: room.phase === 'reveal' || room.phase === 'end' ? serChains(room) : null,
    score: room.phase === 'end' ? scoreboard(room) : null,
  };
}

function playerState(room, player) {
  const idx = room.players.indexOf(player);
  const st = {
    t: 'player_state',
    code: room.code,
    phase: room.phase,
    me: { id: player.id, name: player.name, hue: hueOf(room, player.id) },
    rounds: room.rounds,
    round: room.round,
    timeLeft: room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
    players: pubPlayers(room).map((p) => ({ name: p.name, hue: p.hue, connected: p.connected })),
  };
  if (room.phase === 'round') {
    const r = room.round;
    const task = { type: outType(r), input: null };
    if (r > 0) {
      const prev = room.chains[chainOf(room, idx, r)].steps[r - 1];
      task.input = prev ? { text: prev.text, img: imgUrl(room, prev.img) } : { text: null, img: null };
    }
    st.task = task;
    st.done = room.subs.has(player.id);
  }
  if (room.phase === 'end') {
    st.chains = serChains(room);
    st.score = scoreboard(room);
  }
  return st;
}

function broadcast(room) {
  room.last = Date.now();
  send(room.hostWs, hostState(room));
  for (const p of room.players) send(p.ws, playerState(room, p));
}

// ---------- http ----------
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function serveFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  securityHeaders(res);
  const url = new URL(req.url, 'http://x');
  let p = url.pathname;
  if (BASE && p === BASE) {
    res.writeHead(301, { Location: BASE + '/' + url.search });
    return res.end();
  }
  if (BASE && p.startsWith(BASE + '/')) p = p.slice(BASE.length);

  if (p === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  let m = /^\/img\/([A-Z]{4})\/([a-f0-9]{10})$/.exec(p);
  if (m) {
    const room = rooms.get(m[1]);
    const img = room && room.images.get(m[2]);
    if (!img) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': img.type, 'Cache-Control': 'private, max-age=21600' });
    return res.end(img.buf);
  }

  if (p === '/qr.svg') {
    const text = (url.searchParams.get('u') || '').slice(0, 300);
    if (!/^https?:\/\//.test(text)) {
      res.writeHead(400);
      return res.end();
    }
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }, (err, svg) => {
      if (err) {
        res.writeHead(500);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
      res.end(svg);
    });
    return;
  }

  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  serveFile(res, file);
});

// ---------- websocket ----------
const wss = new WebSocketServer({ noServer: true, maxPayload: 6 * 1024 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (!p.endsWith('/ws')) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.ctx = null; // {role:'host'|'player', room, player?}

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    try {
      handle(ws, msg);
    } catch (e) {
      console.error('handler error', e);
      send(ws, { t: 'error', code: 'server' });
    }
  });

  ws.on('close', () => {
    const c = ws.ctx;
    if (!c) return;
    if (c.role === 'host' && c.room.hostWs === ws) c.room.hostWs = null;
    if (c.role === 'player' && c.player.ws === ws) {
      c.player.ws = null;
      send(c.room.hostWs, hostState(c.room));
    }
  });
});

function handle(ws, msg) {
  switch (msg.t) {
    case 'host_create': {
      const room = createRoom(msg.players, msg.rounds, msg.timer);
      room.hostWs = ws;
      ws.ctx = { role: 'host', room };
      send(ws, { t: 'host_ok', code: room.code, token: room.hostToken });
      return send(ws, hostState(room));
    }
    case 'host_resume': {
      const room = rooms.get(String(msg.code || '').toUpperCase());
      if (!room || room.hostToken !== msg.token) return send(ws, { t: 'error', code: 'no_room' });
      room.hostWs = ws;
      ws.ctx = { role: 'host', room };
      send(ws, { t: 'host_ok', code: room.code, token: room.hostToken });
      return send(ws, hostState(room));
    }
    case 'join': {
      const room = rooms.get(String(msg.code || '').toUpperCase());
      if (!room) return send(ws, { t: 'error', code: 'no_room' });
      let player = msg.token && room.players.find((p) => p.token === msg.token);
      if (player) {
        if (player.ws && player.ws !== ws) player.ws.close();
        player.ws = ws;
      } else {
        if (room.phase !== 'lobby') return send(ws, { t: 'error', code: 'started' });
        if (room.players.length >= Math.min(room.expected, MAX_PLAYERS)) return send(ws, { t: 'error', code: 'full' });
        const name = cleanName(msg.name);
        if (!name) return send(ws, { t: 'error', code: 'bad_name' });
        if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
          return send(ws, { t: 'error', code: 'name_taken' });
        player = { id: rid(6), name, token: rid(16), ws, hue: 0 };
        room.players.push(player);
      }
      ws.ctx = { role: 'player', room, player };
      send(ws, { t: 'join_ok', code: room.code, token: player.token });
      return broadcast(room);
    }
    default:
  }

  const c = ws.ctx;
  if (!c) return;
  const room = c.room;
  room.last = Date.now();

  if (c.role === 'player') {
    if (msg.t === 'submit') {
      const err = submit(room, c.player, msg);
      if (err) return send(ws, { t: 'error', code: err });
      return broadcast(room);
    }
    return;
  }

  // host-only
  switch (msg.t) {
    case 'config':
      if (room.phase !== 'lobby') return;
      room.expected = clamp(msg.players, Math.max(MIN_PLAYERS, room.players.length), MAX_PLAYERS);
      room.rounds = clamp(msg.rounds, 3, MAX_PLAYERS);
      room.timerOn = msg.timer !== false;
      return broadcast(room);
    case 'kick': {
      if (room.phase !== 'lobby') return;
      const i = room.players.findIndex((p) => p.id === msg.id);
      if (i < 0) return;
      const [p] = room.players.splice(i, 1);
      send(p.ws, { t: 'error', code: 'kicked' });
      if (p.ws) p.ws.close();
      return broadcast(room);
    }
    case 'start':
      if (room.phase !== 'lobby' || room.players.length < MIN_PLAYERS) return;
      startGame(room);
      return broadcast(room);
    case 'skip':
      maybeAdvance(room, true);
      return broadcast(room);
    case 'reveal_done':
      if (room.phase === 'reveal') room.phase = 'end';
      return broadcast(room);
    case 'again':
      if (room.phase !== 'end') return;
      room.phase = 'lobby';
      room.chains = [];
      room.images.clear();
      room.round = 0;
      room.subs = new Set();
      clearTimeout(room.timer);
      room.deadline = null;
      room.expected = Math.max(room.expected, room.players.length);
      return broadcast(room);
    default:
  }
}

// keepalive + cleanup
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
  const now = Date.now();
  for (const [code, room] of rooms) if (now - room.last > ROOM_TTL_MS) rooms.delete(code);
}, 30000);

server.listen(PORT, () => console.log(`Promptly Wrong listening on :${PORT} (BASE_PATH='${BASE}')`));

module.exports = { server, rooms };
