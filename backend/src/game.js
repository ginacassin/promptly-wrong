'use strict';
/**
 * Pure game logic. A room is a plain JSON object so it can live in memory or in Redis.
 * No I/O here: every function mutates/reads the room object it is given.
 */
const crypto = require('crypto');

// Hard ceiling per room; override with MAX_PLAYERS env (1 room = 1 shared screen, so keep it sane).
const MAX_PLAYERS = Math.max(3, Math.min(100, Number(process.env.MAX_PLAYERS) || 30));
const MIN_PLAYERS = 3;
const MIN_ROUNDS = 3;
const MAX_TEXT = 120;
const SCALE = Number(process.env.DUR_SCALE || 1); // tests speed timers up
// Timer defaults and limits (seconds). The host can change both in setup/lobby.
const T_TEXT = { def: 60, min: 15, max: 600 };   // writing a prompt / a guess
const T_IMAGE = { def: 150, min: 30, max: 1200 }; // generating + uploading an image

// Player avatars: 30 funny emoji. New players get a random unused one; players may pick any (repeats allowed).
const EMOJIS = ['🐸', '🐙', '🦄', '🐔', '🦖', '🐧', '🦥', '🐌', '🦩', '🐷', '🐵', '🦀', '🐢', '🦉', '🦊', '🐱', '🐶', '🐳', '🦔', '🦆', '🐝', '🍕', '🌮', '🥑', '🍩', '👽', '🤖', '👻', '🤡', '🧀'];
function pickEmoji(room) {
  const used = new Set(room.players.map((p) => p.emoji));
  const free = EMOJIS.filter((e) => !used.has(e));
  const pool = free.length ? free : EMOJIS;
  return pool[crypto.randomInt(pool.length)];
}

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

function createRoom({ code, players, rounds, timer, tText, tImage }) {
  const expected = clamp(players, MIN_PLAYERS, MAX_PLAYERS);
  return {
    v: 1,
    code,
    hostToken: rid(16),
    phase: 'lobby', // lobby | round | reveal | end
    expected,
    rounds: Math.min(clamp(rounds, MIN_ROUNDS, MAX_PLAYERS), expected),
    timerOn: timer !== false,
    tText: clamp(tText ?? T_TEXT.def, T_TEXT.min, T_TEXT.max),
    tImage: clamp(tImage ?? T_IMAGE.def, T_IMAGE.min, T_IMAGE.max),
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
  p = { id: rid(6), name: n, token: rid(16), online: true, conn, emoji: pickEmoji(room) };
  room.players.push(p);
  return { player: p };
}

function disconnect(room, playerId, conn) {
  const p = room.players.find((x) => x.id === playerId);
  if (!p || p.conn !== conn) return false; // a newer connection already took over
  p.online = false;
  return true;
}

function setEmoji(room, playerId, emoji) {
  const p = room.players.find((x) => x.id === playerId);
  if (!p || !EMOJIS.includes(emoji) || p.emoji === emoji) return false;
  p.emoji = emoji;
  return true;
}

function configure(room, { players, rounds, timer, tText, tImage }) {
  if (room.phase !== 'lobby') return false;
  room.expected = clamp(players, Math.max(MIN_PLAYERS, room.players.length), MAX_PLAYERS);
  room.rounds = clamp(rounds, MIN_ROUNDS, MAX_PLAYERS);
  room.timerOn = timer !== false;
  if (tText != null) room.tText = clamp(tText, T_TEXT.min, T_TEXT.max);
  if (tImage != null) room.tImage = clamp(tImage, T_IMAGE.min, T_IMAGE.max);
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
  const secs = outType(room.round) === 'image' ? room.tImage || T_IMAGE.def : room.tText || T_TEXT.def;
  room.deadline = room.phase === 'round' && room.timerOn ? now + secs * SCALE * 1000 : null;
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

const hueOf = (room, id) => Math.round((Math.max(room.players.findIndex((p) => p.id === id), 0) * 137.5) % 360);
const nameOf = (room, id) => (room.players.find((p) => p.id === id) || {}).name || '?';
const emojiOf = (room, id) => (room.players.find((p) => p.id === id) || {}).emoji || null;

// ---------------------------------------------------------------- views (what clients receive)
const imgUrl = (room, id) => (id ? `img/${room.code}/${id}` : null);

function serChains(room) {
  return room.chains.map((ch) => ({
    owner: nameOf(room, ch.owner),
    ownerEmoji: emojiOf(room, ch.owner),
    steps: ch.steps.map((s) => ({ type: s.type, author: nameOf(room, s.by), hue: hueOf(room, s.by), emoji: emojiOf(room, s.by), text: s.text, img: imgUrl(room, s.img) })),
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
    tText: room.tText,
    tImage: room.tImage,
    maxPlayers: MAX_PLAYERS,
    timeLeft: timeLeft(room, now),
    players: room.players.map((p) => ({ id: p.id, name: p.name, hue: hueOf(room, p.id), emoji: p.emoji, connected: !!p.online, done: done && room.subs.includes(p.id) })),
    chains: room.phase === 'reveal' || room.phase === 'end' ? serChains(room) : null,
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
    me: { id: me.id, name: me.name, hue: hueOf(room, me.id), emoji: me.emoji },
    emojis: EMOJIS,
    rounds: room.rounds,
    expected: room.expected,
    timerOn: room.timerOn,
    tText: room.tText,
    tImage: room.tImage,
    round: room.round,
    timeLeft: timeLeft(room, now),
    players: room.players.map((p) => ({ name: p.name, hue: hueOf(room, p.id), emoji: p.emoji, connected: !!p.online })),
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
  if (room.phase === 'end') st.chains = serChains(room);
  return st;
}

module.exports = {
  MAX_TEXT, MIN_PLAYERS, MAX_PLAYERS, T_TEXT, T_IMAGE, EMOJIS,
  rid, newCode, outType, chainOf, nameOf, hueOf,
  createRoom, join, setEmoji, disconnect, configure, kick, start, submit, advance, timeUp, revealDone, again, expectedKind,
  hostView, playerView,
};
