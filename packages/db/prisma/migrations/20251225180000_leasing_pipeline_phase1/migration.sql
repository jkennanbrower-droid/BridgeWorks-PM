-- Leasing Pipeline v4.0 - Phase 1 Migration
-- This migration creates all required tables, enums, indexes, and constraints
-- for the leasing application pipeline.

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "lease_application_status" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'DECISIONED', 'CONVERTED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "lease_application_type" AS ENUM ('INDIVIDUAL', 'JOINT', 'HOUSEHOLD_GROUP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "party_role" AS ENUM ('PRIMARY', 'CO_APPLICANT', 'OCCUPANT', 'GUARANTOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "party_status" AS ENUM ('INVITED', 'IN_PROGRESS', 'COMPLETE', 'LOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_intent_type" AS ENUM ('APPLICATION_FEE', 'HOLDING_DEPOSIT', 'MOVE_IN_FUNDS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_intent_status" AS ENUM ('REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "refund_policy_type" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'NO_REFUND', 'TIME_BASED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "refund_request_status" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'PROCESSED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "unit_reservation_kind" AS ENUM ('SCREENING_LOCK', 'SOFT_HOLD', 'HARD_HOLD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "unit_reservation_status" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "screening_depth" AS ENUM ('FULL', 'CRIMINAL_ONLY', 'CREDIT_ONLY', 'SOFT_CREDIT', 'VERIFICATION_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "priority_level" AS ENUM ('STANDARD', 'PRIORITY', 'EMERGENCY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "relocation_status" AS ENUM ('LOCAL', 'OUT_OF_STATE_EMPLOYED', 'OUT_OF_STATE_JOB_OFFER', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "note_visibility" AS ENUM ('INTERNAL_STAFF_ONLY', 'SHARED_WITH_APPLICANT', 'SHARED_WITH_PARTIES', 'PUBLIC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "decision_outcome" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'DENIED', 'PENDING_REVIEW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "requirement_type" AS ENUM ('DOCUMENT', 'SCREENING', 'PAYMENT', 'SIGNATURE', 'VERIFICATION', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "requirement_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WAIVED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "document_type" AS ENUM ('GOVERNMENT_ID', 'PROOF_OF_INCOME', 'BANK_STATEMENT', 'TAX_RETURN', 'EMPLOYMENT_LETTER', 'REFERENCE_LETTER', 'PET_DOCUMENTATION', 'VEHICLE_REGISTRATION', 'INSURANCE_CERTIFICATE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "override_request_status" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "audit_event_type" AS ENUM ('APPLICATION_CREATED', 'APPLICATION_SUBMITTED', 'APPLICATION_STATUS_CHANGED', 'PARTY_INVITED', 'PARTY_JOINED', 'PARTY_COMPLETED', 'DOCUMENT_UPLOADED', 'DOCUMENT_VERIFIED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'SCREENING_STARTED', 'SCREENING_COMPLETED', 'DECISION_MADE', 'DECISION_OVERRIDDEN', 'RESERVATION_CREATED', 'RESERVATION_RELEASED', 'RESERVATION_EXPIRED', 'REFUND_REQUESTED', 'REFUND_PROCESSED', 'NOTE_ADDED', 'OVERRIDE_REQUESTED', 'OVERRIDE_APPROVED', 'OVERRIDE_DENIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Screening Consent Template (created first as it's referenced by ApplicationParty)
CREATE TABLE IF NOT EXISTS "screening_consent_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_consent_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "screening_consent_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_consent_templates_org_id_version_key" ON "screening_consent_templates"("org_id", "version");
CREATE INDEX IF NOT EXISTS "screening_consent_templates_org_id_is_active_idx" ON "screening_consent_templates"("org_id", "is_active");

-- Refund Policy (created early as it's referenced by PaymentIntent)
CREATE TABLE IF NOT EXISTS "refund_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "policy_type" "refund_policy_type" NOT NULL,
    "description" TEXT,
    "refund_percentage" INTEGER,
    "refund_window_hours" INTEGER,
    "conditions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refund_policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "refund_policies_org_id_is_active_idx" ON "refund_policies"("org_id", "is_active");

-- Lease Application
CREATE TABLE IF NOT EXISTS "lease_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "application_type" "lease_application_type" NOT NULL,
    "status" "lease_application_status" NOT NULL DEFAULT 'DRAFT',
    "priority" "priority_level" NOT NULL DEFAULT 'STANDARD',
    "screening_depth" "screening_depth" NOT NULL DEFAULT 'FULL',
    "relocation_status" "relocation_status",
    "desired_move_in_date" DATE,
    "desired_lease_term_months" INTEGER,
    "duplicate_check_hash" VARCHAR(64),
    "submitted_at" TIMESTAMPTZ(6),
    "decisioned_at" TIMESTAMPTZ(6),
    "converted_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "closed_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "lease_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lease_applications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lease_applications_org_id_status_idx" ON "lease_applications"("org_id", "status");
CREATE INDEX IF NOT EXISTS "lease_applications_org_id_property_id_idx" ON "lease_applications"("org_id", "property_id");
CREATE INDEX IF NOT EXISTS "lease_applications_org_id_unit_id_idx" ON "lease_applications"("org_id", "unit_id");
CREATE INDEX IF NOT EXISTS "lease_applications_duplicate_check_hash_created_at_idx" ON "lease_applications"("duplicate_check_hash", "created_at");
CREATE INDEX IF NOT EXISTS "lease_applications_org_id_created_at_idx" ON "lease_applications"("org_id", "created_at");

-- Application Party
CREATE TABLE IF NOT EXISTS "application_parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "person_id" UUID,
    "role" "party_role" NOT NULL,
    "status" "party_status" NOT NULL DEFAULT 'INVITED',
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "phone" VARCHAR(20),
    "invite_token" VARCHAR(64),
    "invite_sent_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "screening_consent_at" TIMESTAMPTZ(6),
    "screening_consent_template_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_parties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "application_parties_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_parties_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "application_parties_screening_consent_template_id_fkey" FOREIGN KEY ("screening_consent_template_id") REFERENCES "screening_consent_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "application_parties_invite_token_key" ON "application_parties"("invite_token");
CREATE INDEX IF NOT EXISTS "application_parties_application_id_role_idx" ON "application_parties"("application_id", "role");
CREATE INDEX IF NOT EXISTS "application_parties_person_id_idx" ON "application_parties"("person_id");
CREATE INDEX IF NOT EXISTS "application_parties_email_idx" ON "application_parties"("email");

-- Application Draft Session
CREATE TABLE IF NOT EXISTS "application_draft_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "party_id" UUID,
    "session_token" VARCHAR(64) NOT NULL,
    "form_data" JSONB NOT NULL,
    "current_step" VARCHAR(50),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_draft_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "application_draft_sessions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_draft_sessions_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "application_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "application_draft_sessions_session_token_key" ON "application_draft_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "application_draft_sessions_application_id_idx" ON "application_draft_sessions"("application_id");
CREATE INDEX IF NOT EXISTS "application_draft_sessions_party_id_idx" ON "application_draft_sessions"("party_id");
CREATE INDEX IF NOT EXISTS "application_draft_sessions_expires_at_idx" ON "application_draft_sessions"("expires_at");

-- Requirement Item
CREATE TABLE IF NOT EXISTS "requirement_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "party_id" UUID,
    "requirement_type" "requirement_type" NOT NULL,
    "status" "requirement_status" NOT NULL DEFAULT 'PENDING',
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "waived_at" TIMESTAMPTZ(6),
    "waived_by_id" UUID,
    "waived_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "requirement_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "requirement_items_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "application_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "requirement_items_application_id_status_idx" ON "requirement_items"("application_id", "status");
CREATE INDEX IF NOT EXISTS "requirement_items_party_id_idx" ON "requirement_items"("party_id");

-- Document
CREATE TABLE IF NOT EXISTS "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "requirement_item_id" UUID,
    "document_type" "document_type" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "public_url" TEXT,
    "scan_status" VARCHAR(20),
    "scan_result" JSONB,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_id" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by_id" UUID,
    "rejected_reason" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "application_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_requirement_item_id_fkey" FOREIGN KEY ("requirement_item_id") REFERENCES "requirement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "documents_party_id_idx" ON "documents"("party_id");
CREATE INDEX IF NOT EXISTS "documents_org_id_document_type_idx" ON "documents"("org_id", "document_type");
CREATE INDEX IF NOT EXISTS "documents_requirement_item_id_idx" ON "documents"("requirement_item_id");

-- Payment Intent
CREATE TABLE IF NOT EXISTS "payment_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "payment_type" "payment_intent_type" NOT NULL,
    "status" "payment_intent_status" NOT NULL DEFAULT 'REQUIRES_ACTION',
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "stripe_payment_intent_id" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "description" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "canceled_at" TIMESTAMPTZ(6),
    "canceled_reason" TEXT,
    "refund_policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_intents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_intents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_intents_refund_policy_id_fkey" FOREIGN KEY ("refund_policy_id") REFERENCES "refund_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_stripe_payment_intent_id_key" ON "payment_intents"("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "payment_intents_application_id_payment_type_idx" ON "payment_intents"("application_id", "payment_type");
CREATE INDEX IF NOT EXISTS "payment_intents_org_id_status_idx" ON "payment_intents"("org_id", "status");
CREATE INDEX IF NOT EXISTS "payment_intents_stripe_payment_intent_id_idx" ON "payment_intents"("stripe_payment_intent_id");

-- Refund Request
CREATE TABLE IF NOT EXISTS "refund_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_intent_id" UUID NOT NULL,
    "status" "refund_request_status" NOT NULL DEFAULT 'PENDING',
    "requested_amount_cents" INTEGER NOT NULL,
    "approved_amount_cents" INTEGER,
    "reason" TEXT NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "stripe_refund_id" VARCHAR(255),
    "processed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refund_requests_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "refund_requests_payment_intent_id_idx" ON "refund_requests"("payment_intent_id");
CREATE INDEX IF NOT EXISTS "refund_requests_status_idx" ON "refund_requests"("status");

-- Unit Reservation
CREATE TABLE IF NOT EXISTS "unit_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "kind" "unit_reservation_kind" NOT NULL,
    "status" "unit_reservation_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "released_by_id" UUID,
    "released_reason" TEXT,
    "converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unit_reservations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "unit_reservations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "unit_reservations_application_id_idx" ON "unit_reservations"("application_id");
CREATE INDEX IF NOT EXISTS "unit_reservations_unit_id_status_idx" ON "unit_reservations"("unit_id", "status");
CREATE INDEX IF NOT EXISTS "unit_reservations_org_id_unit_id_kind_status_idx" ON "unit_reservations"("org_id", "unit_id", "kind", "status");

-- Risk Assessment (v0 stub)
CREATE TABLE IF NOT EXISTS "risk_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "assessment_data" JSONB NOT NULL,
    "risk_score" INTEGER,
    "risk_level" VARCHAR(20),
    "factors" JSONB,
    "recommended_outcome" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "risk_assessments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "risk_assessments_application_id_idx" ON "risk_assessments"("application_id");

-- Override Request
CREATE TABLE IF NOT EXISTS "override_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "status" "override_request_status" NOT NULL DEFAULT 'PENDING',
    "original_outcome" "decision_outcome" NOT NULL,
    "requested_outcome" "decision_outcome" NOT NULL,
    "justification" TEXT NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "override_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "override_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "override_requests_application_id_status_idx" ON "override_requests"("application_id", "status");
CREATE INDEX IF NOT EXISTS "override_requests_org_id_status_idx" ON "override_requests"("org_id", "status");

-- Decision Record
CREATE TABLE IF NOT EXISTS "decision_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "outcome" "decision_outcome" NOT NULL,
    "decision_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_id" UUID NOT NULL,
    "conditions" JSONB,
    "notes" TEXT,
    "risk_assessment_id" UUID,
    "override_request_id" UUID,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "previous_decision_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "decision_records_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decision_records_risk_assessment_id_fkey" FOREIGN KEY ("risk_assessment_id") REFERENCES "risk_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "decision_records_override_request_id_fkey" FOREIGN KEY ("override_request_id") REFERENCES "override_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "decision_records_previous_decision_id_fkey" FOREIGN KEY ("previous_decision_id") REFERENCES "decision_records"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "decision_records_application_id_version_idx" ON "decision_records"("application_id", "version");
CREATE INDEX IF NOT EXISTS "decision_records_decided_by_id_idx" ON "decision_records"("decided_by_id");

-- Application Score (v0 stub)
CREATE TABLE IF NOT EXISTS "application_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "score_type" VARCHAR(50) NOT NULL,
    "score_value" INTEGER NOT NULL,
    "max_score" INTEGER,
    "factors" JSONB,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "application_scores_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "application_scores_application_id_score_type_idx" ON "application_scores"("application_id", "score_type");

-- Waitlist Entry (v0 stub)
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_type_id" UUID,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(200),
    "contact_phone" VARCHAR(20),
    "desired_move_in" DATE,
    "preferences" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "notified_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "converted_application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "waitlist_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "waitlist_entries_org_id_property_id_priority_idx" ON "waitlist_entries"("org_id", "property_id", "priority");
CREATE INDEX IF NOT EXISTS "waitlist_entries_contact_email_idx" ON "waitlist_entries"("contact_email");

-- Note
CREATE TABLE IF NOT EXISTS "notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "visibility" "note_visibility" NOT NULL DEFAULT 'INTERNAL_STAFF_ONLY',
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "notes_application_id_visibility_idx" ON "notes"("application_id", "visibility");
CREATE INDEX IF NOT EXISTS "notes_application_id_is_pinned_idx" ON "notes"("application_id", "is_pinned");

-- Seasonal Policy
CREATE TABLE IF NOT EXISTS "seasonal_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "property_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "policy_rules" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasonal_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seasonal_policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "seasonal_policies_org_id_is_active_idx" ON "seasonal_policies"("org_id", "is_active");
CREATE INDEX IF NOT EXISTS "seasonal_policies_property_id_start_date_end_date_idx" ON "seasonal_policies"("property_id", "start_date", "end_date");

-- Concurrent Application Group
CREATE TABLE IF NOT EXISTS "concurrent_application_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "resolved_at" TIMESTAMPTZ(6),
    "winner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concurrent_application_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "concurrent_application_groups_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "concurrent_application_groups_org_id_unit_id_is_active_idx" ON "concurrent_application_groups"("org_id", "unit_id", "is_active");

-- Concurrent Application Group Member
CREATE TABLE IF NOT EXISTS "concurrent_application_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "rank" INTEGER,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concurrent_application_group_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "concurrent_application_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "concurrent_application_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "concurrent_application_group_members_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "concurrent_application_group_members_group_id_application_id_key" ON "concurrent_application_group_members"("group_id", "application_id");
CREATE INDEX IF NOT EXISTS "concurrent_application_group_members_application_id_idx" ON "concurrent_application_group_members"("application_id");

-- Lease Audit Event
CREATE TABLE IF NOT EXISTS "lease_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "application_id" UUID,
    "event_type" "audit_event_type" NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "previous_state" JSONB,
    "new_state" JSONB,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lease_audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lease_audit_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lease_audit_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lease_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lease_audit_events_application_id_created_at_idx" ON "lease_audit_events"("application_id", "created_at");
CREATE INDEX IF NOT EXISTS "lease_audit_events_org_id_event_type_created_at_idx" ON "lease_audit_events"("org_id", "event_type", "created_at");
CREATE INDEX IF NOT EXISTS "lease_audit_events_actor_id_created_at_idx" ON "lease_audit_events"("actor_id", "created_at");

-- ============================================================================
-- UNIQUE PARTIAL INDEX: Prevent dual active holds on same unit
-- This constraint ensures only one active SOFT_HOLD or HARD_HOLD per unit.
-- SCREENING_LOCK is allowed to coexist (for initial screening phase).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "unit_reservations_one_active_hold_per_unit"
ON "unit_reservations" ("unit_id")
WHERE "status" = 'ACTIVE' AND "kind" IN ('SOFT_HOLD', 'HARD_HOLD');

-- Comment explaining the constraint
COMMENT ON INDEX "unit_reservations_one_active_hold_per_unit" IS
'Enforces that only one active SOFT_HOLD or HARD_HOLD can exist per unit at any time. SCREENING_LOCK is excluded to allow initial screening without blocking holds.';
