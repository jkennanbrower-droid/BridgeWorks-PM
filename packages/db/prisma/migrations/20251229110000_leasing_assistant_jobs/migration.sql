-- Leasing assistant automation jobs

CREATE TABLE IF NOT EXISTS "leasing_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" UUID,
  "job_key" VARCHAR(80) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "leasing_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leasing_jobs_org_id_job_key_idx"
  ON "leasing_jobs" ("org_id", "job_key");

CREATE TABLE IF NOT EXISTS "leasing_job_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID,
  "org_id" UUID,
  "job_key" VARCHAR(80) NOT NULL,
  "idempotency_key" VARCHAR(200) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'STARTED',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "metadata" JSONB,
  "error" TEXT,

  CONSTRAINT "leasing_job_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leasing_job_runs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "leasing_jobs"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "leasing_job_runs_idempotency_key_idx"
  ON "leasing_job_runs" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "leasing_job_runs_job_key_idx"
  ON "leasing_job_runs" ("job_key");

CREATE INDEX IF NOT EXISTS "leasing_job_runs_org_id_idx"
  ON "leasing_job_runs" ("org_id");
