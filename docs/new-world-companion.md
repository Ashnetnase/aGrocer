# New World trolley companion

Stage 5 uses the user's normal, visible Chrome session to prepare a New World trolley. Agrocer never
collects a New World password and never selects payment, checks out, or places an order.

## Recommended: normal Chrome extension

New World's Cloudflare check repeatedly rejected the Playwright-controlled profile during live
testing. The supported fallback is the unpacked extension in `companion/extension`:

1. Open `chrome://extensions` in the Chrome profile already logged into New World.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `C:\Users\ashle\Documents\Github\aGrocer\companion\extension`.
5. Refresh the Agrocer Shopping page.

Agrocer will show **Chrome trolley extension ready**. Prepare the list and press **Add ready items
to New World**. The extension opens each exact product in a visible New World tab, attempts the
requested quantity, and returns structured results. It reports `added` only when the on-page
quantity can be verified.

For an unmatched line, press **Search New World**. The extension opens the real New World search
inside the normal Chrome profile, reads only the visible product cards, and returns candidates to
Agrocer. Choosing one persists it as the household preference for later shopping lists.

Remembered products are not permanent lock-ins. Each preferred line offers **Pause saved product**
and **Search for a different product**; a paused choice remains stored and can be re-enabled later.
This is useful when another brand is on special without losing the family's normal choice.

On a phone/tablet without the extension, the send button creates a household trolley job. Open the
Shopping page on the desktop with the extension enabled, prepare the view, and press **Process
queued trolley**. Results are stored so the originating PWA can show completed/attention status.

## Optional homelab product catalogue

The Shopping screen has a **New World products** section that works on phones, tablets and desktop.
It does not scrape from the PWA. Agrocer calls a server-side catalogue service, validates the
product records, caches products the household encounters, and lets the user remember an exact
product for an existing shopping item. Prices and specials are displayed only when supplied by the
catalogue; Agrocer never invents them.

Configure the deployed Agrocer container with:

```env
NEW_WORLD_CATALOGUE_URL="http://catalogue:4320"
NEW_WORLD_CATALOGUE_TOKEN="use-a-long-random-token"
NEW_WORLD_STORE_ID="your-store-id"
```

The collector must implement:

```text
GET /v1/new-world/products?q=milk&storeId=your-store-id&limit=40
Authorization: Bearer <NEW_WORLD_CATALOGUE_TOKEN>
```

and return validated retailer records:

```json
{
  "products": [
    {
      "retailer": "new-world",
      "storeId": "your-store-id",
      "externalProductId": "retailer-product-id",
      "name": "Anchor Blue Milk",
      "brand": "Anchor",
      "size": "2L",
      "price": 5.8,
      "specialPrice": 5,
      "productUrl": "https://www.newworld.co.nz/shop/product/...",
      "imageUrl": "https://...",
      "availability": "available",
      "lastSeenAt": "2026-08-30T00:00:00.000Z"
    }
  ],
  "updatedAt": "2026-08-30T00:00:00.000Z"
}
```

An empty `q` means browse recent products. Keep retailer acquisition in this separate service so a
future official API can replace it without changing Agrocer. Do not crawl the entire catalogue on
every request, bypass CAPTCHA/security checks, or place collector credentials in the Agrocer PWA.
If the service is offline, Agrocer labels and displays previously seen cached products instead.

The extension is currently implemented and protocol-tested but its live search/Add/quantity
selectors still need one controlled product test against the normal logged-in Chrome session.

## Optional: Playwright companion

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
