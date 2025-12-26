/**
 * Socket.io event handlers for real-time messaging
 */

export function setupSocketHandlers(io, logger) {
  io.on("connection", (socket) => {
    logger?.info?.({ socketId: socket.id }, "Socket connected");

    // Join a thread room to receive updates for that thread
    socket.on("join:thread", (threadId) => {
      if (!threadId || typeof threadId !== "string") return;
      const room = `thread:${threadId}`;
      socket.join(room);
      logger?.debug?.({ socketId: socket.id, room }, "Socket joined thread room");
    });

    // Leave a thread room
    socket.on("leave:thread", (threadId) => {
      if (!threadId || typeof threadId !== "string") return;
      const room = `thread:${threadId}`;
      socket.leave(room);
      logger?.debug?.({ socketId: socket.id, room }, "Socket left thread room");
    });

    // Join a user room to receive user-specific updates (like new thread notifications)
    socket.on("join:user", (userId) => {
      if (!userId || typeof userId !== "string") return;
      const room = `user:${userId}`;
      socket.join(room);
      logger?.debug?.({ socketId: socket.id, room }, "Socket joined user room");
    });

    // Leave a user room
    socket.on("leave:user", (userId) => {
      if (!userId || typeof userId !== "string") return;
      const room = `user:${userId}`;
      socket.leave(room);
      logger?.debug?.({ socketId: socket.id, room }, "Socket left user room");
    });

    socket.on("disconnect", (reason) => {
      logger?.info?.({ socketId: socket.id, reason }, "Socket disconnected");
    });

    socket.on("error", (error) => {
      logger?.error?.({ socketId: socket.id, error }, "Socket error");
    });
  });
}
