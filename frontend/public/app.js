(() => {
'use strict';

const BASE = location.pathname.replace(/[^/]*$/, '');
// Backend location comes from config.js (generated at container start). Default: same origin, "api/".
const API = (() => { const u = new URL((window.PW_CONFIG && window.PW_CONFIG.apiBase) || 'api/', location.href); if (!u.pathname.endsWith('/')) u.pathname += '/'; return u; })();
const apiUrl = (p) => new URL(p, API).href;
const $app = document.getElementById('app');
const $toasts = document.getElementById('toasts');
const MAX_TEXT = 120;
const previewOnly = new URLSearchParams(location.search).get('preview') === '1';

// ======================================================= i18n
const I18N = {
  en: {
    start_note: 'One screen hosts. Everyone else plays on their phone.',
    setup_kicker: 'MAKE A LITTLE CHAOS', lobby_hint: 'Scan to join or share the room code', players_joined: 'PLAYERS IN THE ROOM',
    round_kicker: 'THE MEANING IS MOVING', reveal_kicker: 'LET’S SEE WHERE IT WENT', results_kicker: 'THE DAMAGE IS DONE',
    step_prompt_hint: 'Start with a wonderfully specific idea.', step_guess_hint: 'You only get the picture. Trust your instincts.',
    press_to_copy: 'Tap to copy', reveal_keys: 'Arrow keys or Space to reveal', progress_label: 'Player progress', preview_mode: 'Preview mode: start the game server to use rooms and multiplayer.',
    copied_room: 'Room code copied', players_ready: '{n} players joined', connected: 'Connected', disconnected: 'Reconnecting',
    tagline: 'The AI telephone game where prompts go hilariously wrong.', use_prompt: 'Use this prompt:', host_sets: 'The host sets up the game', wrap: 'That’s a wrap!', wrap_sub: 'Here’s how every chain went hilariously wrong.', download: 'Download souvenir (PDF)', downloading: 'Preparing your souvenir…', downloaded: 'Souvenir downloaded!', e_pdf: 'Couldn’t create the PDF. Try again.', t_text: 'Writing time', t_image: 'Image time', timer_vals: 'Writing {a} · Image {b}', timer_on: 'Timer on', timer_off: 'No timer', n_rounds: '{n} rounds', cancel_room: 'Cancel room', end_game: 'End game', confirm_cancel: 'Cancel this room? Everyone will be sent back to the start.', confirm_end: 'End the game now? Everyone will be sent back to the start.', yes_cancel: 'Yes, cancel it', yes_end: 'Yes, end it', keep_room: 'Keep the room', keep_playing: 'Keep playing', e_room_closed: 'The host closed the room.', room_cancelled: 'Room cancelled.', more_seats: '+{n} more seats', empty_seat: 'Waiting for a player…',
    play: 'Play', howto: 'How to play', have_code: 'I have a room code', close: 'Close', back: 'Back',
    how1: '**Everyone joins on their phone** and **writes a prompt**.',
    how2: "You get someone else's prompt: **paste it into your AI image generator** and **upload the picture**.",
    how3: 'The next player **sees only the picture** and **guesses the prompt**.',
    how4: 'Keep passing it along, then **watch on the big screen** how it all went wrong!',
    setup: 'Game Setup', players: 'Players', rounds: 'Rounds', timer: 'Timer', on: 'On', off: 'Off',
    rounds_hint: 'Tip: an odd number of rounds ends on a guess. Rounds can’t exceed players.',
    create_room: 'Create Room', lobby: 'Lobby', room_code: 'Room Code', copied: 'Copied!',
    join_at: '**Join** at {url} and enter the **room code**!', scan: 'Or scan the QR code',
    n_players: '{n} / {max} players', start: 'Start game', need_more: 'Need at least 3 players',
    kick: 'Remove', start_hint: 'Starting with {n} players and {r} rounds.',
    round_of: 'Round {r} of {R}', done: 'Done', working: 'Working…', n_done: '{n} / {N} done', skip: 'Skip waiting',
    i_prompt: 'This round: write a funny prompt for an AI image generator.',
    i_image: 'This round: generate an image from the prompt you received.',
    i_guess: 'This round: guess the prompt that made the image.',
    chain_of: 'Chain {c} of {C}', started_by: 'Started by {name}',
    s_prompt: 'Original prompt', s_image: 'Generated image', s_guess: 'Guess',
    by: 'by {name}', next_step: 'Next step', prev_step: 'Back', next_chain: 'Next chain', see_results: 'Wrap it up',
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
    game_over: 'Game Over!', hilarious: 'The chains were hilariously wrong!', thanks: 'Thanks for playing!',
    waiting_host: 'Waiting for the host to start again…', all_chains: 'See all chains', hide_chains: 'Hide chains',
    skipped_in: "The previous player didn't send anything.",
    connecting: 'Connecting…', offline: 'Connection lost. Reconnecting…',
    e_no_room: 'Room not found. Check the code.', e_started: 'That game has already started.', e_full: 'The room is full.',
    e_bad_name: 'Pick a nickname.', e_name_taken: 'That nickname is taken.', e_kicked: 'You were removed from the room.',
    e_bad_image: "We couldn't use that image. Try another.", e_bad_text: 'Write something first.', e_bad_state: 'Too late for that one!', e_server: 'Something went wrong.', e_slow_down: 'Easy there! Too many actions.',
    e_img: "Couldn't read that image.",
    sugg: ['A cat doing taxes', 'A dragon eating spaghetti on the moon', 'Grandma surfing a giant wave', 'A robot crying at a wedding', 'A penguin DJ at a beach party', 'A pirate ship made of cheese', 'A wizard stuck in traffic', 'Dinosaurs playing poker'],
  },
  es: {
    start_note: 'Una pantalla para el anfitrión. Todos los demás juegan desde el móvil.',
    setup_kicker: 'VAMOS A LIARLA UN POCO', lobby_hint: 'Escanea para entrar o comparte el código de sala', players_joined: 'JUGADORES EN LA SALA',
    round_kicker: 'EL SIGNIFICADO ESTÁ CAMBIANDO', reveal_kicker: 'A VER HASTA DÓNDE HA LLEGADO', results_kicker: 'EL DESASTRE YA ESTÁ HECHO',
    step_prompt_hint: 'Empieza con una idea maravillosamente concreta.', step_guess_hint: 'Solo tienes la imagen. Déjate llevar.',
    press_to_copy: 'Pulsa para copiar', reveal_keys: 'Flechas o Espacio para revelar', progress_label: 'Progreso de jugadores', preview_mode: 'Modo de vista previa: inicia el servidor para usar las salas y el multijugador.',
    copied_room: 'Código de sala copiado', players_ready: '{n} jugadores dentro', connected: 'Conectado', disconnected: 'Reconectando',
    tagline: 'El teléfono roto con IA donde los prompts se tuercen de lo lindo.', use_prompt: 'Usa este prompt:', host_sets: 'El anfitrión configura la partida', wrap: '¡Y hasta aquí!', wrap_sub: 'Así se torció cada cadena de lo lindo.', download: 'Descargar recuerdo (PDF)', downloading: 'Preparando tu recuerdo…', downloaded: '¡Recuerdo descargado!', e_pdf: 'No se pudo crear el PDF. Inténtalo de nuevo.', t_text: 'Tiempo para escribir', t_image: 'Tiempo para la imagen', timer_vals: 'Escribir {a} · Imagen {b}', timer_on: 'Con temporizador', timer_off: 'Sin temporizador', n_rounds: '{n} rondas', cancel_room: 'Cancelar sala', end_game: 'Terminar partida', confirm_cancel: '¿Cancelar esta sala? Todos volverán al inicio.', confirm_end: '¿Terminar la partida ahora? Todos volverán al inicio.', yes_cancel: 'Sí, cancelarla', yes_end: 'Sí, terminarla', keep_room: 'Mantener la sala', keep_playing: 'Seguir jugando', e_room_closed: 'El anfitrión ha cerrado la sala.', room_cancelled: 'Sala cancelada.', more_seats: '+{n} plazas más', empty_seat: 'Esperando jugador…',
    play: 'Jugar', howto: 'Cómo jugar', have_code: 'Tengo un código de sala', close: 'Cerrar', back: 'Volver',
    how1: '**Todos entran desde el móvil** y **escriben un prompt**.',
    how2: 'Recibes el prompt de otra persona: **pégalo en tu generador de imágenes con IA** y **sube la imagen**.',
    how3: 'El siguiente jugador **solo ve la imagen** e intenta **adivinar el prompt**.',
    how4: 'Seguid pasándolo y luego **mirad en la pantalla grande** cómo se torció todo.',
    setup: 'Configurar partida', players: 'Jugadores', rounds: 'Rondas', timer: 'Temporizador', on: 'Sí', off: 'No',
    rounds_hint: 'Consejo: con un número impar de rondas se termina con una adivinanza. Las rondas no pueden superar a los jugadores.',
    create_room: 'Crear sala', lobby: 'Sala de espera', room_code: 'Código de sala', copied: '¡Copiado!',
    join_at: '**Entra** en {url} e introduce el **código de sala**.', scan: 'O escanea el código QR',
    n_players: '{n} / {max} jugadores', start: 'Empezar partida', need_more: 'Hacen falta al menos 3 jugadores',
    kick: 'Quitar', start_hint: 'Empieza con {n} jugadores y {r} rondas.',
    round_of: 'Ronda {r} de {R}', done: 'Listo', working: 'Trabajando…', n_done: '{n} / {N} listos', skip: 'No esperar más',
    i_prompt: 'Esta ronda: escribe un prompt divertido para un generador de imágenes con IA.',
    i_image: 'Esta ronda: genera una imagen con el prompt que has recibido.',
    i_guess: 'Esta ronda: adivina el prompt que creó la imagen.',
    chain_of: 'Cadena {c} de {C}', started_by: 'Empezó {name}',
    s_prompt: 'Prompt original', s_image: 'Imagen generada', s_guess: 'Adivinanza',
    by: 'de {name}', next_step: 'Siguiente paso', prev_step: 'Atrás', next_chain: 'Siguiente cadena', see_results: 'Ver el final',
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
    game_over: '¡Fin de la partida!', hilarious: '¡Las cadenas se torcieron a lo grande!', thanks: '¡Gracias por jugar!',
    waiting_host: 'Esperando a que el anfitrión empiece otra vez…', all_chains: 'Ver todas las cadenas', hide_chains: 'Ocultar cadenas',
    skipped_in: 'El jugador anterior no envió nada.',
    connecting: 'Conectando…', offline: 'Conexión perdida. Reconectando…',
    e_no_room: 'Sala no encontrada. Revisa el código.', e_started: 'Esa partida ya ha empezado.', e_full: 'La sala está llena.',
    e_bad_name: 'Elige un apodo.', e_name_taken: 'Ese apodo ya está en uso.', e_kicked: 'Te han quitado de la sala.',
    e_bad_image: 'No pudimos usar esa imagen. Prueba con otra.', e_bad_text: 'Escribe algo primero.', e_bad_state: '¡Demasiado tarde!', e_server: 'Algo salió mal.', e_slow_down: '¡Despacio! Demasiadas acciones.',
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
    else if (k.startsWith('on')) e[k.toLowerCase()] = v;
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
/** CSS-drawn icon */
/** Render a translated string where **word** becomes <b>word</b>; {slot} values can be nodes. */
function rich(str, nodes = {}) {
  const out = [];
  str.split(/(\*\*[^*]+\*\*|\{\w+\})/).forEach((part) => {
    if (!part) return;
    if (part.startsWith('**')) out.push(h('b', null, part.slice(2, -2)));
    else if (/^\{\w+\}$/.test(part) && nodes[part.slice(1, -1)] != null) out.push(nodes[part.slice(1, -1)]);
    else out.push(part);
  });
  return out;
}
const ic = (name, cls = '') => h('i', { class: `ic ic-${name} ${cls}`, 'aria-hidden': 'true' });
/** CSS smiley avatar. Hue comes from the server (i * 137.5 mod 360) and maps to a distinct board colour. */
function avatar(hue, cls = '') {
  const c = Math.floor((((Math.round(hue) % 360) + 360) % 360) / 45) % 8;
  const f = c % 4;
  return h('span', { class: `avatar c${c} f${f} ${cls}`, 'aria-hidden': 'true' });
}
const confetti = (n) => h('span', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: n }, () => h('i')));
function logo(size = 'xl') {
  return h('div', { class: 'logo ' + size, role: 'img', 'aria-label': 'Promptly Wrong' },
    h('span', { class: 'mark', 'aria-hidden': 'true' }, h('span', { class: 'lm-bubble' }), h('span', { class: 'lm-frame' })),
    confetti(8),
    h('span', { class: 'l1' }, 'Promptly'), h('span', { class: 'l2' }, 'Wrong'));
}
const stageFx = h('div', { class: 'stage-fx', 'aria-hidden': 'true' },
  h('span', { class: 'splash pink' }), h('span', { class: 'splash violet' }), h('span', { class: 'splash cyan' }), h('span', { class: 'splash lime' }));
document.body.prepend(stageFx);

function toast(msg, type = 'ok') {
  const el = h('div', { class: 'toast ' + (type === 'error' ? 'error' : ''), role: 'status' },
    h('span', { class: 'tic' }, ic(type === 'error' ? 'warn' : 'check')), h('span', { class: 'grow' }, msg),
    h('button', { class: 'x', 'aria-label': t('close'), onclick: () => el.remove() }, ic('close')));
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
  toast(t(text === S?.code ? 'copied_room' : 'copied'));
}
const fmt = (ms) => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const HANDLERS = ['onclick', 'oninput', 'onchange', 'onsubmit', 'ondragover', 'ondragleave', 'ondrop', 'onpointerdown', 'onpointerup', 'onpointerleave', 'onpointercancel', 'onkeydown', 'oncontextmenu'];
/** Patch DOM node a into b's shape, keeping existing nodes (no flashes, animations keep running, images not reloaded). */
function morph(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName || (a.nodeType === 1 && (a.dataset.k || '') !== (b.dataset.k || ''))) { a.replaceWith(b); return; }
  if (a.nodeType === 3) { if (a.data !== b.data) a.data = b.data; return; }
  if (a.nodeType !== 1) return;
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (const k of HANDLERS) if (a[k] !== b[k]) a[k] = b[k];
  if ('disabled' in b && a.disabled !== b.disabled) a.disabled = b.disabled;
  if ((a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a !== document.activeElement && a.value !== b.value) a.value = b.value;
  const ak = [...a.childNodes], bk = [...b.childNodes];
  bk.forEach((bc, i) => { if (ak[i]) morph(ak[i], bc); else a.appendChild(bc); });
  for (let i = bk.length; i < ak.length; i++) ak[i].remove();
}
let viewKey = null;
/** Mount a screen. Same key → patch in place; new key → replace and play the entrance animation. */
function mount(key, root, { fresh = false } = {}) {
  const cur = $app.firstElementChild;
  if (cur && key === viewKey && !fresh) { root.classList.add('noanim'); morph(cur, root); }
  else { if (key === viewKey) root.classList.add('noanim'); $app.replaceChildren(root); }
  viewKey = key;
}
/** Immediate feedback for actions that wait on the server; the next render clears it. */
function pending(btn) {
  if (!btn) return;
  btn.classList.add('loading'); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  setTimeout(() => { if (btn.isConnected && btn.classList.contains('loading')) { btn.classList.remove('loading'); btn.disabled = false; btn.removeAttribute('aria-busy'); } }, 8000);
}
const act = (msg) => (e) => { const b = e && e.currentTarget; if (send(msg)) pending(b); };

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
let cfg = Object.assign({ players: 8, rounds: 3, timer: true, tText: 60, tImage: 150 }, LS.get('pw_cfg') || {});
const T_TEXT = { min: 15, max: 600, step: 15 }, T_IMAGE = { min: 30, max: 1200, step: 30 };
const clampT = (v, r) => Math.max(r.min, Math.min(r.max, v));
const fmtS = (sec) => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
let rv = null;           // reveal cursor {c, s, busy}
const MAXP = () => (S && S.maxPlayers) || 30;
const qrCache = new Map();

if (urlCode) { V = 'join'; if (playerSess && playerSess.code === urlCode) role = 'player'; }
else if (hostSess) role = 'host';
else if (playerSess) role = 'player';

// ======================================================= network
let ws;
function connect() {
  ws = new WebSocket(apiUrl('ws').replace(/^http/, 'ws'));
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
  if (previewOnly) { toast(t('preview_mode'), 'error'); return false; }
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
      if (m.code === 'room_closed') {
        const wasHost = role === 'host';
        document.querySelectorAll('.modal').forEach((x) => x.remove());
        resetSession(wasHost ? 'host' : 'player');
        if (!wasHost) V = 'landing';
        toast(wasHost ? t('room_cancelled') : t('e_room_closed'), wasHost ? 'ok' : 'error');
        return render();
      }
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
  return h('span', { class: 'pill timer' + (left < 10000 ? ' low' : ''), 'data-timer': '1', role: 'timer' }, ic('clock'), h('span', { class: 'tval' }, fmt(left)));
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
  const wide = window.innerWidth >= 900 && window.innerHeight >= 500;
  const tv = (role === 'host' || (!role && (V === 'landing' || V === 'setup'))) && wide;
  document.body.className = (tv ? 'tv' : 'phone') + (role === 'host' ? ' host' : '');
}
// Press-and-hold repeat. The timer lives outside the buttons: re-renders replace handlers,
// so a per-button closure would lose its timer and keep counting forever.
let holdT = null;
const holdStop = () => { clearTimeout(holdT); clearInterval(holdT); holdT = null; };
['pointerup', 'pointercancel', 'blur'].forEach((ev) => window.addEventListener(ev, holdStop));
document.addEventListener('visibilitychange', holdStop);
/** Stepper: tap to change by 1, press and hold to repeat. onDelta(±1) returns false when it can't move further. */
function stepper(label, val, min, max, onDelta, shown) {
  const btn = (d, cls, aria, dis) => h('button', { 'aria-label': `${label} ${aria}`, disabled: dis,
    onpointerdown: (e) => {
      if (e.button > 0) return;
      e.preventDefault(); holdStop();
      if (onDelta(d) === false) return;
      holdT = setTimeout(() => { holdT = setInterval(() => { if (onDelta(d) === false) holdStop(); }, 110); }, 450);
    },
    onpointerleave: holdStop, oncontextmenu: (e) => e.preventDefault(),
    onclick: (e) => { if (e.detail === 0) onDelta(d); } }, h('i', { class: cls }));
  return h('div', { class: 'stepper' },
    h('span', null, label),
    h('span', { class: 'ctl' },
      btn(-1, 'minus', '−', val <= min),
      h('span', { class: 'val' + (shown ? ' time' : ''), 'aria-live': 'polite' }, shown || String(val)),
      btn(1, 'plus', '+', val >= max)));
}
function toggle(label, on, onChange) {
  return h('div', { class: 'stepper' }, h('span', null, label),
    h('span', { class: 'toggle', role: 'group', 'aria-label': label },
      h('button', { class: on ? 'on' : '', 'aria-pressed': String(on), onclick: () => onChange(true) }, t('on')),
      h('button', { class: !on ? 'on' : '', 'aria-pressed': String(!on), onclick: () => onChange(false) }, t('off'))));
}
function showHowTo() {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('howto'), onclick: (e) => { if (e.target === m) m.remove(); } },
    h('div', { class: 'card' }, h('h2', null, t('howto')),
      h('ol', null, ['how1', 'how2', 'how3', 'how4'].map((k) => h('li', null, h('span', null, rich(t(k)))))),
      h('button', { class: 'btn primary', onclick: () => m.remove() }, t('close'))));
  document.body.appendChild(m);
  m.querySelector('button').focus();
}
function confirmBox(text, yes, no, onYes) {
  document.querySelectorAll('.modal').forEach((x) => x.remove());
  const m = h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': text, onclick: (e) => { if (e.target === m) m.remove(); } },
    h('div', { class: 'card confirm' }, h('p', { class: 'confirm-text' }, text),
      h('div', { class: 'confirm-btns' },
        h('button', { class: 'btn secondary', onclick: () => m.remove() }, no),
        h('button', { class: 'btn danger', onclick: (e) => { pending(e.currentTarget); onYes(); } }, yes))));
  document.body.appendChild(m);
  m.querySelector('.btn.secondary').focus();
}
const closeRoom = (inGame) => confirmBox(t(inGame ? 'confirm_end' : 'confirm_cancel'), t(inGame ? 'yes_end' : 'yes_cancel'), t(inGame ? 'keep_playing' : 'keep_room'), () => { if (!send({ t: 'close' })) document.querySelector('.modal')?.remove(); });
const endBtn = () => h('button', { class: 'btn endgame', onclick: () => closeRoom(true) }, ic('close'), t('end_game'));
const stepName = (type) => t(type === 'prompt' ? 's_prompt' : type === 'image' ? 's_image' : 's_guess');

/** One reveal slot: number + label, the card (bubble / image frame), author. */
function slot(step, i, state, opts = {}) {
  let box;
  if (state === 'future') box = h('div', { class: 'cardbox bubble wait' }, h('span', { class: 'q' }, '?'));
  else if (opts.suspense) box = h('div', { class: 'cardbox ' + (step.type === 'image' ? 'frame' : 'bubble' + (step.type === 'guess' ? ' pink' : '')) }, h('span', { class: 'susp' }, h('i'), h('i'), h('i')));
  else if (step.type === 'image') box = h('div', { class: 'cardbox frame' }, step.img ? h('img', { src: apiUrl(step.img), alt: stepName('image') + ' · ' + step.author }) : h('div', { class: 'none' }, ic('image'), t('no_image')));
  else box = h('div', { class: 'cardbox bubble' + (step.type === 'guess' ? ' pink' : '') + (opts.type ? ' type-me' : ''), 'data-full': step.text || '' }, opts.type ? '' : (step.text || t('no_text')));
  const showWho = state !== 'future' && !opts.suspense;
  return h('div', { class: `slot ${step.type} ${state} ${opts.enter ? 'enter' : ''}` },
    h('div', { class: 'lbl' }, h('b', null, (i + 1) + '.'), stepName(step.type)),
    box,
    showWho ? h('span', { class: 'who' }, avatar(step.hue), step.author) : h('span', { class: 'who' }, ' '));
}
function chainStrip(chain) {
  const kids = [];
  chain.steps.forEach((s, i) => {
    if (i) kids.push(h('span', { class: 'arrow' + (s.type === 'guess' ? ' pink' : '') }));
    kids.push(slot(s, i, 'cur'));
  });
  return h('div', { class: 'strip' }, kids);
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
/** QR drawn as a CSS grid of modules (data from the backend). */
function qrBox(url) {
  const box = h('div', { class: 'qr', role: 'img', 'aria-label': 'QR · ' + url });
  const draw = (q) => {
    box.style.gridTemplateColumns = `repeat(${q.size}, 1fr)`;
    box.replaceChildren(...Array.from(q.bits, (b) => h('i', { class: b === '1' ? 'on' : '' })));
  };
  if (qrCache.has(url)) draw(qrCache.get(url));
  else fetch(apiUrl('qr.json?u=' + encodeURIComponent(url))).then((r) => r.json()).then((q) => { qrCache.set(url, q); draw(q); }).catch(() => {});
  return box;
}

// ======================================================= views: no session
function landingView() {
  mount('landing', h('main', { class: 'screen home' },
    h('span', { class: 'star twinkle', 'aria-hidden': 'true' }), h('span', { class: 'star solid b twinkle', 'aria-hidden': 'true' }),
    logo('xl'),
    h('p', { class: 'tagline' }, t('tagline')),
    h('div', { class: 'row center actions' },
      h('button', { class: 'btn primary big', onclick: () => { V = 'setup'; render(); } }, ic('play'), t('play')),
      h('button', { class: 'btn secondary big', onclick: showHowTo }, t('howto'))),
    h('button', { class: 'btn ghost', onclick: () => { V = 'join'; render(); } }, t('have_code'))));
}
/** Writing-time and image-time steppers (shown when the timer is on). */
function timeSteppers(tText, tImage, onDelta) {
  return h('div', { class: 'time-steppers' },
    stepper(t('t_text'), tText, T_TEXT.min, T_TEXT.max, (d) => onDelta('tText', d * T_TEXT.step), fmtS(tText)),
    stepper(t('t_image'), tImage, T_IMAGE.min, T_IMAGE.max, (d) => onDelta('tImage', d * T_IMAGE.step), fmtS(tImage)));
}
function setupView() {
  const set = (patch) => {
    const before = JSON.stringify(cfg);
    cfg = Object.assign(cfg, patch); cfg.rounds = Math.max(3, Math.min(cfg.rounds, cfg.players));
    cfg.tText = clampT(cfg.tText, T_TEXT); cfg.tImage = clampT(cfg.tImage, T_IMAGE); LS.set('pw_cfg', cfg); render();
    return before !== JSON.stringify(cfg);
  };
  mount('setup', h('main', { class: 'screen mid' },
    h('div', { class: 'card setup-card' },
      h('h2', null, t('setup')),
      stepper(t('players'), cfg.players, 3, MAXP(), (d) => set({ players: Math.max(3, Math.min(MAXP(), cfg.players + d)) })),
      stepper(t('rounds'), cfg.rounds, 3, cfg.players, (d) => set({ rounds: Math.max(3, Math.min(cfg.players, cfg.rounds + d)) })),
      toggle(t('timer'), cfg.timer, (v) => set({ timer: v })),
      cfg.timer ? timeSteppers(cfg.tText, cfg.tImage, (k, d) => set({ [k]: cfg[k] + d })) : null,
      h('p', { class: 'hint' }, t('rounds_hint')),
      h('button', { class: 'btn primary big block', onclick: act({ t: 'host_create', players: cfg.players, rounds: cfg.rounds, timer: cfg.timer, tText: cfg.tText, tImage: cfg.tImage }) }, t('create_room')),
      h('button', { class: 'btn ghost block', onclick: () => { V = 'landing'; render(); } }, t('back')))));
}
function joinView() {
  const code = h('input', { type: 'text', class: 'code', value: draft.code, maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: t('code_ph'),
    oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); draft.code = e.target.value; } });
  const name = h('input', { type: 'text', value: draft.name, maxlength: '16', autocomplete: 'off', placeholder: t('nick_ph'),
    oninput: (e) => { draft.name = e.target.value; } });
  const go = (e) => {
    e && e.preventDefault();
    if (!draft.code || draft.code.length < 4) return toast(t('e_no_room'), 'error');
    if (!draft.name.trim()) return toast(t('e_bad_name'), 'error');
    if (send({ t: 'join', code: draft.code, name: draft.name.trim() })) pending(e && e.currentTarget && e.currentTarget.querySelector('button[type=submit]'));
  };
  mount('join', h('form', { class: 'screen join', onsubmit: go },
    h('div', { class: 'center' }, logo('sm')),
    h('h2', { class: 'ptitle' }, t('join_game')),
    h('label', { class: 'field' }, t('room_code'), code),
    h('label', { class: 'field' }, t('nickname'), name),
    h('button', { class: 'btn primary big block', type: 'submit' }, t('join')),
    h('button', { class: 'btn ghost block', type: 'button', onclick: () => { V = 'landing'; render(); } }, t('back'))), { fresh: true });
  if (!draft.code) code.focus(); else if (!draft.name) name.focus();
}
function connectingView() {
  mount('connecting', h('main', { class: 'screen mid' }, logo('sm'), h('p', { class: 'muted' }, t('connecting'))));
}

// ======================================================= views: host
function lobbyView() {
  const joinUrl = `${location.origin}${BASE}?r=${S.code}`;
  const shown = location.host + BASE.replace(/\/$/, '');
  const n = S.players.length;
  const set = (patch) => {
    const c = Object.assign({ players: S.expected, rounds: S.rounds, timer: S.timerOn, tText: S.tText, tImage: S.tImage }, patch);
    c.players = Math.max(Math.max(3, n), Math.min(MAXP(), c.players)); c.rounds = Math.max(3, Math.min(c.rounds, c.players));
    c.tText = clampT(c.tText, T_TEXT); c.tImage = clampT(c.tImage, T_IMAGE);
    // optimistic: update locally right away, server confirms
    if (c.players === S.expected && c.rounds === S.rounds && c.timer === S.timerOn && c.tText === S.tText && c.tImage === S.tImage) return false;
    Object.assign(S, { expected: c.players, rounds: c.rounds, timerOn: c.timer, tText: c.tText, tImage: c.tImage }); cfg = c; LS.set('pw_cfg', cfg); send(Object.assign({ t: 'config' }, c)); render();
    return true;
  };
  const rows = S.players.map((p) => h('div', { class: 'prow' + (p.connected ? '' : ' off'), 'data-k': p.id }, avatar(p.hue, p.connected ? '' : 'off'), h('span', { class: 'n' }, p.name), ic('check'),
    h('button', { class: 'kick', 'aria-label': t('kick') + ' ' + p.name, onclick: act({ t: 'kick', id: p.id }) }, ic('close'))));
  const seats = S.expected - n, showSeats = Math.min(seats, Math.max(0, 8 - n));
  for (let i = 0; i < showSeats; i++) rows.push(h('div', { class: 'empty-seat', 'data-k': 'seat' + i }, h('span', { class: 'avatar-slot' }), t('empty_seat')));
  if (seats > showSeats) rows.push(h('div', { class: 'empty-seat more', 'data-k': 'more' }, t('more_seats', { n: seats - showSeats })));
  mount('lobby', h('main', { class: 'screen' },
    h('div', { class: 'hdr' }, ic('crown'), h('h2', null, t('lobby'))),
    h('div', { class: 'lobby' },
      h('div', { class: 'left' },
        h('span', { class: 'label' }, t('room_code')),
        h('button', { class: 'roomcode', 'aria-label': t('room_code') + ' ' + S.code + '. ' + t('press_to_copy'), onclick: () => copyText(S.code) }, S.code, ic('copy')),
        h('p', { class: 'join-text' }, rich(t('join_at'), { url: h('b', { class: 'url' }, shown) })),
        h('div', { class: 'qrwrap' }, qrBox(joinUrl), h('span', { class: 'small muted' }, t('scan'))),
        h('div', { class: 'settings' },
          stepper(t('players'), S.expected, Math.max(3, n), MAXP(), (d) => set({ players: S.expected + d })),
          stepper(t('rounds'), S.rounds, 3, S.expected, (d) => set({ rounds: S.rounds + d })),
          toggle(t('timer'), S.timerOn, (v) => set({ timer: v })),
          S.timerOn ? timeSteppers(S.tText, S.tImage, (k, d) => set({ [k]: S[k] + d })) : null)),
      h('div', { class: 'players-panel' },
        h('h3', { 'aria-live': 'polite' }, t('n_players', { n, max: S.expected })),
        h('div', { class: 'plist' + (n > 16 ? ' three' : n > 8 ? ' two' : '') }, rows),
        h('button', { class: 'btn primary big block', disabled: n < 3, onclick: act({ t: 'start' }) }, n < 3 ? t('need_more') : [ic('play'), t('start')]),
        h('button', { class: 'btn danger-outline block', onclick: () => closeRoom(false) }, ic('close'), t('cancel_room'))))));
}
function roundView() {
  const type = S.round === 0 ? 'prompt' : S.round % 2 ? 'image' : 'guess';
  const done = S.players.filter((p) => p.done).length;
  mount('round'+S.round, h('main', { class: 'screen round' },
    h('h2', null, t('round_of', { r: S.round + 1, R: S.rounds })),
    timerPill(),
    h('p', { class: 'instr' }, t('i_' + type)),
    h('div', { class: 'pgrid' + (S.players.length > 12 ? ' many' : ''), role: 'list', 'aria-label': t('progress_label') }, S.players.map((p) =>
      h('div', { class: 'pstat ' + (p.done ? 'done' : p.connected ? 'work' : 'lost'), role: 'listitem', 'data-k': p.id },
        avatar(p.hue, p.connected ? '' : 'off'), h('span', { class: 'n' }, p.name),
        h('span', { class: 'st' }, p.done ? [t('done'), ic('check')] : p.connected ? t('working') : [ic('warn'), t('disconnected')])))),
    h('div', { class: 'foot' },
      h('div', { class: 'progress' },
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(S.players.length), 'aria-valuenow': String(done), 'aria-label': t('progress_label') }, h('i', { style: `width:${(done / S.players.length) * 100}%` })),
        h('span', { class: 'count' }, t('n_done', { n: done, N: S.players.length }))),
      h('div', { class: 'row center' }, h('button', { class: 'btn secondary', onclick: act({ t: 'skip' }) }, t('skip')), endBtn()))));
}

// ---- reveal: 3 even slots (board §5), window slides as the chain grows
function drawReveal(opts = {}) {
  const chain = S.chains[rv.c];
  const C = S.chains.length, L = chain.steps.length;
  const last = rv.s >= L - 1, lastChain = rv.c >= C - 1;
  const start = Math.max(0, Math.min(rv.s - 1, L - 3));
  const kids = [];
  for (let i = start; i < Math.min(L, start + 3); i++) {
    if (i > start) kids.push(h('span', { class: 'arrow' + (chain.steps[i].type === 'guess' ? ' pink' : '') }));
    const state = i < rv.s ? 'past' : i === rv.s ? 'cur' : 'future';
    const fresh = i === rv.s && opts.enter;
    kids.push(slot(chain.steps[i], i, state, { enter: fresh, suspense: i === rv.s && opts.suspense, type: fresh && chain.steps[i].type !== 'image' }));
  }
  const dots = h('span', { class: 'dots', 'aria-hidden': 'true' }, S.chains.map((_, i) => h('i', { class: i === rv.c ? 'on' : i < rv.c ? 'done' : '' })));
  const stage = h('div', { class: 'stage', 'aria-live': 'polite' }, confetti(4), h('span', { class: 'star solid twinkle', 'aria-hidden': 'true' }), kids);
  mount('reveal', h('main', { class: 'screen reveal' }, endBtn(),
    h('div', { class: 'title-center' }, h('h2', null, t('chain_of', { c: rv.c + 1, C })), dots, h('span', { class: 'small muted' }, t('started_by', { name: chain.owner }))),
    stage,
    h('div', { class: 'controls' },
      h('button', { class: 'btn icon', 'aria-label': t('prev_step'), disabled: rv.busy || (rv.c === 0 && rv.s === 0), onclick: revealPrev }, ic('back')),
      h('button', { class: 'btn primary big', disabled: rv.busy, onclick: revealNext }, last ? (lastChain ? t('see_results') : t('next_chain')) : t('next_step'), ic('play'))),
    h('p', { class: 'keys' }, t('reveal_keys'))), { fresh: true });
  const tw = stage.querySelector('.type-me'); if (tw) typewriter(tw);
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
  } else if (send({ t: 'reveal_done' })) {
    pending(document.querySelector('.reveal .btn.primary'));
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

/** Download the souvenir PDF (fetch → blob so we can show progress and errors). */
async function downloadPdf(e) {
  const btn = e && e.currentTarget;
  const code = S && S.code;
  if (!code) return;
  pending(btn);
  const label = btn && btn.querySelector('.lbl');
  if (label) label.textContent = t('downloading');
  try {
    const r = await fetch(apiUrl(`export/${code}.pdf?lang=${lang}`));
    if (!r.ok) throw new Error(r.status);
    const blob = await r.blob();
    const a = h('a', { href: URL.createObjectURL(blob), download: `promptly-wrong-${code}.pdf` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast(t('downloaded'));
  } catch { toast(t('e_pdf'), 'error'); }
  if (btn) { btn.classList.remove('loading'); btn.disabled = false; btn.removeAttribute('aria-busy'); if (label) label.textContent = t('download'); }
}
const pdfBtn = (cls = '') => h('button', { class: 'btn primary big ' + cls, onclick: downloadPdf }, ic('download'), h('span', { class: 'lbl' }, t('download')));

function endView() {
  mount('end', h('main', { class: 'screen wrapup' },
    h('div', { class: 'title-center' }, h('h2', null, ic('crown'), t('wrap'), ic('crown')), h('p', { class: 'muted' }, t('wrap_sub'))),
    h('div', { class: 'wrap-actions' },
      pdfBtn(),
      h('button', { class: 'btn secondary big', onclick: act({ t: 'again' }) }, t('play_again')),
      h('button', { class: 'btn outline big', onclick: (e) => { if (send({ t: 'close' })) pending(e.currentTarget); else { resetSession('host'); render(); } } }, t('new_game'))),
    h('div', { class: 'scroll-y' }, S.chains.map((c, i) => h('div', { class: 'chain-block', 'data-k': 'c' + i }, h('h3', null, t('chain_of', { c: i + 1, C: S.chains.length }) + ' · ' + t('started_by', { name: c.owner })), chainStrip(c))))));
}

// ======================================================= views: player
function phoneHeader() {
  return h('div', { class: 'phead' }, h('span', { class: 'pill' }, avatar(S.me.hue), S.me.name), timerPill());
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
  const head = [phoneHeader(), h('p', { class: 'roundtag' }, t('round_of', { r: S.round + 1, R: S.rounds }))];
  const counter = (val) => h('div', { class: 'counter' + (val.length > MAX_TEXT - 15 ? ' warn' : '') }, `${val.length} / ${MAX_TEXT}`);

  if (task.type === 'prompt' || task.type === 'guess') {
    const isPrompt = task.type === 'prompt';
    const key = isPrompt ? 'text' : 'guess';
    const cnt = h('div', { 'aria-live': 'polite' }, counter(draft[key]));
    const btn = h('button', { class: 'btn primary big block', disabled: !draft[key].trim() || draft.busy, onclick: () => { draft.busy = true; btn.disabled = true; btn.textContent = t('sending'); send({ t: 'submit', data: draft[key] }); } }, isPrompt ? t('send_prompt') : t('send_guess'));
    const field = h(isPrompt ? 'textarea' : 'input', { type: isPrompt ? null : 'text', value: draft[key], maxlength: String(MAX_TEXT), placeholder: isPrompt ? t('prompt_ph') : t('guess_ph'), 'aria-label': isPrompt ? t('write_prompt') : t('guess_title'), autocomplete: 'off',
      oninput: (e) => { draft[key] = e.target.value; cnt.replaceChildren(counter(draft[key])); btn.disabled = !draft[key].trim() || draft.busy; } });
    const body = isPrompt
      ? [h('h2', { class: 'ptitle' }, t('write_prompt')), field, cnt,
         h('button', { class: 'btn secondary block', onclick: () => { const s = t('sugg'); field.value = draft.text = s[Math.floor(Math.random() * s.length)]; field.dispatchEvent(new Event('input')); } }, ic('dice'), t('surprise'))]
      : [h('h2', { class: 'ptitle' }, t('guess_title')),
         task.input && task.input.img ? h('img', { class: 'guessimg', src: apiUrl(task.input.img), alt: '' }) : h('div', { class: 'noimg' }, ic('image'), t('no_image')), field, cnt];
    mount('task'+S.round, h('main', { class: 'screen task' }, head, h('div', { class: 'fill' }, body), btn), { fresh: true });
    return;
  }

  // image task
  const inp = task.input || {};
  const preview = h('img', { class: 'preview', alt: '', hidden: !draft.img, src: draft.img || '' });
  const btn = h('button', { class: 'btn primary big block', disabled: !draft.img || draft.busy, onclick: () => { draft.busy = true; btn.disabled = true; btn.textContent = t('uploading'); if (send({ t: 'submit', data: draft.img })) toast(t('uploaded')); else { draft.busy = false; btn.disabled = false; btn.textContent = t('upload'); } } }, t('upload'));
  const dzIcon = ic('image');
  const take = async (file) => {
    if (!file || !/^image\//.test(file.type)) return;
    try { draft.img = await fileToJpeg(file); preview.src = draft.img; preview.hidden = false; dzIcon.hidden = true; dz.classList.add('has-img'); btn.disabled = draft.busy; btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    catch { toast(t('e_img'), 'error'); }
  };
  if (draft.img) dzIcon.hidden = true;
  const mkInput = (cap) => h('input', { type: 'file', accept: 'image/*', capture: cap, hidden: true, onchange: (e) => { take(e.target.files[0]); e.target.value = ''; } });
  const cam = mkInput('environment'), gal = mkInput(null);
  const dz = h('div', { class: 'dropzone' + (draft.img ? ' has-img' : ''), ondragover: (e) => { e.preventDefault(); dz.classList.add('over'); }, ondragleave: () => dz.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); dz.classList.remove('over'); take(e.dataTransfer.files[0]); } },
    dzIcon, preview, h('span', { class: 'dz-text' }, t('drop')),
    h('div', { class: 'row' },
      h('button', { class: 'btn secondary', onclick: () => cam.click() }, ic('camera'), t('camera')),
      h('button', { class: 'btn secondary', onclick: () => gal.click() }, ic('image'), t('gallery'))), cam, gal);
  pasteHandler = (e) => { const f = [...(e.clipboardData ? e.clipboardData.files : [])][0]; if (f) take(f); };
  mount('task'+S.round, h('main', { class: 'screen task' }, head,
    h('div', { class: 'fill' },
      h('h2', { class: 'ptitle' }, t('gen_image')),
      inp.text ? [h('p', { class: 'useprompt' }, t('use_prompt')), h('div', { class: 'promptbox' }, inp.text),
        h('button', { class: 'btn secondary block', onclick: () => copyText(inp.text) }, ic('copy'), t('copy_prompt'))]
        : h('div', { class: 'noimg', style: 'aspect-ratio:auto;padding:16px' }, t('skipped_in')),
      dz), btn), { fresh: true });
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
    mount('p-lobby', h('main', { class: 'screen mid' },
      h('div', { class: 'milestone' }, h('div', { class: 'hourglass', 'aria-hidden': 'true' }, h('span', { class: 'glass' }), h('span', { class: 'rim' }))),
      h('h2', null, t('youre_in')), h('p', { class: 'muted' }, t('waiting_start')),
      h('div', { class: 'avatars-row' }, S.players.map((p) => avatar(p.hue, 'lg' + (p.connected ? '' : ' off')))),
      h('span', { class: 'pill me-pill' }, avatar(S.me.hue), S.me.name),
      S.expected ? h('div', { class: 'gameinfo', 'aria-label': t('host_sets') },
        h('span', { class: 'gi-title' }, ic('crown'), t('host_sets')),
        h('div', { class: 'gi-row' },
          h('span', null, ic('user'), t('n_players', { n: S.players.length, max: S.expected })),
          h('span', null, t('n_rounds', { n: S.rounds })),
          h('span', null, ic('clock'), S.timerOn ? t('timer_vals', { a: fmtS(S.tText || 60), b: fmtS(S.tImage || 150) }) : t('timer_off')))) : null));
  } else if (ph === 'round') {
    mount('p-done'+S.round, h('main', { class: 'screen mid' },
      h('div', { class: 'milestone' }, confetti(6), h('div', { class: 'bigcheck', role: 'img', 'aria-label': t('done') })),
      h('h2', null, t('all_set')), h('p', { class: 'muted' }, t('waiting_others')), timerPill()));
  } else if (ph === 'reveal') {
    mount('p-reveal', h('main', { class: 'screen mid' },
      h('div', { class: 'milestone' }, h('div', { class: 'eyes', 'aria-hidden': 'true' }, h('i'), h('i'))),
      h('h2', null, t('look_tv')), h('p', { class: 'muted' }, t('look_tv_sub'))));
  } else if (ph === 'end') {
    mount('p-end', h('main', { class: 'screen mid' },
      h('div', { class: 'milestone' }, confetti(6), h('div', { class: 'trophy', role: 'img', 'aria-label': t('game_over') }, h('span', { class: 'h l' }), h('span', { class: 'h r' }), h('span', { class: 'cup' }), h('span', { class: 'stem' }), h('span', { class: 'base' }))),
      h('h2', null, t('game_over')), h('p', null, t('hilarious')),
      pdfBtn('block'),
      h('button', { class: 'btn secondary block', onclick: () => { V2 = V2 ? null : 'chains'; render(); } }, V2 ? t('hide_chains') : t('all_chains')),
      V2 ? h('div', { class: 'col', style: 'width:100%;text-align:left' }, S.chains.map((c, i) => h('div', { class: 'chain-block', 'data-k': 'c' + i }, h('h3', null, t('chain_of', { c: i + 1, C: S.chains.length })), chainStrip(c)))) : null,
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
    if (S.phase === 'reveal') return drawReveal({ enter: false });
    if (S.phase === 'end') return endView();
  }
  if (role === 'player' && S && S.t === 'player_state') return playerView();
  if (role) return connectingView();
  lastKey = null;
  if (V === 'setup') return setupView();
  if (V === 'join') return joinView();
  return landingView();
}

let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const before = document.body.className; setBodyClass(); if (document.body.className !== before) { viewKey = null; lastKey = null; render(); } }, 200); });

if (previewOnly) online = true;
else connect();
render();
})();
