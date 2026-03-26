import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  myrentcardAccountId: varchar("myrentcard_account_id", { length: 255 }),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  twilioAccountSid: varchar("twilio_account_sid", { length: 100 }),
  twilioAuthToken: varchar("twilio_auth_token", { length: 100 }),
  twilioApiKeySid: varchar("twilio_api_key_sid", { length: 100 }),
  twilioApiKeySecret: varchar("twilio_api_key_secret", { length: 100 }),
  twilioTwimlAppSid: varchar("twilio_twiml_app_sid", { length: 100 }),
  aiAssistEnabled: boolean("ai_assist_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
