import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, numeric, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { propertiesTable } from "./properties";

export const prospectsTable = pgTable("prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  assignedPropertyId: varchar("assigned_property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  fullName: varchar("full_name", { length: 255 }),
  phonePrimary: varchar("phone_primary", { length: 30 }).notNull(),
  phoneSecondary: varchar("phone_secondary", { length: 30 }),
  email: varchar("email", { length: 255 }),
  desiredMoveInDate: varchar("desired_move_in_date", { length: 50 }),
  desiredBedrooms: varchar("desired_bedrooms", { length: 20 }),
  budgetMin: numeric("budget_min", { precision: 10, scale: 2 }),
  budgetMax: numeric("budget_max", { precision: 10, scale: 2 }),
  pets: varchar("pets", { length: 100 }),
  voucherType: varchar("voucher_type", { length: 100 }),
  employmentStatus: varchar("employment_status", { length: 100 }),
  monthlyIncome: numeric("monthly_income", { precision: 10, scale: 2 }),
  languagePreference: varchar("language_preference", { length: 50 }),
  latestSummary: varchar("latest_summary", { length: 2000 }),
  latestSentiment: varchar("latest_sentiment", { length: 50 }),
  qualificationScore: numeric("qualification_score", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  exportStatus: varchar("export_status", { length: 50 }).notNull().default("pending"),
  crmExternalId: varchar("crm_external_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("uq_prospects_account_phone").on(table.accountId, table.phonePrimary),
  index("idx_prospects_account_id").on(table.accountId),
  index("idx_prospects_phone_primary").on(table.phonePrimary),
  index("idx_prospects_status").on(table.status),
  index("idx_prospects_export_status").on(table.exportStatus),
]);

export const insertProspectSchema = createInsertSchema(prospectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospectsTable.$inferSelect;
