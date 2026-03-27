import { pool } from "@workspace/db";
import { logger } from "./logger";

const migrations: { name: string; sql: string }[] = [
  // 0001: replace qualification_score with completeness_score
  {
    name: "add_completeness_score",
    sql: `ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "completeness_score" integer`,
  },
  {
    name: "drop_qualification_score",
    sql: `ALTER TABLE "prospects" DROP COLUMN IF EXISTS "qualification_score"`,
  },

  // 0002: auto-reply, business hours, stale-lead tracking, push tokens
  {
    name: "accounts_auto_reply_enabled",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_enabled" boolean NOT NULL DEFAULT false`,
  },
  {
    name: "accounts_auto_reply_message",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_message" text DEFAULT 'Hi {firstName}! Thanks for reaching out about {propertyName}. We''ll get back to you shortly.'`,
  },
  {
    name: "accounts_auto_reply_after_hours_only",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_after_hours_only" boolean NOT NULL DEFAULT true`,
  },
  {
    name: "accounts_business_hours_start",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_hours_start" varchar(5) NOT NULL DEFAULT '09:00'`,
  },
  {
    name: "accounts_business_hours_end",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_hours_end" varchar(5) NOT NULL DEFAULT '18:00'`,
  },
  {
    name: "accounts_business_timezone",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_timezone" varchar(50) NOT NULL DEFAULT 'America/New_York'`,
  },
  {
    name: "twilio_numbers_auto_reply_enabled",
    sql: `ALTER TABLE "twilio_numbers" ADD COLUMN IF NOT EXISTS "auto_reply_enabled" boolean`,
  },
  {
    name: "prospects_last_inbound_at",
    sql: `ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamp with time zone`,
  },
  {
    name: "prospects_last_outbound_at",
    sql: `ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "last_outbound_at" timestamp with time zone`,
  },
  {
    name: "prospects_last_inbound_at_index",
    sql: `CREATE INDEX IF NOT EXISTS "idx_prospects_last_inbound_at" ON "prospects" ("last_inbound_at")`,
  },
  {
    name: "account_users_expo_push_token",
    sql: `ALTER TABLE "account_users" ADD COLUMN IF NOT EXISTS "expo_push_token" varchar(255)`,
  },
  {
    name: "account_users_push_digest_enabled",
    sql: `ALTER TABLE "account_users" ADD COLUMN IF NOT EXISTS "push_digest_enabled" boolean NOT NULL DEFAULT true`,
  },

  // Twilio voice credentials (added to schema without a migration file)
  {
    name: "accounts_twilio_api_key_sid",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "twilio_api_key_sid" varchar(100)`,
  },
  {
    name: "accounts_twilio_api_key_secret",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "twilio_api_key_secret" varchar(100)`,
  },
  {
    name: "accounts_twilio_twiml_app_sid",
    sql: `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "twilio_twiml_app_sid" varchar(100)`,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const { name, sql } of migrations) {
      try {
        await client.query(sql);
        logger.debug({ migration: name }, "Migration applied (or already present)");
      } catch (err) {
        logger.error({ migration: name, err }, "Migration failed — aborting startup");
        throw err;
      }
    }
    logger.info({ count: migrations.length }, "Database migrations complete");
  } finally {
    client.release();
  }
}
