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
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
  autoReplyMessage: text("auto_reply_message").default("Hi {firstName}! Thanks for reaching out about {propertyName}. We'll get back to you shortly."),
  autoReplyAfterHoursOnly: boolean("auto_reply_after_hours_only").notNull().default(true),
  businessHoursStart: varchar("business_hours_start", { length: 5 }).notNull().default("09:00"),
  businessHoursEnd: varchar("business_hours_end", { length: 5 }).notNull().default("18:00"),
  businessTimezone: varchar("business_timezone", { length: 50 }).notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
