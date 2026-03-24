import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, numeric, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { prospectsTable } from "./prospects";
import { propertiesTable } from "./properties";

export const interactionsTable = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").references(() => prospectsTable.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  sourceType: varchar("source_type", { length: 30 }).notNull(),
  direction: varchar("direction", { length: 20 }).notNull().default("inbound"),
  twilioMessageSid: varchar("twilio_message_sid", { length: 100 }).unique(),
  twilioCallSid: varchar("twilio_call_sid", { length: 100 }),
  parentThreadKey: varchar("parent_thread_key", { length: 255 }),
  fromNumber: varchar("from_number", { length: 30 }).notNull(),
  toNumber: varchar("to_number", { length: 30 }).notNull(),
  rawText: varchar("raw_text", { length: 5000 }),
  transcript: varchar("transcript", { length: 10000 }),
  summary: varchar("summary", { length: 2000 }),
  category: varchar("category", { length: 100 }),
  urgency: varchar("urgency", { length: 50 }),
  sentiment: varchar("sentiment", { length: 50 }),
  extractionConfidence: numeric("extraction_confidence", { precision: 5, scale: 4 }),
  structuredExtractionJson: jsonb("structured_extraction_json"),
  extractionStatus: varchar("extraction_status", { length: 50 }).default("pending"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_interactions_account_id").on(table.accountId),
  index("idx_interactions_prospect_id").on(table.prospectId),
  index("idx_interactions_occurred_at").on(table.occurredAt),
  index("idx_interactions_extraction_status").on(table.extractionStatus),
]);

export const insertInteractionSchema = createInsertSchema(interactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactionsTable.$inferSelect;
