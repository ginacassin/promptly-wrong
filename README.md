# Promptly Wrong

The AI telephone game where prompts go hilariously wrong. Jackbox-style: one shared screen (TV/laptop) hosts the game, everyone plays from their phone. English + Spanish.

## How it plays
1. Host picks **players** and **rounds** and creates a room (4-letter code + QR).
2. Round 1: everyone writes a prompt.
3. Round 2: you receive someone else's prompt, paste it into **your own AI image generator** (the app doesn't generate images) and upload the picture.
4. Round 3: the next player sees only the picture and guesses the prompt. Then it repeats (image, guess, image, ...).
5. The TV reveals every chain step by step (prompt, image, guess, ...). Leaderboard + "drift" stat at the end.

Rounds can't exceed players (nobody handles the same chain twice). An odd number of rounds ends on a guess.

**Scoring:** a guess scores 0-100 for how close it is to the text that produced the image (word overlap + edit distance, accent-insensitive); the image maker shares those points. The drift stat is the average distance between each chain's first prompt and its last text.

## Run locally
```bash
npm install
npm start        # http://localhost:3000
npm test         # simulates a full game over WebSocket
```
Open `/` on the big screen, scan the QR (or open `/?r=CODE`) on phones.

## Config (env vars)
| Var | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Port inside the container |
| `BASE_PATH` | *(empty)* | Only if served under a path (e.g. `/promptlywrong`) **and** the proxy does not strip it. Works with or without "Strip Path". |

State is in memory (rooms expire after 6 h idle; a restart drops live games). Images are kept in memory too, max 4 MB each, resized to 1024 px on the phone.

## Deploy on Dokploy
1. Create application in your project, source: GitHub `ginacassin/promptly-wrong`, branch `main`, build type **Dockerfile**.
2. Domains tab: host `promptlywrong.rabbia.net` (or `bots.rabbia.net` with path `/promptlywrong` + Strip Path), **port 3000**, HTTPS on, same certificate setup as the bots.
3. WebSockets work through Traefik with no extra config.
4. Deploy. Health check: `/healthz`.

## Assets
Drop optional AI-generated art in `public/assets/` (the UI falls back gracefully if missing): `bg-tv.webp`, `bg-phone.webp`, `hero.webp`, `og-image.png`, `trophy.webp`.
Fonts (Rubik Glitch, Rubik, Inter) are self-hosted from `public/fonts/` (SIL OFL).
