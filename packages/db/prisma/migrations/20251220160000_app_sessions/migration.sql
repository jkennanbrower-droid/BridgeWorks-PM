DO $$ BEGIN
  CREATE TYPE "AppName" AS ENUM ('public', 'user', 'staff', 'org', 'console');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "app_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "app" "AppName" NOT NULL,
    "session_key" TEXT NOT NULL,
    "clerk_user_id" TEXT,
    "is_authenticated" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_sessions_app_session_key_key" ON "app_sessions"("app", "session_key");
CREATE INDEX IF NOT EXISTS "app_sessions_app_last_seen_at_idx" ON "app_sessions"("app", "last_seen_at");

