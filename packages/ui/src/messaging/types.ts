export type MessagingAppId = "staff" | "user" | "org" | "console" | (string & {});

export type MessagingChannel = "portal" | "sms" | "email";

export type ThreadStatus = "open" | "pending" | "resolved" | "closed";

export type ThreadPriority = "low" | "normal" | "high" | "urgent";

export type ThreadKind = "direct" | "group";

export type ViewerContext = {
  appId: MessagingAppId;
  orgId: string;
  actorId: string;
  roleHint?: string;
  isStaffView: boolean;
};

export type Attachment = {
  id: string;
  threadId: string;
  messageId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedById: string;
  storageKey?: string;
  publicUrl?: string;
  scanStatus?: "clean" | "pending" | "blocked";
};

export type Participant = {
  id: string;
  name: string;
  role: "tenant" | "staff" | "org" | "vendor" | "internal";
  avatarUrl?: string;
  presence?: "online" | "offline";
  lastSeenAt?: string;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  senderLabel: string;
  body: string;
  createdAt: string;
  channel: MessagingChannel;
  attachments?: Attachment[];
  deletedAt?: string;
  deletedById?: string;
  deletedForEveryone?: boolean;
  delivery?: {
    status: "draft" | "queued" | "sent" | "delivered" | "read" | "failed";
    updatedAt?: string;
  };
  reactions?: Record<string, string[]>;
  scheduledFor?: string;
  internalOnly?: boolean;
};

export type AuditEvent = {
  id: string;
  threadId: string;
  type: string;
  actorId: string;
  actorLabel: string;
  createdAt: string;
  meta?: Record<string, any>;
};

export type Thread = {
  id: string;
  kind: ThreadKind;
  title: string;
  archivedAt?: string | null;
  status: ThreadStatus;
  priority: ThreadPriority;
  channelDefault: MessagingChannel;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  propertyId?: string;
  propertyLabel?: string;
  unitId?: string;
  unitLabel?: string;
  assigneeId?: string;
  assigneeLabel?: string;
  tags?: string[];
  followers?: string[];
  dueDate?: string;
  slaDueAt?: string;
  linkedWorkOrderId?: string;
  linkedTaskId?: string;
  participants: Participant[];
};

export type SortKey = "updated_desc" | "updated_asc" | "sla_asc" | "priority_desc";

export type ThreadQuery = {
  text?: string;
  tab?: "all" | "groups" | "unread" | "archived";
  status?: ThreadStatus[];
  channel?: MessagingChannel[];
  propertyId?: string[];
  unitId?: string[];
  assigneeId?: string[];
  priority?: ThreadPriority[];
  dateFrom?: string;
  dateTo?: string;
  sortKey?: SortKey;
};
