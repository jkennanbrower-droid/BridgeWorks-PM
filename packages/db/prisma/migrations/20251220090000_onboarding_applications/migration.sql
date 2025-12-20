-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "onboarding_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "portfolio_types" JSONB,
    "approx_properties" INTEGER,
    "approx_units" INTEGER,
    "current_software" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_applications_pkey" PRIMARY KEY ("id")
);
