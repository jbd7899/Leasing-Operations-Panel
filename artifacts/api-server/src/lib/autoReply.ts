import { db, accountsTable, prospectsTable, propertiesTable, interactionsTable, twilioNumbersTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { getTwilioClientForAccount } from "../routes/settings";
import { logger } from "./logger";
import { logEvent } from "./logEvent";

type TwilioNumberRecord = typeof twilioNumbersTable.$inferSelect;

function isOutsideBusinessHours(
  businessHoursStart: string,
  businessHoursEnd: string,
  businessTimezone: string,
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: businessTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const currentMinutes = hour * 60 + minute;

  const [startH, startM] = businessHoursStart.split(":").map(Number);
  const [endH, endM] = businessHoursEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes < startMinutes || currentMinutes >= endMinutes;
}

export async function shouldAutoReply(
  accountId: string,
  twilioNumber: TwilioNumberRecord,
): Promise<boolean> {
  // Check per-number override first
  if (twilioNumber.autoReplyEnabled === false) return false;

  const [account] = await db
    .select({
      autoReplyEnabled: accountsTable.autoReplyEnabled,
      autoReplyAfterHoursOnly: accountsTable.autoReplyAfterHoursOnly,
      businessHoursStart: accountsTable.businessHoursStart,
      businessHoursEnd: accountsTable.businessHoursEnd,
      businessTimezone: accountsTable.businessTimezone,
    })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  if (!account) return false;

  // Per-number override: true = always on, null = use account setting
  const enabled = twilioNumber.autoReplyEnabled === true ? true : account.autoReplyEnabled;
  if (!enabled) return false;

  // If after-hours only, check business hours
  if (account.autoReplyAfterHoursOnly) {
    try {
      if (!isOutsideBusinessHours(account.businessHoursStart, account.businessHoursEnd, account.businessTimezone)) {
        return false;
      }
    } catch {
      logger.warn({ accountId }, "Invalid business timezone — skipping time check, allowing auto-reply");
    }
  }

  return true;
}

export async function sendAutoReply(
  accountId: string,
  prospectId: string,
  fromTwilioNumber: string,
  toPhone: string,
): Promise<void> {
  // Rate limit: 1 auto-reply per prospect per 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentAutoReply] = await db
    .select({ id: interactionsTable.id })
    .from(interactionsTable)
    .where(
      and(
        eq(interactionsTable.prospectId, prospectId),
        eq(interactionsTable.direction, "outbound"),
        eq(interactionsTable.category, "auto_reply"),
        gte(interactionsTable.occurredAt, oneDayAgo),
      ),
    )
    .limit(1);

  if (recentAutoReply) {
    logger.info({ prospectId }, "Auto-reply skipped — already sent within 24h");
    return;
  }

  // Fetch account auto-reply message template
  const [account] = await db
    .select({ autoReplyMessage: accountsTable.autoReplyMessage })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  const template = account?.autoReplyMessage ?? "Hi! Thanks for reaching out. We'll get back to you shortly.";

  // Fetch prospect name
  const [prospect] = await db
    .select({ firstName: prospectsTable.firstName, fullName: prospectsTable.fullName })
    .from(prospectsTable)
    .where(eq(prospectsTable.id, prospectId));

  // Fetch property name from twilio number
  const [twilioNum] = await db
    .select({ propertyId: twilioNumbersTable.propertyId })
    .from(twilioNumbersTable)
    .where(eq(twilioNumbersTable.phoneNumber, fromTwilioNumber));

  let propertyName = "our property";
  if (twilioNum?.propertyId) {
    const [property] = await db
      .select({ name: propertiesTable.name })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, twilioNum.propertyId));
    if (property?.name) propertyName = property.name;
  }

  // Interpolate template
  const message = template
    .replace(/\{firstName\}/g, prospect?.firstName ?? "there")
    .replace(/\{fullName\}/g, prospect?.fullName ?? "there")
    .replace(/\{propertyName\}/g, propertyName);

  // Send via Twilio
  const client = await getTwilioClientForAccount(accountId);
  if (!client) {
    logger.warn({ accountId }, "Auto-reply skipped — no Twilio client");
    return;
  }

  try {
    const sent = await client.messages.create({
      body: message,
      from: fromTwilioNumber,
      to: toPhone,
    });

    const threadKey = [fromTwilioNumber, toPhone].sort().join("|");

    await db.insert(interactionsTable).values({
      accountId,
      prospectId,
      propertyId: twilioNum?.propertyId ?? null,
      sourceType: "sms",
      direction: "outbound",
      twilioMessageSid: sent.sid,
      fromNumber: fromTwilioNumber,
      toNumber: toPhone,
      rawText: message,
      summary: message,
      category: "auto_reply",
      parentThreadKey: threadKey,
      extractionStatus: "skipped",
      occurredAt: new Date(),
    });

    // Update lastOutboundAt
    await db
      .update(prospectsTable)
      .set({ lastOutboundAt: new Date() })
      .where(eq(prospectsTable.id, prospectId));

    logEvent({
      accountId,
      prospectId,
      propertyId: twilioNum?.propertyId ?? null,
      eventType: "automation",
      eventName: "auto_reply_sent",
      sourceLayer: "webhook",
      metadataJson: { messageSid: sent.sid, to: toPhone },
    });

    logger.info({ prospectId, to: toPhone }, "Auto-reply sent");
  } catch (err) {
    logger.error({ err, prospectId }, "Failed to send auto-reply");
  }
}
