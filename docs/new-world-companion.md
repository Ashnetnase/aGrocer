# New World trolley companion

Stage 5 uses a local, visible Chrome session to prepare a New World trolley. Agrocer never
collects a New World password and never selects payment, checks out, or places an order.

## Configure

Add these server-only values to `.env.local`:

```env
SHOPPING_PROVIDER="new-world-browser"
NEW_WORLD_COMPANION_URL="http://127.0.0.1:4317"
NEW_WORLD_STORE_ID=""
NEW_WORLD_COMPANION_TOKEN=""
```

The localhost default is the safe configuration when Agrocer and the companion run on the same
machine. If the Agrocer container calls a companion on another machine, bind the companion to a
LAN address with `NEW_WORLD_COMPANION_HOST` and set the same strong
`NEW_WORLD_COMPANION_TOKEN` at both ends. The companion refuses a non-local bind without a token.
Firewall the port to the Agrocer host as well.

## Run

```bash
npm run companion:newworld
```

The first search/add request launches visible Chrome with a persistent profile under
`.runtime/newworld-profile/`. That directory is gitignored because it contains the authenticated
browser session. Log into New World yourself in that window.

In Agrocer, **Prepare New World trolley** searches or applies remembered product choices. Resolve
uncertain items, then press **Add ready items to New World**. Agrocer reports an item as added only
when the companion can verify it in the visible trolley. Complete store, pickup/delivery, payment,
and final checkout yourself on New World.

## Current validation status

- Companion health endpoint: locally smoke-tested.
- Request validation, matching, preference precedence, unavailable handling and partial failures:
  covered by automated tests.
- Product preference persistence: tested against the real PostgreSQL database.
- Live New World selectors, search results and trolley addition: **not yet validated**. Selectors are
  centralised in `companion/src/retailers/newworld/newworld.selectors.ts`; a site change should
  return `selector-failed`, not a false success.
- Live search reached New World's Cloudflare **Just a moment** security check on 2026-08-30.
  The companion returns `blocked` immediately. Complete the check manually in the visible companion
  Chrome profile and retry; there is no bypass or stealth behavior.
