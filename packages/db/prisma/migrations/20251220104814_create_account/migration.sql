-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CLERK');

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_org_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_applications" DROP CONSTRAINT "onboarding_applications_provisioned_org_id_fkey";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invites" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "onboarding_applications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "people" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
