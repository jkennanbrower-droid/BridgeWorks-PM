-- Leasing Pipeline v4.0 - Audit event for application views

DO $$ BEGIN
  ALTER TYPE "audit_event_type" ADD VALUE IF NOT EXISTS 'APPLICATION_VIEWED';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
