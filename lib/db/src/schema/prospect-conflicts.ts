import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { prospectsTable } from "./prospects";

export const prospectConflictsTable = pgTable("prospect_conflicts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").notNull().references(() => prospectsTable.id, { onDelete: "cascade" }),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  existingValue: varchar("existing_value", { length: 1000 }),
  extractedValue: varchar("extracted_value", { length: 1000 }).notNull(),
  chosenValue: varchar("chosen_value", { length: 1000 }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_prospect_conflicts_prospect_id").on(table.prospectId),
  index("idx_prospect_conflicts_account_id").on(table.accountId),
  index("idx_prospect_conflicts_resolved").on(table.resolvedAt),
]);

export type ProspectConflict = typeof prospectConflictsTable.$inferSelect;
