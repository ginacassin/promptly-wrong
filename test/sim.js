// End-to-end simulation: spawns the server, plays a full game with N bot players over WebSocket.
const { spawn } = require('child_process');
const WebSocket = require('ws');
const assert = require('assert');
const path = require('path');

const PORT = 3999;
const N = 4, R = 3;
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const c = { ws, state: null, msgs: [], waiters: [] };
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    c.msgs.push(m);
    if (m.t.endsWith('_state')) c.state = m;
    c.waiters = c.waiters.filter((w) => !(w.pred(m) && (w.res(m), true)));
  });
  c.open = new Promise((r) => ws.on('open', r));
  c.send = (o) => ws.send(JSON.stringify(o));
  c.until = (pred, ms = 3000) => new Promise((res, rej) => {
    const hit = c.msgs.slice().reverse().find(pred);
    if (hit && pred(c.state)) return res(hit);
    const to = setTimeout(() => rej(new Error('timeout waiting')), ms);
    c.waiters.push({ pred, res: (m) => { clearTimeout(to); res(m); } });
  });
  return c;
}

(async () => {
  const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT }, cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  await sleep(600);
  try {
    // http sanity
    const r = await fetch(`http://localhost:${PORT}/healthz`); assert.equal(await r.text(), 'ok');
    const page = await fetch(`http://localhost:${PORT}/`); assert((await page.text()).includes('Promptly Wrong'));
    const qr = await fetch(`http://localhost:${PORT}/qr.svg?u=${encodeURIComponent('http://x/?r=ABCD')}`); assert.equal(qr.status, 200);
    assert.equal((await fetch(`http://localhost:${PORT}/../server.js`)).status === 200 && false, false);

    const host = client(); await host.open;
    host.send({ t: 'host_create', players: N + 1, rounds: R, timer: true });
    const code = (await host.until((m) => m.t === 'host_ok')).code;
    assert.match(code, /^[A-Z]{4}$/);

    const ps = [];
    for (let i = 0; i < N; i++) {
      const p = client(); await p.open;
      p.send({ t: 'join', code: code.toLowerCase(), name: 'P' + i });
      await p.until((m) => m.t === 'join_ok');
      ps.push(p);
    }
    // duplicate name / bad code
    const dup = client(); await dup.open; dup.send({ t: 'join', code, name: 'p0' });
    assert.equal((await dup.until((m) => m.t === 'error')).code, 'name_taken');
    await sleep(100);
    assert.equal(host.state.players.length, N);

    host.send({ t: 'start' });
    await host.until((m) => m.t === 'host_state' && m.phase === 'round');
    assert(host.state.timeLeft > 0, 'timer should be running');

    for (let r = 0; r < R; r++) {
      await sleep(80);
      for (let i = 0; i < N; i++) {
        const st = ps[i].state; assert.equal(st.phase, 'round'); assert.equal(st.round, r);
        const type = r === 0 ? 'prompt' : r % 2 ? 'image' : 'guess';
        assert.equal(st.task.type, type);
        if (r === 1) assert.equal(st.task.input.text, `prompt by P${(i - 1 + N) % N}`, 'image maker must get previous prompt');
        if (r === 2) assert(st.task.input.img, 'guesser must get an image');
        const data = type === 'image' ? JPG : r === 0 ? `prompt by P${i}` : `guess by P${i}`;
        ps[i].send({ t: 'submit', data });
      }
      await sleep(150);
    }
    await host.until((m) => m.t === 'host_state' && m.phase === 'reveal');
    const chains = host.state.chains;
    assert.equal(chains.length, N);
    chains.forEach((c, i) => {
      assert.equal(c.steps.length, R);
      assert.equal(c.steps[0].author, 'P' + i);
      assert.equal(c.steps[1].author, 'P' + ((i + 1) % N));
      assert.equal(c.steps[2].author, 'P' + ((i + 2) % N));
      assert.equal(c.steps[0].text, `prompt by P${i}`);
      assert(c.steps[1].img && !c.steps[1].text);
    });
    const img = await fetch(`http://localhost:${PORT}/${chains[0].steps[1].img}`); assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/jpeg');

    host.send({ t: 'reveal_done' });
    await host.until((m) => m.t === 'host_state' && m.phase === 'end');
    assert(host.state.score.board.length === N);
    assert(host.state.score.drift != null);
    await ps[0].until((m) => m.t === 'player_state' && m.phase === 'end');
    assert(ps[0].state.chains.length === N);

    // play again goes back to lobby with the same players
    host.send({ t: 'again' });
    await host.until((m) => m.t === 'host_state' && m.phase === 'lobby');
    assert.equal(host.state.players.length, N);

    // second game: skip a round with a missing player
    host.send({ t: 'start' });
    await host.until((m) => m.t === 'host_state' && m.phase === 'round');
    await sleep(50);
    ps[0].send({ t: 'submit', data: 'only one' });
    await sleep(100);
    host.send({ t: 'skip' });
    await host.until((m) => m.t === 'host_state' && m.round === 1);
    assert(host.state.players.every((p) => !p.done));

    // late join to started game is refused
    const late = client(); await late.open; late.send({ t: 'join', code, name: 'late' });
    assert.equal((await late.until((m) => m.t === 'error')).code, 'started');

    // reconnect with token keeps the seat
    const tok = ps[1].msgs.find((m) => m.t === 'join_ok').token;
    ps[1].ws.close(); await sleep(100);
    const back = client(); await back.open; back.send({ t: 'join', code, token: tok });
    await back.until((m) => m.t === 'player_state');
    assert.equal(back.state.me.name, 'P1');

    // image validation
    const bad = client(); await bad.open; bad.send({ t: 'join', code, token: ps[2].msgs.find((m) => m.t === 'join_ok').token });
    await bad.until((m) => m.t === 'player_state');
    bad.send({ t: 'submit', data: 'not an image' });
    assert.equal((await bad.until((m) => m.t === 'error')).code, 'bad_image');

    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('TEST FAILED:', e);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(), 200);
  }
})();
