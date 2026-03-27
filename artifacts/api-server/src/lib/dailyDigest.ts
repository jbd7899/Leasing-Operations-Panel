import { db, accountUsersTable, interactionsTable, prospectsTable } from "@workspace/db";
import { eq, and, gte, isNotNull, ne } from "drizzle-orm";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { logger } from "./logger";

const expo = new Expo();

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export async function computeAndSendDigests(): Promise<void> {
  // Find users with push tokens and digest enabled
  const users = await db
    .select({
      id: accountUsersTable.id,
      accountId: accountUsersTable.accountId,
      expoPushToken: accountUsersTable.expoPushToken,
      name: accountUsersTable.name,
    })
    .from(accountUsersTable)
    .where(
      and(
        eq(accountUsersTable.pushDigestEnabled, true),
        isNotNull(accountUsersTable.expoPushToken),
      ),
    );

  if (users.length === 0) {
    logger.info("Daily digest: no users with push tokens");
    return;
  }

  // Group by account to avoid duplicate queries
  const accountUsers = new Map<string, typeof users>();
  for (const user of users) {
    const list = accountUsers.get(user.accountId) ?? [];
    list.push(user);
    accountUsers.set(user.accountId, list);
  }

  const messages: ExpoPushMessage[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const [accountId, accountUserList] of accountUsers) {
    try {
      // Count new inbound interactions in last 24h
      const recentInbound = await db
        .select({ id: interactionsTable.id })
        .from(interactionsTable)
        .where(
          and(
            eq(interactionsTable.accountId, accountId),
            eq(interactionsTable.direction, "inbound"),
            gte(interactionsTable.occurredAt, oneDayAgo),
          ),
        );
      const newInquiries = recentInbound.length;

      // Count stale prospects
      const activeProspects = await db
        .select({
          id: prospectsTable.id,
          lastInboundAt: prospectsTable.lastInboundAt,
          lastOutboundAt: prospectsTable.lastOutboundAt,
          status: prospectsTable.status,
        })
        .from(prospectsTable)
        .where(
          and(
            eq(prospectsTable.accountId, accountId),
            ne(prospectsTable.status, "disqualified"),
            isNotNull(prospectsTable.lastInboundAt),
          ),
        );

      let staleCount = 0;
      for (const p of activeProspects) {
        if (!p.lastInboundAt) continue;
        const lastIn = new Date(p.lastInboundAt).getTime();
        const lastOut = p.lastOutboundAt ? new Date(p.lastOutboundAt).getTime() : 0;
        if (lastIn > lastOut && Date.now() - lastIn > STALE_THRESHOLD_MS) {
          staleCount++;
        }
      }

      // Skip empty digests
      if (newInquiries === 0 && staleCount === 0) continue;

      // Build message
      const parts: string[] = [];
      if (newInquiries > 0) parts.push(`${newInquiries} new inquir${newInquiries === 1 ? "y" : "ies"}`);
      if (staleCount > 0) parts.push(`${staleCount} need${staleCount === 1 ? "s" : ""} follow-up`);
      const body = parts.join(", ");

      for (const user of accountUserList) {
        if (!user.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) continue;
        messages.push({
          to: user.expoPushToken,
          sound: "default",
          title: "MyRentCard Daily Digest",
          body,
          data: { type: "daily_digest" },
        });
      }
    } catch (err) {
      logger.error({ err, accountId }, "Failed to compute digest for account");
    }
  }

  if (messages.length === 0) {
    logger.info("Daily digest: no messages to send");
    return;
  }

  // Send in chunks
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      logger.error({ err }, "Failed to send push notification chunk");
    }
  }

  logger.info({ count: messages.length }, "Daily digest notifications sent");
}
