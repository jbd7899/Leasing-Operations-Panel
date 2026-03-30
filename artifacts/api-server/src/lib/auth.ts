import { createClient } from "@supabase/supabase-js";
import { type Request, type Response } from "express";
import { db, usersTable, accountsTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw error ?? new Error("Invalid token");
  return data.user;
}

export function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}

export async function clearSession(res: Response): Promise<void> {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function upsertUser(data: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl?: string | null;
}) {
  try {
    const [user] = await db
      .insert(usersTable)
      .values(data)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return user;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isEmailConflict =
      msg.includes("users_email_unique") ||
      (msg.includes("unique constraint") && msg.includes("email"));
    if (!isEmailConflict || !data.email) throw err;

    // A row with this email exists under a different ID (e.g. legacy Clerk ID).
    // Update its ID to the current Supabase UUID so the session links correctly.
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (!existing) throw err;

    // Re-key account_users first (FK → users.id)
    await db
      .update(accountUsersTable)
      .set({ userId: data.id })
      .where(eq(accountUsersTable.userId, existing.id));

    const [updated] = await db
      .update(usersTable)
      .set({ id: data.id, firstName: data.firstName, lastName: data.lastName, profileImageUrl: data.profileImageUrl ?? null, updatedAt: new Date() })
      .where(eq(usersTable.id, existing.id))
      .returning();

    return updated;
  }
}

export async function ensureAccountForUser(
  userId: string,
  displayName: string | null,
): Promise<{ accountId: string; role: string }> {
  const [existing] = await db
    .select()
    .from(accountUsersTable)
    .where(eq(accountUsersTable.userId, userId))
    .limit(1);

  if (existing) return { accountId: existing.accountId, role: existing.role };

  const accountName = displayName ? `${displayName}'s Account` : "My Account";
  const [account] = await db.insert(accountsTable).values({ name: accountName }).returning();
  await db.insert(accountUsersTable).values({
    accountId: account.id,
    userId,
    role: "owner",
    name: displayName,
    email: null,
  });
  return { accountId: account.id, role: "owner" };
}

export type { SessionUser };
