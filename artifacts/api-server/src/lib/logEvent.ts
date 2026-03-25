import { db, appEventsTable } from "@workspace/db";
import { logger } from "./logger";

export interface LogEventInput {
  accountId: string;
  userId?: string | null;
  prospectId?: string | null;
  interactionId?: string | null;
  propertyId?: string | null;
  eventType: string;
  eventName: string;
  sourceLayer?: string | null;
  sessionId?: string | null;
  deviceType?: string | null;
  platform?: string | null;
  metadataJson?: Record<string, unknown> | null;
  previousStateJson?: Record<string, unknown> | null;
  newStateJson?: Record<string, unknown> | null;
  aiContextJson?: Record<string, unknown> | null;
}

export function logEvent(input: LogEventInput): void {
  setImmediate(async () => {
    try {
      await db.insert(appEventsTable).values({
        accountId: input.accountId,
        userId: input.userId ?? null,
        prospectId: input.prospectId ?? null,
        interactionId: input.interactionId ?? null,
        propertyId: input.propertyId ?? null,
        eventType: input.eventType,
        eventName: input.eventName,
        sourceLayer: input.sourceLayer ?? null,
        sessionId: input.sessionId ?? null,
        deviceType: input.deviceType ?? null,
        platform: input.platform ?? null,
        metadataJson: input.metadataJson ?? null,
        previousStateJson: input.previousStateJson ?? null,
        newStateJson: input.newStateJson ?? null,
        aiContextJson: input.aiContextJson ?? null,
        eventTimestamp: new Date(),
      });
    } catch (err) {
      logger.error({ err, eventName: input.eventName }, "Failed to log app event");
    }
  });
}
