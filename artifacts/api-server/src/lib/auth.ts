import { createClient } from "@supabase/supabase-js";
import { type Request, type Response } from "express";
import { db, usersTable, accountsTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

const DEV_BYPASS = process.env.DEV_BYPASS === "true";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DEV_BYPASS) {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL must be set.");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export async function verifySupabaseToken(token: string): Promise<{ sub: string; email: string | null }> {
  if (!supabaseAdmin) throw new Error("Supabase not configured");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error(error?.message ?? "Invalid token");
  return { sub: data.user.id, email: data.user.email ?? null };
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
  const [user] = await db
    .insert(usersTable)
    .values(data)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return user;
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
