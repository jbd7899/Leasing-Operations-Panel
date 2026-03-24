import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { usersTable } from "./auth";
import { prospectsTable } from "./prospects";

export const exportBatchesTable = pgTable("export_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  format: varchar("format", { length: 20 }).notNull(),
  targetSystem: varchar("target_system", { length: 100 }),
  recordCount: integer("record_count").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  fileUrl: varchar("file_url", { length: 1000 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_export_batches_account_id").on(table.accountId),
]);

export const exportBatchItemsTable = pgTable("export_batch_items", {
  exportBatchId: varchar("export_batch_id").notNull().references(() => exportBatchesTable.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").notNull().references(() => prospectsTable.id, { onDelete: "cascade" }),
});

export const insertExportBatchSchema = createInsertSchema(exportBatchesTable).omit({ id: true, createdAt: true });
export type InsertExportBatch = z.infer<typeof insertExportBatchSchema>;
export type ExportBatch = typeof exportBatchesTable.$inferSelect;
export type ExportBatchItem = typeof exportBatchItemsTable.$inferSelect;
