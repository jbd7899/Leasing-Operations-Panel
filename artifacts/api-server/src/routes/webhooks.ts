import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, twilioNumbersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processInteraction } from "../lib/processInteraction";
import { logger } from "../lib/logger";
import { validateTwilioSignature } from "../middlewares/twilioSignature";
import { normalizePhoneE164, findOrCreateProspectShell } from "../lib/prospectShell";

const router: IRouter = Router();

function twimlResponse(twiml = ""): string {
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


router.post(
  "/webhooks/twilio/sms",
  validateTwilioSignature,
  async (req: Request, res: Response) => {
    const { MessageSid, From, To, Body } = req.body as Record<string, string>;

    if (!MessageSid || !From || !To) {
      res.setHeader("Content-Type", "text/xml");
      res.status(400).send(twimlResponse());
      return;
    }

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(twimlResponse());

    setImmediate(async () => {
      try {
        const fromNorm = normalizePhoneE164(From);
        const toNorm = normalizePhoneE164(To);

        const twilioNumber = await findTwilioNumber(toNorm);
        if (!twilioNumber) {
          logger.warn({ To: toNorm }, "No Twilio number record found for incoming SMS");
          return;
        }

        const { id: prospectId, confidence } = await findOrCreateProspectShell(
          twilioNumber.accountId,
          fromNorm,
          twilioNumber.propertyId ?? null,
        );

        const [interaction] = await db
          .insert(interactionsTable)
          .values({
            accountId: twilioNumber.accountId,
            propertyId: twilioNumber.propertyId ?? null,
            prospectId,
            prospectMatchConfidence: confidence,
            sourceType: "sms",
            direction: "inbound",
            twilioMessageSid: MessageSid,
            fromNumber: fromNorm,
            toNumber: toNorm,
            rawText: Body ?? null,
            extractionStatus: "pending",
            occurredAt: new Date(),
          })
          .onConflictDoNothing()
          .returning();

        if (interaction) {
          await processInteraction(interaction.id);
        } else {
          logger.info({ MessageSid }, "Duplicate SMS webhook — ignoring");
        }
      } catch (err) {
        logger.error({ err, MessageSid }, "Error processing incoming SMS webhook");
      }
    });
  },
);

router.post(
  "/webhooks/twilio/voice",
  validateTwilioSignature,
  async (req: Request, res: Response) => {
    const { CallSid, From, To, CallStatus, Duration } = req.body as Record<string, string>;

    const apiBase = process.env.API_BASE_URL ?? "";
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(
      twimlResponse(
        `<Say>Thank you for calling. Please leave a message after the tone and we will get back to you shortly.</Say>` +
          `<Record maxLength="120" transcribe="true" transcribeCallback="${apiBase}/api/webhooks/twilio/voicemail-transcript" action="${apiBase}/api/webhooks/twilio/voice-complete" />`,
      ),
    );

    setImmediate(async () => {
      try {
        if (!CallSid || !From || !To) return;

        const fromNorm = normalizePhoneE164(From);
        const toNorm = normalizePhoneE164(To);

        const twilioNumber = await findTwilioNumber(toNorm);
        if (!twilioNumber) {
          logger.warn({ To: toNorm }, "No Twilio number record found for incoming voice call");
          return;
        }

        const { id: prospectId, confidence } = await findOrCreateProspectShell(
          twilioNumber.accountId,
          fromNorm,
          twilioNumber.propertyId ?? null,
        );

        await db
          .insert(interactionsTable)
          .values({
            accountId: twilioNumber.accountId,
            propertyId: twilioNumber.propertyId ?? null,
            prospectId,
            prospectMatchConfidence: confidence,
            sourceType: "voice",
            direction: "inbound",
            twilioCallSid: CallSid,
            fromNumber: fromNorm,
            toNumber: toNorm,
            rawText: CallStatus ? `Call status: ${CallStatus}${Duration ? `, duration: ${Duration}s` : ""}` : null,
            extractionStatus: "pending",
            occurredAt: new Date(),
          })
          .onConflictDoNothing();
      } catch (err) {
        logger.error({ err, CallSid }, "Error recording voice call");
      }
    });
  },
);

router.post("/webhooks/twilio/voice-complete", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twimlResponse("<Hangup/>"));
});

router.post(
  "/webhooks/twilio/voicemail-transcript",
  validateTwilioSignature,
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
              sourceType: "voicemail",
              extractionStatus: "pending",
              updatedAt: new Date(),
            })
            .where(eq(interactionsTable.id, interaction.id));

          await processInteraction(interaction.id);
        } else {
          logger.warn({ CallSid }, "No interaction found for voicemail transcript");
        }
      } catch (err) {
        logger.error({ err, CallSid }, "Error processing voicemail transcript");
      }
    });
  },
);

export default router;
