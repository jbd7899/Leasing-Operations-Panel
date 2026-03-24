import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, twilioNumbersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processInteraction } from "../lib/processInteraction";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function twilioXmlResponse(twiml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`;
}

async function findTwilioNumber(toNumber: string) {
  const [record] = await db
    .select()
    .from(twilioNumbersTable)
    .where(eq(twilioNumbersTable.phoneNumber, toNumber))
    .limit(1);
  return record ?? null;
}

router.post("/webhooks/twilio/sms", async (req: Request, res: Response) => {
  const {
    MessageSid,
    From,
    To,
    Body,
    NumMedia,
  } = req.body;

  if (!MessageSid || !From || !To) {
    res.status(400).send(twilioXmlResponse(""));
    return;
  }

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twilioXmlResponse(""));

  setImmediate(async () => {
    try {
      const twilioNumber = await findTwilioNumber(To);
      if (!twilioNumber) {
        logger.warn({ To }, "No Twilio number record found for incoming SMS");
        return;
      }

      const [interaction] = await db.insert(interactionsTable).values({
        accountId: twilioNumber.accountId,
        propertyId: twilioNumber.propertyId ?? null,
        sourceType: "sms",
        direction: "inbound",
        twilioMessageSid: MessageSid,
        fromNumber: From,
        toNumber: To,
        rawText: Body ?? null,
        extractionStatus: "pending",
        occurredAt: new Date(),
      }).onConflictDoNothing().returning();

      if (interaction) {
        await processInteraction(interaction.id);
      }
    } catch (err) {
      logger.error({ err, MessageSid }, "Error processing incoming SMS webhook");
    }
  });
});

router.post("/webhooks/twilio/voice", async (req: Request, res: Response) => {
  const { CallSid, From, To } = req.body;

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twilioXmlResponse(
    `<Say>Thank you for calling. Please leave a message after the tone and we will get back to you shortly.</Say>` +
    `<Record maxLength="120" transcribe="true" transcribeCallback="${process.env.API_BASE_URL ?? ""}/api/webhooks/twilio/voicemail-transcript" action="/api/webhooks/twilio/voice-complete" />`
  ));

  setImmediate(async () => {
    try {
      if (!CallSid || !From || !To) return;
      const twilioNumber = await findTwilioNumber(To);
      if (!twilioNumber) {
        logger.warn({ To }, "No Twilio number record found for incoming voice call");
        return;
      }

      await db.insert(interactionsTable).values({
        accountId: twilioNumber.accountId,
        propertyId: twilioNumber.propertyId ?? null,
        sourceType: "voice",
        direction: "inbound",
        twilioCallSid: CallSid,
        fromNumber: From,
        toNumber: To,
        extractionStatus: "pending",
        occurredAt: new Date(),
      }).onConflictDoNothing();
    } catch (err) {
      logger.error({ err, CallSid }, "Error recording voice call");
    }
  });
});

router.post("/webhooks/twilio/voice-complete", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twilioXmlResponse("<Hangup/>"));
});

router.post("/webhooks/twilio/voicemail-transcript", async (req: Request, res: Response) => {
  const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;

  res.status(200).json({ received: true });

  setImmediate(async () => {
    try {
      if (!CallSid || TranscriptionStatus !== "completed" || !TranscriptionText) return;

      const existingInteractions = await db.select()
        .from(interactionsTable)
        .where(eq(interactionsTable.twilioCallSid, CallSid))
        .limit(1);

      if (existingInteractions.length > 0) {
        const interaction = existingInteractions[0];
        await db.update(interactionsTable)
          .set({
            transcript: TranscriptionText,
            sourceType: "voicemail",
            extractionStatus: "pending",
            updatedAt: new Date(),
          })
          .where(eq(interactionsTable.id, interaction.id));

        await processInteraction(interaction.id);
      }
    } catch (err) {
      logger.error({ err, CallSid }, "Error processing voicemail transcript");
    }
  });
});

export default router;
