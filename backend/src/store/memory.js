'use strict';
/** Single-instance store: everything in process memory. Good for dev or a one-replica deploy. */
const { EventEmitter } = require('events');

class MemoryStore {
  constructor({ ttlMs }) {
    this.kind = 'memory';
    this.ttlMs = ttlMs;
    this.rooms = new Map();
    this.images = new Map(); // `${code}/${id}` -> {buf, type}
    this.em = new EventEmitter();
    this.em.setMaxListeners(0);
    this.sweeper = setInterval(() => this.sweep(), 60_000).unref();
  }

  async get(code) {
    const r = this.rooms.get(code);
    return r ? structuredClone(r) : null;
  }

  async create(room) {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }

  /** fn(room) runs synchronously, so read-modify-write is atomic in a single process. */
  async update(code, fn) {
    const cur = this.rooms.get(code);
    if (!cur) return null;
    const room = structuredClone(cur);
    const res = fn(room) || {};
    if (res.changed !== false) {
      room.last = Date.now();
      this.rooms.set(code, room);
    }
    return { room, res };
  }

  async delete(code) {
    this.rooms.delete(code);
    await this.dropImages(code);
  }

  async due(now) {
    const out = [];
    for (const r of this.rooms.values()) if (r.phase === 'round' && r.deadline != null && r.deadline <= now) out.push(r.code);
    return out;
  }

  async forgetDeadline() {}

  async putImage(code, id, buf, type) {
    this.images.set(`${code}/${id}`, { buf, type });
  }

  async getImage(code, id) {
    return this.images.get(`${code}/${id}`) || null;
  }

  async dropImages(code) {
    for (const k of this.images.keys()) if (k.startsWith(code + '/')) this.images.delete(k);
  }

  async publish(code) {
    setImmediate(() => this.em.emit('change', code));
  }

  async onChange(handler) {
    this.em.on('change', handler);
  }

  async ping() {
    return true;
  }

  sweep() {
    const now = Date.now();
    for (const [code, r] of this.rooms) {
      if (now - r.last > this.ttlMs) {
        this.rooms.delete(code);
        this.dropImages(code);
      }
    }
  }

  async close() {
    clearInterval(this.sweeper);
  }
}

module.exports = { MemoryStore };
