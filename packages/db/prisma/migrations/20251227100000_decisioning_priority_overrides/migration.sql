-- Leasing Pipeline v4.0 - Decisioning and priority overrides

DO $$ BEGIN
  CREATE TYPE "override_request_type" AS ENUM ('DECISION', 'PRIORITY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "income_calculation_method" AS ENUM ('GROSS_MONTHLY', 'NET_MONTHLY', 'ANNUAL_GROSS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "decision_records"
  ADD COLUMN IF NOT EXISTS "criteria_version" INTEGER,
  ADD COLUMN IF NOT EXISTS "reason_codes" JSONB,
  ADD COLUMN IF NOT EXISTS "income_calculation_method" "income_calculation_method",
  ADD COLUMN IF NOT EXISTS "income_verified_monthly_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "income_verified_annual_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "income_passed" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "income_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "criminal_review_status" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "criminal_record_summary" JSONB,
  ADD COLUMN IF NOT EXISTS "criminal_review_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "criminal_reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "criminal_reviewed_by_id" UUID;

ALTER TABLE "override_requests"
  ADD COLUMN IF NOT EXISTS "request_type" "override_request_type" NOT NULL DEFAULT 'DECISION',
  ADD COLUMN IF NOT EXISTS "original_priority" "priority_level",
  ADD COLUMN IF NOT EXISTS "requested_priority" "priority_level";

ALTER TABLE "override_requests"
  ALTER COLUMN "original_outcome" DROP NOT NULL,
  ALTER COLUMN "requested_outcome" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "override_requests_application_id_request_type_idx" ON "override_requests"("application_id", "request_type");
