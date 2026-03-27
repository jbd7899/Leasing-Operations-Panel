-- Replace qualification_score (decimal 0.00-1.00) with completeness_score (integer 0-100)
ALTER TABLE "prospects" ADD COLUMN "completeness_score" integer;

-- Migrate existing data: convert decimal (0-1) to integer (0-100)
UPDATE "prospects"
SET "completeness_score" = ROUND("qualification_score" * 100)::integer
WHERE "qualification_score" IS NOT NULL;

ALTER TABLE "prospects" DROP COLUMN "qualification_score";
