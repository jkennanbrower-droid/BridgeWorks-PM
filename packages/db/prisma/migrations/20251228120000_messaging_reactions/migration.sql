ALTER TABLE "messaging_messages"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deleted_for_everyone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "edited_by_id" TEXT;

CREATE TABLE IF NOT EXISTS "messaging_reactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "thread_id" UUID NOT NULL REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "message_id" UUID NOT NULL REFERENCES "messaging_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("message_id", "user_id", "emoji")
);

CREATE INDEX IF NOT EXISTS "idx_messaging_reactions_message" ON "messaging_reactions"("message_id");
