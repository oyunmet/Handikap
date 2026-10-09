import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import { Server as SocketIOServer } from "socket.io";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { createDuelApi } from "./duelApi";
import { createProfileApi } from "./profileApi";
import { createStoreApi } from "./storeApi";
import { createWorldRewardsApi } from "./worldRewardsApi";
import { STORE_CATALOG } from "./storeCatalog";

const port = Number(process.env.GAME_SERVER_PORT ?? "3001");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GAME_SERVER_PORT must be a valid port number.");
}

const database = new Pool();
let databaseStatus: "connected" | "unavailable" | "not_configured" =
  process.env.DATABASE_URL || process.env.PGHOST ? "unavailable" : "not_configured";
const app = express();
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY?.trim());

// Clerk's production frontend-API proxy must be mounted before body parsers.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));

app.get("/api/health", async (_request, response) => {
  if (databaseStatus !== "not_configured") {
    try {
      await database.query("SELECT 1");
      databaseStatus = "connected";
    } catch {
      databaseStatus = "unavailable";
    }
  }
  response.setHeader("Cache-Control", "no-store");
  response.json({ status: "ok", database: databaseStatus });
});

app.get("/api/store/catalog", (_request, response) => {
  response.setHeader("Cache-Control", "public, max-age=60");
  response.json({ items: STORE_CATALOG });
});

if (clerkConfigured) {
  app.use(
    clerkMiddleware((request) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(request) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

app.use(express.json({ limit: "256kb" }));

if (clerkConfigured) {
  app.use(createProfileApi(database));
  app.use(createWorldRewardsApi(database));
  app.use(createDuelApi(database));
  app.use(createStoreApi(database));
} else {
  const authUnavailable: express.RequestHandler = (_request, response) => {
    response.status(503).json({ error: "authentication_unavailable" });
  };

  app.use(CLERK_PROXY_PATH, authUnavailable);
  app.use("/api/profile", authUnavailable);
  app.use("/api/duels", authUnavailable);
  app.use("/api/store", authUnavailable);
  console.warn("[shafak-server] Clerk is not configured; account, store mutation, and duel APIs are disabled.");
}

const httpServer = createServer(app);
const sockets = new SocketIOServer(httpServer, {
  path: "/socket.io",
  serveClient: false,
});

sockets.on("connection", (socket) => {
  socket.emit("server:ready", { status: "ready" });
});

async function startServer() {
  if (databaseStatus !== "not_configured") {
    try {
      await database.query("SELECT 1");
      databaseStatus = "connected";
    } catch {
      databaseStatus = "unavailable";
      console.warn("PostgreSQL is unavailable; the local game server is starting without persistent database features.");
    }
  }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[shafak-server] listening on port ${port}; database=${databaseStatus}`);
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
