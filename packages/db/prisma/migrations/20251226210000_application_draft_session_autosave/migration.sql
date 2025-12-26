-- Leasing Pipeline v4.0 - Draft session autosave fields
-- Adds progress map and last saved timestamp for applicant autosave/resume.

ALTER TABLE "application_draft_sessions"
  ADD COLUMN IF NOT EXISTS "progress_map" JSONB,
  ADD COLUMN IF NOT EXISTS "last_saved_at" TIMESTAMPTZ(6);

