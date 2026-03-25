import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { app } from "./app";
import { ensureDemoData } from "./services/bootstrap.service";

const server = createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.emit("system", { message: "Connected to UniLib realtime channel" });

  socket.on("join-branch", (branch: string) => {
    socket.join(`branch:${branch}`);
  });

  socket.on("reading-room:join", (payload: { roomId: string; userName: string }) => {
    if (!payload?.roomId) return;
    socket.join(`reading-room:${payload.roomId}`);
    io.to(`reading-room:${payload.roomId}`).emit("reading-room:system", {
      roomId: payload.roomId,
      message: `${payload.userName || "A reader"} joined the room`,
      at: new Date().toISOString(),
    });
  });

  socket.on("reading-room:message", (payload: { roomId: string; userName: string; message: string }) => {
    if (!payload?.roomId || !payload?.message) return;
    io.to(`reading-room:${payload.roomId}`).emit("reading-room:message", {
      userName: payload.userName,
      message: payload.message,
      at: new Date().toISOString(),
    });
  });

  socket.on("reading-room:highlight", (payload: { roomId: string; userName: string; highlight: string }) => {
    if (!payload?.roomId || !payload?.highlight) return;
    io.to(`reading-room:${payload.roomId}`).emit("reading-room:highlight", {
      userName: payload.userName,
      highlight: payload.highlight,
      at: new Date().toISOString(),
    });
  });
});

const port = Number(env.PORT);

const startServer = async () => {
  try {
    await ensureDemoData();
    console.log("Demo data ensured");
  } catch (err) {
    console.error("Demo data bootstrap failed", err);
  }

  server.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
};

startServer().catch((err) => {
  console.error("Server startup failed", err);
  process.exit(1);
});

const captureRealtimeStats = async () => {
  const mostIssued = await prisma.transaction.groupBy({
    by: ["bookId"],
    where: { type: "ISSUE" },
    _count: true,
    orderBy: { _count: { bookId: "desc" } },
    take: 5,
  });

  io.emit("analytics:update", { mostIssued, timestamp: new Date().toISOString() });
};

setInterval(() => {
  captureRealtimeStats().catch((err) => console.error("Analytics push failed", err));
}, 30_000);
