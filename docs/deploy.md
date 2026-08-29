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
cloudflared          -- a container on this SAME host (cloudflare-tunnel_default)
   │  http://192.168.1.49:3000     <- host LAN IP today; see "Tightening" below
   ▼
agrocer container ──────────► Supabase Postgres (ap-southeast-2)
```

## Prerequisites

- Docker Engine on **`192.168.1.49`** — the host chosen on 2026-08-29. Its hostname is
  `portainer`, which is misleading: Portainer the application is on **8000/9443**, not 3000.

  What is actually running there, verified on 2026-08-29:

  | Port | Container |
  | ---- | --------- |
  | 8080 | `vaultwarden` |
  | 3001 | `uptime-kuma` |
  | 8000, 9443 | `portainer` |
  | 80, 81, 443 | `ngix-npm-1` |
  | — | `cloudflared` |

  **Port 3000 is free**, so the default needs no override. `AGROCER_HOST_PORT` exists for the
  next host where it is not — set it in `.env` and use the same number in the tunnel route.
  The container is always 3000 internally (`PORT`, `EXPOSE`, healthcheck) and nothing in the
  app derives a URL from the port, so changing the published one needs no rebuild.
- The `homelab` Cloudflare Tunnel **runs on this same host**, as a container on the
  `cloudflare-tunnel_default` network, started with `["tunnel","run"]` — the token is in an
  environment variable, so all routing lives in the Zero Trust dashboard and there is no
  config file to edit.
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
| URL | `192.168.1.49:3000` |

`HTTP` is correct here, not HTTPS: the hop from `cloudflared` to the container is inside the
home network. TLS is terminated at Cloudflare's edge.

**The route is a LAN IP, not `localhost`.** `cloudflared` is a *container*, so `localhost`
means inside that container, not the host — which is why the first attempt 502'd. It reaches
every service by address: `vault → 192.168.1.49:8080` (its own host), `chat → 192.168.1.37:8080`
(another machine). Find the address with `hostname -I`.

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
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# AGROCER_HOST_PORT=3002                 # only if 3000 is taken; it is free on .49
```

Three values, not five, and no port line — 3000 is free on this host. `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are **not** needed here —
nothing in the running container reads them, only `scripts/claim.ts` and `scripts/rls-check.ts`
do, and those run from a checkout against `.env.local`. Compose briefly demanded `SUPABASE_URL`
and aborted otherwise-valid deploys because of it.

> **A `$` in the database password must be doubled.** Compose interpolates `$` inside `.env`
> values, so `p$ss` becomes `p` followed by an undefined variable. Write `p$$ss`. The symptom
> is a Postgres authentication failure with a password you can prove is correct — the single
> most likely way this file goes wrong.

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
# On the host. Use the PUBLISHED port — 3000 unless you set AGROCER_HOST_PORT.
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/sign-in      # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/shopping # 401 — auth works

docker compose ps        # health: healthy
docker compose logs -f   # no repeated errors
```

Then from **another machine on the LAN**, because that is how `cloudflared` reaches it — this
is the check that distinguishes "the app is running" from "the tunnel can see the app":

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://192.168.1.49:3000/sign-in   # 200
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

## Tightening, once it is working

`cloudflared` turned out to be a container **on this same host**, on the
`cloudflare-tunnel_default` network. ADR-019 assumed otherwise, which is why the compose file
publishes a LAN port and accepts the session cookie travelling in clear on that hop.

Now that the assumption is corrected, the clean arrangement is available: join Agrocer to
`cloudflare-tunnel_default`, publish **no** host port at all, and point the route at
`http://agrocer:3000` by container name. That removes the LAN hop entirely and makes host port
collisions permanently irrelevant.

**Do it as a second step, not as part of the first deploy.** Two changes at once means a 502
tells you nothing about which one caused it. Get `200`/`401` on `127.0.0.1:3000` first — that
proves the application — then move it behind the Docker network and re-verify the same two
codes through the tunnel.

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
