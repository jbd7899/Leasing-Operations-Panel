import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { usersTable } from "./auth";

export const accountUsersTable = pgTable("account_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("agent"),
  expoPushToken: varchar("expo_push_token", { length: 255 }),
  pushDigestEnabled: boolean("push_digest_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_account_users_account_id").on(table.accountId),
  index("idx_account_users_user_id").on(table.userId),
]);

export const insertAccountUserSchema = createInsertSchema(accountUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccountUser = z.infer<typeof insertAccountUserSchema>;
export type AccountUser = typeof accountUsersTable.$inferSelect;
