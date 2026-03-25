import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { usersTable } from "./auth";
import { prospectsTable } from "./prospects";
import { propertiesTable } from "./properties";
import { interactionsTable } from "./interactions";

export const appEventsTable = pgTable("app_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  prospectId: varchar("prospect_id").references(() => prospectsTable.id, { onDelete: "set null" }),
  interactionId: varchar("interaction_id").references(() => interactionsTable.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventName: varchar("event_name", { length: 100 }).notNull(),
  sourceLayer: varchar("source_layer", { length: 50 }),
  eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull().defaultNow(),
  sessionId: varchar("session_id", { length: 255 }),
  deviceType: varchar("device_type", { length: 50 }),
  platform: varchar("platform", { length: 50 }),
  metadataJson: jsonb("metadata_json"),
  previousStateJson: jsonb("previous_state_json"),
  newStateJson: jsonb("new_state_json"),
  aiContextJson: jsonb("ai_context_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_app_events_account_id").on(table.accountId),
  index("idx_app_events_event_type").on(table.eventType),
  index("idx_app_events_event_name").on(table.eventName),
  index("idx_app_events_prospect_id").on(table.prospectId),
  index("idx_app_events_interaction_id").on(table.interactionId),
  index("idx_app_events_timestamp").on(table.eventTimestamp),
]);

export type AppEvent = typeof appEventsTable.$inferSelect;
