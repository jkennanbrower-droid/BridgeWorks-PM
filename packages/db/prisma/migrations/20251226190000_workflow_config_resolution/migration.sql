-- Leasing Pipeline v4.0 - Workflow config resolution + refund policy versioning
-- Adds a versioned workflow config table and extends refund policies to support
-- deterministic effective-dated selection by jurisdiction/payment type.

-- ============================================================================
-- WORKFLOW CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "workflow_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "property_id" UUID,
    "jurisdiction_code" VARCHAR(10),
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workflow_configs_org_id_property_id_jurisdiction_code_effective_at_idx"
ON "workflow_configs"("org_id", "property_id", "jurisdiction_code", "effective_at");

CREATE INDEX IF NOT EXISTS "workflow_configs_org_id_effective_at_idx"
ON "workflow_configs"("org_id", "effective_at");

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_configs_scope_version_key"
ON "workflow_configs"("org_id", "property_id", "jurisdiction_code", "version");

-- ============================================================================
-- REFUND POLICIES: versioned + effective dated + jurisdiction/payment scoping
-- ============================================================================

ALTER TABLE "refund_policies" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "refund_policies" ADD COLUMN IF NOT EXISTS "jurisdiction_code" VARCHAR(10);
ALTER TABLE "refund_policies" ADD COLUMN IF NOT EXISTS "payment_type" "payment_intent_type";

ALTER TABLE "refund_policies" ADD COLUMN IF NOT EXISTS "effective_at" TIMESTAMPTZ(6);
UPDATE "refund_policies" SET "effective_at" = "created_at" WHERE "effective_at" IS NULL;
ALTER TABLE "refund_policies" ALTER COLUMN "effective_at" SET NOT NULL;
ALTER TABLE "refund_policies" ALTER COLUMN "effective_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "refund_policies" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "refund_policies_org_id_jurisdiction_code_payment_type_effective_at_idx"
ON "refund_policies"("org_id", "jurisdiction_code", "payment_type", "effective_at");

CREATE UNIQUE INDEX IF NOT EXISTS "refund_policies_scope_version_key"
ON "refund_policies"("org_id", "jurisdiction_code", "payment_type", "version");

