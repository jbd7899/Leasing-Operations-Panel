import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { usersTable } from "./auth";
import { prospectsTable } from "./prospects";
import { propertiesTable } from "./properties";

export const founderObservationsTable = pgTable("founder_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  observationType: varchar("observation_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  prospectId: varchar("prospect_id").references(() => prospectsTable.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => propertiesTable.id, { onDelete: "set null" }),
  weekLabel: varchar("week_label", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_founder_obs_account_id").on(table.accountId),
  index("idx_founder_obs_type").on(table.observationType),
  index("idx_founder_obs_created_at").on(table.createdAt),
]);

export type FounderObservation = typeof founderObservationsTable.$inferSelect;
