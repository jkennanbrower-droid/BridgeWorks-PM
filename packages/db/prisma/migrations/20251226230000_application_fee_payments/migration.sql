-- Leasing Pipeline v4.0 - Application fee payments + attempts

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "application_fee_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- LEASE APPLICATIONS: PAYMENT GATE STATUS
-- ============================================================================

ALTER TABLE "lease_applications"
  ADD COLUMN IF NOT EXISTS "application_fee_status" "application_fee_status" NOT NULL DEFAULT 'PENDING';

-- ============================================================================
-- PAYMENT INTENTS: PROVIDER + ATTEMPT METADATA
-- ============================================================================

ALTER TABLE "payment_intents"
  ADD COLUMN IF NOT EXISTS "provider" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "provider_reference" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "provider_client_secret" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "attempts_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_failure_code" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "last_failure_message" TEXT,
  ADD COLUMN IF NOT EXISTS "last_failure_at" TIMESTAMPTZ(6);

-- ============================================================================
-- PAYMENT INTENT ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payment_intent_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_intent_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "payment_intent_status" NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "provider_reference" VARCHAR(255),
    "failure_code" VARCHAR(50),
    "failure_message" TEXT,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_intent_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_intent_attempts_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payment_intent_attempts_payment_intent_id_attempt_number_idx"
ON "payment_intent_attempts"("payment_intent_id", "attempt_number");

