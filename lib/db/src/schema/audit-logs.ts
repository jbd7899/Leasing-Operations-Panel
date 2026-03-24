import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { usersTable } from "./auth";

export const auditLogsTable = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_audit_logs_account_id").on(table.accountId),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
]);

export type AuditLog = typeof auditLogsTable.$inferSelect;
