'use strict';
/**
 * Souvenir PDF: the game's chains drawn with the Promptly Wrong look
 * (dark stage, soft neon blobs, logo, speech bubbles, cyan image frames, confetti, stamps).
 * Everything is vector except the images players uploaded.
 */
const path = require('path');
const PDFDocument = require('pdfkit');

const fs = require('fs');
const FONTS = path.join(__dirname, '..', 'assets', 'fonts');
const EMOJI_DIR = path.join(__dirname, '..', 'assets', 'emoji');
const emojiCache = new Map();
/** PNG of an emoji (rendered from Noto Color Emoji), or null. */
function emojiPng(e) {
  if (!e) return null;
  if (!emojiCache.has(e)) {
    const f = path.join(EMOJI_DIR, [...e].map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-') + '.png');
    emojiCache.set(e, fs.existsSync(f) ? fs.readFileSync(f) : null);
  }
  return emojiCache.get(e);
}
const C = {
  bg: '#0B0A1A', surface: '#181436', violet: '#2A1D5C', text: '#F4F3FF', muted: '#C9C3EC', ink: '#0B0A1A',
  pink: '#FF4FA3', lime: '#C8FF3D', cyan: '#49E6FF', yellow: '#FFD84D', guess: '#FFC2E0', red: '#FF3B5C',
};
const AV = ['#FF4FA3', '#49E6FF', '#FFD84D', '#B98CFF', '#FFA24D', '#6FA8FF', '#C8FF3D', '#FF7A7A'];
const W = 595.28, H = 841.89, M = 44;

const T = {
  en: {
    souvenir: 'SOUVENIR EDITION', room: 'Room', players: 'players', rounds: 'rounds', chains: 'chains',
    tagline: 'The AI telephone game where prompts go hilariously wrong.',
    certified: ['CERTIFIED', 'HILARIOUSLY', 'WRONG'],
    chain: 'CHAIN {c} OF {C}', from: 'From', to: 'to', started: 'Started by {name}',
    s_prompt: 'Original prompt', s_image: 'Generated image', s_guess: 'Guess', no_image: 'No image (skipped)', no_text: '(nothing sent)',
    cont: 'continued', starring: 'STARRING', theend: 'The End', thanks: 'Thanks for playing!', again: 'Play again at {host}',
    page: 'page {n}', remembered: 'Remembered as:', twists: { glimpse: 'Glimpse', peep: 'Peephole', tv: 'Bad TV', memory: 'Memory mode', words: 'Word limit' }, quips: ['NAILED IT. SORT OF.', 'LOST IN TRANSLATION', 'CLOSE ENOUGH!', 'THE AI MADE ME DO IT', 'TECHNICALLY CORRECT', 'NO NOTES', 'CHAOS: ACHIEVED', 'WHO WROTE THIS?!', 'PERFECTLY WRONG'],
  },
  es: {
    souvenir: 'EDICIÓN RECUERDO', room: 'Sala', players: 'jugadores', rounds: 'rondas', chains: 'cadenas',
    tagline: 'El teléfono roto con IA donde los prompts se tuercen de lo lindo.',
    certified: ['CERTIFICADO', 'TORCIDO', 'DE LO LINDO'],
    chain: 'CADENA {c} DE {C}', from: 'De', to: 'a', started: 'Empezó {name}',
    s_prompt: 'Prompt original', s_image: 'Imagen generada', s_guess: 'Adivinanza', no_image: 'Sin imagen (omitida)', no_text: '(no envió nada)',
    cont: 'continuación', starring: 'PROTAGONIZADO POR', theend: 'Fin', thanks: '¡Gracias por jugar!', again: 'Vuelve a jugar en {host}',
    page: 'página {n}', remembered: 'Lo recordó como:', twists: { glimpse: 'Vistazo', peep: 'Mirilla', tv: 'Tele rota', memory: 'Modo memoria', words: 'Límite de palabras' }, quips: ['CASI, CASI', 'PERDIDO EN LA TRADUCCIÓN', '¡CASI LO CLAVAS!', 'LA IA ME OBLIGÓ', 'TÉCNICAMENTE CORRECTO', 'SIN COMENTARIOS', 'CAOS: CONSEGUIDO', '¿¡QUIÉN ESCRIBIÓ ESTO!?', 'PERFECTAMENTE MAL'],
  },
};
const fill = (s, v) => Object.entries(v || {}).reduce((a, [k, x]) => a.split('{' + k + '}').join(x), s);
// keep only characters the bundled fonts can draw (Latin + common punctuation); drop emoji etc.
const clean = (s) => String(s == null ? '' : s).replace(/[^ -ɏ‘-‟…–—€¡¿]/g, '').replace(/\s+/g, ' ').trim();
const colorOf = (hue) => Math.floor((((Math.round(hue) % 360) + 360) % 360) / 45) % 8;
// tiny deterministic random so the same game always gives the same souvenir
function rng(seed) { let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ------------------------------------------------------------- drawing kit */
function background(doc, rnd) {
  doc.rect(0, 0, W, H).fill(C.bg);
  const blob = (x, y, r, color, a) => {
    const g = doc.radialGradient(x, y, 0, x, y, r);
    g.stop(0, color, a).stop(0.55, color, a * 0.45).stop(1, color, 0);
    doc.circle(x, y, r).fill(g);
  };
  blob(-20, -10, 230, C.pink, 0.55);
  blob(120, 40, 150, '#C02AD8', 0.35);
  blob(W + 10, 30, 170, '#9B4DFF', 0.3);
  blob(W + 20, H + 20, 240, C.cyan, 0.4);
  blob(W - 140, H - 30, 150, '#6A3BFF', 0.35);
  blob(-30, H + 10, 150, C.lime, 0.22);
  doc.save().fillColor('#FFFFFF').fillOpacity(0.05);
  for (let y = 10; y < H; y += 14) for (let x = 10 + ((y / 14) % 2) * 7; x < W; x += 14) doc.circle(x, y, 0.55).fill();
  doc.restore();
  for (let i = 0; i < 7; i++) confetti(doc, rnd() * W, rnd() * H, rnd() * 180, [C.lime, C.yellow, C.pink][i % 3], 0.35);
}

function confetti(doc, x, y, angle, color, opacity = 1, len = 14, th = 4) {
  doc.save().translate(x, y).rotate(angle).roundedRect(-len / 2, -th / 2, len, th, th / 2).fillOpacity(opacity).fill(color).restore();
}

function star(doc, cx, cy, r, color, outline = false) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  doc.save().polygon(...pts);
  if (outline) doc.lineWidth(r * 0.18).lineJoin('round').stroke(color); else doc.fill(color);
  doc.restore();
}

function speechMark(doc, x, y, s) {
  doc.save().translate(x, y).rotate(-8);
  doc.roundedRect(1.5, 1.5, 34 * s, 25 * s, 8 * s).fill(C.ink);
  doc.roundedRect(0, 0, 34 * s, 25 * s, 8 * s).fillAndStroke(C.text, C.ink);
  doc.polygon([5 * s, 24 * s], [14 * s, 24 * s], [5 * s, 32 * s]).fill(C.text);
  [9, 17, 25].forEach((cx) => doc.circle(cx * s, 12.5 * s, 2.6 * s).fill(C.ink));
  doc.restore();
}

function frameMark(doc, x, y, s) {
  doc.save().translate(x, y).rotate(9);
  doc.roundedRect(3, 3, 38 * s, 29 * s, 4 * s).fill(C.pink);
  doc.roundedRect(0, 0, 38 * s, 29 * s, 4 * s).fill('#241A55');
  doc.save().roundedRect(0, 0, 38 * s, 29 * s, 4 * s).clip();
  doc.polygon([0, 29 * s], [0, 22 * s], [12 * s, 9 * s], [21 * s, 20 * s], [27 * s, 14 * s], [38 * s, 25 * s], [38 * s, 29 * s]).fill(C.cyan);
  doc.restore();
  doc.circle(31 * s, 7 * s, 3 * s).fill(C.yellow);
  doc.roundedRect(0, 0, 38 * s, 29 * s, 4 * s).lineWidth(3.5 * s).stroke(C.cyan);
  doc.restore();
}

/** The two-line wordmark, centred on cx. size = font size of "Promptly". */
function logo(doc, cx, top, size) {
  doc.save().rotate(-4, { origin: [cx, top + size] });
  doc.font('rubik900').fontSize(size);
  const w1 = doc.widthOfString('Promptly');
  const x1 = cx - w1 / 2, y1 = top + size * 0.35;
  doc.fillColor(C.pink).text('Promptly', x1 + size * 0.05, y1 + size * 0.045, { lineBreak: false });
  doc.fillColor(C.cyan).text('Promptly', x1 - size * 0.035, y1 - size * 0.025, { lineBreak: false });
  doc.fillColor(C.text).text('Promptly', x1, y1, { lineBreak: false });
  // "Wrong" on a skewed pink slab
  const w2 = doc.widthOfString('Wrong'), pad = size * 0.28, sk = size * 0.16;
  const sx = cx - w2 / 2 - pad, sy = y1 + size * 0.98, sw = w2 + pad * 2, sh = size * 1.1;
  const slab = (dx, dy, color) => doc.polygon([sx + sk + dx, sy + dy], [sx + sw + sk + dx, sy + dy - 3], [sx + sw + dx, sy + sh + dy - 3], [sx + dx, sy + sh + dy]).fill(color);
  slab(size * 0.11, size * 0.11, C.cyan);
  slab(size * 0.055, size * 0.055, C.ink);
  slab(0, 0, C.pink);
  doc.rect(sx + sw * 0.62, sy + sh - 4, size * 0.09, size * 0.26).fill(C.pink); // drip
  doc.fillColor(C.ink).text('Wrong', cx - w2 / 2 + sk / 2, sy + size * 0.05, { lineBreak: false });
  // bubble → frame mark and confetti
  speechMark(doc, x1 + w1 * 0.1, top - size * 0.2, size / 48);
  frameMark(doc, cx + w1 * 0.02, top - size * 0.34, size / 48);
  const cf = [[-0.12, 0.55, -30, C.lime], [-0.08, 0.95, 10, C.yellow], [-0.14, 1.35, 40, C.pink], [1.08, 0.2, -50, C.lime], [1.12, 0.62, -10, C.yellow], [1.05, 1.45, 30, C.pink], [0.45, -0.25, -70, C.lime], [0.12, 1.85, -20, C.yellow]];
  cf.forEach(([fx, fy, a, col]) => confetti(doc, x1 + w1 * fx, top + size * fy, a, col, 1, size * 0.2, size * 0.055));
  doc.restore();
  return top + size * 2.55;
}

function avatar(doc, cx, cy, r, hue, emoji) {
  const c = colorOf(hue), f = c % 4;
  doc.circle(cx, cy, r + 1.2).fill(C.ink);
  doc.circle(cx, cy, r).fill(AV[c]);
  const png = emojiPng(emoji);
  if (png) { const s = r * 1.5; doc.image(png, cx - s / 2, cy - s / 2, { width: s, height: s }); return; }
  doc.circle(cx - r * 0.3, cy - r * 0.38, r * 0.32).fillOpacity(0.35).fill('#FFFFFF').fillOpacity(1);
  doc.fillColor(C.ink).strokeColor(C.ink).lineWidth(r * 0.14).lineCap('round');
  if (f === 2) { // squint ><
    doc.moveTo(cx - r * 0.5, cy - r * 0.32).lineTo(cx - r * 0.2, cy - r * 0.18).stroke();
    doc.moveTo(cx + r * 0.5, cy - r * 0.32).lineTo(cx + r * 0.2, cy - r * 0.18).stroke();
  } else { doc.circle(cx - r * 0.33, cy - r * 0.22, r * 0.13).fill(); doc.circle(cx + r * 0.33, cy - r * 0.22, r * 0.13).fill(); }
  if (f === 1) doc.moveTo(cx - r * 0.42, cy + r * 0.12).quadraticCurveTo(cx, cy + r * 0.75, cx + r * 0.42, cy + r * 0.12).closePath().fill();
  else if (f === 3) doc.moveTo(cx - r * 0.38, cy + r * 0.48).quadraticCurveTo(cx, cy + r * 0.12, cx + r * 0.38, cy + r * 0.48).stroke();
  else doc.moveTo(cx - r * 0.42, cy + r * 0.18).quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.42, cy + r * 0.18).stroke();
  doc.lineCap('butt');
}

function bubbleBox(doc, x, y, w, text, color, opts = {}) {
  const pad = 14, fs = opts.fs || 15;
  doc.font('inter800').fontSize(fs);
  const th = doc.heightOfString(text, { width: w - pad * 2, align: 'center' });
  const h = Math.max(54, th + pad * 2);
  doc.roundedRect(x + 4, y + 5, w, h, 14).fillOpacity(0.35).fill('#000000').fillOpacity(1);
  doc.roundedRect(x, y, w, h, 14).fill(color);
  doc.polygon([x + 22, y + h - 1], [x + 44, y + h - 1], [x + 24, y + h + 14]).fill(color);
  doc.fillColor(opts.textColor || C.ink).text(text, x + pad, y + (h - th) / 2, { width: w - pad * 2, align: 'center' });
  return h + 14;
}

function imageBox(doc, x, y, w, h, img, label) {
  for (let i = 3; i >= 1; i--) doc.roundedRect(x - i * 2, y - i * 2, w + i * 4, h + i * 4, 14 + i * 2).fillOpacity(0.07).fill(C.cyan);
  doc.fillOpacity(1).roundedRect(x, y, w, h, 12).fill('#241A55');
  if (img) {
    doc.save().roundedRect(x, y, w, h, 12).clip();
    try { doc.image(img, x, y, { cover: [w, h], align: 'center', valign: 'center' }); } catch { img = null; }
    doc.restore();
  }
  if (!img) {
    doc.save().translate(x + w / 2 - 20, y + h / 2 - 34);
    doc.roundedRect(0, 0, 40, 30, 5).lineWidth(3).stroke('#5A4F8A');
    doc.polygon([3, 27], [14, 13], [22, 22], [28, 16], [37, 27]).fill('#5A4F8A');
    doc.restore();
    doc.font('inter700').fontSize(11).fillColor(C.muted).text(label, x, y + h / 2 + 6, { width: w, align: 'center' });
  }
  doc.roundedRect(x, y, w, h, 12).lineWidth(4).stroke(C.cyan);
  return h;
}

function arrowBetween(doc, x1, y1, x2, y2, color) {
  const mx = (x1 + x2) / 2;
  doc.save().lineWidth(3.5).lineCap('round').dash(1, { space: 8 }).strokeColor(color);
  doc.moveTo(x1, y1).bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2 - 6).stroke();
  doc.undash();
  doc.polygon([x2 - 7, y2 - 10], [x2 + 7, y2 - 10], [x2, y2]).fill(color);
  doc.restore();
  return mx;
}

const TWIST_COLOR = { glimpse: C.cyan, peep: C.yellow, tv: C.pink, memory: C.lime, words: '#B98CFF' };
/** Twist chip: coloured pill with a dark dot and the twist name. Returns its width. */
function twistChip(doc, x, y, id, label) {
  doc.font('inter800').fontSize(9);
  const w = doc.widthOfString(label) + 26, col = TWIST_COLOR[id] || C.text;
  doc.roundedRect(x, y, w, 15, 7.5).fill(col);
  doc.circle(x + 8, y + 7.5, 4.2).fill(C.ink);
  doc.circle(x + 8, y + 7.5, 1.8).fill(col);
  doc.fillColor(C.ink).text(label, x + 15, y + 3.2, { lineBreak: false });
  return w;
}

function stamp(doc, cx, cy, lines, color, angle) {
  doc.save().rotate(angle, { origin: [cx, cy] });
  doc.font('rubik900');
  const sizes = lines.map((l, i) => (lines.length > 1 && i === 1 ? 17 : 12));
  const widths = lines.map((l, i) => doc.fontSize(sizes[i]).widthOfString(l));
  const w = Math.max(...widths) + 34, h = sizes.reduce((a, b) => a + b * 1.15, 0) + 20;
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 10).lineWidth(3).strokeOpacity(0.9).stroke(color);
  doc.roundedRect(cx - w / 2 + 5, cy - h / 2 + 5, w - 10, h - 10, 7).lineWidth(1.2).stroke(color);
  let y = cy - h / 2 + 11;
  lines.forEach((l, i) => { doc.fontSize(sizes[i]).fillColor(color).text(l, cx - widths[i] / 2, y, { lineBreak: false }); y += sizes[i] * 1.15; });
  doc.strokeOpacity(1).restore();
}

function footer(doc, t, code, n) {
  doc.font('inter700').fontSize(8.5).fillColor(C.muted).fillOpacity(0.7);
  doc.text(`Promptly Wrong  ·  ${t.room} ${code}  ·  ${fill(t.page, { n })}`, M, H - 26, { width: W - M * 2, align: 'center', lineBreak: false });
  doc.fillOpacity(1);
}

/* ------------------------------------------------------------- document */
/**
 * @param {object} room  game room (players, chains)
 * @param {(id:string)=>Promise<{buf:Buffer,type:string}|null>} getImage
 * @param {{lang?:string, host?:string}} opts
 * @returns {PDFKit.PDFDocument} a document stream (call .pipe())
 */
async function buildSouvenir(room, getImage, { lang = 'en', host = '' } = {}) {
  const t = T[lang] || T.en;
  const rnd = rng(room.code + room.chains.length);
  const name = (id) => clean((room.players.find((p) => p.id === id) || {}).name || '?');
  const hue = (id) => Math.round((Math.max(room.players.findIndex((p) => p.id === id), 0) * 137.5) % 360);
  const emo = (id) => (room.players.find((p) => p.id === id) || {}).emoji;
  const stepName = (type) => t[type === 'prompt' ? 's_prompt' : type === 'image' ? 's_image' : 's_guess'];

  // preload images (JPEG/PNG only: what pdfkit can embed)
  const imgs = new Map();
  for (const ch of room.chains) for (const s of ch.steps) if (s.img && !imgs.has(s.img)) {
    const im = await getImage(s.img).catch(() => null);
    imgs.set(s.img, im && /jpe?g|png/.test(im.type) ? im.buf : null);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: `Promptly Wrong · ${room.code}`, Author: 'Promptly Wrong', Subject: t.souvenir } });
  doc.registerFont('rubik900', path.join(FONTS, 'Rubik_900Black.ttf'));
  doc.registerFont('rubik800', path.join(FONTS, 'Rubik_800ExtraBold.ttf'));
  doc.registerFont('inter400', path.join(FONTS, 'Inter_400Regular.ttf'));
  doc.registerFont('inter700', path.join(FONTS, 'Inter_700Bold.ttf'));
  doc.registerFont('inter800', path.join(FONTS, 'Inter_800ExtraBold.ttf'));
  let pageNo = 0;
  const newPage = () => { doc.addPage(); pageNo++; background(doc, rnd); footer(doc, t, room.code, pageNo); };

  // ---------- cover
  newPage();
  doc.font('inter800').fontSize(11).fillColor(C.cyan).text(t.souvenir, 0, 92, { width: W, align: 'center', characterSpacing: 3 });
  let y = logo(doc, W / 2, 150, 64);
  doc.font('inter700').fontSize(14).fillColor(C.text).text(t.tagline, 90, y + 14, { width: W - 180, align: 'center' });
  y = doc.y + 34;
  const date = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  // room code ticket
  doc.font('rubik900').fontSize(44);
  const cw = doc.widthOfString(room.code) + 60;
  doc.roundedRect(W / 2 - cw / 2, y, cw, 74, 16).fillOpacity(0.6).fill(C.ink).fillOpacity(1);
  doc.roundedRect(W / 2 - cw / 2, y, cw, 74, 16).lineWidth(3).stroke(C.text);
  doc.fillColor(C.text).text(room.code, W / 2 - cw / 2, y + 12, { width: cw, align: 'center', characterSpacing: 6 });
  doc.font('inter700').fontSize(12).fillColor(C.muted).text(`${t.room} · ${date}`, 0, y + 86, { width: W, align: 'center' });
  // stats pills
  y += 130;
  const stats = [`${room.players.length} ${t.players}`, `${room.rounds} ${t.rounds}`, `${room.chains.length} ${t.chains}`];
  doc.font('inter800').fontSize(13);
  const sw = stats.map((s) => doc.widthOfString(s) + 34);
  let sx = W / 2 - (sw.reduce((a, b) => a + b, 0) + 12 * (stats.length - 1)) / 2;
  stats.forEach((s, i) => {
    const col = [C.pink, C.lime, C.cyan][i];
    doc.roundedRect(sx, y, sw[i], 32, 16).fill(col);
    doc.fillColor(C.ink).text(s, sx, y + 9, { width: sw[i], align: 'center' });
    sx += sw[i] + 12;
  });
  // avatars parade
  y += 62;
  const n = room.players.length, per = Math.min(n, 10), r = n > 10 ? 13 : 16;
  room.players.forEach((p, i) => {
    const row = Math.floor(i / per), inRow = Math.min(per, n - row * per), col = i % per;
    avatar(doc, W / 2 - ((inRow - 1) * (r * 2 + 10)) / 2 + col * (r * 2 + 10), y + row * (r * 2 + 10), r, hue(p.id), emo(p.id));
  });
  stamp(doc, W - 130, H - 140, t.certified, C.pink, -14);
  star(doc, 95, H - 175, 22, C.yellow, true);
  star(doc, 140, H - 120, 9, C.yellow);
  star(doc, W - 80, 120, 14, C.yellow, true);

  // ---------- chains
  const bottom = H - 70;
  room.chains.forEach((ch, ci) => {
    newPage();
    // short chains are drawn bigger so they fill their page
    let colW = 300, imgH = 210, fs = 15;
    const est = (cw, ih, f) => ch.steps.reduce((a, s) => {
      if (s.type === 'image') return a + ih + 52 + (s.remembered ? 44 : 0);
      doc.font('inter800').fontSize(f);
      return a + Math.max(54, doc.heightOfString(clean(s.text) || t.no_text, { width: cw - 28, align: 'center' }) + 28) + 60;
    }, 0);
    const avail = bottom - 190, need = est(colW, imgH, fs);
    if (need < avail) { const k = Math.min(1.45, avail / need); colW = Math.min(370, Math.round(300 * Math.min(k, 1.23))); imgH = Math.round(210 * k); fs = Math.round(15 * Math.min(k, 1.25)); if (est(colW, imgH, fs) > avail) { imgH = 210; colW = 300; fs = 15; } }
    else if (need > avail) { imgH = 160; colW = 270; fs = 13; } // long chains: pack tighter
    const xL = M + 8, xR = W - M - 8 - colW;
    const first = ch.steps[0] && ch.steps[0].text;
    const lastT = [...ch.steps].reverse().find((s) => s.type !== 'image' && s.text);
    doc.font('inter800').fontSize(10.5).fillColor(C.pink).text(fill(t.chain, { c: ci + 1, C: room.chains.length }), M, 46, { characterSpacing: 2.5 });
    doc.font('rubik900').fontSize(22).fillColor(C.text);
    const title = first && lastT && ch.steps.length > 1
      ? `${t.from} «${clean(first)}» ${t.to} «${clean(lastT.text)}»`
      : `«${clean(first) || t.no_text}»`;
    doc.text(title, M, 64, { width: W - M * 2 - 40, lineGap: 1 });
    let yy = doc.y + 8;
    avatar(doc, M + 10, yy + 9, 10, hue(ch.owner), emo(ch.owner));
    doc.font('inter700').fontSize(11).fillColor(C.muted).text(fill(t.started, { name: name(ch.owner) }), M + 28, yy + 3);
    yy += 40;
    let prev = null;
    ch.steps.forEach((s, i) => {
      const left = i % 2 === 0, x = left ? xL : xR;
      const text = clean(s.text);
      doc.font('inter800').fontSize(fs);
      const need = s.type === 'image' ? imgH + 30 + (s.remembered ? 44 : 0) : Math.max(54, doc.heightOfString(text || t.no_text, { width: colW - 28, align: 'center' }) + 28) + 44;
      if (yy + need > bottom) {
        newPage();
        doc.font('inter800').fontSize(10.5).fillColor(C.pink).text(`${fill(t.chain, { c: ci + 1, C: room.chains.length })} · ${t.cont}`, M, 46, { characterSpacing: 2.5 });
        yy = 82; prev = null;
      }
      if (prev) arrowBetween(doc, prev.x, prev.y, x + colW / 2, yy + 2, s.type === 'guess' ? C.pink : C.text);
      // label
      doc.font('inter800').fontSize(11);
      const num = `${i + 1}.`;
      const numCol = s.type === 'prompt' ? C.yellow : s.type === 'image' ? C.cyan : C.pink;
      doc.fillColor(numCol).text(num, x, yy, { continued: true }).fillColor(C.text).text(' ' + stepName(s.type));
      const lw = doc.font('inter800').fontSize(11).widthOfString(`${num} ${stepName(s.type)}`);
      avatar(doc, x + lw + 16, yy + 6, 7.5, hue(s.by), emo(s.by));
      doc.font('inter700').fontSize(10).fillColor(C.muted).text(name(s.by), x + lw + 28, yy + 1);
      if (s.twist && t.twists[s.twist]) {
        const nw = doc.font('inter700').fontSize(10).widthOfString(name(s.by));
        twistChip(doc, x + lw + 36 + nw, yy - 1, s.twist, t.twists[s.twist]);
      }
      yy += 20;
      if (s.type === 'image' && s.remembered) {
        const rem = clean(s.remembered);
        doc.save().roundedRect(x, yy, colW, 34, 9).fillOpacity(0.12).fill(C.lime).restore();
        doc.save().roundedRect(x, yy, colW, 34, 9).lineWidth(1.6).dash(4, { space: 3 }).stroke(C.lime).undash().restore();
        doc.font('inter700').fontSize(9.5).fillColor(C.lime).text(t.remembered, x + 10, yy + 6, { lineBreak: false });
        doc.font('inter800').fontSize(11).fillColor(C.text).text(`“${rem}”`, x + 10, yy + 18, { width: colW - 20, lineBreak: false, ellipsis: true });
        yy += 42;
      }
      let h;
      if (s.type === 'image') h = imageBox(doc, x, yy, colW, imgH, s.img ? imgs.get(s.img) : null, t.no_image) + 6;
      else h = bubbleBox(doc, x, yy, colW, text || t.no_text, s.type === 'guess' ? C.guess : C.text, { fs });
      prev = { x: x + colW / 2, y: yy + h + 4 };
      yy += h + 26;
    });
    // verdict stamp
    const q = t.quips[Math.floor(rnd() * t.quips.length)];
    const sy = Math.min(yy + 30, bottom - 20);
    const leftLast = (ch.steps.length - 1) % 2 === 0;
    stamp(doc, leftLast ? W - M - 110 : M + 110, Math.max(sy - 40, 140), [q], [C.lime, C.yellow, C.pink, C.cyan][ci % 4], leftLast ? 9 : -9);
  });

  // ---------- credits
  newPage();
  doc.font('rubik900').fontSize(54).fillColor(C.text).text(t.theend, 0, 120, { width: W, align: 'center' });
  doc.font('inter800').fontSize(11).fillColor(C.cyan).text(t.starring, 0, 205, { width: W, align: 'center', characterSpacing: 3 });
  let cy = 240;
  const cols = room.players.length > 12 ? 2 : 1, colWd = cols === 2 ? 220 : 280;
  room.players.forEach((p, i) => {
    const col = cols === 2 ? i % 2 : 0, row = cols === 2 ? Math.floor(i / 2) : i;
    const x0 = cols === 2 ? W / 2 - colWd - 10 + col * (colWd + 20) : W / 2 - colWd / 2;
    const yv = cy + row * 34;
    avatar(doc, x0 + 14, yv + 12, 12, hue(p.id), emo(p.id));
    doc.font('rubik800').fontSize(17).fillColor(C.text).text(name(p.id), x0 + 36, yv + 2, { width: colWd - 40, lineBreak: false, ellipsis: true });
  });
  const rows = cols === 2 ? Math.ceil(room.players.length / 2) : room.players.length;
  cy += rows * 34 + 30;
  doc.font('rubik900').fontSize(26).fillColor(C.lime).text(t.thanks, 0, Math.min(cy, H - 230), { width: W, align: 'center' });
  if (host) doc.font('inter700').fontSize(13).fillColor(C.muted).text(fill(t.again, { host }), 0, doc.y + 8, { width: W, align: 'center' });
  logo(doc, W / 2, H - 190, 30);
  star(doc, 90, 150, 18, C.yellow, true); star(doc, W - 95, 175, 12, C.yellow); star(doc, W - 70, 120, 7, C.yellow);
  doc.end();
  return doc;
}

module.exports = { buildSouvenir };
