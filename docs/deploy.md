# Deploying Agrocer

Stage 2 deployment: one stateless container on the homelab, reached over HTTPS through the
existing Cloudflare Tunnel (ADR-019). The database is Supabase (ADR-013), so this container
holds nothing — destroy and rebuild it freely.

```
phone / wall tablet
   │  https://home.ashnetbase.org
   ▼
Cloudflare edge  ── TLS terminates here, real certificate
   │  (tunnel "homelab", outbound only — no port open on the router)
   ▼
cloudflared on the homelab host
   │  http://127.0.0.1:3000
   ▼
agrocer container ──────────► Supabase Postgres (ap-southeast-2)
```

## Prerequisites

- Docker Engine on the homelab host.
- The `homelab` Cloudflare Tunnel already running there — it is, serving `chat`, `vault`,
  `status` and `api.chat`.
- A Supabase project with the schema applied and at least one claimed account
  (`npm run db:claim`).

## 1. Add the hostname to the tunnel

In **Cloudflare Zero Trust → Networks → Tunnels → `homelab` → Public Hostnames → Add**:

| Field | Value |
| ----- | ----- |
| Subdomain | `home` |
| Domain | `ashnetbase.org` |
| Service type | `HTTP` |
| URL | `localhost:3000` |

`HTTP` is correct here, not HTTPS: the hop from `cloudflared` to the container is over the
loopback interface on the same machine. TLS is terminated at Cloudflare's edge.

This creates the `home.ashnetbase.org` DNS record automatically, as a Tunnel record like the
existing four.

> **Note on the wildcard.** `*.ashnetbase.org` is a `CNAME` to `ashnetbase.org` (DNS only,
> `203.211.97.101`). A specific record wins over the wildcard, so adding `home` takes
> precedence — but until you add it, `home.ashnetbase.org` already resolves to that IP rather
> than failing. Do not test before creating the hostname and conclude something is broken.

## 2. Configure the host

Copy `.env.example` to `.env` next to `docker-compose.yml` on the homelab host and fill in:

```
DATABASE_URL=                            # Supabase → Database → session pooler
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=                     # only needed for npm run db:claim
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env` is gitignored. `docker-compose.yml` fails the run if a required value is missing rather
than starting a container that will 500 on its first request.

**Do not set `AGROCER_AUTH`.** Authentication is enforced unless it is exactly `"off"`
(ADR-017), and the compose file deliberately does not mention it, so it cannot be disabled by
editing a value that looks harmless.

## 3. Deploy

```bash
docker compose up -d --build
```

The `NEXT_PUBLIC_*` values are compiled into the client bundle, so **changing them requires a
rebuild, not a restart**. Everything secret is runtime-only and never enters an image layer.

## 4. Verify

```bash
# On the host: the container answers, and only on loopback.
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/sign-in     # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/shopping # 401 — auth works

docker compose ps        # health: healthy
docker compose logs -f   # no repeated errors
```

Then from a phone, **off the home Wi-Fi** — mobile data proves it is the tunnel and not the
LAN:

- `https://home.ashnetbase.org` redirects to `/sign-in`.
- Signing in reaches the app with real data.
- `https://home.ashnetbase.org/dashboard` is the wall view.

## 5. Install it on a phone

This is what the whole HTTPS question was blocking. A real certificate means a secure context,
so the service worker registers and the install prompt appears (ADR-011).

- **iOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** ⋮ → Install app / Add to Home screen.

Open it from the home screen: no browser chrome, and the offline page should appear if you
turn the network off.

## 6. The wall tablet

Point the kiosk browser at `https://home.ashnetbase.org/dashboard` and sign in once. The
session persists — the middleware refreshes the token on every request, which is why a tablet
left open for weeks stays signed in (ADR-017). If it ever does lapse, the next tap redirects
to sign-in rather than showing an error.

## What is deliberately not here

**Cloudflare Access is not in front of this.** The app has its own authentication; Access
would add a second sign-in on a shared kitchen tablet and its interstitial interferes with
service-worker registration and `fetch` calls to `/api/*`. See ADR-019.

**The AI assistant will not work from this container.** Ollama binds to `127.0.0.1` on the
workstation by design, so from the homelab it is unreachable and `/api/ai/ask` returns 503
`unreachable` — the correct failure, and the card says "The assistant is offline. It runs on
the home PC — check that is on." Making it reachable is a separate decision: a tunnel between
the two hosts, or an authenticated proxy. Never `OLLAMA_HOST=0.0.0.0`.

## Backups

See [`backup.md`](./backup.md). The container holds no data; Supabase does.
