import type {
  Attachment,
  Message,
  MessagingChannel,
  Thread,
  ThreadKind,
  ThreadQuery,
} from "./types";

export interface MessagingClient {
  listThreads(query: ThreadQuery): Promise<{ threads: Thread[] }>;
  listMessages(threadId: string): Promise<{ messages: Message[] }>;
  createThread(input: {
    title: string;
    kind: ThreadKind;
    channel: MessagingChannel;
    participantIds: string[];
    tags?: string[];
    propertyId?: string;
    unitId?: string;
  }): Promise<Thread>;
  sendMessage(
    threadId: string,
    input: {
      body: string;
      channel?: MessagingChannel;
      attachments?: Array<
        Pick<Attachment, "fileName" | "mimeType" | "sizeBytes"> & {
          publicUrl?: string;
          storageKey?: string;
          file?: File;
        }
      >;
      scheduledFor?: string;
      internalOnly?: boolean;
    },
  ): Promise<Message>;
  deleteMessage(threadId: string, messageId: string): Promise<void>;
  editMessage(threadId: string, messageId: string, body: string): Promise<void>;
  addReaction(threadId: string, messageId: string, emoji: string): Promise<void>;
  removeReaction(threadId: string, messageId: string, emoji: string): Promise<void>;
  getReadReceipts(threadId: string): Promise<{ receipts: Array<{ userId: string; displayName: string; lastReadAt: string }> }>;
  updateThread(
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
        | "linkedWorkOrderId"
        | "linkedTaskId"
        | "followers"
      >
    >,
  ): Promise<Thread>;
  bulkUpdateThreads(
    threadIds: string[],
    action:
      | { type: "mark_resolved" }
      | { type: "reassign"; assigneeId: string; assigneeLabel: string }
      | { type: "add_tag"; tag: string },
  ): Promise<{ updated: Thread[] }>;
  searchGlobal(input: {
    text: string;
  }): Promise<{ threads: Thread[]; messages: Message[]; attachments: Attachment[] }>;
  resetDemoSessionData?(scope?: "current" | "all"): Promise<void> | void;
}
