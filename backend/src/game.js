'use strict';
/**
 * Pure game logic. A room is a plain JSON object so it can live in memory or in Redis.
 * No I/O here: every function mutates/reads the room object it is given.
 */
const crypto = require('crypto');

const MAX_PLAYERS = 12;
const MIN_PLAYERS = 3;
const MIN_ROUNDS = 3;
const MAX_TEXT = 120;
const SCALE = Number(process.env.DUR_SCALE || 1); // tests speed timers up
const DUR = { prompt: 60 * SCALE, image: 150 * SCALE, guess: 60 * SCALE }; // seconds per phase when the timer is on

const rid = (n = 8) => crypto.randomBytes(n).toString('hex').slice(0, n);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || a)));
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
const cleanText = (s) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, MAX_TEXT);

// Round r: chain c is handled by player (c + r) % N  <=>  player p handles chain (p - r) mod N.
// r === 0 prompt (text) · odd r image (from text) · even r >= 2 guess (text, from image)
const outType = (r) => (r === 0 ? 'prompt' : r % 2 === 1 ? 'image' : 'guess');
const chainOf = (room, p, r) => (((p - r) % room.N) + room.N) % room.N;

function createRoom({ code, players, rounds, timer }) {
  const expected = clamp(players, MIN_PLAYERS, MAX_PLAYERS);
  return {
    v: 1,
    code,
    hostToken: rid(16),
    phase: 'lobby', // lobby | round | reveal | end
    expected,
    rounds: Math.min(clamp(rounds, MIN_ROUNDS, MAX_PLAYERS), expected),
    timerOn: timer !== false,
    deadline: null,
    players: [], // {id, name, token, online, conn}
    N: 0,
    round: 0,
    chains: [],
    subs: [],
    last: Date.now(),
  };
}

/** Join or re-join. Returns {player} or {err}. */
function join(room, { name, token, conn }) {
  let p = token && room.players.find((x) => x.token === token);
  if (p) {
    p.online = true;
    p.conn = conn;
    return { player: p };
  }
  if (room.phase !== 'lobby') return { err: 'started' };
  if (room.players.length >= Math.min(room.expected, MAX_PLAYERS)) return { err: 'full' };
  const n = cleanName(name);
  if (!n) return { err: 'bad_name' };
  if (room.players.some((x) => x.name.toLowerCase() === n.toLowerCase())) return { err: 'name_taken' };
  p = { id: rid(6), name: n, token: rid(16), online: true, conn };
  room.players.push(p);
  return { player: p };
}

function disconnect(room, playerId, conn) {
  const p = room.players.find((x) => x.id === playerId);
  if (!p || p.conn !== conn) return false; // a newer connection already took over
  p.online = false;
  return true;
}

function configure(room, { players, rounds, timer }) {
  if (room.phase !== 'lobby') return false;
  room.expected = clamp(players, Math.max(MIN_PLAYERS, room.players.length), MAX_PLAYERS);
  room.rounds = clamp(rounds, MIN_ROUNDS, MAX_PLAYERS);
  room.timerOn = timer !== false;
  return true;
}

function kick(room, id) {
  if (room.phase !== 'lobby') return false;
  const i = room.players.findIndex((p) => p.id === id);
  if (i < 0) return false;
  room.players.splice(i, 1);
  return true;
}

function startRound(room, now) {
  room.subs = [];
  room.deadline = room.phase === 'round' && room.timerOn ? now + DUR[outType(room.round)] * 1000 : null;
}

function start(room, now) {
  if (room.phase !== 'lobby' || room.players.length < MIN_PLAYERS) return false;
  room.N = room.players.length;
  room.rounds = Math.max(MIN_ROUNDS, Math.min(room.rounds, room.N));
  room.chains = room.players.map((p) => ({ owner: p.id, steps: [] }));
  room.round = 0;
  room.phase = 'round';
  startRound(room, now);
  return true;
}

/** What the player has to produce this round: 'text' or 'image'. */
function expectedKind(room) {
  return outType(room.round) === 'image' ? 'image' : 'text';
}

/** payload: {text} or {img: imageId}. Returns error code or null. */
function submit(room, playerId, payload, now) {
  if (room.phase !== 'round' || room.subs.includes(playerId)) return 'bad_state';
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return 'bad_state';
  const r = room.round;
  const type = outType(r);
  const step = { type, by: playerId, text: null, img: null };
  if (type === 'image') {
    if (!payload.img) return 'bad_image';
    step.img = payload.img;
  } else {
    const text = cleanText(payload.text);
    if (!text) return 'bad_text';
    step.text = text;
  }
  room.chains[chainOf(room, idx, r)].steps[r] = step;
  room.subs.push(playerId);
  advance(room, now, false);
  return null;
}

function advance(room, now, force) {
  if (room.phase !== 'round') return false;
  if (!force && room.subs.length < room.N) return false;
  room.players.forEach((p, idx) => {
    if (room.subs.includes(p.id)) return;
    room.chains[chainOf(room, idx, room.round)].steps[room.round] = { type: outType(room.round), by: p.id, text: null, img: null };
  });
  room.round += 1;
  if (room.round >= room.rounds) room.phase = 'reveal';
  startRound(room, now);
  return true;
}

function timeUp(room, now) {
  return room.phase === 'round' && room.deadline != null && now >= room.deadline + 300;
}

function revealDone(room) {
  if (room.phase !== 'reveal') return false;
  room.phase = 'end';
  return true;
}

function again(room) {
  if (room.phase !== 'end') return false;
  Object.assign(room, { phase: 'lobby', chains: [], round: 0, subs: [], deadline: null, N: 0 });
  room.expected = Math.max(room.expected, room.players.length);
  return true;
}

// ---------------------------------------------------------------- scoring
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** 0..1 similarity: word overlap + character edit distance, accent-insensitive. */
function sim(a, b) {
  a = norm(a);
  b = norm(b);
  if (!a || !b) return 0;
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return 0.5 * (inter / (A.size + B.size - inter)) + 0.5 * (1 - lev(a, b) / Math.max(a.length, b.length));
}

const hueOf = (room, id) => Math.round((Math.max(room.players.findIndex((p) => p.id === id), 0) * 137.5) % 360);
const nameOf = (room, id) => (room.players.find((p) => p.id === id) || {}).name || '?';

function scoreboard(room) {
  const pts = new Map(room.players.map((p) => [p.id, 0]));
  const drifts = [];
  for (const ch of room.chains) {
    const st = ch.steps;
    for (let i = 2; i < st.length; i++) {
      if (st[i].type !== 'guess' || st[i].text == null || !st[i - 2] || st[i - 2].text == null) continue;
      const v = Math.round(sim(st[i - 2].text, st[i].text) * 100);
      pts.set(st[i].by, (pts.get(st[i].by) || 0) + v);
      if (pts.has(st[i - 1].by)) pts.set(st[i - 1].by, pts.get(st[i - 1].by) + v); // image maker shares credit
    }
    const first = st[0] && st[0].text;
    const lastText = [...st].reverse().find((s) => s.type !== 'image' && s.text != null);
    if (first != null && lastText && st.length > 1) drifts.push(Math.round((1 - sim(first, lastText.text)) * 100));
  }
  const board = room.players.map((p) => ({ name: p.name, hue: hueOf(room, p.id), pts: pts.get(p.id) || 0 })).sort((a, b) => b.pts - a.pts);
  const drift = drifts.length ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length) : null;
  return { board, drift };
}

// ---------------------------------------------------------------- views (what clients receive)
const imgUrl = (room, id) => (id ? `img/${room.code}/${id}` : null);

function serChains(room) {
  return room.chains.map((ch) => ({
    owner: nameOf(room, ch.owner),
    steps: ch.steps.map((s) => ({ type: s.type, author: nameOf(room, s.by), hue: hueOf(room, s.by), text: s.text, img: imgUrl(room, s.img) })),
  }));
}
const timeLeft = (room, now) => (room.deadline ? Math.max(0, room.deadline - now) : null);

function hostView(room, now) {
  const done = room.phase === 'round';
  return {
    t: 'host_state',
    code: room.code,
    phase: room.phase,
    expected: room.expected,
    rounds: room.rounds,
    round: room.round,
    N: room.N,
    timerOn: room.timerOn,
    timeLeft: timeLeft(room, now),
    players: room.players.map((p) => ({ id: p.id, name: p.name, hue: hueOf(room, p.id), connected: !!p.online, done: done && room.subs.includes(p.id) })),
    chains: room.phase === 'reveal' || room.phase === 'end' ? serChains(room) : null,
    score: room.phase === 'end' ? scoreboard(room) : null,
  };
}

function playerView(room, playerId, now) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return null;
  const me = room.players[idx];
  const st = {
    t: 'player_state',
    code: room.code,
    phase: room.phase,
    me: { id: me.id, name: me.name, hue: hueOf(room, me.id) },
    rounds: room.rounds,
    round: room.round,
    timeLeft: timeLeft(room, now),
    players: room.players.map((p) => ({ name: p.name, hue: hueOf(room, p.id), connected: !!p.online })),
  };
  if (room.phase === 'round') {
    const r = room.round;
    const task = { type: outType(r), input: null };
    if (r > 0) {
      const prev = room.chains[chainOf(room, idx, r)].steps[r - 1];
      task.input = prev ? { text: prev.text, img: imgUrl(room, prev.img) } : { text: null, img: null };
    }
    st.task = task;
    st.done = room.subs.includes(me.id);
  }
  if (room.phase === 'end') {
    st.chains = serChains(room);
    st.score = scoreboard(room);
  }
  return st;
}

module.exports = {
  MAX_TEXT, MIN_PLAYERS, MAX_PLAYERS, DUR,
  rid, newCode, outType, chainOf, sim,
  createRoom, join, disconnect, configure, kick, start, submit, advance, timeUp, revealDone, again, expectedKind,
  scoreboard, hostView, playerView,
};
