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

function buildAccountSettingsResponse(account: {
  id: string;
  name: string;
  plan: string;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioApiKeySid: string | null;
  twilioApiKeySecret: string | null;
  twilioTwimlAppSid: string | null;
  aiAssistEnabled: boolean;
}) {
  return {
    id: account.id,
    name: account.name,
    plan: account.plan,
    twilioConfigured: !!(account.twilioAccountSid && account.twilioAuthToken),
    twilioAccountSid: account.twilioAccountSid ?? null,
    twilioAuthTokenMasked: maskToken(account.twilioAuthToken),
    twilioVoiceConfigured: !!(
      account.twilioApiKeySid &&
      account.twilioApiKeySecret &&
      account.twilioTwimlAppSid
    ),
    twilioApiKeySid: account.twilioApiKeySid ?? null,
    twilioApiKeySecretMasked: maskToken(account.twilioApiKeySecret),
    twilioTwimlAppSid: account.twilioTwimlAppSid ?? null,
    aiAssistEnabled: account.aiAssistEnabled ?? false,
  };
}

const ACCOUNT_SELECT_FIELDS = {
  id: accountsTable.id,
  name: accountsTable.name,
  plan: accountsTable.plan,
  twilioAccountSid: accountsTable.twilioAccountSid,
  twilioAuthToken: accountsTable.twilioAuthToken,
  twilioApiKeySid: accountsTable.twilioApiKeySid,
  twilioApiKeySecret: accountsTable.twilioApiKeySecret,
  twilioTwimlAppSid: accountsTable.twilioTwimlAppSid,
  aiAssistEnabled: accountsTable.aiAssistEnabled,
} as const;

router.get("/settings/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const [account] = await db
    .select(ACCOUNT_SELECT_FIELDS)
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(buildAccountSettingsResponse(account));
});

router.put("/settings/account", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const {
    twilioAccountSid,
    twilioAuthToken,
    twilioApiKeySid,
    twilioApiKeySecret,
    twilioTwimlAppSid,
    aiAssistEnabled,
  } = req.body as {
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioApiKeySid?: string | null;
    twilioApiKeySecret?: string | null;
    twilioTwimlAppSid?: string | null;
    aiAssistEnabled?: boolean;
  };

  const incomingSid = twilioAccountSid !== undefined ? (twilioAccountSid?.trim() || null) : undefined;
  const incomingToken = twilioAuthToken !== undefined ? (twilioAuthToken?.trim() || null) : undefined;

  const settingEither = incomingSid !== undefined || incomingToken !== undefined;
  if (settingEither) {
    const bothPresent = incomingSid !== null && incomingToken !== null;
    const bothAbsent = incomingSid === null && incomingToken === null;
    if (!bothPresent && !bothAbsent) {
      res.status(400).json({
        error: "twilioAccountSid and twilioAuthToken must be provided together, or both cleared together",
      });
      return;
    }
  }

  const incomingApiKeySid = twilioApiKeySid !== undefined ? (twilioApiKeySid?.trim() || null) : undefined;
  const incomingApiKeySecret = twilioApiKeySecret !== undefined ? (twilioApiKeySecret?.trim() || null) : undefined;
  const incomingTwimlAppSid = twilioTwimlAppSid !== undefined ? (twilioTwimlAppSid?.trim() || null) : undefined;

  if (incomingApiKeySid !== undefined && incomingApiKeySid !== null && !incomingApiKeySid.startsWith("SK")) {
    res.status(400).json({ error: "twilioApiKeySid must start with 'SK'" });
    return;
  }
  if (incomingTwimlAppSid !== undefined && incomingTwimlAppSid !== null && !incomingTwimlAppSid.startsWith("AP")) {
    res.status(400).json({ error: "twilioTwimlAppSid must start with 'AP'" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (incomingSid !== undefined) updates.twilioAccountSid = incomingSid;
  if (incomingToken !== undefined) updates.twilioAuthToken = incomingToken;
  if (incomingApiKeySid !== undefined) updates.twilioApiKeySid = incomingApiKeySid;
  if (incomingApiKeySecret !== undefined) updates.twilioApiKeySecret = incomingApiKeySecret;
  if (incomingTwimlAppSid !== undefined) updates.twilioTwimlAppSid = incomingTwimlAppSid;
  if (aiAssistEnabled !== undefined) updates.aiAssistEnabled = aiAssistEnabled;

  const [account] = await db
    .update(accountsTable)
    .set(updates)
    .where(eq(accountsTable.id, accountId))
    .returning(ACCOUNT_SELECT_FIELDS);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  logger.info({ accountId }, "Account settings updated");

  res.json(buildAccountSettingsResponse(account));
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
