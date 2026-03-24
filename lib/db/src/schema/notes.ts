import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { prospectsTable } from "./prospects";
import { usersTable } from "./auth";

export const notesTable = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").notNull().references(() => prospectsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_notes_prospect_id").on(table.prospectId),
  index("idx_notes_account_id").on(table.accountId),
]);

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
