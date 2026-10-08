import { createServer } from "node:http";
import { Pool } from "pg";
import { Server as SocketIOServer } from "socket.io";

const port = Number(process.env.GAME_SERVER_PORT ?? "3001");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GAME_SERVER_PORT must be a valid port number.");
}

const database = new Pool();
const httpServer = createServer(async (request, response) => {
  if (request.method !== "GET" || request.url !== "/api/health") {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    await database.query("SELECT 1");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ status: "ok", database: "connected" }));
  } catch {
    response.writeHead(503, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ status: "unavailable", database: "unavailable" }));
  }
});

const sockets = new SocketIOServer(httpServer, {
  path: "/socket.io",
  serveClient: false,
});

sockets.on("connection", (socket) => {
  socket.emit("server:ready", { status: "ready" });
});

async function startServer() {
  try {
    await database.query("SELECT 1");
  } catch {
    console.error("PostgreSQL is unavailable; the game server did not start.");
    await database.end();
    process.exitCode = 1;
    return;
  }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[shafak-server] listening on port ${port}; PostgreSQL is connected`);
  });
}

async function stopServer() {
  sockets.close(async () => {
    await database.end();
  });
}

process.once("SIGINT", () => void stopServer());
process.once("SIGTERM", () => void stopServer());

void startServer();
