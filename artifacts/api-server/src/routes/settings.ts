import { Router, type IRouter, type Request, type Response } from "express";
import { db, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import twilio from "twilio";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (token.length <= 8) return "••••••••";
  return token.slice(0, 4) + "••••••••••••" + token.slice(-4);
}

router.get("/settings/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const [account] = await db
    .select({
      id: accountsTable.id,
      name: accountsTable.name,
      plan: accountsTable.plan,
      twilioAccountSid: accountsTable.twilioAccountSid,
      twilioAuthToken: accountsTable.twilioAuthToken,
      aiAssistEnabled: accountsTable.aiAssistEnabled,
    })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json({
    id: account.id,
    name: account.name,
    plan: account.plan,
    twilioConfigured: !!(account.twilioAccountSid && account.twilioAuthToken),
    twilioAccountSid: account.twilioAccountSid ?? null,
    twilioAuthTokenMasked: maskToken(account.twilioAuthToken),
    aiAssistEnabled: account.aiAssistEnabled ?? false,
  });
});

router.put("/settings/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { twilioAccountSid, twilioAuthToken, aiAssistEnabled } = req.body as {
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    aiAssistEnabled?: boolean;
  };

  const incomingSid = twilioAccountSid !== undefined ? (twilioAccountSid?.trim() || null) : undefined;
  const incomingToken = twilioAuthToken !== undefined ? (twilioAuthToken?.trim() || null) : undefined;

  const settingEither = incomingSid !== undefined || incomingToken !== undefined;
  if (settingEither) {
    const bothPresent = (incomingSid !== null && incomingToken !== null);
    const bothAbsent = (incomingSid === null && incomingToken === null);
    if (!bothPresent && !bothAbsent) {
      res.status(400).json({ error: "twilioAccountSid and twilioAuthToken must be provided together, or both cleared together" });
      return;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (incomingSid !== undefined) {
    updates.twilioAccountSid = incomingSid;
  }
  if (incomingToken !== undefined) {
    updates.twilioAuthToken = incomingToken;
  }
  if (aiAssistEnabled !== undefined) {
    updates.aiAssistEnabled = aiAssistEnabled;
  }

  const [account] = await db
    .update(accountsTable)
    .set(updates)
    .where(eq(accountsTable.id, accountId))
    .returning({
      id: accountsTable.id,
      name: accountsTable.name,
      plan: accountsTable.plan,
      twilioAccountSid: accountsTable.twilioAccountSid,
      twilioAuthToken: accountsTable.twilioAuthToken,
      aiAssistEnabled: accountsTable.aiAssistEnabled,
    });

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  logger.info({ accountId }, "Account settings updated");

  res.json({
    id: account.id,
    name: account.name,
    plan: account.plan,
    twilioConfigured: !!(account.twilioAccountSid && account.twilioAuthToken),
    twilioAccountSid: account.twilioAccountSid ?? null,
    twilioAuthTokenMasked: maskToken(account.twilioAuthToken),
    aiAssistEnabled: account.aiAssistEnabled ?? false,
  });
});

router.post("/settings/account/test-twilio", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { twilioAccountSid, twilioAuthToken } = req.body as {
    twilioAccountSid?: string;
    twilioAuthToken?: string;
  };

  const sid = twilioAccountSid?.trim();
  const token = twilioAuthToken?.trim();

  if (!sid || !token) {
    res.status(400).json({ error: "twilioAccountSid and twilioAuthToken are required" });
    return;
  }

  try {
    const client = twilio(sid, token);
    const account = await client.api.accounts(sid).fetch();
    res.json({
      ok: true,
      accountFriendlyName: account.friendlyName ?? null,
    });
  } catch (err) {
    logger.warn({ accountId, err }, "Twilio credential test failed");
    const msg = err instanceof Error ? err.message : String(err);
    res.status(200).json({ ok: false, error: msg });
  }
});

export async function getTwilioClientForAccount(accountId: string): Promise<ReturnType<typeof twilio> | null> {
  const [account] = await db
    .select({
      twilioAccountSid: accountsTable.twilioAccountSid,
      twilioAuthToken: accountsTable.twilioAuthToken,
    })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  const dbSid = account?.twilioAccountSid ?? null;
  const dbToken = account?.twilioAuthToken ?? null;

  let sid: string | null;
  let token: string | null;

  if (dbSid || dbToken) {
    sid = dbSid;
    token = dbToken;
  } else {
    sid = process.env.TWILIO_ACCOUNT_SID ?? null;
    token = process.env.TWILIO_AUTH_TOKEN ?? null;
  }

  if (!sid || !token) return null;
  return twilio(sid, token);
}

export default router;
