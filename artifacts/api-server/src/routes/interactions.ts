import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable, twilioNumbersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

router.get("/interactions/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { id } = req.params;
  const [interaction] = await db
    .select()
    .from(interactionsTable)
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)));

  if (!interaction) { res.status(404).json({ error: "Not found" }); return; }
  res.json(interaction);
});

router.patch("/interactions/:id/review", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { id } = req.params;
  const { summary, category, propertyId, prospectId, structuredExtractionJson } = req.body;

  if (propertyId !== undefined) {
    const [property] = await db.select({ id: propertiesTable.id })
      .from(propertiesTable)
      .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.accountId, accountId)));
    if (!property) {
      res.status(400).json({ error: "propertyId does not belong to this account" });
      return;
    }
  }

  if (prospectId !== undefined) {
    const [prospect] = await db.select({ id: prospectsTable.id })
      .from(prospectsTable)
      .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));
    if (!prospect) {
      res.status(400).json({ error: "prospectId does not belong to this account" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (summary !== undefined) updates.summary = summary;
  if (category !== undefined) updates.category = category;
  if (propertyId !== undefined) updates.propertyId = propertyId;
  if (prospectId !== undefined) updates.prospectId = prospectId;
  if (structuredExtractionJson !== undefined) updates.structuredExtractionJson = structuredExtractionJson;

  const [interaction] = await db
    .update(interactionsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)))
    .returning();

  if (!interaction) { res.status(404).json({ error: "Not found" }); return; }

  if (interaction.prospectId && interaction.summary) {
    await db.update(prospectsTable)
      .set({ latestSummary: interaction.summary, latestSentiment: interaction.sentiment ?? undefined, updatedAt: new Date() })
      .where(and(eq(prospectsTable.id, interaction.prospectId), eq(prospectsTable.accountId, accountId)));
  }

  res.json(interaction);
});

router.post("/interactions/send-sms", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { prospectId, body, fromTwilioNumberId } = req.body as {
    prospectId: string;
    body: string;
    fromTwilioNumberId?: string;
  };

  if (!prospectId) { res.status(400).json({ error: "prospectId is required" }); return; }
  if (!body || !body.trim()) { res.status(400).json({ error: "body is required" }); return; }

  const [prospect] = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));
  if (!prospect) { res.status(404).json({ error: "Prospect not found" }); return; }
  if (!prospect.phonePrimary) { res.status(400).json({ error: "Prospect has no phone number" }); return; }

  let twilioNumber;
  if (fromTwilioNumberId) {
    const [found] = await db
      .select()
      .from(twilioNumbersTable)
      .where(and(eq(twilioNumbersTable.id, fromTwilioNumberId), eq(twilioNumbersTable.accountId, accountId)));
    if (!found) { res.status(400).json({ error: "Twilio number not found" }); return; }
    twilioNumber = found;
  } else {
    const numbers = await db
      .select()
      .from(twilioNumbersTable)
      .where(and(eq(twilioNumbersTable.accountId, accountId), eq(twilioNumbersTable.isActive, true)));
    if (numbers.length === 0) {
      res.status(422).json({ error: "No active Twilio numbers configured for this account. Add a Twilio number in Settings." });
      return;
    }
    twilioNumber = numbers[0];
  }

  const client = getTwilioClient();
  if (!client) {
    res.status(503).json({ error: "Twilio is not configured on this server. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN." });
    return;
  }

  let twilioMessageSid: string | undefined;
  try {
    const message = await client.messages.create({
      body: body.trim(),
      from: twilioNumber.phoneNumber,
      to: prospect.phonePrimary,
    });
    twilioMessageSid = message.sid;
    logger.info({ sid: message.sid, to: prospect.phonePrimary }, "Outbound SMS sent via Twilio");
  } catch (err) {
    logger.error({ err }, "Failed to send outbound SMS via Twilio");
    res.status(502).json({ error: `Failed to send SMS: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  const [interaction] = await db
    .insert(interactionsTable)
    .values({
      accountId,
      prospectId,
      propertyId: prospect.assignedPropertyId ?? null,
      sourceType: "sms",
      direction: "outbound",
      twilioMessageSid,
      fromNumber: twilioNumber.phoneNumber,
      toNumber: prospect.phonePrimary,
      rawText: body.trim(),
      summary: body.trim(),
      category: "general_question",
      extractionStatus: "skipped",
      occurredAt: new Date(),
    })
    .returning();

  res.status(201).json(interaction);
});

export default router;
