# Messaging DB/API (Prompt 3)

## Goal
- Swap the UI `MessagingClient` implementation from `MockMessagingClient` to a real API-backed `HttpMessagingClient` while keeping the existing messaging UI/layout unchanged.

## Identity vs session (Prompt 2.5 rule)
- Persistent scoping uses stable identity: `appId + orgId(orgKey) + actorId`.
- `sessionId` is **ephemeral** and must **not** be used for DB persistence scoping or storage namespaces; it is request/session context only.

## Phase checklist
- [x] Phase 1: Prisma schema + SQL migration for messaging tables/enums.
- [x] Phase 2: `apps/api` endpoints (Express + pg Pool), demo-header scoped, mounted at both `/messaging/*` and `/api/messaging/*`.
- [x] Phase 3: `HttpMessagingClient` + feature-flag swap, attachments upload via `/api/r2-upload`, keep UI unchanged.

## After merging
- Apply DB schema (pick one):
  - Preferred: `pnpm db:migrate` (deploy/apply-only)
  - If Prisma migration state is drifted: `pnpm db:bootstrap-messaging`
  - If Prisma migration checksums/drift block you: `pnpm db:repair` then rerun `pnpm db:migrate`

## Endpoint contract mapping (MessagingClient → routes)
- `listThreads(query)` → `GET /api/messaging/threads` (also available at `/messaging/threads`)
- `listMessages(threadId)` → `GET /api/messaging/threads/:threadId/messages` (+ best-effort `POST /api/messaging/threads/:threadId/read`)
- `createThread(input)` → `POST /api/messaging/threads`
- `sendMessage(threadId, input)` → `POST /api/messaging/threads/:threadId/messages`
- `updateThread(threadId, patch)` → `PATCH /api/messaging/threads/:threadId`
- `bulkUpdateThreads(threadIds, action)` → `POST /api/messaging/threads/bulk`
- `searchGlobal({ text })` → `GET /api/messaging/search?text=...`
- `deleteMessage(threadId, messageId)` → deferred (no endpoint in Prompt 3)

## Request scoping (demo soft-auth)
- Required headers (401 if missing): `X-Demo-Org-Id`, `X-Demo-Actor-Id`
- Additional headers passed through (not used for persistence scoping): `X-Demo-App-Id`, `X-Demo-Role`, `X-Demo-Session-Id`

## Tenant org mapping (ensureOrgId)
- If `X-Demo-Org-Id` looks like a UUID: treated as `orgId` and an `organizations` row is inserted if missing.
- Else treated as a stable demo key (slug-like): looks up `organizations.slug = orgKey`, and inserts a new org if missing.
- Note: `organizations.slug` is not unique in current schema; demo mapping uses first match by `created_at` and may create duplicates under concurrent inserts. #TODO: enforce uniqueness or replace with real tenancy claims.

## Success conditions
- Messaging tables/enums exist in `packages/db` schema + a new migration is added.
- API endpoints exist under both route prefixes and are scoped by derived `orgId` (no cross-org leakage).
- Thread list supports filters/sort/search and includes `unreadCount` per actor.
- Create thread, send message (incl. attachments metadata), update thread, bulk updates, global search, and mark-read work against the DB.
- UI swaps to `HttpMessagingClient` when `NEXT_PUBLIC_API_BASE_URL` is set and `messagingFlags.useApi` is true; falls back to mock if API is unreachable.
- `sessionId` is not used for persistent scoping/storage.

## Failure conditions
- Importing TS-only modules into the `apps/api` runtime.
- Breaking existing `MessagingClient` method signatures used by the UI.
- Missing or incorrect org scoping on any endpoint.
- UI layout changes/redesign.
- Hard-coded provider delivery logic instead of persisting channel/status for Prompt 4.

## Deferred to Prompt 4
- Realtime updates (SSE/WebSocket), delivery jobs, retries, provider integration, notification pipelines.
- Full RBAC enforcement/policy decisions, retention, escalation triggers.
- Delete semantics (message/thread), hard deletes, and archive UX.
- Large-file/presigned/multipart/resumable uploads and attachment scanning pipeline.
