import { Router, type IRouter, type Request, type Response } from "express";
import twilio, { jwt } from "twilio";
import { db, interactionsTable, twilioNumbersTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateTwilioSignatureWithToken } from "../middlewares/twilioSignature";
import { processInteraction } from "../lib/processInteraction";
import { normalizePhoneE164, findOrCreateProspectShell } from "../lib/prospectShell";

const { AccessToken } = jwt;
const { VoiceGrant } = AccessToken;

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function twimlResponse(twiml = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`;
}

async function getAccountTwilioCreds(accountId: string): Promise<{
  sid: string;
  token: string;
  twilioApiKeySid: string | null;
  twilioApiKeySecret: string | null;
  twilioTwimlAppSid: string | null;
} | null> {
  const [account] = await db
    .select({
      twilioAccountSid: accountsTable.twilioAccountSid,
      twilioAuthToken: accountsTable.twilioAuthToken,
      twilioApiKeySid: accountsTable.twilioApiKeySid,
      twilioApiKeySecret: accountsTable.twilioApiKeySecret,
      twilioTwimlAppSid: accountsTable.twilioTwimlAppSid,
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
  return {
    sid,
    token,
    twilioApiKeySid: account?.twilioApiKeySid ?? null,
    twilioApiKeySecret: account?.twilioApiKeySecret ?? null,
    twilioTwimlAppSid: account?.twilioTwimlAppSid ?? null,
  };
}

async function resolveAuthTokenFromCallerId(req: Request): Promise<string | null> {
  const body = req.body as Record<string, string>;
  const callerId = body.CallerId ?? body.callerId ?? null;
  if (!callerId) {
    return process.env.TWILIO_AUTH_TOKEN ?? null;
  }

  try {
    const normalized = normalizePhoneE164(callerId);
    const [twilioNumber] = await db
      .select({ accountId: twilioNumbersTable.accountId })
      .from(twilioNumbersTable)
      .where(eq(twilioNumbersTable.phoneNumber, normalized))
      .limit(1);

    if (!twilioNumber) {
      return process.env.TWILIO_AUTH_TOKEN ?? null;
    }

    const creds = await getAccountTwilioCreds(twilioNumber.accountId);
    return creds?.token ?? process.env.TWILIO_AUTH_TOKEN ?? null;
  } catch {
    return process.env.TWILIO_AUTH_TOKEN ?? null;
  }
}

async function resolveAccountFromCallSid(
  callSid: string,
): Promise<{ accountId: string; token: string; sid: string } | null> {
  try {
    const [interaction] = await db
      .select({ accountId: interactionsTable.accountId })
      .from(interactionsTable)
      .where(eq(interactionsTable.twilioCallSid, callSid))
      .limit(1);

    if (!interaction) return null;

    const creds = await getAccountTwilioCreds(interaction.accountId);
    if (!creds) return null;
    return { accountId: interaction.accountId, token: creds.token, sid: creds.sid };
  } catch {
    return null;
  }
}

async function resolveAuthTokenFromCallSid(req: Request): Promise<string | null> {
  const body = req.body as Record<string, string>;
  const callSid = body.CallSid ?? null;
  if (!callSid) {
    return process.env.TWILIO_AUTH_TOKEN ?? null;
  }
  const account = await resolveAccountFromCallSid(callSid);
  return account?.token ?? process.env.TWILIO_AUTH_TOKEN ?? null;
}

async function resolveAuthTokenFromRecordingSid(req: Request): Promise<string | null> {
  const body = req.body as Record<string, string>;
  const callSid = body.CallSid ?? null;
  if (!callSid) {
    return process.env.TWILIO_AUTH_TOKEN ?? null;
  }
  const account = await resolveAccountFromCallSid(callSid);
  return account?.token ?? process.env.TWILIO_AUTH_TOKEN ?? null;
}

router.post("/voice/token", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const creds = await getAccountTwilioCreds(accountId);
  if (!creds) {
    res.status(503).json({
      error: "Twilio is not configured for this account. Add your Twilio credentials in Settings.",
    });
    return;
  }

  const apiKeySid = creds.twilioApiKeySid ?? process.env.TWILIO_API_KEY_SID ?? null;
  const apiKeySecret = creds.twilioApiKeySecret ?? process.env.TWILIO_API_KEY_SECRET ?? null;
  const twimlAppSid = creds.twilioTwimlAppSid ?? process.env.TWILIO_TWIML_APP_SID ?? null;

  if (!apiKeySid || !apiKeySecret || !twimlAppSid) {
    res.status(503).json({
      error:
        "Voice calling is not fully configured for this account. Add your API Key and TwiML App in Settings.",
    });
    return;
  }

  const identity = `user_${accountId.slice(0, 8)}`;

  try {
    const accessToken = new AccessToken(creds.sid, apiKeySid, apiKeySecret, {
      identity,
      ttl: 3600,
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    });

    accessToken.addGrant(voiceGrant);

    const token = accessToken.toJwt();
    res.json({ token, identity });
  } catch (err) {
    logger.error({ err, accountId }, "Failed to generate Twilio Voice access token");
    res.status(500).json({ error: "Failed to generate voice token" });
  }
});

router.post(
  "/webhooks/twilio/outbound-call",
  validateTwilioSignatureWithToken(resolveAuthTokenFromCallerId),
  async (req: Request, res: Response) => {
    const body = req.body as Record<string, string>;
    const To = body.To;
    const CallSid = body.CallSid;
    const CallerId = body.CallerId ?? body.callerId ?? null;
    const apiBase = process.env.API_BASE_URL ?? "";

    res.setHeader("Content-Type", "text/xml");

    if (!To) {
      logger.warn({ body }, "Outbound call TwiML request missing To");
      res.status(400).send(twimlResponse("<Hangup/>"));
      return;
    }

    if (!CallerId) {
      logger.warn({ body }, "Outbound call TwiML request missing CallerId param — cannot route call");
      res.status(400).send(twimlResponse("<Hangup/>"));
      return;
    }

    const recordingStatusCallback = `${apiBase}/api/webhooks/twilio/call-recording-status`;

    res.status(200).send(
      twimlResponse(
        `<Dial callerId="${CallerId}" record="record-from-ringing" recordingStatusCallback="${recordingStatusCallback}" recordingStatusCallbackMethod="POST">` +
          `<Number>${To}</Number>` +
          `</Dial>`,
      ),
    );

    setImmediate(async () => {
      try {
        if (!CallSid || !CallerId || !To) return;

        const fromNorm = normalizePhoneE164(CallerId);
        const toNorm = normalizePhoneE164(To);

        const [twilioNumber] = await db
          .select()
          .from(twilioNumbersTable)
          .where(eq(twilioNumbersTable.phoneNumber, fromNorm))
          .limit(1);

        if (!twilioNumber) {
          logger.warn({ CallerId: fromNorm }, "No Twilio number record found for outbound call");
          return;
        }

        const { id: prospectId, confidence } = await findOrCreateProspectShell(
          twilioNumber.accountId,
          toNorm,
          twilioNumber.propertyId ?? null,
        );

        await db
          .insert(interactionsTable)
          .values({
            accountId: twilioNumber.accountId,
            propertyId: twilioNumber.propertyId ?? null,
            prospectId,
            prospectMatchConfidence: confidence,
            sourceType: "call",
            direction: "outbound",
            twilioCallSid: CallSid,
            fromNumber: fromNorm,
            toNumber: toNorm,
            rawText: null,
            extractionStatus: "pending",
            occurredAt: new Date(),
          })
          .onConflictDoNothing();
      } catch (err) {
        logger.error({ err, CallSid }, "Error recording outbound call shell");
      }
    });
  },
);

router.post("/webhooks/twilio/outbound-call-complete", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twimlResponse());
});

router.post(
  "/webhooks/twilio/call-recording-status",
  validateTwilioSignatureWithToken(resolveAuthTokenFromRecordingSid),
  async (req: Request, res: Response) => {
    const {
      CallSid,
      RecordingSid,
      RecordingStatus,
      RecordingDuration,
    } = req.body as Record<string, string>;

    res.status(200).json({ received: true });

    setImmediate(async () => {
      try {
        if (!CallSid || RecordingStatus !== "completed") {
          logger.info({ CallSid, RecordingStatus }, "Recording status callback — not completed");
          return;
        }

        const [interaction] = await db
          .select()
          .from(interactionsTable)
          .where(eq(interactionsTable.twilioCallSid, CallSid))
          .limit(1);

        if (!interaction) {
          logger.warn({ CallSid }, "No interaction found for call recording status");
          return;
        }

        const durationText = RecordingDuration ? ` (${RecordingDuration}s)` : "";
        await db
          .update(interactionsTable)
          .set({
            sourceType: "call",
            rawText: `Outbound call recording available${durationText}`,
            extractionStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(interactionsTable.id, interaction.id));

        if (RecordingSid) {
          const creds = await getAccountTwilioCreds(interaction.accountId);
          if (creds) {
            const apiBase = process.env.API_BASE_URL ?? "";
            const transcriptionCallback = `${apiBase}/api/webhooks/twilio/call-transcription`;

            try {
              const client = twilio(creds.sid, creds.token);
              await client.recordings(RecordingSid).transcriptions.create({
                transcribeCallback: transcriptionCallback,
              });
              logger.info({ CallSid, RecordingSid }, "Transcription requested via REST API");
            } catch (transcribeErr) {
              logger.error({ err: transcribeErr, CallSid, RecordingSid }, "Failed to request transcription via REST API");
            }
          } else {
            logger.warn({ CallSid }, "No Twilio creds available to request transcription");
          }
        }

        logger.info({ CallSid }, "Outbound call recording status processed");
      } catch (err) {
        logger.error({ err, CallSid }, "Error processing call recording status callback");
      }
    });
  },
);

router.post(
  "/webhooks/twilio/call-transcription",
  validateTwilioSignatureWithToken(resolveAuthTokenFromCallSid),
  async (req: Request, res: Response) => {
    const { CallSid, TranscriptionText, TranscriptionStatus } = req.body as Record<string, string>;

    res.status(200).json({ received: true });

    setImmediate(async () => {
      try {
        if (!CallSid || TranscriptionStatus !== "completed" || !TranscriptionText) return;

        const [interaction] = await db
          .select()
          .from(interactionsTable)
          .where(eq(interactionsTable.twilioCallSid, CallSid))
          .limit(1);

        if (interaction) {
          await db
            .update(interactionsTable)
            .set({
              transcript: TranscriptionText,
              rawText: null,
              sourceType: "call",
              extractionStatus: "pending",
              updatedAt: new Date(),
            })
            .where(eq(interactionsTable.id, interaction.id));

          await processInteraction(interaction.id);
          logger.info({ CallSid }, "Outbound call transcription processed");
        } else {
          logger.warn({ CallSid }, "No interaction found for call transcription callback");
        }
      } catch (err) {
        logger.error({ err, CallSid }, "Error processing call transcription");
      }
    });
  },
);

export default router;
