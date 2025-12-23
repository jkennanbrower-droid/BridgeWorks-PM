DO $$ BEGIN
  CREATE TYPE "MessagingChannel" AS ENUM ('portal', 'sms', 'email');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagingThreadStatus" AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagingThreadPriority" AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagingThreadKind" AS ENUM ('direct', 'group');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagingDeliveryStatus" AS ENUM ('draft', 'queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessagingNotifyPreference" AS ENUM ('immediate', 'digest', 'muted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "messaging_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "kind" "MessagingThreadKind" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MessagingThreadStatus" NOT NULL,
    "priority" "MessagingThreadPriority" NOT NULL,
    "channel_default" "MessagingChannel" NOT NULL,
    "property_id" TEXT,
    "unit_id" TEXT,
    "assignee_id" TEXT,
    "assignee_label" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "due_date" TIMESTAMPTZ(6),
    "sla_due_at" TIMESTAMPTZ(6),
    "linked_work_order_id" TEXT,
    "linked_task_id" TEXT,
    "last_message_preview" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "messaging_threads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_threads_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "messaging_threads_org_id_updated_at_idx" ON "messaging_threads"("org_id", "updated_at");
CREATE INDEX IF NOT EXISTS "messaging_threads_org_id_status_idx" ON "messaging_threads"("org_id", "status");
CREATE INDEX IF NOT EXISTS "messaging_threads_org_id_priority_idx" ON "messaging_threads"("org_id", "priority");
CREATE INDEX IF NOT EXISTS "messaging_threads_org_id_sla_due_at_idx" ON "messaging_threads"("org_id", "sla_due_at");

CREATE TABLE IF NOT EXISTS "messaging_thread_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "participant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "last_read_at" TIMESTAMPTZ(6),
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "notify_preference" "MessagingNotifyPreference" NOT NULL DEFAULT 'immediate',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_thread_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_thread_participants_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "messaging_thread_participants_thread_id_participant_id_key" ON "messaging_thread_participants"("thread_id", "participant_id");
CREATE INDEX IF NOT EXISTS "messaging_thread_participants_org_id_participant_id_idx" ON "messaging_thread_participants"("org_id", "participant_id");
CREATE INDEX IF NOT EXISTS "messaging_thread_participants_thread_id_idx" ON "messaging_thread_participants"("thread_id");

CREATE TABLE IF NOT EXISTS "messaging_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "internal_only" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_for" TIMESTAMPTZ(6),
    "delivery_status" "MessagingDeliveryStatus" NOT NULL DEFAULT 'sent',
    "delivery_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "messaging_messages_thread_id_created_at_idx" ON "messaging_messages"("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "messaging_messages_org_id_created_at_idx" ON "messaging_messages"("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "messaging_messages_delivery_status_idx" ON "messaging_messages"("delivery_status");

CREATE TABLE IF NOT EXISTS "messaging_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "message_id" UUID,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storage_key" TEXT,
    "public_url" TEXT,
    "scan_status" TEXT,

    CONSTRAINT "messaging_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_attachments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_attachments_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messaging_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "messaging_attachments_thread_id_uploaded_at_idx" ON "messaging_attachments"("thread_id", "uploaded_at");
CREATE INDEX IF NOT EXISTS "messaging_attachments_message_id_idx" ON "messaging_attachments"("message_id");

CREATE TABLE IF NOT EXISTS "messaging_thread_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_label" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_thread_audit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_thread_audit_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_thread_audit_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "messaging_thread_audit_thread_id_created_at_idx" ON "messaging_thread_audit"("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "messaging_thread_audit_org_id_created_at_idx" ON "messaging_thread_audit"("org_id", "created_at");

CREATE TABLE IF NOT EXISTS "messaging_thread_followers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "follower_id" TEXT NOT NULL,

    CONSTRAINT "messaging_thread_followers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messaging_thread_followers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messaging_thread_followers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "messaging_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "messaging_thread_followers_thread_id_follower_id_key" ON "messaging_thread_followers"("thread_id", "follower_id");
CREATE INDEX IF NOT EXISTS "messaging_thread_followers_follower_id_idx" ON "messaging_thread_followers"("follower_id");

