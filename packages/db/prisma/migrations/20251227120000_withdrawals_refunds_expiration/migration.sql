-- Leasing Pipeline v4.0 - Withdrawals, refunds, and abandonment tracking

ALTER TABLE "lease_applications"
  ADD COLUMN IF NOT EXISTS "withdrawn_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "withdrawn_reason_code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "withdrawn_reason" TEXT;

ALTER TABLE "application_parties"
  ADD COLUMN IF NOT EXISTS "abandoned_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "abandoned_reason_code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "reminder_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_reminder_at" TIMESTAMPTZ(6);

ALTER TABLE "refund_requests"
  ADD COLUMN IF NOT EXISTS "policy_id" UUID,
  ADD COLUMN IF NOT EXISTS "policy_version" INTEGER,
  ADD COLUMN IF NOT EXISTS "decision_reason_code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "eligible_amount_cents" INTEGER;

CREATE INDEX IF NOT EXISTS "refund_requests_policy_id_idx" ON "refund_requests"("policy_id");
