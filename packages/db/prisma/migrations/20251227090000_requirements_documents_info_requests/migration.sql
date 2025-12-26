-- Leasing Pipeline v4.0 - Requirements, documents, and info requests

DO $$ BEGIN
  CREATE TYPE "document_verification_status" AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "info_request_status" AS ENUM ('OPEN', 'RESPONDED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "verification_status" "document_verification_status" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN IF NOT EXISTS "valid_from" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "valid_until" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "documents_valid_until_idx" ON "documents"("valid_until");

CREATE TABLE IF NOT EXISTS "info_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "party_id" UUID,
    "status" "info_request_status" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "requested_items" JSONB,
    "unlock_scopes" JSONB,
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "info_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "info_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "info_requests_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "info_requests_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "application_parties"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "info_requests_application_id_status_idx" ON "info_requests"("application_id", "status");
CREATE INDEX IF NOT EXISTS "info_requests_org_id_status_idx" ON "info_requests"("org_id", "status");
CREATE INDEX IF NOT EXISTS "info_requests_party_id_idx" ON "info_requests"("party_id");

ALTER TABLE "requirement_items"
  ADD COLUMN IF NOT EXISTS "info_request_id" UUID;

ALTER TABLE "requirement_items"
  ADD CONSTRAINT "requirement_items_info_request_id_fkey"
  FOREIGN KEY ("info_request_id") REFERENCES "info_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
