import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { propertiesTable } from "./properties";

export const twilioNumbersTable = pgTable("twilio_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  phoneNumber: varchar("phone_number", { length: 30 }).notNull(),
  friendlyName: varchar("friendly_name", { length: 255 }),
  purpose: varchar("purpose", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_twilio_numbers_account_id").on(table.accountId),
  index("idx_twilio_numbers_phone").on(table.phoneNumber),
]);

export const insertTwilioNumberSchema = createInsertSchema(twilioNumbersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTwilioNumber = z.infer<typeof insertTwilioNumberSchema>;
export type TwilioNumber = typeof twilioNumbersTable.$inferSelect;
