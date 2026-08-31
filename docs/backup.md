# Backup and restore

All family data lives in Supabase Postgres (ADR-013). The Agrocer container is stateless, so
there is nothing to back up on the homelab host — destroy and rebuild it freely.

Everything below was run against the live project on 2026-08-29 and works. The commands use
Docker rather than a local `pg_dump`, so they run identically on the workstation, the homelab
host, and in CI, and the client version always matches the server's.

## What Supabase already does

The free tier takes **daily backups with 7 days of retention**, restorable from the dashboard
(Database → Backups). That covers the common case: a bad migration, or somebody clearing the
shopping list by accident.

It does **not** cover: the project being deleted, the account being lost, or wanting a copy
older than a week. That is what the dumps below are for.

## Taking a backup

```bash
mkdir -p backups
DBURL='postgresql://...'   # the session pooler URL from .env.local

docker run --rm -e PGURL="$DBURL" postgres:17-alpine \
  sh -c 'pg_dump "$PGURL" --no-owner --no-acl' \
  | gzip > "backups/agrocer-$(date +%Y-%m-%d).sql.gz"
```

**This dump contains `auth.users`, including password hashes.** That is a feature — it is what
makes accounts restorable — but it means the file is a credential store. Keep it somewhere
private and encrypted; never commit it. `backups/`, `*.sql.gz` and `*.dump` are gitignored for
that reason.

### A safer, smaller variant

If you only want the family's data and would rather not hold password hashes:

```bash
docker run --rm -e PGURL="$DBURL" postgres:17-alpine \
  sh -c 'pg_dump "$PGURL" --no-owner --no-acl --schema=public' \
  | gzip > "backups/agrocer-public-$(date +%Y-%m-%d).sql.gz"
```

The cost: restoring from this brings back the household, pantry, list, meals and members, but
**not the accounts**. Each person then needs a new Supabase account and
`npm run db:claim -- <email> "<name>"` to re-link, because `household_members.user_id`
references a user id that no longer exists (ADR-017).

## What a full dump contains

Verified on 2026-08-29 — a 200 KB dump of the live project:

| Schema | Tables | Why it is there |
| ------ | ------ | --------------- |
| `public` | 7 | The family's data. The point of the exercise. |
| `auth` | 23 | Supabase Auth, including `auth.users`. Password hashes. |
| `drizzle` | 1 | The migration journal, so a restored database knows which migrations ran. |
| `storage`, `realtime`, `supabase_migrations` | 12 | Supabase's own; harmless, and simpler to keep than to exclude. |

RLS state and all seven policies are included, so a restore comes back locked down rather than
open (ADR-016).

## Restoring

**Into a fresh Supabase project** — the disaster case:

```bash
gunzip -c backups/agrocer-2026-08-29.sql.gz \
  | docker run --rm -i -e PGURL="$NEW_DBURL" postgres:17-alpine \
      sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1'
```

Then:

1. `npm run db:rls` — confirm RLS is on and the publishable key reads nothing.
2. `npm run db:migrate` — should be a clean no-op. If it wants to apply something, the dump
   predates a migration; check `drizzle/meta/_journal.json`.
3. `npm run db:claim` — list members and confirm the links survived.
4. Update `DATABASE_URL`, `SUPABASE_URL` and the `NEXT_PUBLIC_*` values, then **rebuild** the
   container. The public values are compiled into the bundle, so a restart is not enough.

**Rolling back one bad change** is usually better done from Supabase's own daily backup than
from a dump — it is faster and does not disturb `auth`.

## How often

Manual, before anything risky: a migration, a schema change, a bulk edit. Supabase's daily
backup covers ordinary days.

Worth automating on the homelab once it is running — a weekly cron running the command above
into a directory that is itself backed up. Not done yet, and deliberately not automated from
the workstation, which is not always on (ADR-007).

## What is not backed up, and does not need to be

- **The container** — stateless, rebuilt from the repository.
- **`.env` / `.env.local`** — secrets, kept in a password manager, not in a backup.
- **Ollama models** — re-pullable with `ollama pull qwen3:8b`.
