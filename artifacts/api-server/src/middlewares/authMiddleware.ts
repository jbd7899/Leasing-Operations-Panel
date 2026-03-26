import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  verifyClerkToken,
  clerkClient,
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

  let clerkUserId: string;
  try {
    const payload = await verifyClerkToken(token);
    clerkUserId = payload.sub;
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
      .where(eq(usersTable.id, clerkUserId))
      .limit(1);
    row = rows[0];
  } catch (err: unknown) {
    const e = err as Error & { cause?: Error };
    req.log?.error({ clerkUserId, msg: e.message, cause: e.cause?.message }, "DB lookup failed in authMiddleware");
  }

  if (row) {
    req.user = row as SessionUser;
    next();
    return;
  }

  // First-time login: pull profile from Clerk and provision in our DB
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? null;

    const dbUser = await upsertUser({
      id: clerkUserId,
      email: primaryEmail,
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
      profileImageUrl: clerkUser.imageUrl ?? null,
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
    req.log?.error({ err }, "Failed to provision user from Clerk");
  }

  next();
}
