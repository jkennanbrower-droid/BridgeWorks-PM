import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface MessagingSocketEvents {
  "message:created": (message: any) => void;
  "message:deleted": (data: { threadId: string; messageId: string; deletedBy: string; deletedAt: string }) => void;
  "message:status": (data: { threadId: string; messageId: string; status: string; updatedAt: string }) => void;
  "message:reaction": (data: { threadId: string; messageId: string; reactions: Record<string, string[]> }) => void;
  "thread:created": (thread: any) => void;
  "thread:updated": (thread: any) => void;
  "thread:read": (data: { threadId: string; actorId: string; readAt: string }) => void;
}

export interface UseMessagingSocketOptions {
  apiBaseUrl: string;
  userId?: string;
  threadId?: string;
  onMessageCreated?: MessagingSocketEvents["message:created"];
  onMessageDeleted?: MessagingSocketEvents["message:deleted"];
  onMessageStatus?: MessagingSocketEvents["message:status"];
  onMessageReaction?: MessagingSocketEvents["message:reaction"];
  onThreadCreated?: MessagingSocketEvents["thread:created"];
  onThreadUpdated?: MessagingSocketEvents["thread:updated"];
  onThreadRead?: MessagingSocketEvents["thread:read"];
  enabled?: boolean;
}

export function useMessagingSocket({
  apiBaseUrl,
  userId,
  threadId,
  onMessageCreated,
  onMessageDeleted,
  onMessageStatus,
  onMessageReaction,
  onThreadCreated,
  onThreadUpdated,
  onThreadRead,
  enabled = true,
}: UseMessagingSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const currentThreadRef = useRef<string | undefined>(threadId);
  const currentUserRef = useRef<string | undefined>(userId);

  // Connect to socket server
  useEffect(() => {
    if (!enabled || !apiBaseUrl) return;

    const socket = io(apiBaseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Join user room if userId is set
      if (currentUserRef.current) {
        socket.emit("join:user", currentUserRef.current);
      }
      // Join thread room if threadId is set
      if (currentThreadRef.current) {
        socket.emit("join:thread", currentThreadRef.current);
      }
    });

    socket.on("disconnect", () => {
      // Socket disconnected
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBaseUrl, enabled]);

  // Handle userId changes
  useEffect(() => {
    const socket = socketRef.current;

    // Leave old user room
    if (currentUserRef.current && currentUserRef.current !== userId && socket?.connected) {
      socket.emit("leave:user", currentUserRef.current);
    }

    // Join new user room
    if (userId && socket?.connected) {
      socket.emit("join:user", userId);
    }

    currentUserRef.current = userId;
  }, [userId]);

  // Handle threadId changes
  useEffect(() => {
    const socket = socketRef.current;

    // Leave old thread room
    if (currentThreadRef.current && currentThreadRef.current !== threadId && socket?.connected) {
      socket.emit("leave:thread", currentThreadRef.current);
    }

    // Join new thread room
    if (threadId && socket?.connected) {
      socket.emit("join:thread", threadId);
    }

    currentThreadRef.current = threadId;
  }, [threadId]);

  // Set up event listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (onMessageCreated) {
      socket.on("message:created", onMessageCreated);
    }
    if (onMessageDeleted) {
      socket.on("message:deleted", onMessageDeleted);
    }
    if (onMessageStatus) {
      socket.on("message:status", onMessageStatus);
    }
    if (onMessageReaction) {
      socket.on("message:reaction", onMessageReaction);
    }
    if (onThreadCreated) {
      socket.on("thread:created", onThreadCreated);
    }
    if (onThreadUpdated) {
      socket.on("thread:updated", onThreadUpdated);
    }
    if (onThreadRead) {
      socket.on("thread:read", onThreadRead);
    }

    return () => {
      if (onMessageCreated) socket.off("message:created", onMessageCreated);
      if (onMessageDeleted) socket.off("message:deleted", onMessageDeleted);
      if (onMessageStatus) socket.off("message:status", onMessageStatus);
      if (onMessageReaction) socket.off("message:reaction", onMessageReaction);
      if (onThreadCreated) socket.off("thread:created", onThreadCreated);
      if (onThreadUpdated) socket.off("thread:updated", onThreadUpdated);
      if (onThreadRead) socket.off("thread:read", onThreadRead);
    };
  }, [
    onMessageCreated,
    onMessageDeleted,
    onMessageStatus,
    onMessageReaction,
    onThreadCreated,
    onThreadUpdated,
    onThreadRead,
  ]);

  // Manual join/leave methods
  const joinThread = useCallback((id: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("join:thread", id);
    }
  }, []);

  const leaveThread = useCallback((id: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("leave:thread", id);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinThread,
    leaveThread,
    isConnected: socketRef.current?.connected ?? false,
  };
}
