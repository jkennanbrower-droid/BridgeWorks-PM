# Messaging UI Prompt 2 — Demo Sessions & Identity

## What Prompt 2 adds (vs Prompt 1 / 3 / 4)
- Prompt 1: Built the enterprise Messaging UI/UX + `MessagingClient` contract + `MockMessagingClient` (already done).
- Prompt 2 (this): Adds demo identity + session separation + per-app isolation + persistent demo users + safe reset rules while keeping Prompt 1 UI/UX and contracts intact.
- Prompt 3: Replaces mock messaging with DB+API using the same `MessagingClient` contract and the ViewerContext contract defined here.
- Prompt 4: Adds realtime, jobs, notifications, and SLA processing.

## Demo identity + data model

### App identity inputs
- `appId`: `"staff" | "user" | "org" | ...` (namespaces all demo storage).
- `orgId`: stable per app, default `"demo-org-1"` (future-safe for real tenancy).

### Demo user (per appId + orgId)
Stored in localStorage (mini DB):
- Key: `bw.demo.users.v1.{appId}.{orgId}`
- Shape: `{ version: 1, createdAt, users: DemoUser[] }`
- `DemoUser` fields:
  - `id` (stable)
  - `role` (string)
  - `displayName`
  - `email` (demo)
  - `permissions` = `["SUPER"]` (demo-only, app-scoped)
  - `avatarUrl?` (optional demo)

### Required demo users (exactly 3 per app)
- Staff: `staff_admin`, `property_manager`, `maintenance`
- User: `tenant_primary`, `tenant_roommate`, `tenant_guest`
- Org: `org_owner`, `org_admin`, `org_accountant`

### Demo session (session ≠ user ≠ data)
Stored in localStorage:
- Key: `bw.demo.session.v1.{appId}`
- Shape: `{ version: 1, appId, orgId, userId, sessionId, createdAt, lastSignedInAt }`
- `userId`: selected demo user
- `sessionId`: ephemeral, rotates on sign out
- `orgId`: stable per app (default `"demo-org-1"`)

## Session vs identity vs data reset rules

### Ensure session (`ensureDemoSession(appId)`)
- Guarantees `orgId`
- Guarantees demo users exist for `{appId, orgId}`
- Guarantees an active demo user (`userId`)
- Persists across refresh

### Sign out (`resetDemoSession(appId)`)
- Rotates `sessionId`
- Clears dashboard UI state for `appId`
- Clears messaging UI-only state for `appId` (drafts/selection/hidden-message state)
- Does NOT delete demo users
- Does NOT delete persisted messaging mock data

### Explicit demo reset (`resetDemoData(appId, orgId)`)
- Deletes demo users for `{appId, orgId}`
- Clears mock messaging data for `{appId, orgId}`
- Clears dashboard + messaging UI state for `appId`
- Scoped ONLY to current `{appId, orgId}`

## Viewer context contract (for Prompt 3)
Viewer context is the single source of identity for messaging:
- `appId`
- `orgId`
- `actorId` (demo user id)
- `roleHint` (role string)
- `isStaffView`
- `sessionId` (for Prompt 3+ request headers/trace)

Rules:
- Messaging derives identity from demo session and demo users.
- Messaging never invents `orgId` or `actorId` internally.

## Success conditions
- Each app has 3 full demo users with stable identities
- Continue auto-logs in last active demo user (no login form)
- Staff/User/Org sessions and demo users are fully isolated (appId + orgId namespacing)
- Sign out resets session + UI, not identity (unless explicit reset)
- Mock messaging data can be cleared cleanly per `{appId, orgId}`
- Messaging UI/UX is unchanged from Prompt 1
- Viewer context is future-safe for Prompt 3
- No deep imports from app-internals into `packages/ui`

## Failure conditions
- UI redesign or layout changes
- `MessagingClient` contract changes
- Demo users shared across apps
- Clearing data across portals
- Hard-coded auth assumptions

## Deferred TODOs
- Prompt 3: Replace mock client with API client using ViewerContext headers (`sessionId`, `orgId`, `actorId`)
- Prompt 4: Realtime, jobs, notifications, SLA processing
- Replace demo `SUPER` permissions with real permission evaluation

