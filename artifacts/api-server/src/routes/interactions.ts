import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable, twilioNumbersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { processInteraction } from "../lib/processInteraction";
import { logEvent } from "../lib/logEvent";
import { normalizePhoneE164, findOrCreateProspectShell } from "../lib/prospectShell";
import { getTwilioClientForAccount } from "./settings";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
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

  logEvent({
    accountId,
    eventType: "user_review",
    eventName: "interaction_opened",
    interactionId: id as string,
    prospectId: interaction.prospectId ?? undefined,
    propertyId: interaction.propertyId ?? undefined,
    metadataJson: { extractionStatus: interaction.extractionStatus, sourceType: interaction.sourceType },
  });

  res.json(interaction);
});

router.patch("/interactions/:id/review", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const reviewUser = req.user! as typeof req.user & { id: string };
  const { accountId } = reviewUser;
  const userId = reviewUser.id;

  const { id } = req.params;
  const { summary, category, propertyId, prospectId, structuredExtractionJson } = req.body;

  const [before] = await db.select().from(interactionsTable)
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)));
  if (!before) { res.status(404).json({ error: "Not found" }); return; }

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

  logEvent({
    accountId,
    userId,
    prospectId: interaction.prospectId,
    interactionId: interaction.id,
    propertyId: interaction.propertyId,
    eventType: "user_review",
    eventName: "review_completed",
    sourceLayer: "api",
    previousStateJson: {
      summary: before.summary,
      category: before.category,
      propertyId: before.propertyId,
      prospectId: before.prospectId,
    },
    newStateJson: {
      summary: interaction.summary,
      category: interaction.category,
      propertyId: interaction.propertyId,
      prospectId: interaction.prospectId,
    },
    metadataJson: {
      summaryEdited: summary !== undefined && summary !== before.summary,
      categoryEdited: category !== undefined && category !== before.category,
      propertyAssigned: propertyId !== undefined,
      prospectLinked: prospectId !== undefined,
      structuredFieldsEdited: structuredExtractionJson !== undefined,
    },
  });

  if (structuredExtractionJson !== undefined && before.structuredExtractionJson) {
    const aiFields = before.structuredExtractionJson as Record<string, unknown>;
    const humanFields = structuredExtractionJson as Record<string, unknown>;
    for (const field of Object.keys(humanFields)) {
      const aiVal = aiFields[field];
      const humanVal = humanFields[field];
      if (String(aiVal ?? "") !== String(humanVal ?? "") && humanVal != null) {
        logEvent({
          accountId,
          userId,
          prospectId: interaction.prospectId,
          interactionId: interaction.id,
          propertyId: interaction.propertyId,
          eventType: "user_review",
          eventName: "field_edited",
          sourceLayer: "api",
          previousStateJson: { field, aiValue: aiVal },
          newStateJson: { field, humanValue: humanVal },
          aiContextJson: { confidence: aiFields["confidence"] ?? null },
        });
      }
    }
  }

  if (interaction.prospectId && interaction.summary) {
    await db.update(prospectsTable)
      .set({ latestSummary: interaction.summary, latestSentiment: interaction.sentiment ?? undefined, updatedAt: new Date() })
      .where(and(eq(prospectsTable.id, interaction.prospectId), eq(prospectsTable.accountId, accountId)));
  }

  res.json(interaction);
});

router.post("/interactions/initiate-sms", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { toPhone, body, fromTwilioNumberId } = req.body as {
    toPhone: string;
    body: string;
    fromTwilioNumberId?: string;
  };

  if (!toPhone || !toPhone.trim()) { res.status(400).json({ error: "toPhone is required" }); return; }
  if (!body || !body.trim()) { res.status(400).json({ error: "body is required" }); return; }

  const digits = toPhone.replace(/\D/g, "");
  const looksLikeValidPhone =
    digits.length === 10 ||
    (digits.length === 11 && digits[0] === "1") ||
    toPhone.trim().startsWith("+");

  if (!looksLikeValidPhone) {
    res.status(400).json({ error: "Invalid phone number format. Use 10-digit US number or E.164 format." });
    return;
  }

  const normalizedPhone = normalizePhoneE164(toPhone.trim());

  let twilioNumber;
  if (fromTwilioNumberId) {
    const [found] = await db
      .select()
      .from(twilioNumbersTable)
      .where(and(
        eq(twilioNumbersTable.id, fromTwilioNumberId),
        eq(twilioNumbersTable.accountId, accountId),
        eq(twilioNumbersTable.isActive, true),
      ));
    if (!found) { res.status(400).json({ error: "Twilio number not found or is not active" }); return; }
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

  const { id: prospectId, confidence: prospectMatchConfidence } = await findOrCreateProspectShell(
    accountId,
    normalizedPhone,
    twilioNumber.propertyId ?? null,
  );

  const [prospect] = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)))
    .limit(1);

  const client = await getTwilioClientForAccount(accountId);
  if (!client) {
    res.status(503).json({ error: "Twilio is not configured for this account. Add your Twilio Account SID and Auth Token in Settings → Integrations." });
    return;
  }

  let twilioMessageSid: string | undefined;
  try {
    const message = await client.messages.create({
      body: body.trim(),
      from: twilioNumber.phoneNumber,
      to: normalizedPhone,
    });
    twilioMessageSid = message.sid;
    logger.info({ sid: message.sid, to: normalizedPhone }, "Outbound initiate SMS sent via Twilio");
  } catch (err) {
    logger.error({ err }, "Failed to send outbound initiate SMS via Twilio");
    res.status(502).json({ error: `Failed to send SMS: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  const [interaction] = await db
    .insert(interactionsTable)
    .values({
      accountId,
      prospectId,
      propertyId: prospect?.assignedPropertyId ?? null,
      prospectMatchConfidence,
      sourceType: "sms",
      direction: "outbound",
      twilioMessageSid,
      fromNumber: twilioNumber.phoneNumber,
      toNumber: normalizedPhone,
      rawText: body.trim(),
      extractionStatus: "pending",
      occurredAt: new Date(),
    })
    .returning();

  setImmediate(async () => {
    try {
      await processInteraction(interaction.id);
    } catch (err) {
      logger.error({ err, interactionId: interaction.id }, "Failed to process outbound initiate SMS interaction");
    }
  });

  res.status(201).json({ interaction, prospect });
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
      .where(and(
        eq(twilioNumbersTable.id, fromTwilioNumberId),
        eq(twilioNumbersTable.accountId, accountId),
        eq(twilioNumbersTable.isActive, true),
      ));
    if (!found) { res.status(400).json({ error: "Twilio number not found or is not active" }); return; }
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

  const client = await getTwilioClientForAccount(accountId);
  if (!client) {
    res.status(503).json({ error: "Twilio is not configured for this account. Add your Twilio Account SID and Auth Token in Settings → Integrations." });
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

router.post("/interactions/ai-draft", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { prospectId } = req.body as { prospectId: string };

  if (!prospectId) {
    res.status(400).json({ error: "prospectId is required" });
    return;
  }

  const [prospect] = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));

  if (!prospect) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }

  const recentInbound = await db
    .select({ rawText: interactionsTable.rawText, sourceType: interactionsTable.sourceType })
    .from(interactionsTable)
    .where(
      and(
        eq(interactionsTable.prospectId, prospectId),
        eq(interactionsTable.accountId, accountId),
        eq(interactionsTable.direction, "inbound"),
      ),
    )
    .orderBy(desc(interactionsTable.occurredAt))
    .limit(3);

  const lastMessage = recentInbound[0]?.rawText ?? null;

  if (!lastMessage) {
    res.status(200).json({ draft: "" });
    return;
  }

  const prospectContext = [
    prospect.fullName ? `Prospect name: ${prospect.fullName}` : null,
    prospect.desiredBedrooms ? `Bedrooms desired: ${prospect.desiredBedrooms}` : null,
    prospect.desiredMoveInDate ? `Move-in date: ${prospect.desiredMoveInDate}` : null,
    prospect.budgetMax ? `Budget: up to $${prospect.budgetMax}/mo` : null,
    prospect.latestSummary ? `Summary: ${prospect.latestSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are a helpful leasing agent assistant. Draft a short, professional, and friendly SMS reply to a prospective renter. The reply should directly address their most recent message. Keep it concise (2-4 sentences). Do not use formal salutations or signatures. Respond with only the SMS text — no explanation, no quotes.`;

  const userPrompt = `${prospectContext ? `Prospect context:\n${prospectContext}\n\n` : ""}Most recent message from prospect:\n"${lastMessage}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const draft = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ draft });
  } catch (err) {
    logger.error({ err, prospectId }, "Failed to generate AI draft reply");
    res.status(500).json({ error: "Failed to generate draft. Please try again." });
  }
});

export default router;
