// End-to-end tests over real WebSockets.
//  1) memory store, single backend
//  2) Redis store, TWO backend replicas: host on A, players spread over A and B,
//     shared timer fires exactly once, failover reconnect keeps the seat.
const { spawn, execSync } = require('child_process');
const WebSocket = require('ws');
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = [];

function backend(port, env = {}) {
  const p = spawn('node', ['src/server.js'], { cwd: ROOT, env: { ...process.env, PORT: port, ...env }, stdio: ['ignore', 'inherit', 'inherit'] });
  procs.push(p);
  return p;
}

function client(port, wsPath = '/ws') {
  const ws = new WebSocket(`ws://localhost:${port}${wsPath}`);
  const c = { ws, state: null, msgs: [], waiters: [] };
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    c.msgs.push(m);
    if (m.t.endsWith('_state')) c.state = m;
    c.waiters = c.waiters.filter((w) => !(w.pred(m) && (w.res(m), true)));
  });
  c.open = new Promise((r) => ws.on('open', r));
  c.send = (o) => ws.send(JSON.stringify(o));
  c.until = (pred, ms = 4000) => new Promise((res, rej) => {
    if (c.state && pred(c.state)) return res(c.state);
    const last = c.msgs[c.msgs.length - 1];
    if (last && pred(last)) return res(last);
    const to = setTimeout(() => rej(new Error('timeout waiting; last=' + JSON.stringify(c.msgs[c.msgs.length - 1]).slice(0, 200))), ms);
    c.waiters.push({ pred, res: (m) => { clearTimeout(to); res(m); } });
  });
  return c;
}

async function fullGame({ hostPort, playerPorts, N = 4, R = 3, label }) {
  const host = client(hostPort, '/api/ws'); // prefix-tolerant routing
  await host.open;
  host.send({ t: 'host_create', players: N + 1, rounds: R, timer: false });
  const code = (await host.until((m) => m.t === 'host_ok')).code;
  const ps = [];
  for (let i = 0; i < N; i++) {
    const p = client(playerPorts[i % playerPorts.length]);
    await p.open;
    p.send({ t: 'join', code: code.toLowerCase(), name: 'P' + i });
    await p.until((m) => m.t === 'join_ok');
    ps.push(p);
  }
  const dup = client(playerPorts[playerPorts.length - 1]); await dup.open;
  dup.send({ t: 'join', code, name: 'p0' });
  assert.equal((await dup.until((m) => m.t === 'error')).code, 'name_taken');
  await host.until((m) => m.t === 'host_state' && m.players.length === N);

  // only the host can change settings or start: player commands are ignored
  const exp0 = host.state.expected;
  ps[0].send({ t: 'config', players: 3, rounds: 3, timer: false });
  ps[0].send({ t: 'start' }); ps[0].send({ t: 'close' }); ps[0].send({ t: 'kick', id: 'x' });
  await sleep(300);
  assert.equal(host.state.expected, exp0, 'player must not change settings');
  assert.equal(host.state.phase, 'lobby', 'player must not start the game');
  assert.equal(ps[1].state.expected, exp0, 'players see the settings');

  host.send({ t: 'start' });
  for (let r = 0; r < R; r++) {
    for (const p of ps) await p.until((m) => m.t === 'player_state' && m.phase === 'round' && m.round === r && !m.done);
    for (let i = 0; i < N; i++) {
      const st = ps[i].state;
      const type = r === 0 ? 'prompt' : r % 2 ? 'image' : 'guess';
      assert.equal(st.task.type, type);
      if (r === 1) assert.equal(st.task.input.text, `prompt by P${(i - 1 + N) % N}`);
      if (r === 2) assert(st.task.input.img);
      ps[i].send({ t: 'submit', data: type === 'image' ? JPG : r === 0 ? `prompt by P${i}` : `prompt by P${(i - 2 + N) % N}` });
    }
  }
  const rev = await host.until((m) => m.t === 'host_state' && m.phase === 'reveal');
  rev.chains.forEach((c, i) => {
    assert.equal(c.steps.length, R);
    assert.deepEqual(c.steps.map((s) => s.author), [0, 1, 2].map((k) => 'P' + ((i + k) % N)));
    assert(c.steps[1].img);
  });
  // image is served by EVERY replica
  for (const port of new Set([hostPort, ...playerPorts])) {
    const img = await fetch(`http://localhost:${port}/api/${rev.chains[0].steps[1].img}`);
    assert.equal(img.status, 200, 'image on port ' + port);
    assert.equal(img.headers.get('content-type'), 'image/jpeg');
  }
  host.send({ t: 'reveal_done' });
  const end = await host.until((m) => m.t === 'host_state' && m.phase === 'end');
  assert.equal(end.score.board.length, N);
  assert(end.score.board.every((p) => p.pts > 0), 'perfect guesses should score');
  await ps[N - 1].until((m) => m.t === 'player_state' && m.phase === 'end' && m.chains.length === N);

  host.send({ t: 'again' });
  await host.until((m) => m.t === 'host_state' && m.phase === 'lobby' && m.players.length === N);
  console.log(`  ✓ full game (${label})`);
  return { host, ps, code };
}

async function memoryTests() {
  console.log('memory store');
  backend(3901);
  await sleep(500);
  assert.equal((await (await fetch('http://localhost:3901/api/healthz')).json()).store, 'memory');
  assert.equal((await fetch('http://localhost:3901/qr.svg?u=' + encodeURIComponent('https://x/?r=ABCD'))).status, 200);
  const { host, ps, code } = await fullGame({ hostPort: 3901, playerPorts: [3901], label: 'single instance' });

  // skip with a missing player, late join refused, kick, bad image
  host.send({ t: 'start' });
  await ps[0].until((m) => m.phase === 'round' && m.round === 0);
  ps[0].send({ t: 'submit', data: 'only one' });
  await sleep(100);
  host.send({ t: 'skip' });
  await host.until((m) => m.round === 1);
  const late = client(3901); await late.open; late.send({ t: 'join', code, name: 'late' });
  assert.equal((await late.until((m) => m.t === 'error')).code, 'started');
  await ps[1].until((m) => m.round === 1);
  ps[1].send({ t: 'submit', data: 'not an image' });
  assert.equal((await ps[1].until((m) => m.t === 'error')).code, 'bad_image');
  console.log('  ✓ skip / late join / validation');

  // cancel room: host closes, every player is told and the room is gone
  host.send({ t: 'close' });
  for (const p of ps) assert.equal((await p.until((m) => m.t === 'error' && m.code === 'room_closed')).code, 'room_closed');
  const again = client(3901); await again.open; again.send({ t: 'join', code, name: 'zz' });
  assert.equal((await again.until((m) => m.t === 'error')).code, 'no_room');
  console.log('  ✓ cancel room notifies everyone');

  // more than 12 players
  const big = client(3901); await big.open;
  big.send({ t: 'host_create', players: 20, rounds: 3, timer: false });
  const bcode = (await big.until((m) => m.t === 'host_ok')).code;
  assert.equal((await big.until((m) => m.t === 'host_state')).expected, 20);
  for (let i = 0; i < 20; i++) { const p = client(3901); await p.open; p.send({ t: 'join', code: bcode, name: 'B' + i }); await p.until((m) => m.t === 'join_ok'); }
  await big.until((m) => m.t === 'host_state' && m.players.length === 20);
  big.send({ t: 'start' });
  await big.until((m) => m.t === 'host_state' && m.phase === 'round' && m.N === 20);
  console.log('  ✓ 20-player room');
}

async function redisTests() {
  console.log('redis store, 2 replicas');
  const redisPort = 6390;
  const redis = spawn('redis-server', ['--port', String(redisPort), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
  procs.push(redis);
  await sleep(400);
  const env = { REDIS_URL: `redis://localhost:${redisPort}`, DUR_SCALE: '0.02' };
  backend(3911, env);
  const b = backend(3912, env);
  await sleep(800);
  assert.equal((await (await fetch('http://localhost:3912/healthz')).json()).store, 'redis');

  await fullGame({ hostPort: 3911, playerPorts: [3911, 3912], label: 'host on A, players on A+B' });

  // shared timer: prompt phase = 1.2s, image phase = 3s -> after ~2.3s we must be exactly in round 1
  const host = client(3912); await host.open;
  host.send({ t: 'host_create', players: 3, rounds: 3, timer: true });
  const code = (await host.until((m) => m.t === 'host_ok')).code;
  const ps = [];
  for (let i = 0; i < 3; i++) {
    const p = client(i % 2 ? 3912 : 3911); await p.open;
    p.send({ t: 'join', code, name: 'T' + i }); await p.until((m) => m.t === 'join_ok'); ps.push(p);
  }
  host.send({ t: 'start' });
  await host.until((m) => m.phase === 'round' && m.timeLeft > 0);
  await sleep(2300);
  assert.equal(host.state.round, 1, 'timer should advance exactly once across replicas');
  assert.equal(ps[0].state.round, 1);
  console.log('  ✓ timer fires once across replicas');

  // failover: kill replica B, a player that was on B reconnects to A with its token
  const tok = ps[1].msgs.find((m) => m.t === 'join_ok').token;
  b.kill('SIGTERM');
  await sleep(400);
  const back = client(3911); await back.open;
  back.send({ t: 'join', code, token: tok });
  const st = await back.until((m) => m.t === 'player_state');
  assert.equal(st.me.name, 'T1');
  assert.equal(st.round, 1);
  console.log('  ✓ failover reconnect keeps the seat');

  // cancel from replica A reaches a player on replica A (B is down) and the room is deleted in Redis
  host.ws.terminate();
  const h2 = client(3911); await h2.open;
  h2.send({ t: 'host_resume', code, token: host.msgs.find((m) => m.t === 'host_ok').token });
  await h2.until((m) => m.t === 'host_ok');
  h2.send({ t: 'close' });
  assert.equal((await back.until((m) => m.t === 'error' && m.code === 'room_closed')).code, 'room_closed');
  console.log('  ✓ cancel room across replicas');
}

(async () => {
  let hasRedis = true;
  try { execSync('which redis-server', { stdio: 'ignore' }); } catch { hasRedis = false; }
  try {
    await memoryTests();
    if (hasRedis) await redisTests();
    else console.log('(redis-server not found: skipping multi-replica tests)');
    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('TEST FAILED:', e);
    process.exitCode = 1;
  } finally {
    procs.forEach((p) => p.kill('SIGKILL'));
    setTimeout(() => process.exit(), 300);
  }
})();
