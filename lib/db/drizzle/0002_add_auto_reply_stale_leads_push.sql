-- Auto-reply settings on accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_message" text DEFAULT 'Hi {firstName}! Thanks for reaching out about {propertyName}. We''ll get back to you shortly.';
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "auto_reply_after_hours_only" boolean NOT NULL DEFAULT true;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_hours_start" varchar(5) NOT NULL DEFAULT '09:00';
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_hours_end" varchar(5) NOT NULL DEFAULT '18:00';
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_timezone" varchar(50) NOT NULL DEFAULT 'America/New_York';

-- Per-number auto-reply override
ALTER TABLE "twilio_numbers" ADD COLUMN IF NOT EXISTS "auto_reply_enabled" boolean;

-- Stale lead tracking on prospects
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamp with time zone;
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "last_outbound_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "idx_prospects_last_inbound_at" ON "prospects" ("last_inbound_at");

-- Push notification token storage on account_users
ALTER TABLE "account_users" ADD COLUMN IF NOT EXISTS "expo_push_token" varchar(255);
ALTER TABLE "account_users" ADD COLUMN IF NOT EXISTS "push_digest_enabled" boolean NOT NULL DEFAULT true;

-- Backfill lastInboundAt / lastOutboundAt from existing interactions
UPDATE prospects p SET
  last_inbound_at = sub.last_in,
  last_outbound_at = sub.last_out
FROM (
  SELECT
    prospect_id,
    MAX(CASE WHEN direction = 'inbound' THEN occurred_at END) AS last_in,
    MAX(CASE WHEN direction = 'outbound' THEN occurred_at END) AS last_out
  FROM interactions
  WHERE prospect_id IS NOT NULL
  GROUP BY prospect_id
) sub
WHERE p.id = sub.prospect_id;
