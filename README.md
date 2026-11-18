# Promptly Wrong

The AI telephone game where prompts go hilariously wrong. Jackbox-style: one shared screen (TV/laptop) hosts, everyone plays on their phone. English + Spanish.

## How it plays
1. Host picks **players** and **rounds** and creates a room (4-letter code + QR).
2. Round 1: everyone writes a prompt.
3. Round 2: you get someone else's prompt, paste it into **your own AI image generator** (the app doesn't generate images) and upload the picture.
4. Round 3: the next player sees only the picture and guesses the prompt. Then image, guess, image, ...
5. The TV reveals every chain step by step. Leaderboard + "drift" stat at the end.

Rounds are 3..players (nobody touches the same chain twice). Odd rounds end on a guess.
**Scoring:** each guess scores 0-100 for closeness to the text that produced the image (word overlap + edit distance, accent-insensitive); the image maker shares the points.

## Architecture
```
            ┌──────────────── Traefik (Dokploy) ────────────────┐
browser ──▶ │  /       → frontend (nginx, static)                │
            │  /api/*  → backend × N  (Node: WebSocket, images, QR)
            └───────────────────────────┬───────────────────────┘
                                        ▼
                                      Redis  (rooms, images, timers, pub/sub)
```
- **frontend/**: static HTML/CSS/JS served by nginx. `config.js` is generated at container start, so the same image works on any domain.
- **backend/**: stateless Node API. With `REDIS_URL` set, any number of replicas can run: room state is locked per room in Redis, images are stored in Redis with a TTL, round deadlines live in a sorted set (any replica fires them, exactly once), and changes are fanned out to every replica over pub/sub. No sticky sessions needed; if a replica dies, clients reconnect to another and keep their seat. Without `REDIS_URL` it runs single-instance in memory.

## Configuration
**backend**
| Var | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `REDIS_URL` | *(empty → memory)* | e.g. `redis://default:pass@promptly-wrong-redis:6379` |
| `ROOM_TTL_HOURS` | `6` | rooms + images expire after this idle time |

Routes match by suffix, so the backend works at `/`, `/api`, or any prefix with or without "strip path": `GET …/healthz`, `GET …/qr.svg?u=`, `GET …/img/CODE/ID`, `WS …/ws`.

**frontend**
| Var | Default | |
|---|---|---|
| `API_BASE` | `api/` | where the browser reaches the backend, relative to the page or absolute (`https://api.example.com/`) |
| `BACKEND_URL` | *(empty)* | if set (e.g. `http://backend:3000`), nginx itself proxies `/api/` to it, useful without Traefik path routing |

## Develop
```bash
cd backend && npm install
npm run dev     # backend + frontend on http://localhost:3000 (memory store)
npm test        # e2e: memory, then 2 replicas on Redis (needs redis-server)
```
Full stack locally: `docker compose up --build` → http://localhost:8080 (redis + 2 backend replicas + frontend).

## Deploy on Dokploy
Project **Promptly Wrong**, three services:
1. **redis**: Database → Redis. Copy its internal connection URL.
2. **backend**: Application, Git provider `https://github.com/ginacassin/promptly-wrong`, branch `main`, build path `/backend`, build type Dockerfile. Env `REDIS_URL=<internal url>`. Domain: your host, **path `/api`**, port **3000**, HTTPS. Scale with Advanced → Replicas.
3. **frontend**: same repo, build path `/frontend`, Dockerfile. Domain: same host, path `/`, port **80**, HTTPS.

Serving under a sub-path (e.g. `bots.rabbia.net/promptlywrong`): frontend path `/promptlywrong` and backend path `/promptlywrong/api`, both with Strip Path on.

## Assets
Optional AI art in `frontend/public/assets/` (UI falls back if missing): `bg-tv.webp`, `bg-phone.webp`, `hero.webp`, `og-image.png`, `trophy.webp`. Fonts (Rubik Glitch, Rubik, Inter, SIL OFL) are self-hosted.
