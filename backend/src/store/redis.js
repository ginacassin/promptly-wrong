'use strict';
/**
 * Shared store for running many backend replicas.
 * - Rooms are JSON strings with a TTL; writes go through a per-room lock (SET NX PX + compare-and-delete).
 * - Images are binary keys with the same TTL.
 * - Round deadlines live in a sorted set so any replica can fire an expired timer (the lock makes it exactly-once).
 * - Room changes are announced on a pub/sub channel; every replica pushes fresh state to its own sockets.
 */
const crypto = require('crypto');
const { createClient, commandOptions } = require('redis');

const UNLOCK = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const CHANNEL = 'pw:changes';
const DEADLINES = 'pw:deadlines';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class RedisStore {
  static async connect(url, opts) {
    const c = createClient({ url, socket: { reconnectStrategy: (n) => Math.min(n * 200, 3000) } });
    c.on('error', (e) => console.error('[redis]', e.message));
    await c.connect();
    const sub = c.duplicate();
    sub.on('error', (e) => console.error('[redis sub]', e.message));
    await sub.connect();
    return new RedisStore(c, sub, opts);
  }

  constructor(c, sub, { ttlMs }) {
    this.kind = 'redis';
    this.c = c;
    this.sub = sub;
    this.ttl = Math.ceil(ttlMs / 1000);
  }

  key(code) {
    return `pw:room:${code}`;
  }

  async get(code) {
    const s = await this.c.get(this.key(code));
    return s ? JSON.parse(s) : null;
  }

  async create(room) {
    const ok = await this.c.set(this.key(room.code), JSON.stringify(room), { NX: true, EX: this.ttl });
    return ok === 'OK';
  }

  async lock(code) {
    const k = `pw:lock:${code}`;
    const token = crypto.randomBytes(8).toString('hex');
    const t0 = Date.now();
    while ((await this.c.set(k, token, { NX: true, PX: 5000 })) !== 'OK') {
      if (Date.now() - t0 > 4000) throw new Error('room lock timeout ' + code);
      await sleep(10 + Math.random() * 20);
    }
    return () => this.c.eval(UNLOCK, { keys: [k], arguments: [token] });
  }

  async update(code, fn) {
    const unlock = await this.lock(code);
    try {
      const room = await this.get(code);
      if (!room) return null;
      const res = fn(room) || {};
      if (res.changed !== false) {
        room.last = Date.now();
        const m = this.c.multi().set(this.key(code), JSON.stringify(room), { EX: this.ttl });
        if (room.phase === 'round' && room.deadline != null) m.zAdd(DEADLINES, { score: room.deadline, value: code });
        else m.zRem(DEADLINES, code);
        await m.exec();
      }
      return { room, res };
    } finally {
      await unlock().catch(() => {});
    }
  }

  async delete(code) {
    await this.c.multi().del(this.key(code)).zRem(DEADLINES, code).exec();
    // images expire with their TTL
  }

  async due(now) {
    return this.c.zRangeByScore(DEADLINES, 0, now);
  }

  async forgetDeadline(code) {
    await this.c.zRem(DEADLINES, code);
  }

  async putImage(code, id, buf, type) {
    await this.c.set(`pw:img:${code}:${id}`, Buffer.concat([Buffer.from(type + '\n'), buf]), { EX: this.ttl });
  }

  async getImage(code, id) {
    const b = await this.c.get(commandOptions({ returnBuffers: true }), `pw:img:${code}:${id}`);
    if (!b) return null;
    const nl = b.indexOf(10);
    return { type: b.subarray(0, nl).toString(), buf: b.subarray(nl + 1) };
  }

  async dropImages() {} // images expire with their TTL

  async publish(code) {
    await this.c.publish(CHANNEL, code);
  }

  async onChange(handler) {
    await this.sub.subscribe(CHANNEL, (code) => handler(code));
  }

  async ping() {
    return (await this.c.ping()) === 'PONG';
  }

  async close() {
    await Promise.allSettled([this.sub.quit(), this.c.quit()]);
  }
}

module.exports = { RedisStore };
