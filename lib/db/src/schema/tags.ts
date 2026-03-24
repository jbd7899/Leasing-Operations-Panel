import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { prospectsTable } from "./prospects";

export const tagsTable = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tags_account_id").on(table.accountId),
]);

export const prospectTagsTable = pgTable("prospect_tags", {
  prospectId: varchar("prospect_id").notNull().references(() => prospectsTable.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.prospectId, table.tagId] }),
]);

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true, createdAt: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;
export type ProspectTag = typeof prospectTagsTable.$inferSelect;
