(() => {
'use strict';

const BASE = location.pathname.replace(/[^/]*$/, '');
const $app = document.getElementById('app');
const $toasts = document.getElementById('toasts');
const MAX_TEXT = 120;

// ======================================================= i18n
const I18N = {
  en: {
    tagline: 'The AI telephone game where prompts go hilariously wrong.',
    play: 'Play', howto: 'How to play', have_code: 'I have a room code', close: 'Close', back: 'Back',
    how1: 'Everyone joins on their phone and writes a prompt.',
    how2: "You get someone else's prompt: paste it into your favourite AI image generator and upload the picture.",
    how3: 'The next player sees only the picture and guesses what the prompt was.',
    how4: 'Keep passing it along, then watch on the big screen how it all went wrong!',
    setup: 'Game Setup', players: 'Players', rounds: 'Rounds', timer: 'Timer', on: 'On', off: 'Off',
    rounds_hint: 'Tip: an odd number of rounds ends on a guess. Rounds can’t exceed players.',
    create_room: 'Create Room', lobby: 'Lobby', room_code: 'Room Code', copied: 'Copied!',
    join_at: 'Join at {url} and enter the code!', scan: 'Or scan the QR code',
    n_players: '{n} / {max} players', start: 'Start game', need_more: 'Need at least 3 players',
    kick: 'Remove', start_hint: 'Starting with {n} players and {r} rounds.',
    round_of: 'Round {r} of {R}', done: 'Done', working: 'Working…', n_done: '{n} / {N} done', skip: 'Skip waiting',
    i_prompt: 'This round: write a funny prompt for an AI image generator.',
    i_image: 'This round: generate an image from the prompt you received.',
    i_guess: 'This round: guess the prompt that made the image.',
    chain_of: 'Chain {c} of {C}', started_by: 'Started by {name}',
    s_prompt: 'Original prompt', s_image: 'Generated image', s_guess: 'Guess',
    by: 'by {name}', next_step: 'Next step', prev_step: 'Back', next_chain: 'Next chain', see_results: 'See results',
    no_image: 'No image (skipped)', no_text: '(no answer)',
    results: 'Results!', pts: '{n} pts', drift: 'The prompts drifted an average of {n}% before going completely wrong!',
    play_again: 'Play Again', new_game: 'New Game', review: 'Review chains',
    join_game: 'Join a Game', nickname: 'Nickname', join: 'Join', nick_ph: 'Your name', code_ph: 'ABCD',
    youre_in: "You're in!", waiting_start: 'Waiting for the game to start…',
    write_prompt: 'Write a prompt', prompt_ph: 'A cat doing taxes…', send_prompt: 'Send Prompt', surprise: 'Surprise me',
    gen_image: 'Generate an image', gen_help: 'Copy this prompt, paste it into your AI image generator, then upload the result.',
    copy_prompt: 'Copy prompt', drop: 'Drop an image here or choose a file', camera: 'Camera', gallery: 'Gallery',
    upload: 'Upload Image', uploading: 'Uploading…', uploaded: 'Image uploaded!',
    guess_title: 'What was the original prompt?', guess_ph: 'Type your guess…', send_guess: 'Send Guess', sending: 'Sending…',
    all_set: 'All set!', waiting_others: 'Waiting for the other players…',
    look_tv: 'Look at the big screen!', look_tv_sub: 'The reveal is starting…',
    game_over: 'Game Over!', hilarious: 'The chains were hilariously wrong', thanks: 'Thanks for playing!',
    waiting_host: 'Waiting for the host to start again…', your_pts: 'You scored {n} pts', all_chains: 'See all chains', hide_chains: 'Hide chains',
    skipped_in: "The previous player didn't send anything.",
    connecting: 'Connecting…', offline: 'Connection lost. Reconnecting…',
    e_no_room: 'Room not found. Check the code.', e_started: 'That game has already started.', e_full: 'The room is full.',
    e_bad_name: 'Pick a nickname.', e_name_taken: 'That nickname is taken.', e_kicked: 'You were removed from the room.',
    e_bad_image: "We couldn't use that image. Try another.", e_bad_text: 'Write something first.', e_bad_state: 'Too late for that one!', e_server: 'Something went wrong.',
    e_img: "Couldn't read that image.",
    sugg: ['A cat doing taxes', 'A dragon eating spaghetti on the moon', 'Grandma surfing a giant wave', 'A robot crying at a wedding', 'A penguin DJ at a beach party', 'A pirate ship made of cheese', 'A wizard stuck in traffic', 'Dinosaurs playing poker'],
  },
  es: {
    tagline: 'El teléfono roto con IA donde los prompts se tuercen de lo lindo.',
    play: 'Jugar', howto: 'Cómo jugar', have_code: 'Tengo un código de sala', close: 'Cerrar', back: 'Volver',
    how1: 'Todos entran desde el móvil y escriben un prompt.',
    how2: 'Recibes el prompt de otra persona: pégalo en tu generador de imágenes con IA favorito y sube la imagen.',
    how3: 'El siguiente jugador solo ve la imagen e intenta adivinar cuál era el prompt.',
    how4: 'Seguid pasándolo y luego mirad en la pantalla grande cómo se torció todo.',
    setup: 'Configurar partida', players: 'Jugadores', rounds: 'Rondas', timer: 'Temporizador', on: 'Sí', off: 'No',
    rounds_hint: 'Consejo: con un número impar de rondas se termina con una adivinanza. Las rondas no pueden superar a los jugadores.',
    create_room: 'Crear sala', lobby: 'Sala de espera', room_code: 'Código de sala', copied: '¡Copiado!',
    join_at: 'Entra en {url} e introduce el código.', scan: 'O escanea el código QR',
    n_players: '{n} / {max} jugadores', start: 'Empezar partida', need_more: 'Hacen falta al menos 3 jugadores',
    kick: 'Quitar', start_hint: 'Empieza con {n} jugadores y {r} rondas.',
    round_of: 'Ronda {r} de {R}', done: 'Listo', working: 'Trabajando…', n_done: '{n} / {N} listos', skip: 'No esperar más',
    i_prompt: 'Esta ronda: escribe un prompt divertido para un generador de imágenes con IA.',
    i_image: 'Esta ronda: genera una imagen con el prompt que has recibido.',
    i_guess: 'Esta ronda: adivina el prompt que creó la imagen.',
    chain_of: 'Cadena {c} de {C}', started_by: 'Empezó {name}',
    s_prompt: 'Prompt original', s_image: 'Imagen generada', s_guess: 'Adivinanza',
    by: 'de {name}', next_step: 'Siguiente paso', prev_step: 'Atrás', next_chain: 'Siguiente cadena', see_results: 'Ver resultados',
    no_image: 'Sin imagen (omitida)', no_text: '(sin respuesta)',
    results: '¡Resultados!', pts: '{n} pts', drift: '¡Los prompts se desviaron un {n}% de media antes de torcerse del todo!',
    play_again: 'Jugar otra vez', new_game: 'Nueva partida', review: 'Repasar cadenas',
    join_game: 'Unirse a una partida', nickname: 'Apodo', join: 'Entrar', nick_ph: 'Tu nombre', code_ph: 'ABCD',
    youre_in: '¡Ya estás dentro!', waiting_start: 'Esperando a que empiece la partida…',
    write_prompt: 'Escribe un prompt', prompt_ph: 'Un gato haciendo la declaración de la renta…', send_prompt: 'Enviar prompt', surprise: 'Sorpréndeme',
    gen_image: 'Genera una imagen', gen_help: 'Copia este prompt, pégalo en tu generador de imágenes con IA y sube el resultado.',
    copy_prompt: 'Copiar prompt', drop: 'Suelta una imagen aquí o elige un archivo', camera: 'Cámara', gallery: 'Galería',
    upload: 'Subir imagen', uploading: 'Subiendo…', uploaded: '¡Imagen subida!',
    guess_title: '¿Cuál era el prompt original?', guess_ph: 'Escribe tu respuesta…', send_guess: 'Enviar respuesta', sending: 'Enviando…',
    all_set: '¡Todo listo!', waiting_others: 'Esperando a los demás jugadores…',
    look_tv: '¡Mira la pantalla grande!', look_tv_sub: 'Empieza la revelación…',
    game_over: '¡Fin de la partida!', hilarious: 'Las cadenas se torcieron a lo grande', thanks: '¡Gracias por jugar!',
    waiting_host: 'Esperando a que el anfitrión empiece otra vez…', your_pts: 'Has conseguido {n} pts', all_chains: 'Ver todas las cadenas', hide_chains: 'Ocultar cadenas',
    skipped_in: 'El jugador anterior no envió nada.',
    connecting: 'Conectando…', offline: 'Conexión perdida. Reconectando…',
    e_no_room: 'Sala no encontrada. Revisa el código.', e_started: 'Esa partida ya ha empezado.', e_full: 'La sala está llena.',
    e_bad_name: 'Elige un apodo.', e_name_taken: 'Ese apodo ya está en uso.', e_kicked: 'Te han quitado de la sala.',
    e_bad_image: 'No pudimos usar esa imagen. Prueba con otra.', e_bad_text: 'Escribe algo primero.', e_bad_state: '¡Demasiado tarde!', e_server: 'Algo salió mal.',
    e_img: 'No se pudo leer esa imagen.',
    sugg: ['Un gato haciendo la declaración de la renta', 'Un dragón comiendo espaguetis en la luna', 'Una abuela surfeando una ola gigante', 'Un robot llorando en una boda', 'Un pingüino DJ en una fiesta en la playa', 'Un barco pirata hecho de queso', 'Un mago atrapado en un atasco', 'Dinosaurios jugando al póker'],
  },
};
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
let lang = LS.get('pw_lang') || ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');
const t = (k, v) => {
  let s = (I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k;
  if (typeof s !== 'string') return s;
  if (v) for (const x in v) s = s.replaceAll('{' + x + '}', v[x]);
  return s;
};

// ======================================================= helpers
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'disabled' || k === 'checked' || k === 'textContent') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(add);
    e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return e;
}
function avatar(hue, cls = '') {
  const v = Math.round(hue) % 3;
  const mouths = ['<path d="M30 60q20 20 40 0" fill="none" stroke="#0B0A1A" stroke-width="6" stroke-linecap="round"/>',
    '<path d="M30 58q20 26 40 0z" fill="#0B0A1A"/>',
    '<path d="M32 62q18 -10 36 0" fill="none" stroke="#0B0A1A" stroke-width="6" stroke-linecap="round"/>'];
  const eyes = v === 2 ? '<path d="M28 38l14 6M72 38l-14 6" stroke="#0B0A1A" stroke-width="6" stroke-linecap="round"/>'
    : '<circle cx="35" cy="40" r="7" fill="#0B0A1A"/><circle cx="65" cy="40" r="7" fill="#0B0A1A"/>';
  const s = document.createElement('span');
  s.innerHTML = `<svg class="avatar ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="hsl(${Math.round(hue)} 90% 66%)"/>${eyes}${mouths[v]}</svg>`;
  return s.firstChild;
}
function logo(size = 'xl') {
  return h('div', { class: 'logo ' + size, role: 'img', 'aria-label': 'Promptly Wrong' },
    h('span', { class: 'l1' }, 'Promptly'), h('span', { class: 'l2' }, 'Wrong'),
    h('img', { class: 'mark', src: 'icon.svg', alt: '' }));
}
function toast(msg, type = 'ok') {
  const el = h('div', { class: 'toast ' + (type === 'error' ? 'error' : '') },
    h('span', null, type === 'error' ? '⚠' : '✓'), h('span', { class: 'grow' }, msg),
    h('button', { class: 'x', 'aria-label': t('close'), onclick: () => el.remove() }, '×'));
  $toasts.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = h('textarea', { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  toast(t('copied'));
}
const fmt = (ms) => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const mount = (...nodes) => { $app.replaceChildren(...nodes); };

// ======================================================= state
let S = null;            // last server state
let role = null;         // 'host' | 'player' | null
let V = 'landing';       // local view when no server state yet
let V2 = null;           // local sub-view ('review' for host, 'chains' for player)
let lastKey = null;      // render gating for phone inputs
let online = false;
const urlCode = (new URLSearchParams(location.search).get('r') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
let hostSess = LS.get('pw_host');
let playerSess = LS.get('pw_player');
const draft = { code: urlCode, name: (playerSess && playerSess.name) || '', text: '', guess: '', img: null, busy: false };
let cfg = Object.assign({ players: 8, rounds: 3, timer: true }, LS.get('pw_cfg') || {});
let rv = null;           // reveal cursor {c, s, busy}

if (urlCode) { V = 'join'; if (playerSess && playerSess.code === urlCode) role = 'player'; }
else if (hostSess) role = 'host';
else if (playerSess) role = 'player';

// ======================================================= network
let ws;
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}${BASE}ws`);
  ws.onopen = () => {
    online = true;
    if (role === 'host' && hostSess) send({ t: 'host_resume', code: hostSess.code, token: hostSess.token });
    else if (role === 'player' && playerSess) send({ t: 'join', code: playerSess.code, token: playerSess.token });
    render();
  };
  ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch { return; } onMsg(m); };
  ws.onclose = () => { online = false; render(); setTimeout(connect, 1500); };
}
function send(obj) {
  if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
  toast(t('offline'), 'error');
  return false;
}
function resetSession(kind) {
  if (kind === 'host') { LS.del('pw_host'); hostSess = null; }
  if (kind === 'player') { LS.del('pw_player'); playerSess = null; }
  role = null; S = null; V = 'landing'; V2 = null; rv = null; lastKey = null;
}
function onMsg(m) {
  switch (m.t) {
    case 'host_ok': hostSess = { code: m.code, token: m.token }; LS.set('pw_host', hostSess); role = 'host'; return;
    case 'join_ok': playerSess = { code: m.code, token: m.token, name: draft.name }; LS.set('pw_player', playerSess); role = 'player'; return;
    case 'host_state': {
      const prev = S && S.phase;
      S = m; S._at = performance.now();
      if (m.phase === 'reveal' && prev !== 'reveal') rv = { c: 0, s: 0, busy: false };
      if (m.phase !== 'end') V2 = null;
      if (m.phase === 'reveal' && prev === 'reveal') return; // keep the reveal animation undisturbed
      return render();
    }
    case 'player_state': {
      const prevRound = S && S.t === 'player_state' && S.phase === 'round' ? S.round : null;
      S = m; S._at = performance.now();
      if (m.phase !== 'end') V2 = null;
      if (m.phase !== 'round' || prevRound !== m.round) { draft.text = ''; draft.guess = ''; draft.img = null; draft.busy = false; }
      return render();
    }
    case 'error': {
      const msg = t('e_' + m.code);
      if (m.code === 'no_room' && role === 'host') { resetSession('host'); toast(msg, 'error'); return render(); }
      if (m.code === 'no_room' && role === 'player' && playerSess) { resetSession('player'); V = 'join'; toast(msg, 'error'); return render(); }
      if (m.code === 'kicked') { resetSession('player'); toast(msg, 'error'); return render(); }
      draft.busy = false;
      toast(msg, 'error');
      if (S) { lastKey = null; render(); }
      return;
    }
    default:
  }
}

// ======================================================= language switch + timer
const $lang = h('div', { class: 'lang', role: 'group', 'aria-label': 'Language' });
function paintLang() {
  $lang.replaceChildren(...['en', 'es'].map((l) =>
    h('button', { class: l === lang ? 'on' : '', 'aria-pressed': String(l === lang), onclick: () => { lang = l; LS.set('pw_lang', l); lastKey = null; render(); } }, l.toUpperCase())));
  document.documentElement.lang = lang;
}
document.body.appendChild($lang);
const $off = h('div', { class: 'offline', hidden: true }, '');
document.body.appendChild($off);

function timerPill() {
  if (!S || S.timeLeft == null) return null;
  const left = Math.max(0, S.timeLeft - (performance.now() - S._at));
  return h('span', { class: 'pill timer', 'data-timer': '1' }, '⏱ ', h('span', { class: 'tval' }, fmt(left)));
}
setInterval(() => {
  if (!S || S.timeLeft == null) return;
  const left = Math.max(0, S.timeLeft - (performance.now() - S._at));
  document.querySelectorAll('[data-timer]').forEach((el) => {
    el.lastChild.textContent = fmt(left);
    el.classList.toggle('low', left < 10000);
  });
}, 250);

// ======================================================= views: shared
function setBodyClass() {
  const tv = role === 'host' || (!role && (V === 'landing' || V === 'setup') && window.innerWidth >= 900);
  document.body.className = tv ? 'tv' : 'phone';
}
function stepper(label, val, min, max, onChange) {
  return h('div', { class: 'stepper' },
    h('span', null, label),
    h('span', { class: 'row' },
      h('button', { 'aria-label': '−', disabled: val <= min, onclick: () => onChange(val - 1) }, '−'),
      h('span', { class: 'val', 'aria-live': 'polite' }, String(val)),
      h('button', { 'aria-label': '+', disabled: val >= max, onclick: () => onChange(val + 1) }, '+')));
}
function toggle(label, on, onChange) {
  return h('div', { class: 'stepper' }, h('span', null, label),
    h('span', { class: 'toggle', role: 'group' },
      h('button', { class: on ? 'on' : '', onclick: () => onChange(true) }, t('on')),
      h('button', { class: !on ? 'on' : '', onclick: () => onChange(false) }, t('off'))));
}
function showHowTo() {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', onclick: (e) => { if (e.target === m) m.remove(); } },
    h('div', { class: 'card' }, h('h2', null, t('howto')),
      h('ol', null, ['how1', 'how2', 'how3', 'how4'].map((k) => h('li', null, t(k)))),
      h('button', { class: 'btn primary', onclick: () => m.remove() }, t('close'))));
  document.body.appendChild(m);
}
function stepLabel(step, i) {
  return `${i + 1}. ` + t(step.type === 'prompt' ? 's_prompt' : step.type === 'image' ? 's_image' : 's_guess');
}
function stepCard(step, i, opts = {}) {
  const kind = step.img || step.type === 'image' ? 'image' : 'text';
  let box;
  if (opts.suspense) box = h('div', { class: 'box susp' }, h('span', null, '•'), h('span', null, '•'), h('span', null, '•'));
  else if (step.type === 'image') box = h('div', { class: 'box' }, step.img ? h('img', { src: BASE + step.img, alt: '' }) : h('span', { class: 'muted small' }, t('no_image')));
  else box = h('div', { class: 'box' + (opts.type ? ' type-me' : ''), 'data-full': step.text || '' }, opts.type ? '' : (step.text || t('no_text')));
  return h('div', { class: `step ${step.type} ${kind} ${opts.cur ? 'cur' : ''} ${opts.enter ? 'enter' : ''}`, 'data-i': i },
    h('div', { class: 'lbl' }, stepLabel(step, i), ' · ', avatar(step.hue, ''), step.author), box);
}
function chainStrip(chain) {
  const kids = [];
  chain.steps.forEach((s, i) => {
    if (i) kids.push(h('span', { class: 'arrow' }, '→'));
    kids.push(stepCard(s, i, { cur: true }));
  });
  return h('div', { class: 'carousel strip' }, kids);
}
function typewriter(el, ms = 800) {
  const full = el.getAttribute('data-full') || t('no_text');
  const n = full.length, t0 = performance.now();
  (function tick() {
    const k = Math.min(n, Math.ceil(((performance.now() - t0) / ms) * n));
    el.textContent = full.slice(0, k);
    if (k < n) requestAnimationFrame(tick);
  })();
}

// ======================================================= views: no session
function landingView() {
  mount(h('main', { class: 'screen mid' },
    h('div', { class: 'col center', style: 'align-items:center;gap:1.2em' },
      logo('xl'),
      h('p', { class: 'muted', style: 'max-width:28em;margin-top:.8em' }, t('tagline')),
      h('div', { class: 'row center', style: 'margin-top:.6em' },
        h('button', { class: 'btn primary big', onclick: () => { V = 'setup'; render(); } }, '▶ ' + t('play')),
        h('button', { class: 'btn secondary big', onclick: showHowTo }, t('howto'))),
      h('button', { class: 'btn ghost', onclick: () => { V = 'join'; render(); } }, t('have_code')))));
}
function setupView() {
  const set = (patch) => { cfg = Object.assign(cfg, patch); cfg.rounds = Math.max(3, Math.min(cfg.rounds, cfg.players)); LS.set('pw_cfg', cfg); render(); };
  mount(h('main', { class: 'screen mid' },
    h('div', { class: 'card col', style: 'width:min(32em,100%)' },
      h('h2', { class: 'center' }, t('setup')),
      stepper(t('players'), cfg.players, 3, 12, (v) => set({ players: v })),
      stepper(t('rounds'), cfg.rounds, 3, cfg.players, (v) => set({ rounds: v })),
      toggle(t('timer'), cfg.timer, (v) => set({ timer: v })),
      h('p', { class: 'small muted' }, t('rounds_hint')),
      h('button', { class: 'btn primary big block', onclick: () => send({ t: 'host_create', players: cfg.players, rounds: cfg.rounds, timer: cfg.timer }) }, t('create_room')),
      h('button', { class: 'btn ghost block', onclick: () => { V = 'landing'; render(); } }, t('back')))));
}
function joinView() {
  const code = h('input', { type: 'text', class: 'code', value: draft.code, maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: t('code_ph'), 'aria-label': t('room_code'),
    oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); draft.code = e.target.value; } });
  const name = h('input', { type: 'text', value: draft.name, maxlength: '16', autocomplete: 'off', placeholder: t('nick_ph'), 'aria-label': t('nickname'),
    oninput: (e) => { draft.name = e.target.value; } });
  const go = (e) => {
    e && e.preventDefault();
    if (!draft.code || draft.code.length < 4) return toast(t('e_no_room'), 'error');
    if (!draft.name.trim()) return toast(t('e_bad_name'), 'error');
    send({ t: 'join', code: draft.code, name: draft.name.trim() });
  };
  mount(h('form', { class: 'screen top', onsubmit: go },
    h('div', { class: 'center' }, logo('sm')),
    h('h2', { class: 'center', style: 'margin-top:.6em' }, t('join_game')),
    h('label', { class: 'field' }, t('room_code'), code),
    h('label', { class: 'field' }, t('nickname'), name),
    h('button', { class: 'btn primary big block', type: 'submit' }, t('join')),
    h('button', { class: 'btn ghost block', type: 'button', onclick: () => { V = 'landing'; render(); } }, t('back'))));
  if (!draft.code) code.focus(); else if (!draft.name) name.focus();
}
function connectingView() {
  mount(h('main', { class: 'screen mid' }, logo('sm'), h('p', { class: 'muted' }, t('connecting'))));
}

// ======================================================= views: host
function playerChip(p, extra) {
  return h('div', { class: 'pchip' + (p.connected === false ? ' off' : '') }, avatar(p.hue), h('span', { class: 'n' }, p.name), extra);
}
function lobbyView() {
  const joinUrl = `${location.origin}${BASE}?r=${S.code}`;
  const shown = location.host + BASE.replace(/\/$/, '');
  const n = S.players.length;
  const set = (patch) => { const c = Object.assign({ players: S.expected, rounds: S.rounds, timer: S.timerOn }, patch); c.rounds = Math.max(3, Math.min(c.rounds, c.players)); cfg = c; LS.set('pw_cfg', cfg); send(Object.assign({ t: 'config' }, c)); };
  mount(h('main', { class: 'screen' },
    h('div', { class: 'row hdr' }, h('h2', null, t('lobby')), h('span', { class: 'grow' }), logo('sm')),
    h('div', { class: 'lobby-grid' },
      h('div', { class: 'col', style: 'align-items:flex-start' },
        h('span', { class: 'muted small' }, t('room_code')),
        h('button', { class: 'roomcode', 'aria-label': t('room_code') + ' ' + S.code, onclick: () => copyText(S.code) }, S.code, h('small', null, '⧉')),
        h('p', null, t('join_at', { url: shown })),
        h('div', { class: 'row' }, h('div', { class: 'qr' }, h('img', { src: `${BASE}qr.svg?u=${encodeURIComponent(joinUrl)}`, alt: 'QR' })), h('span', { class: 'muted small' }, t('scan'))),
        h('div', { class: 'col', style: 'width:min(24em,100%)' },
          stepper(t('players'), S.expected, Math.max(3, n), 12, (v) => set({ players: v })),
          stepper(t('rounds'), S.rounds, 3, S.expected, (v) => set({ rounds: v })),
          toggle(t('timer'), S.timerOn, (v) => set({ timer: v })))),
      h('div', { class: 'col' },
        h('h3', null, t('n_players', { n, max: S.expected })),
        h('div', { class: 'grid-players' }, S.players.map((p) =>
          playerChip(p, [h('span', { class: 'tick', 'aria-label': 'ready' }, p.connected ? '✓' : ''),
            h('button', { class: 'chip-btn', style: 'background:none;border:0;color:var(--color-muted);cursor:pointer;min-width:32px;min-height:32px', 'aria-label': t('kick') + ' ' + p.name, onclick: () => send({ t: 'kick', id: p.id }) }, '×')]))),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn primary big', disabled: n < 3, onclick: () => send({ t: 'start' }) }, n < 3 ? t('need_more') : '▶ ' + t('start')),
        n >= 3 ? h('p', { class: 'small muted' }, t('start_hint', { n, r: Math.min(S.rounds, n) })) : null))));
}
function roundView() {
  const type = S.round === 0 ? 'prompt' : S.round % 2 ? 'image' : 'guess';
  const done = S.players.filter((p) => p.done).length;
  mount(h('main', { class: 'screen center', style: 'align-items:center;text-align:center' },
    h('h2', null, t('round_of', { r: S.round + 1, R: S.rounds })),
    timerPill(),
    h('p', { style: 'max-width:30em' }, t('i_' + type)),
    h('div', { class: 'row center', style: 'gap:1.2em;margin-top:.5em' }, S.players.map((p) =>
      h('div', { class: 'pstat ' + (p.done ? 'done' : 'work') }, avatar(p.hue), p.name, h('span', null, p.done ? t('done') + ' ✓' : (p.connected ? t('working') : '⚠ ' + t('working')))))),
    h('span', { class: 'grow' }),
    h('div', { style: 'width:min(40em,100%)' }, h('div', { class: 'bar' }, h('i', { style: `width:${(done / S.players.length) * 100}%` })),
      h('p', { class: 'small muted', style: 'margin-top:.4em' }, t('n_done', { n: done, N: S.players.length }))),
    h('button', { class: 'btn secondary', onclick: () => send({ t: 'skip' }) }, t('skip'))));
}

// ---- reveal
function drawReveal(opts = {}) {
  const chain = S.chains[rv.c];
  const C = S.chains.length;
  const last = rv.s >= chain.steps.length - 1;
  const lastChain = rv.c >= C - 1;
  const cards = [];
  for (let i = 0; i <= rv.s; i++) {
    if (i) cards.push(h('span', { class: 'arrow' }, '→'));
    const fresh = i === rv.s && opts.enter;
    cards.push(stepCard(chain.steps[i], i, { cur: i === rv.s, enter: fresh, suspense: i === rv.s && opts.suspense, type: fresh && chain.steps[i].type !== 'image' }));
  }
  const dots = h('span', { class: 'dots' }, S.chains.map((_, i) => h('i', { class: i === rv.c ? 'on' : '' })));
  const car = h('div', { class: 'carousel', 'aria-live': 'polite' }, cards);
  mount(h('main', { class: 'screen' },
    h('div', { class: 'row hdr' }, h('h2', null, t('chain_of', { c: rv.c + 1, C })), dots, h('span', { class: 'grow' }), h('span', { class: 'muted' }, t('started_by', { name: chain.owner }))),
    car,
    h('div', { class: 'row center' },
      h('button', { class: 'btn secondary', disabled: rv.busy || (rv.c === 0 && rv.s === 0), onclick: revealPrev }, '◀ ' + t('prev_step')),
      h('button', { class: 'btn primary big', disabled: rv.busy, onclick: revealNext }, (last ? (lastChain ? t('see_results') : t('next_chain')) : t('next_step')) + ' ▶'))));
  const cur = car.querySelector('.step.cur');
  if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: opts.enter ? 'smooth' : 'auto' });
  const tw = car.querySelector('.type-me'); if (tw) typewriter(tw);
}
function revealNext() {
  if (!rv || rv.busy) return;
  const chain = S.chains[rv.c];
  if (rv.s < chain.steps.length - 1) {
    rv.s++; rv.busy = true;
    drawReveal({ suspense: true });
    setTimeout(() => { rv.busy = false; drawReveal({ enter: true }); }, 900); // slow drumroll
  } else if (rv.c < S.chains.length - 1) {
    rv.c++; rv.s = 0; drawReveal({ enter: true });
  } else {
    send({ t: 'reveal_done' });
  }
}
function revealPrev() {
  if (!rv || rv.busy) return;
  if (rv.s > 0) rv.s--;
  else if (rv.c > 0) { rv.c--; rv.s = S.chains[rv.c].steps.length - 1; }
  drawReveal();
}
document.addEventListener('keydown', (e) => {
  if (role !== 'host' || !S || S.phase !== 'reveal' || V2) return;
  if (['ArrowRight', ' ', 'Enter'].includes(e.key) && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); revealNext(); }
  if (e.key === 'ArrowLeft') revealPrev();
});

function resultsView() {
  const board = (S.score && S.score.board) || [];
  const drift = S.score && S.score.drift;
  const medal = ['🥇', '🥈', '🥉'];
  mount(h('main', { class: 'screen' },
    h('div', { class: 'row hdr' }, h('h2', null, '🏆 ' + t('results')), h('span', { class: 'grow' }), logo('sm')),
    h('div', { class: 'results-grid' },
      h('div', { class: 'board' }, board.map((p, i) => h('div', { class: 'rowp' }, h('span', { class: 'rank' }, medal[i] || String(i + 1)), avatar(p.hue), p.name, h('span', { class: 'pts' }, t('pts', { n: p.pts }))))),
      h('div', { class: 'col' },
        drift != null ? h('div', { class: 'statcard' }, h('b', null, drift + '%'), h('span', null, t('drift', { n: drift }))) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn primary big', onclick: () => send({ t: 'again' }) }, t('play_again')),
          h('button', { class: 'btn secondary big', onclick: () => { resetSession('host'); render(); } }, t('new_game'))),
        h('button', { class: 'btn ghost', onclick: () => { V2 = 'review'; render(); } }, t('review'))))));
}
function reviewView() {
  mount(h('main', { class: 'screen' },
    h('div', { class: 'row hdr' }, h('h2', null, t('review')), h('span', { class: 'grow' }), h('button', { class: 'btn secondary', onclick: () => { V2 = null; render(); } }, t('back'))),
    h('div', { class: 'scroll-y' }, S.chains.map((c, i) => h('div', { class: 'chain-block' }, h('h3', null, t('chain_of', { c: i + 1, C: S.chains.length }) + ' · ' + t('started_by', { name: c.owner })), chainStrip(c))))));
}

// ======================================================= views: player
function phoneHeader() {
  return h('div', { class: 'row', style: 'justify-content:space-between;min-height:40px' },
    h('span', { class: 'pill' }, avatar(S.me.hue), S.me.name), timerPill());
}
async function fileToJpeg(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1024, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}
function taskView() {
  const task = S.task;
  const head = [phoneHeader(), h('p', { class: 'muted small center' }, t('round_of', { r: S.round + 1, R: S.rounds }))];
  const counter = (val) => h('div', { class: 'counter' + (val.length > MAX_TEXT - 15 ? ' warn' : '') }, `${val.length} / ${MAX_TEXT}`);

  if (task.type === 'prompt' || task.type === 'guess') {
    const isPrompt = task.type === 'prompt';
    const key = isPrompt ? 'text' : 'guess';
    const cnt = h('div', null, counter(draft[key]));
    const btn = h('button', { class: 'btn primary big block', disabled: !draft[key].trim() || draft.busy, onclick: () => { draft.busy = true; btn.disabled = true; btn.textContent = t('sending'); send({ t: 'submit', data: draft[key] }); } }, isPrompt ? t('send_prompt') : t('send_guess'));
    const field = h(isPrompt ? 'textarea' : 'input', { type: isPrompt ? null : 'text', value: draft[key], maxlength: String(MAX_TEXT), placeholder: isPrompt ? t('prompt_ph') : t('guess_ph'), 'aria-label': isPrompt ? t('write_prompt') : t('guess_ph'), autocomplete: 'off',
      oninput: (e) => { draft[key] = e.target.value; cnt.replaceChildren(counter(draft[key])); btn.disabled = !draft[key].trim() || draft.busy; } });
    const body = [];
    if (isPrompt) body.push(h('h2', null, t('write_prompt')), field, cnt,
      h('button', { class: 'btn secondary block', onclick: () => { const s = t('sugg'); field.value = draft.text = s[Math.floor(Math.random() * s.length)]; field.dispatchEvent(new Event('input')); } }, '🎲 ' + t('surprise')));
    else {
      body.push(h('h2', null, t('guess_title')));
      body.push(task.input && task.input.img ? h('img', { class: 'guessimg', src: BASE + task.input.img, alt: '' }) : h('div', { class: 'card center muted' }, t('no_image')), field, cnt);
    }
    mount(h('main', { class: 'screen top' }, head, h('div', { class: 'col grow' }, body), btn));
    return;
  }

  // image task
  const inp = task.input || {};
  const preview = h('img', { class: 'preview', alt: '', hidden: !draft.img, src: draft.img || '' });
  const btn = h('button', { class: 'btn primary big block', disabled: !draft.img || draft.busy, onclick: () => { draft.busy = true; btn.disabled = true; btn.textContent = t('uploading'); if (send({ t: 'submit', data: draft.img })) toast(t('uploaded')); else { draft.busy = false; btn.disabled = false; btn.textContent = t('upload'); } } }, t('upload'));
  const take = async (file) => {
    if (!file || !/^image\//.test(file.type)) return;
    try { draft.img = await fileToJpeg(file); preview.src = draft.img; preview.hidden = false; btn.disabled = draft.busy; }
    catch { toast(t('e_img'), 'error'); }
  };
  const mkInput = (cap) => h('input', { type: 'file', accept: 'image/*', capture: cap, hidden: true, onchange: (e) => { take(e.target.files[0]); e.target.value = ''; } });
  const cam = mkInput('environment'), gal = mkInput(null);
  const dz = h('div', { class: 'dropzone', ondragover: (e) => { e.preventDefault(); dz.classList.add('over'); }, ondragleave: () => dz.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); dz.classList.remove('over'); take(e.dataTransfer.files[0]); } },
    preview, h('span', { class: 'small' }, '🖼 ' + t('drop')),
    h('div', { class: 'row center' },
      h('button', { class: 'btn secondary', onclick: () => cam.click() }, '📷 ' + t('camera')),
      h('button', { class: 'btn secondary', onclick: () => gal.click() }, '🖼 ' + t('gallery'))), cam, gal);
  pasteHandler = (e) => { const f = [...(e.clipboardData ? e.clipboardData.files : [])][0]; if (f) take(f); };
  mount(h('main', { class: 'screen top' }, head,
    h('div', { class: 'col grow' },
      h('h2', null, t('gen_image')),
      inp.text ? h('div', { class: 'promptbox' }, inp.text) : h('div', { class: 'card muted' }, t('skipped_in')),
      inp.text ? h('button', { class: 'btn secondary block', onclick: () => copyText(inp.text) }, '⧉ ' + t('copy_prompt')) : null,
      h('p', { class: 'small muted' }, t('gen_help')), dz), btn));
}
let pasteHandler = null;
document.addEventListener('paste', (e) => { if (pasteHandler) pasteHandler(e); });

function playerView() {
  const ph = S.phase;
  if (ph === 'round' && !S.done) {
    const key = 'task' + S.round;
    if (lastKey === key && $app.firstChild) return;
    lastKey = key; taskView(); return;
  }
  lastKey = null; pasteHandler = null;
  if (ph === 'lobby') {
    mount(h('main', { class: 'screen mid' }, h('div', { class: 'hourglass' }, '⏳'), h('h2', null, t('youre_in')), h('p', { class: 'muted' }, t('waiting_start')),
      h('div', { class: 'row center' }, S.players.map((p) => avatar(p.hue, 'lg'))),
      h('span', { class: 'pill' }, avatar(S.me.hue), S.me.name)));
  } else if (ph === 'round') {
    mount(h('main', { class: 'screen mid' }, h('div', { class: 'check' }, '✓'), h('h2', null, t('all_set')), h('p', { class: 'muted' }, t('waiting_others')), timerPill()));
  } else if (ph === 'reveal') {
    mount(h('main', { class: 'screen mid' }, h('div', { class: 'bigicon' }, '👀'), h('h2', null, t('look_tv')), h('p', { class: 'muted' }, t('look_tv_sub'))));
  } else if (ph === 'end') {
    const board = (S.score && S.score.board) || [];
    const me = board.find((p) => p.name === S.me.name);
    const trophy = h('img', { src: 'assets/trophy.webp', alt: '', onerror: (e) => { e.target.replaceWith(h('span', null, '🏆')); } });
    mount(h('main', { class: 'screen top center', style: 'text-align:center' },
      h('div', { class: 'bigicon' }, trophy), h('h2', null, t('game_over')), h('p', { class: 'muted' }, t('hilarious')),
      me ? h('p', { class: 'pill', style: 'align-self:center' }, t('your_pts', { n: me.pts })) : null,
      h('div', { class: 'board', style: 'text-align:left' }, board.map((p, i) => h('div', { class: 'rowp' }, h('span', { class: 'rank' }, String(i + 1)), avatar(p.hue), p.name, h('span', { class: 'pts' }, t('pts', { n: p.pts }))))),
      h('button', { class: 'btn secondary block', onclick: () => { V2 = V2 ? null : 'chains'; render(); } }, V2 ? t('hide_chains') : t('all_chains')),
      V2 ? h('div', { class: 'col' }, S.chains.map((c, i) => h('div', { class: 'chain-block' }, h('h3', null, t('chain_of', { c: i + 1, C: S.chains.length })), chainStrip(c)))) : null,
      h('p', { class: 'muted small' }, t('thanks')), h('p', { class: 'muted small' }, t('waiting_host'))));
  }
}

// ======================================================= render
function render() {
  setBodyClass(); paintLang();
  $off.hidden = online; $off.textContent = t('offline');
  if (role === 'host' && S && S.t === 'host_state') {
    lastKey = null;
    if (S.phase === 'lobby') return lobbyView();
    if (S.phase === 'round') return roundView();
    if (S.phase === 'reveal') {
      return drawReveal({ enter: false });
    }
    if (S.phase === 'end') return V2 === 'review' ? reviewView() : resultsView();
  }
  if (role === 'player' && S && S.t === 'player_state') return playerView();
  if (role) return connectingView();
  lastKey = null;
  if (V === 'setup') return setupView();
  if (V === 'join') return joinView();
  return landingView();
}

connect();
render();
})();
