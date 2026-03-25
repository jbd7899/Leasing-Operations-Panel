import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, accountsTable, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";
import type { SessionUser } from "../lib/types";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const MOBILE_STATE_TTL = 10 * 60 * 1000;

// In-memory store for mobile PKCE state, keyed by the OIDC `state` parameter.
// Entries expire after MOBILE_STATE_TTL ms. Cleanup runs every 60 s.
const mobileStateStore = new Map<
  string,
  { codeVerifier: string; nonce: string; expiresAt: number }
>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of mobileStateStore) {
    if (entry.expiresAt < now) mobileStateStore.delete(key);
  }
}, 60_000).unref();

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

async function ensureAccountForUser(
  userId: string,
  displayName: string | null,
): Promise<{ accountId: string; role: string }> {
  const [existingMembership] = await db
    .select()
    .from(accountUsersTable)
    .where(eq(accountUsersTable.userId, userId))
    .limit(1);

  if (existingMembership) {
    return { accountId: existingMembership.accountId, role: existingMembership.role };
  }

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

function buildSessionUser(
  dbUser: { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null },
  accountId: string,
  role: string,
): SessionUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
    accountId,
    role,
  };
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.removeHeader("ETag");
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Mobile auth entry point: generates server-side PKCE, stores state, redirects
// to Replit OIDC. The app opens this URL in WebBrowser.openAuthSessionAsync with
// callbackURLScheme = "myrentcard" so ASWebAuthenticationSession closes when it
// sees the final myrentcard:// redirect.
router.get("/mobile-auth/start", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  mobileStateStore.set(state, {
    codeVerifier,
    nonce,
    expiresAt: Date.now() + MOBILE_STATE_TTL,
  });

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login",
    state,
    nonce,
  });

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  // Mobile flow: ASWebAuthenticationSession has an isolated cookie store so none
  // of the server-set PKCE cookies are present. Complete the exchange server-side
  // using the stored PKCE state, then redirect to the app with a session token.
  if (!codeVerifier && !expectedState) {
    if (req.query.error) {
      const params = new URLSearchParams();
      params.set("error", req.query.error as string);
      if (req.query.error_description) {
        params.set("error_description", req.query.error_description as string);
      }
      res.redirect(`myrentcard://auth-callback?${params.toString()}`);
      return;
    }

    if (req.query.code && !req.query.state) {
      res.redirect("myrentcard://auth-callback?error=invalid_state");
      return;
    }

    if (req.query.code && req.query.state) {
      const code = req.query.code as string;
      const state = req.query.state as string;

      const stored = mobileStateStore.get(state);
      if (!stored || stored.expiresAt < Date.now()) {
        mobileStateStore.delete(state);
        res.redirect("myrentcard://auth-callback?error=expired_state");
        return;
      }
      mobileStateStore.delete(state);

      try {
        const currentUrl = new URL(
          `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
        );
        const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
          pkceCodeVerifier: stored.codeVerifier,
          expectedNonce: stored.nonce,
          expectedState: state,
          idTokenExpected: true,
        });

        const claims = tokens.claims();
        if (!claims) {
          res.redirect("myrentcard://auth-callback?error=no_claims");
          return;
        }

        const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
        const displayName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || null;
        const { accountId, role } = await ensureAccountForUser(dbUser.id, displayName);

        const now = Math.floor(Date.now() / 1000);
        const sessionData: SessionData = {
          user: buildSessionUser(dbUser, accountId, role),
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
        };

        const sid = await createSession(sessionData);
        res.redirect(`myrentcard://auth-callback?token=${encodeURIComponent(sid)}`);
      } catch (err) {
        req.log.error({ err }, "Mobile OIDC exchange error");
        res.redirect("myrentcard://auth-callback?error=auth_failed");
      }
      return;
    }

    res.redirect("/api/login");
    return;
  }

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);
  const displayName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || null;
  const { accountId, role } = await ensureAccountForUser(dbUser.id, displayName);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: buildSessionUser(dbUser, accountId, role),
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
