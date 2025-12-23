# Messaging UI — Prompt 1 Plan

## Overview
Prompt 1 builds UI/UX + architecture building blocks only:
- No DB, no real auth, no hard-coded endpoints.
- UI talks to a `MessagingClient` interface; Prompt 3 will introduce `HttpMessagingClient` with the same contract and swap it in without rewriting UI.

Prompt 2/3/4 sequence:
- Prompt 2: demo session isolation (per-app sessions), Home/Sign out, viewer context sourcing.
- Prompt 3: replace mock with DB+API (`HttpMessagingClient`) using identical types/payloads.
- Prompt 4: realtime/jobs/notifications using identical types/payloads.

## Architecture Notes
- `packages/ui/src/messaging/types.ts`: shared messaging types (UI-local for now).
- `packages/ui/src/messaging/client.ts`: `MessagingClient` contract (UI depends on this only).
- `packages/ui/src/messaging/mockClient.ts`: in-memory + seeded demo data, namespaced by viewer context and persisted in localStorage (optional).
- `packages/ui/src/messaging/useMessagingClient.ts`: factory hook returning a memoized client per namespace.
- No direct fetch calls in UI. No hard-coded API URLs.

## Checklist

### Phase 0 — Plan doc
- [x] Add this plan doc.

### Phase 1 — Architecture building blocks
- [x] Define UI-local messaging types.
- [x] Define `MessagingClient` interface.
- [x] Implement `MockMessagingClient` with seeded data and persistence.
- [x] Add `useMessagingClient(viewer)` factory hook.

### Phase 2 — Messages module (threads)
- [x] Keep existing grid layout + details rail sizing.
- [x] Viewer context derived from `appId`/`isStaffView` (TODO: Prompt 2 replaces).
- [x] Thread filtering/search/sort via `ThreadQuery` and `client.listThreads`.
- [x] Row indicators: preview, timestamp, unread badge, assignee, SLA indicator.
- [x] Bulk select + bulk actions using `client.bulkUpdateThreads`.
- [x] New Thread modal creates thread using `client.createThread`.

### Phase 3 — Conversation
- [x] Header actions: in-thread search + next/prev, quick actions.
- [x] In-thread search highlight + navigation.
- [x] Composer: channel switch, attachments (picker + drag/drop UI), emoji insertion, canned responses, scheduled send, send via `client.sendMessage`.

### Phase 4 — Thread details panel
- [x] Keep Info/Internal tabs; gate Internal by `isStaffView`.
- [x] Editable fields via lightweight popovers/inputs; update via callback to UI.
- [x] Timeline (audit) shown from mock audit events.
- [x] Related links (work order) actions remain reachable via header + panel.

### Phase 5 — isStaffView determination
- [x] `isStaffView` derived from `appId` or role hint set.

## Success Conditions
- Thread search/filters update results immediately and can be cleared.
- Sorting works (newest/oldest/SLA/priority).
- New Thread modal creates and selects a new thread.
- Bulk select updates multiple threads via client.
- Composer supports attachments UI, emoji insertion, canned responses, scheduled send, channel switching; sending adds messages.
- In-thread search highlights and next/prev navigation works.
- Details panel edits update thread state; timeline visible; Internal tab gated by staff view.
- No hard-coded endpoints or direct fetch usage in UI.

## Failure Conditions
- Layout is redesigned or grid columns replaced.
- UI contains direct fetch calls or hard-coded API URLs.
- Search/filters are non-functional.
- Features are static placeholders only.

## Deferred / TODO (Prompt 2–4)
- Prompt 2: real demo session manager + per-app session isolation; Home/Sign out wiring; viewer context sourcing.
- Prompt 3: `HttpMessagingClient`, server-side filtering/sorting/pagination, real participant/unit/template sources.
- Prompt 4: realtime events, scheduled-send worker, SLA jobs, delivery receipts/providers.

