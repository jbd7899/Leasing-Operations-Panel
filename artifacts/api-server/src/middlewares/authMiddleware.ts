import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  verifySupabaseToken,
  getAuthToken,
  upsertUser,
  ensureAccountForUser,
} from "../lib/auth";
import type { SessionUser } from "../lib/types";

declare global {
  namespace Express {
    interface User extends SessionUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const token = getAuthToken(req);
  if (!token) {
    next();
    return;
  }

  let supabaseUserId: string;
  let supabaseEmail: string | undefined;
  let supabaseMeta: Record<string, unknown> = {};
  try {
    const supabaseUser = await verifySupabaseToken(token);
    supabaseUserId = supabaseUser.id;
    supabaseEmail = supabaseUser.email;
    supabaseMeta = supabaseUser.user_metadata ?? {};
  } catch {
    next();
    return;
  }

  // Fast path: user already exists in our DB
  let row: { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null; accountId: string; role: string } | undefined;
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        accountId: accountUsersTable.accountId,
        role: accountUsersTable.role,
      })
      .from(usersTable)
      .innerJoin(accountUsersTable, eq(accountUsersTable.userId, usersTable.id))
      .where(eq(usersTable.id, supabaseUserId))
      .limit(1);
    row = rows[0];
  } catch (err: unknown) {
    const e = err as Error & { cause?: Error };
    req.log?.error({ supabaseUserId, msg: e.message, cause: e.cause?.message }, "DB lookup failed in authMiddleware");
  }

  if (row) {
    req.user = row as SessionUser;
    next();
    return;
  }

  // First-time login: provision user from Supabase JWT metadata
  try {
    const fullName = (supabaseMeta.full_name as string) ?? null;
    const firstName = (supabaseMeta.first_name as string) ?? fullName?.split(" ")[0] ?? null;
    const lastName = (supabaseMeta.last_name as string) ?? (fullName?.split(" ").slice(1).join(" ") || null);

    const dbUser = await upsertUser({
      id: supabaseUserId,
      email: supabaseEmail ?? null,
      firstName,
      lastName,
      profileImageUrl: (supabaseMeta.avatar_url as string) ?? null,
    });

    const displayName =
      [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || null;
    const { accountId, role } = await ensureAccountForUser(dbUser.id, displayName);

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      accountId,
      role,
    };
  } catch (err) {
    req.log?.error({ err }, "Failed to provision user from Supabase");
  }

  next();
}
