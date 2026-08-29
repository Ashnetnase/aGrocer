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
cloudflared          -- runs on its OWN machine, not with the app
   │  http://<agrocer-host>:3000   <- a LAN IP, not localhost
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

In **Cloudflare Zero Trust → Networks → Tunnels & Mesh → `homelab` → Published application
routes → Add**:

| Field | Value |
| ----- | ----- |
| Subdomain | `home` |
| Domain | `ashnetbase.org` |
| Service type | `HTTP` |
| URL | `<agrocer-host-ip>:3000` — e.g. `192.168.1.49:3000` |

`HTTP` is correct here, not HTTPS: the hop from `cloudflared` to the container is inside the
home network. TLS is terminated at Cloudflare's edge.

**The route is a LAN IP, not `localhost`.** `cloudflared` runs on its own machine and reaches
every service by address — `vault → 192.168.1.49:8080`, `chat → 192.168.1.37:8080`. So
`localhost:3000` would mean localhost *inside cloudflared*, and the route would 502 forever.
Find the address with `hostname -I` on whichever box runs the container.

In the current Cloudflare UI this lives under the tunnel's **Published application routes**
tab — not "Public Hostname", and not "Hostname routes", which is for private WARP routing.

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
# On the host: the container answers.
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/sign-in     # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/shopping # 401 — auth works

docker compose ps        # health: healthy
docker compose logs -f   # no repeated errors
```

Then from **another machine on the LAN**, because that is how `cloudflared` reaches it — this
is the check that distinguishes "the app is running" from "the tunnel can see the app":

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://<agrocer-host-ip>:3000/sign-in   # 200
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

**The AI assistant will not work from this container**, and this was checked rather than
assumed on 2026-08-29. There are two Ollama instances on this network and neither serves:

| Where | Version | Models | Why not |
| ----- | ------- | ------ | ------- |
| Workstation `192.168.1.222` | 0.33.1 | `qwen3:8b`, `qwen3:4b` | Bound to `127.0.0.1`; confirmed unreachable on its LAN address |
| `192.168.1.14` (behind `api.chat`) | 0.7.1 | `phi3:mini`, `llama3:8b` | Reachable, but has neither model the assistant was built and tested against, and 0.7.1 is far older |

So `/api/ai/ask` returns 503 `unreachable` and the card says "The assistant is offline. It runs
on the home PC — check that is on." That is the correct failure, not a deployment fault.

**Settled by ADR-020: reach the workstation.** Pulling `qwen3:8b` onto `.14` is not an option —
`ashnetserv1` is a Proxmox box with **no GPU**, and an 8B model on CPU answers in tens of
seconds, which is useless at a wall tablet. So:

1. On the workstation, set `OLLAMA_HOST=0.0.0.0:11434` and restart Ollama.
2. Add an inbound firewall rule on TCP 11434 **scoped to the Agrocer host's address only**.
   Ollama has no authentication whatsoever, so who can reach the port is the entire control —
   a bare `0.0.0.0` with no rule leaves an open GPU on the network.
3. Reserve the workstation's address in DHCP. A moving lease breaks `OLLAMA_BASE_URL` silently,
   and the symptom looks identical to the workstation being switched off.
4. Set `OLLAMA_BASE_URL=http://192.168.1.222:11434` in the homelab `.env` and restart.

The assistant will still be offline whenever the workstation is (ADR-007). That is inherent to
the GPU living there, and the app degrades correctly: everything else on the wall keeps
working, because the AI is not on the critical path for shopping, pantry or meals.

## Backups

See [`backup.md`](./backup.md). The container holds no data; Supabase does.
