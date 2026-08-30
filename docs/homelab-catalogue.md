# 24/7 household product catalogue

This guide explains what Agrocer keeps online, how products reach it, and how to deploy and verify
the catalogue safely.

## What “24/7” means

Agrocer already runs continuously on `192.168.1.49`, and PostgreSQL is managed by Supabase. Those
two existing services are the catalogue service:

```text
Visible New World search in normal Chrome
                  |
                  v
       validated product candidates
                  |
                  v
      Agrocer on 192.168.1.49
                  |
                  v
    household rows in Supabase PostgreSQL
                  |
                  v
 phone / tablet / wall display, available 24/7
```

No second database or catalogue container is required. Every valid product returned by extension
0.1.4 is now saved, not just the product eventually selected. Phones can browse those saved names,
prices and image URLs while the workstation is off. The Shopping screen labels this data **24/7
household catalogue** and shows when its newest result was recorded.

The important distinction is availability versus freshness:

- Saved catalogue data is available 24/7.
- A New World search performed in normal Chrome refreshes the matching data.
- New World blocks unattended server requests with a Cloudflare challenge. Agrocer does not bypass
  that challenge, crawl the store-wide search endpoint, or claim old prices are live.
- A future authorised retailer feed can plug into `NEW_WORLD_CATALOGUE_URL` without changing the UI.

## Step 1 — confirm the homelab identity

On the workstation, connect once:

```powershell
ssh 192.168.1.49
```

The expected ED25519 fingerprint observed on 2026-08-30 is:

```text
SHA256:8qTOie9fVH83KBijPu6FubqNWSee2rPhBdzmXpU3Tnk
```

Compare that fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` run from the
homelab console or Portainer host terminal. Type `yes` only when both values match. This prevents a
different device from being trusted merely because it has the same IP address.

## Step 2 — update and rebuild Agrocer

On `192.168.1.49`, enter the directory containing `docker-compose.yml`, then run:

```bash
git pull --ff-only
docker compose up -d --build agrocer
docker compose ps
```

Expected result: the `agrocer` container becomes `healthy`. The build is required because this
change includes browser UI code.

Do **not** set `NEW_WORLD_CATALOGUE_URL` merely to remove a message. Leave it empty until a real,
authorised external feed exists. The built-in PostgreSQL household catalogue works without it.

## Step 3 — verify the always-on catalogue

On the homelab host:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/sign-in
docker compose logs --tail=100 agrocer
```

Expected result: `200` and no repeating application errors.

From the phone on mobile data:

1. Open `https://home.ashnetbase.org`.
2. Sign in and open **Shopping**.
3. Expand **New World products**.
4. Confirm it says **24/7 household catalogue** rather than “catalogue is not configured.”
5. Previously saved products should remain available while the workstation is off.

## Step 4 — refresh catalogue products

Reload the unpacked extension first:

1. Open `chrome://extensions` in the normal Chrome profile used for New World.
2. Find **Agrocer New World Trolley**.
3. Press **Reload** and confirm version `0.1.4`.
4. Refresh the Agrocer Shopping page.
5. Confirm **Chrome trolley extension ready** appears after preparing a trolley.

Then search normally from either entry point:

- **New World products → Search**, or
- **Prepare New World trolley → Search for a different product**.

The extension opens a visible New World search. When product cards appear, Agrocer validates and
saves every specific `/shop/product/…` candidate, including its real lazy-loaded image URL. The
next phone search reads those products from PostgreSQL even when desktop Chrome is offline.

## Step 5 — check freshness and failures

The catalogue timestamp is the newest matching product's `lastSeenAt`, not a promise that every
product has the same age. If New World presents a security check:

1. Complete it manually in the visible New World tab.
2. Return to Agrocer and retry the search.
3. Never install stealth plugins or CAPTCHA bypasses.

If a product has no image, search for it again with extension 0.1.4. Older rows saved by extension
0.1.1 did not always contain an image URL and correctly display a placeholder until refreshed.

## Routine operation

There is no new service to babysit. Normal maintenance remains:

```bash
docker compose ps
docker compose logs --tail=100 agrocer
docker compose up -d --build agrocer   # after pulling application updates
```

Supabase remains the system of record and is covered by `docs/backup.md`. Product catalogue rows
are household-scoped, authenticated, and protected by the same RLS policy checks as the rest of
Agrocer.

## What remains manual

- Accepting the homelab SSH key after independently comparing its fingerprint.
- Logging into New World and completing any Cloudflare security check.
- Selecting the correct store and exact household products.
- Reviewing the trolley and completing checkout/payment.
- Obtaining permission or a licensed API before adding unattended store-wide acquisition.
