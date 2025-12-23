import type { MessagingClient } from "./client";
import { messagingFlags } from "./flags";
import type {
  Attachment,
  AuditEvent,
  Message,
  MessagingChannel,
  Participant,
  Thread,
  ThreadPriority,
  ThreadQuery,
  ThreadStatus,
  ViewerContext,
} from "./types";

type MockStore = {
  version: 1;
  threadsById: Record<string, Thread>;
  threadIds: string[];
  messagesByThreadId: Record<string, Message[]>;
  attachmentsById: Record<string, Attachment>;
  participantsById: Record<string, Participant>;
  auditByThreadId: Record<string, AuditEvent[]>;
};

export const MOCK_UNASSIGNED_TOKEN = "__unassigned__";

function nowIso() {
  return new Date().toISOString();
}

function minutesAgoIso(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

let fallbackIdCounter = 0;
function newId(prefix: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uuid = (globalThis as any).crypto?.randomUUID?.();
    if (typeof uuid === "string") return `${prefix}_${uuid}`;
  } catch {
    // ignore
  }
  fallbackIdCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${fallbackIdCounter}`;
}

function normalizeText(text: string) {
  return text.toLowerCase().trim();
}

function tokensFromQuery(text: string) {
  return normalizeText(text)
    .split(/\\s+/g)
    .filter(Boolean);
}

function includesAllTokens(haystack: string, tokens: string[]) {
  const normalized = normalizeText(haystack);
  return tokens.every((token) => normalized.includes(token));
}

function priorityRank(priority: ThreadPriority) {
  if (priority === "urgent") return 4;
  if (priority === "high") return 3;
  if (priority === "normal") return 2;
  return 1;
}

function sortThreads(threads: Thread[], sortKey: ThreadQuery["sortKey"]) {
  const key = sortKey ?? "updated_desc";
  const byUpdated = (a: Thread, b: Thread) =>
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  const bySla = (a: Thread, b: Thread) => {
    const aTime = a.slaDueAt
      ? new Date(a.slaDueAt).getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = b.slaDueAt
      ? new Date(b.slaDueAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return byUpdated(b, a);
  };
  const byPriority = (a: Thread, b: Thread) => {
    const delta = priorityRank(b.priority) - priorityRank(a.priority);
    return delta !== 0 ? delta : byUpdated(b, a);
  };

  const sorted = [...threads];
  sorted.sort((a, b) => {
    if (key === "updated_asc") return byUpdated(a, b);
    if (key === "sla_asc") return bySla(a, b);
    if (key === "priority_desc") return byPriority(a, b);
    return byUpdated(b, a);
  });
  return sorted;
}

function applyThreadQuery(threads: Thread[], query: ThreadQuery) {
  let filtered = [...threads];

  if (query.tab === "archived") {
    filtered = filtered.filter((t) => Boolean(t.archivedAt));
  } else {
    filtered = filtered.filter((t) => !t.archivedAt);
  }

  if (query.tab === "groups") filtered = filtered.filter((t) => t.kind === "group");
  if (query.tab === "unread") filtered = filtered.filter((t) => (t.unreadCount ?? 0) > 0);

  if (query.status?.length) {
    const allowed = new Set<ThreadStatus>(query.status);
    filtered = filtered.filter((t) => allowed.has(t.status));
  }
  if (query.channel?.length) {
    const allowed = new Set<MessagingChannel>(query.channel);
    filtered = filtered.filter((t) => allowed.has(t.channelDefault));
  }
  if (query.priority?.length) {
    const allowed = new Set<ThreadPriority>(query.priority);
    filtered = filtered.filter((t) => allowed.has(t.priority));
  }
  if (query.propertyId?.length) {
    const allowed = new Set(query.propertyId);
    filtered = filtered.filter((t) => (t.propertyId ? allowed.has(t.propertyId) : false));
  }
  if (query.unitId?.length) {
    const allowed = new Set(query.unitId);
    filtered = filtered.filter((t) => (t.unitId ? allowed.has(t.unitId) : false));
  }
  if (query.assigneeId?.length) {
    const allowed = new Set(query.assigneeId);
    filtered = filtered.filter((t) => {
      if (!t.assigneeId) return allowed.has(MOCK_UNASSIGNED_TOKEN);
      return allowed.has(t.assigneeId);
    });
  }

  if (query.dateFrom) {
    const from = new Date(query.dateFrom).getTime();
    filtered = filtered.filter((t) => new Date(t.updatedAt).getTime() >= from);
  }
  if (query.dateTo) {
    const to = new Date(query.dateTo).getTime();
    filtered = filtered.filter((t) => new Date(t.updatedAt).getTime() <= to);
  }

  if (query.text?.trim()) {
    const tokens = tokensFromQuery(query.text);
    filtered = filtered.filter((t) => {
      const participantNames = t.participants.map((p) => p.name).join(" ");
      const haystack = [
        t.title,
        t.lastMessagePreview ?? "",
        t.propertyLabel ?? "",
        t.unitLabel ?? "",
        t.assigneeLabel ?? "",
        (t.tags ?? []).join(" "),
        participantNames,
      ].join(" ");
      return includesAllTokens(haystack, tokens);
    });
  }

  return sortThreads(filtered, query.sortKey);
}

function seedStore(viewer: ViewerContext): MockStore {
  const participants: Participant[] = [
    {
      id: viewer.actorId,
      name: viewer.isStaffView ? "You (Staff)" : "You (Tenant)",
      role: viewer.isStaffView ? "staff" : "tenant",
      presence: "online",
    },
    { id: "demo-tenant-1", name: "Anna Williams", role: "tenant", presence: "online" },
    { id: "demo-tenant-2", name: "Robert Mitchell", role: "tenant", presence: "offline" },
    { id: "demo-tenant-3", name: "Becky Sanders", role: "tenant", presence: "offline" },
    { id: "demo-tenant-4", name: "Carlos Munoz", role: "tenant", presence: "offline" },
    { id: "demo-staff-2", name: "Dana Kim", role: "staff", presence: "online" },
    { id: "demo-staff-3", name: "Sasha Patel", role: "staff", presence: "offline" },
    { id: "demo-staff-4", name: "Mike Chen", role: "staff", presence: "offline" },
    { id: "demo-vendor-1", name: "Apex HVAC", role: "vendor", presence: "offline" },
    { id: "demo-org-1", name: "BridgeWorks Ops", role: "org", presence: "online" },
    { id: "demo-internal-1", name: "Internal Bot", role: "internal", presence: "online" },
  ];
  const participantsById: Record<string, Participant> = Object.fromEntries(
    participants.map((p) => [p.id, p]),
  );

  const properties = [
    { id: "prop-riverstone", label: "Riverstone Apartments" },
    { id: "prop-maple", label: "Maplewood Flats" },
    { id: "prop-oak", label: "Oak Ridge Townhomes" },
  ];
  const units = [
    { id: "unit-rs-14", label: "Unit 14", propertyId: "prop-riverstone" },
    { id: "unit-rs-22", label: "Unit 22", propertyId: "prop-riverstone" },
    { id: "unit-mp-7", label: "Unit 7", propertyId: "prop-maple" },
    { id: "unit-ok-3b", label: "Unit 3B", propertyId: "prop-oak" },
  ];

  const createdAt = minutesAgoIso(20 * 24 * 60);

  const threads: Thread[] = [
    {
      id: "t-ac-14",
      title: "AC not cooling - Unit 14 (follow-up)",
      kind: "direct",
      status: "open",
      priority: "high",
      channelDefault: "sms",
      createdAt,
      updatedAt: minutesAgoIso(2),
      lastMessagePreview: "Can someone come by this afternoon?",
      unreadCount: 2,
      propertyId: properties[0]!.id,
      propertyLabel: properties[0]!.label,
      unitId: units[0]!.id,
      unitLabel: units[0]!.label,
      assigneeId: "demo-staff-2",
      assigneeLabel: "Dana K.",
      tags: ["hvac", "follow-up"],
      followers: [],
      slaDueAt: minutesAgoIso(-90),
      linkedWorkOrderId: "WO-1842",
      participants: [
        participantsById["demo-tenant-1"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-2"]!,
      ],
    },
    {
      id: "t-leak-22",
      title: "Kitchen sink leak (photos attached)",
      kind: "direct",
      status: "pending",
      priority: "urgent",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(25),
      lastMessagePreview: "Water is spreading under the cabinet.",
      unreadCount: 1,
      propertyId: properties[0]!.id,
      propertyLabel: properties[0]!.label,
      unitId: units[1]!.id,
      unitLabel: units[1]!.label,
      assigneeId: "demo-staff-4",
      assigneeLabel: "Mike C.",
      archivedAt: nowIso(),
      tags: ["plumbing"],
      followers: [],
      slaDueAt: minutesAgoIso(45),
      participants: [
        participantsById["demo-tenant-2"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-4"]!,
      ],
    },
    {
      id: "t-renewal",
      title: "Lease renewal questions",
      kind: "direct",
      status: "open",
      priority: "normal",
      channelDefault: "email",
      createdAt,
      updatedAt: minutesAgoIso(6 * 60),
      lastMessagePreview: "Do I need to sign anything this week?",
      unreadCount: 0,
      propertyId: properties[1]!.id,
      propertyLabel: properties[1]!.label,
      unitId: units[2]!.id,
      unitLabel: units[2]!.label,
      tags: ["leasing"],
      followers: [],
      slaDueAt: minutesAgoIso(6 * 60 + 60),
      participants: [
        participantsById["demo-tenant-3"]!,
        participantsById[viewer.actorId]!,
      ],
    },
    {
      id: "t-group-ops",
      title: "Team Chat: after-hours coverage",
      kind: "group",
      status: "open",
      priority: "normal",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(18),
      lastMessagePreview: "I can cover Friday night.",
      unreadCount: 5,
      tags: ["ops"],
      followers: [],
      participants: [
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-2"]!,
        participantsById["demo-staff-3"]!,
        participantsById["demo-org-1"]!,
      ],
    },
    {
      id: "t-trash",
      title: "Trash pickup missed again",
      kind: "direct",
      status: "resolved",
      priority: "low",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(2 * 24 * 60),
      lastMessagePreview: "Thanks, they came this morning.",
      unreadCount: 0,
      propertyId: properties[2]!.id,
      propertyLabel: properties[2]!.label,
      unitId: units[3]!.id,
      unitLabel: units[3]!.label,
      assigneeId: "demo-staff-3",
      assigneeLabel: "Sasha P.",
      tags: ["grounds"],
      followers: [],
      linkedTaskId: "TASK-119",
      participants: [
        participantsById["demo-tenant-4"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-3"]!,
      ],
    },
    {
      id: "t-vendor-hvac",
      title: "Vendor: HVAC preventative maintenance",
      kind: "group",
      status: "open",
      priority: "high",
      channelDefault: "email",
      createdAt,
      updatedAt: minutesAgoIso(9 * 60),
      lastMessagePreview: "Attached schedule for next week.",
      unreadCount: 0,
      assigneeId: "demo-staff-2",
      assigneeLabel: "Dana K.",
      tags: ["vendor", "hvac"],
      followers: [],
      slaDueAt: minutesAgoIso(24 * 60),
      linkedTaskId: "TASK-402",
      participants: [
        participantsById[viewer.actorId]!,
        participantsById["demo-vendor-1"]!,
        participantsById["demo-staff-2"]!,
      ],
    },
    {
      id: "t-noise",
      title: "Noise complaint (quiet hours)",
      kind: "direct",
      status: "pending",
      priority: "normal",
      channelDefault: "sms",
      createdAt,
      updatedAt: minutesAgoIso(55),
      lastMessagePreview: "It’s still loud upstairs.",
      unreadCount: 0,
      propertyId: properties[1]!.id,
      propertyLabel: properties[1]!.label,
      unitId: units[2]!.id,
      unitLabel: units[2]!.label,
      assigneeId: "demo-staff-2",
      assigneeLabel: "Dana K.",
      tags: ["policy"],
      followers: [],
      slaDueAt: minutesAgoIso(6 * 60),
      participants: [
        participantsById["demo-tenant-1"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-2"]!,
      ],
    },
    {
      id: "t-parking",
      title: "Parking permit - new vehicle",
      kind: "direct",
      status: "open",
      priority: "low",
      channelDefault: "email",
      createdAt,
      updatedAt: minutesAgoIso(3 * 24 * 60 + 30),
      lastMessagePreview: "Plate is 7XYZ123.",
      unreadCount: 0,
      propertyId: properties[2]!.id,
      propertyLabel: properties[2]!.label,
      unitId: units[3]!.id,
      unitLabel: units[3]!.label,
      tags: ["parking"],
      followers: [],
      participants: [
        participantsById["demo-tenant-2"]!,
        participantsById[viewer.actorId]!,
      ],
    },
    {
      id: "t-moveout",
      title: "Move-out inspection scheduling",
      kind: "direct",
      status: "closed",
      priority: "normal",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(14 * 24 * 60),
      lastMessagePreview: "Inspection completed. Deposit timeline sent.",
      unreadCount: 0,
      propertyId: properties[0]!.id,
      propertyLabel: properties[0]!.label,
      unitId: units[1]!.id,
      unitLabel: units[1]!.label,
      assigneeId: "demo-staff-3",
      assigneeLabel: "Sasha P.",
      tags: ["move-out"],
      followers: [],
      participants: [
        participantsById["demo-tenant-3"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-3"]!,
      ],
    },
    {
      id: "t-rent",
      title: "Rent payment posted?",
      kind: "direct",
      status: "open",
      priority: "normal",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(3 * 60),
      lastMessagePreview: "I see a pending charge in my bank.",
      unreadCount: 3,
      propertyId: properties[1]!.id,
      propertyLabel: properties[1]!.label,
      unitId: units[2]!.id,
      unitLabel: units[2]!.label,
      tags: ["billing"],
      followers: [],
      slaDueAt: minutesAgoIso(12 * 60),
      participants: [
        participantsById["demo-tenant-4"]!,
        participantsById[viewer.actorId]!,
      ],
    },
    {
      id: "t-pool",
      title: "Pool hours clarification",
      kind: "direct",
      status: "resolved",
      priority: "low",
      channelDefault: "sms",
      createdAt,
      updatedAt: minutesAgoIso(4 * 24 * 60),
      lastMessagePreview: "Got it, thank you!",
      unreadCount: 0,
      propertyId: properties[2]!.id,
      propertyLabel: properties[2]!.label,
      unitId: units[3]!.id,
      unitLabel: units[3]!.label,
      tags: ["amenities"],
      followers: [],
      participants: [
        participantsById["demo-tenant-1"]!,
        participantsById[viewer.actorId]!,
      ],
    },
    {
      id: "t-gate",
      title: "Gate code not working",
      kind: "direct",
      status: "pending",
      priority: "high",
      channelDefault: "portal",
      createdAt,
      updatedAt: minutesAgoIso(80),
      lastMessagePreview: "It fails after I enter the last digit.",
      unreadCount: 0,
      propertyId: properties[0]!.id,
      propertyLabel: properties[0]!.label,
      unitId: units[0]!.id,
      unitLabel: units[0]!.label,
      assigneeId: "demo-staff-4",
      assigneeLabel: "Mike C.",
      tags: ["access"],
      followers: [],
      slaDueAt: minutesAgoIso(20),
      participants: [
        participantsById["demo-tenant-2"]!,
        participantsById[viewer.actorId]!,
        participantsById["demo-staff-4"]!,
      ],
    },
  ];

  const threadsById: Record<string, Thread> = Object.fromEntries(
    threads.map((t) => [t.id, t]),
  );
  const messagesByThreadId: Record<string, Message[]> = {};
  const attachmentsById: Record<string, Attachment> = {};
  const auditByThreadId: Record<string, AuditEvent[]> = {};

  const cannedBodies = [
    "Thanks for the update — I’m checking on this now.",
    "Understood. I’ll coordinate with maintenance and follow up shortly.",
    "Can you confirm the best time today for access?",
    "I’ve created a work order and will keep you posted here.",
    "We’re on it. If anything changes, reply anytime.",
    "Can you share a photo so we can triage faster?",
  ];

  const addAudit = (threadId: string, input: Omit<AuditEvent, "id">) => {
    const event: AuditEvent = { id: newId("ae"), ...input };
    auditByThreadId[threadId] = [...(auditByThreadId[threadId] ?? []), event].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  };

  const addMessage = (threadId: string, message: Message) => {
    messagesByThreadId[threadId] = [...(messagesByThreadId[threadId] ?? []), message].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  };

  const addAttachments = (
    threadId: string,
    messageId: string,
    uploadedById: string,
    defs: Array<{ fileName: string; mimeType: string; sizeBytes: number }>,
  ) => {
    const uploadedAt = nowIso();
    return defs.map((def) => {
      const attachment: Attachment = {
        id: newId("att"),
        threadId,
        messageId,
        fileName: def.fileName,
        mimeType: def.mimeType,
        sizeBytes: def.sizeBytes,
        uploadedAt,
        uploadedById,
      };
      attachmentsById[attachment.id] = attachment;
      return attachment;
    });
  };

  threads.forEach((thread, index) => {
    const baseMinutesAgo = 12 * 60 + index * 13;
    const count = Math.min(40, Math.max(5, 10 + (index % 7) * 5));
    const participantIds = thread.participants.map((p) => p.id);
    const otherId = participantIds.find((id) => id !== viewer.actorId) ?? participantIds[0]!;

    addAudit(thread.id, {
      threadId: thread.id,
      type: "thread.created",
      actorId: otherId,
      actorLabel: participantsById[otherId]?.name ?? "System",
      createdAt,
      meta: { title: thread.title },
    });
    if (thread.assigneeId) {
      addAudit(thread.id, {
        threadId: thread.id,
        type: "thread.assigned",
        actorId: viewer.actorId,
        actorLabel: participantsById[viewer.actorId]?.name ?? "You",
        createdAt: minutesAgoIso(baseMinutesAgo),
        meta: { assigneeId: thread.assigneeId, assigneeLabel: thread.assigneeLabel },
      });
    }
    if (thread.tags?.length) {
      addAudit(thread.id, {
        threadId: thread.id,
        type: "thread.tagged",
        actorId: viewer.actorId,
        actorLabel: participantsById[viewer.actorId]?.name ?? "You",
        createdAt: minutesAgoIso(baseMinutesAgo - 20),
        meta: { tags: thread.tags },
      });
    }

    for (let i = 0; i < count; i += 1) {
      const fromYou = i % 3 === 1;
      const senderId = fromYou ? viewer.actorId : otherId;
      const senderLabel =
        participantsById[senderId]?.name ?? (fromYou ? "You" : "Participant");
      const body =
        cannedBodies[(i + index) % cannedBodies.length] +
        (i % 5 === 0 ? ` (ref: #BW-${1000 + index * 17 + i})` : "");

      const createdAtMessage = minutesAgoIso(baseMinutesAgo + (count - i) * 9);
      const message: Message = {
        id: newId("m"),
        threadId: thread.id,
        senderId,
        senderLabel,
        body,
        createdAt: createdAtMessage,
        channel: thread.channelDefault,
        delivery: { status: fromYou ? "delivered" : "sent", updatedAt: createdAtMessage },
      };

      if (i === Math.floor(count / 2) && index % 3 === 0) {
        message.attachments = addAttachments(thread.id, message.id, senderId, [
          { fileName: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 2_143_221 },
          { fileName: "invoice.pdf", mimeType: "application/pdf", sizeBytes: 321_114 },
        ]);
      }
      if (i === count - 3 && index % 4 === 0) {
        message.attachments = addAttachments(thread.id, message.id, senderId, [
          { fileName: "walkthrough.mp4", mimeType: "video/mp4", sizeBytes: 12_400_000 },
        ]);
      }

      addMessage(thread.id, message);
    }
  });

  return {
    version: 1,
    threadsById,
    threadIds: threads.map((t) => t.id),
    messagesByThreadId,
    attachmentsById,
    participantsById,
    auditByThreadId,
  };
}

export class MockMessagingClient implements MessagingClient {
  readonly viewer: ViewerContext;
  readonly namespaceKey: string;
  private store: MockStore;

  constructor(viewer: ViewerContext) {
    this.viewer = viewer;
    this.namespaceKey = `bw.messaging.mock.v1.${viewer.appId}.${viewer.orgId}.${viewer.actorId}`;
    this.store = this.loadOrSeed();
  }

  resetDemoSessionData(scope: "current" | "all" = "current") {
    if (scope === "all") {
      if (typeof window === "undefined") return;
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("bw.messaging.mock.v1."))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
      this.store = seedStore(this.viewer);
      this.persist();
      return;
    }
    this.clearNamespace();
  }

  clearNamespace() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(this.namespaceKey);
      } catch {
        // ignore
      }
    }
    this.store = seedStore(this.viewer);
    this.persist();
  }

  async listThreads(query: ThreadQuery): Promise<{ threads: Thread[] }> {
    const threads = this.store.threadIds
      .map((id) => this.store.threadsById[id])
      .filter((t): t is Thread => Boolean(t));
    return { threads: applyThreadQuery(threads, query) };
  }

  async listMessages(threadId: string): Promise<{ messages: Message[] }> {
    return {
      messages: (this.store.messagesByThreadId[threadId] ?? []).map((m) => ({ ...m })),
    };
  }

  async createThread(input: {
    title: string;
    kind: Thread["kind"];
    channel: MessagingChannel;
    participantIds: string[];
    tags?: string[];
    propertyId?: string;
    unitId?: string;
  }): Promise<Thread> {
    const createdAt = nowIso();
    const threadId = newId("t");
    const participants = input.participantIds
      .map((id) => this.store.participantsById[id])
      .filter((p): p is Participant => Boolean(p));

    const propertyLabel = input.propertyId
      ? Object.values(this.store.threadsById).find((t) => t.propertyId === input.propertyId)
          ?.propertyLabel
      : undefined;
    const unitLabel = input.unitId
      ? Object.values(this.store.threadsById).find((t) => t.unitId === input.unitId)?.unitLabel
      : undefined;

    const thread: Thread = {
      id: threadId,
      kind: input.kind,
      title: input.title.trim() || "New thread",
      status: "open",
      priority: "normal",
      channelDefault: input.channel,
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: "Thread created",
      unreadCount: 0,
      propertyId: input.propertyId,
      propertyLabel,
      unitId: input.unitId,
      unitLabel,
      tags: input.tags ?? [],
      participants: participants.length
        ? participants
        : [
            this.store.participantsById[this.viewer.actorId]!,
            this.store.participantsById["demo-tenant-1"]!,
          ],
      followers: [],
    };

    this.store.threadsById[thread.id] = thread;
    this.store.threadIds = [thread.id, ...this.store.threadIds];
    this.store.messagesByThreadId[thread.id] = [];
    this.store.auditByThreadId[thread.id] = [
      {
        id: newId("ae"),
        threadId,
        type: "thread.created",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt,
        meta: { title: thread.title, kind: thread.kind, channel: thread.channelDefault },
      },
    ];

    this.persist();
    return { ...thread };
  }

  async sendMessage(
    threadId: string,
    input: {
      body: string;
      channel?: MessagingChannel;
      attachments?: Array<
        Pick<Attachment, "fileName" | "mimeType" | "sizeBytes"> & {
          publicUrl?: string;
          storageKey?: string;
        }
      >;
      scheduledFor?: string;
      internalOnly?: boolean;
    },
  ): Promise<Message> {
    const thread = this.store.threadsById[threadId];
    if (!thread) throw new Error("Thread not found");

    const createdAt = nowIso();
    const message: Message = {
      id: newId("m"),
      threadId,
      senderId: this.viewer.actorId,
      senderLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
      body: input.body,
      createdAt,
      channel: input.channel ?? thread.channelDefault,
      scheduledFor: input.scheduledFor,
      internalOnly: input.internalOnly,
      delivery: {
        status: input.scheduledFor ? "queued" : "sent",
        updatedAt: createdAt,
      },
    };

    if (input.attachments?.length) {
      const uploadedAt = createdAt;
      message.attachments = input.attachments.map((a) => {
        const att: Attachment = {
          id: newId("att"),
          threadId,
          messageId: message.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          uploadedAt,
          uploadedById: this.viewer.actorId,
          publicUrl: a.publicUrl,
          storageKey: a.storageKey,
          scanStatus: "clean",
        };
        this.store.attachmentsById[att.id] = att;
        return att;
      });
    }

    this.store.messagesByThreadId[threadId] = [
      ...(this.store.messagesByThreadId[threadId] ?? []),
      message,
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    thread.updatedAt = createdAt;
    thread.lastMessagePreview = input.body.trim().slice(0, 140);
    thread.unreadCount = 0;

    this.store.auditByThreadId[threadId] = [
      ...(this.store.auditByThreadId[threadId] ?? []),
      {
        id: newId("ae"),
        threadId,
        type: "message.sent",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt,
        meta: {
          channel: message.channel,
          scheduledFor: input.scheduledFor,
          internalOnly: input.internalOnly,
          attachments: message.attachments?.map((a) => a.fileName) ?? [],
        },
      },
    ];

    this.persist();
    return { ...message };
  }

  async updateThread(
    threadId: string,
    patch: Partial<
      Pick<
        Thread,
        | "status"
        | "priority"
        | "assigneeId"
        | "assigneeLabel"
        | "tags"
        | "dueDate"
        | "slaDueAt"
        | "archivedAt"
        | "linkedWorkOrderId"
        | "linkedTaskId"
        | "followers"
      >
    >,
  ): Promise<Thread> {
    const thread = this.store.threadsById[threadId];
    if (!thread) throw new Error("Thread not found");

    const updatedAt = nowIso();
    const before = { ...thread };
    Object.assign(thread, patch);
    thread.updatedAt = updatedAt;

    const audit: AuditEvent[] = [];
    if (patch.status && patch.status !== before.status) {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.status_changed",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { from: before.status, to: patch.status },
      });
    }
    if (patch.priority && patch.priority !== before.priority) {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.priority_changed",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { from: before.priority, to: patch.priority },
      });
    }
    if (typeof patch.assigneeId !== "undefined" && patch.assigneeId !== before.assigneeId) {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.assigned",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { assigneeId: patch.assigneeId, assigneeLabel: patch.assigneeLabel },
      });
    }
    if (patch.tags && patch.tags.join("|") !== (before.tags ?? []).join("|")) {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.tags_updated",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { tags: patch.tags },
      });
    }
    if (typeof patch.dueDate !== "undefined") {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.due_date_updated",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { dueDate: patch.dueDate },
      });
    }
    if (typeof patch.slaDueAt !== "undefined") {
      audit.push({
        id: newId("ae"),
        threadId,
        type: "thread.sla_due_updated",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { slaDueAt: patch.slaDueAt },
      });
    }
    if (typeof patch.archivedAt !== "undefined" && patch.archivedAt !== before.archivedAt) {
      audit.push({
        id: newId("ae"),
        threadId,
        type: patch.archivedAt ? "thread.archived" : "thread.unarchived",
        actorId: this.viewer.actorId,
        actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
        createdAt: updatedAt,
        meta: { archivedAt: patch.archivedAt },
      });
    }

    this.store.auditByThreadId[threadId] = [
      ...(this.store.auditByThreadId[threadId] ?? []),
      ...audit,
    ];
    this.persist();
    return { ...thread };
  }

  async bulkUpdateThreads(
    threadIds: string[],
    action:
      | { type: "mark_resolved" }
      | { type: "reassign"; assigneeId: string; assigneeLabel: string }
      | { type: "add_tag"; tag: string },
  ): Promise<{ updated: Thread[] }> {
    const updatedAt = nowIso();
    const updated: Thread[] = [];

    for (const threadId of threadIds) {
      const thread = this.store.threadsById[threadId];
      if (!thread) continue;

      if (action.type === "mark_resolved") {
        thread.status = "resolved";
      } else if (action.type === "reassign") {
        thread.assigneeId = action.assigneeId;
        thread.assigneeLabel = action.assigneeLabel;
      } else if (action.type === "add_tag") {
        const tags = new Set(thread.tags ?? []);
        tags.add(action.tag);
        thread.tags = [...tags];
      }

      thread.updatedAt = updatedAt;
      this.store.auditByThreadId[threadId] = [
        ...(this.store.auditByThreadId[threadId] ?? []),
        {
          id: newId("ae"),
          threadId,
          type: `thread.bulk.${action.type}`,
          actorId: this.viewer.actorId,
          actorLabel: this.store.participantsById[this.viewer.actorId]?.name ?? "You",
          createdAt: updatedAt,
          meta: action,
        },
      ];
      updated.push({ ...thread });
    }

    this.persist();
    return { updated };
  }

  async searchGlobal(input: { text: string }): Promise<{
    threads: Thread[];
    messages: Message[];
    attachments: Attachment[];
  }> {
    const text = input.text.trim();
    if (!text) return { threads: [], messages: [], attachments: [] };
    const tokens = tokensFromQuery(text);

    const threads = Object.values(this.store.threadsById).filter((t) => {
      const participantNames = t.participants.map((p) => p.name).join(" ");
      const haystack = [
        t.title,
        t.lastMessagePreview ?? "",
        t.propertyLabel ?? "",
        t.unitLabel ?? "",
        (t.tags ?? []).join(" "),
        participantNames,
      ].join(" ");
      return includesAllTokens(haystack, tokens);
    });

    const messages = Object.values(this.store.messagesByThreadId)
      .flat()
      .filter((m) => includesAllTokens(m.body, tokens));

    const attachments = Object.values(this.store.attachmentsById).filter((a) =>
      includesAllTokens(`${a.fileName} ${a.mimeType}`, tokens),
    );

    return { threads: sortThreads(threads, "updated_desc"), messages, attachments };
  }

  getParticipants(): Participant[] {
    return Object.values(this.store.participantsById);
  }

  getAudit(threadId: string): AuditEvent[] {
    return this.store.auditByThreadId[threadId] ?? [];
  }

  private loadOrSeed(): MockStore {
    if (!messagingFlags.persistMock || typeof window === "undefined") {
      return seedStore(this.viewer);
    }
    try {
      const raw = window.localStorage.getItem(this.namespaceKey);
      if (!raw) return seedStore(this.viewer);
      const parsed = JSON.parse(raw) as MockStore;
      if (!parsed || parsed.version !== 1) return seedStore(this.viewer);
      return parsed;
    } catch {
      return seedStore(this.viewer);
    }
  }

  private persist() {
    if (!messagingFlags.persistMock || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.namespaceKey, JSON.stringify(this.store));
    } catch {
      // ignore storage errors
    }
  }
}
