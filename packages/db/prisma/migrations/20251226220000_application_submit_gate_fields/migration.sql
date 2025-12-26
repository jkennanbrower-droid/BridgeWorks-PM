-- Leasing Pipeline v4.0 - Submit gate fields
-- Adds unit availability snapshot fields and consent versioning fields.

ALTER TABLE "lease_applications"
  ADD COLUMN IF NOT EXISTS "unit_availability_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "unit_availability_verified_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "unit_was_available_at_submit" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6);

ALTER TABLE "application_parties"
  ADD COLUMN IF NOT EXISTS "screening_consent_template_version" INTEGER,
  ADD COLUMN IF NOT EXISTS "screening_consent_ip" VARCHAR(45),
  ADD COLUMN IF NOT EXISTS "screening_consent_signature" JSONB;

