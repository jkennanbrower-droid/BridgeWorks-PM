DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('founder', 'platform_admin', 'support_admin', 'support_agent', 'auditor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonStatus" AS ENUM ('active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrgStatus" AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('org_admin', 'staff_manager', 'staff_agent', 'tenant_user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('active', 'invited', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InviteStatus" AS ENUM ('pending_send', 'sent', 'accepted', 'send_failed', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('draft', 'submitted', 'provisioning', 'provisioned', 'rejected', 'provisioning_failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'degraded', 'down');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "people" ALTER COLUMN "clerk_user_id" DROP NOT NULL;
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "platform_role" "PlatformRole";
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "status" "PersonStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX IF NOT EXISTS "people_email_key" ON "people"("email");

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "primary_contact_email" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "health_status" "HealthStatus";
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "organizations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "organizations" ALTER COLUMN "status" TYPE "OrgStatus" USING ("status"::text::"OrgStatus");
ALTER TABLE "organizations" ALTER COLUMN "status" SET DEFAULT 'active'::"OrgStatus";

ALTER TABLE "onboarding_applications" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;
ALTER TABLE "onboarding_applications" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ(6);
ALTER TABLE "onboarding_applications" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "onboarding_applications" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "onboarding_applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "onboarding_applications" ALTER COLUMN "status" TYPE "ApplicationStatus" USING ("status"::text::"ApplicationStatus");
ALTER TABLE "onboarding_applications" ALTER COLUMN "status" SET DEFAULT 'submitted'::"ApplicationStatus";
UPDATE "onboarding_applications" SET "submitted_at" = "created_at" WHERE "submitted_at" IS NULL;

ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ(6);
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ(6);
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "invites" ALTER COLUMN "role" TYPE "OrgRole" USING ("role"::text::"OrgRole");
ALTER TABLE "invites" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invites" ALTER COLUMN "status" TYPE "InviteStatus" USING ("status"::text::"InviteStatus");
ALTER TABLE "invites" ALTER COLUMN "status" SET DEFAULT 'pending_send'::"InviteStatus";
CREATE UNIQUE INDEX IF NOT EXISTS "invites_org_id_email_role_key" ON "invites"("org_id", "email", "role");

ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "org_id" UUID;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "audit_log" ALTER COLUMN "target_id" TYPE TEXT USING ("target_id"::text);
CREATE INDEX IF NOT EXISTS "audit_log_org_id_idx" ON "audit_log"("org_id");

CREATE TABLE IF NOT EXISTS "org_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "org_role" "OrgRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "org_memberships_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_id_person_id_org_role_key" ON "org_memberships"("org_id", "person_id", "org_role");
CREATE INDEX IF NOT EXISTS "org_memberships_org_id_status_idx" ON "org_memberships"("org_id", "status");
CREATE INDEX IF NOT EXISTS "org_memberships_person_id_status_idx" ON "org_memberships"("person_id", "status");
