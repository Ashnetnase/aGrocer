/**
 * Links a Supabase Auth user to a household member (`npm run db:claim`).
 *
 *   npm run db:claim                      # list members and their link state
 *   npm run db:claim -- ash@example.com   # link that account to a member, interactively named
 *   npm run db:claim -- ash@example.com "Ash"
 *
 * Joining a household is a deliberate act, not something signing up does by itself. That is
 * the whole point: `currentHouseholdId()` refuses any account with no member row, so an
 * account created against this Supabase project — by anyone, for any reason — gets nothing
 * until somebody with database access runs this.
 *
 * It mirrors `seed.ts`, which exists for the same reason: re-seeding must be explicit.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { householdMembers, households } from '@/db/schema';

function fromEnvFile(key: string): string | undefined {
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

const config = (key: string): string | undefined => process.env[key] ?? fromEnvFile(key);

function required(key: string): string {
  const value = config(key);
  if (!value) throw new Error(`${key} is not set. See .env.example.`);
  return value;
}

/**
 * Looks the account up by email using the secret key.
 *
 * The secret key bypasses RLS and can read `auth.users`, which is exactly why it is
 * server-only and never goes near the browser. This script is the only place it is used.
 */
async function findUserByEmail(email: string): Promise<{ id: string; email: string } | undefined> {
  const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SECRET_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // `listUsers` is paginated and has no email filter, so this walks pages. A household has a
  // handful of accounts; if that ever stops being true, this is the thing to replace.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match?.email) return { id: match.id, email: match.email };
    if (data.users.length < 200) break;
  }
  return undefined;
}

async function main() {
  const [email, memberName] = process.argv.slice(2);

  const sql = postgres(required('DATABASE_URL'), { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    const members = await db
      .select({
        id: householdMembers.id,
        name: householdMembers.name,
        role: householdMembers.role,
        userId: householdMembers.userId,
        householdId: householdMembers.householdId,
        householdName: households.name,
      })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .orderBy(householdMembers.name);

    if (members.length === 0) {
      throw new Error('No household members exist. Run `npm run db:seed` first.');
    }

    if (!email) {
      console.log('Household members:\n');
      console.table(
        members.map((member) => ({
          name: member.name,
          role: member.role,
          household: member.householdName,
          'signs in': member.userId ? 'yes' : '—',
        })),
      );
      console.log(
        '\nTo link an account:\n' +
          '  npm run db:claim -- <email> "<member name>"\n\n' +
          'The account must already exist in Supabase (Authentication → Users, or the app’s\n' +
          'sign-up). This script never creates one.',
      );
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error(
        `No Supabase account with the email ${email}.\n` +
          '  Create it first in the Supabase dashboard under Authentication → Users.\n' +
          '  This script deliberately does not create accounts.',
      );
    }

    const alreadyLinked = members.find((member) => member.userId === user.id);
    if (alreadyLinked) {
      console.log(
        `${user.email} is already linked to ${alreadyLinked.name} (${alreadyLinked.householdName}).`,
      );
      return;
    }

    if (!memberName) {
      throw new Error(
        `Which member is ${user.email}? Pass the name:\n` +
          `  npm run db:claim -- ${user.email} "${members[0]?.name ?? 'Name'}"`,
      );
    }

    const member = members.find(
      (candidate) => candidate.name.toLowerCase() === memberName.toLowerCase(),
    );
    if (!member) {
      throw new Error(
        `No household member named "${memberName}".\n` +
          `  Members: ${members.map((candidate) => candidate.name).join(', ')}`,
      );
    }
    if (member.userId) {
      throw new Error(
        `${member.name} is already linked to another account. Unlink it first if that is wrong.`,
      );
    }

    await db
      .update(householdMembers)
      .set({ userId: user.id })
      .where(eq(householdMembers.id, member.id));

    console.log(
      `✓ ${user.email} now signs in as ${member.name} (${member.role}) ` +
        `in ${member.householdName}.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
