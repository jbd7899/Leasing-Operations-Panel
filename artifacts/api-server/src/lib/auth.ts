import { createClerkClient, verifyToken } from "@clerk/backend";
import { type Request, type Response } from "express";
import { db, usersTable, accountsTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY must be set.");

export const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export async function verifyClerkToken(token: string) {
  return verifyToken(token, { secretKey: CLERK_SECRET_KEY! });
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

// Keep for type compatibility with routes that still reference SessionUser
export type { SessionUser };
