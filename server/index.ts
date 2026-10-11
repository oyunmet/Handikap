import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  checkDatabaseHealth,
  createDatabaseConnection,
} from "../db/postgres";
import { requireAuthenticatedUserId } from "./auth";
import { checkClerkKeyHealth } from "./clerk-health";
import { createDuelApi } from "./duelApi";
import { createProfileApi } from "./profileApi";
import { createStoreApi } from "./storeApi";
import { createWorldRewardsApi } from "./worldRewardsApi";
import { STORE_CATALOG } from "./storeCatalog";

const port = Number(process.env.GAME_SERVER_PORT ?? "3001");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GAME_SERVER_PORT must be a valid port number.");
}

const databaseConnection = createDatabaseConnection(process.env.DATABASE_URL);
const database = databaseConnection.pool;
const app = express();
app.set("trust proxy", 1);
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() &&
  process.env.CLERK_PUBLISHABLE_KEY?.trim(),
);

app.use(cors({ credentials: true, origin: true }));

app.get("/api/health", async (_request, response) => {
  const [health, clerkKeyHealth] = await Promise.all([
    checkDatabaseHealth(databaseConnection),
    checkClerkKeyHealth(),
  ]);
  const keysMatch =
    clerkKeyHealth.secretKeyValid &&
    clerkKeyHealth.publishableKeyValid &&
    clerkKeyHealth.clientPublishableKeyValid &&
    clerkKeyHealth.publishableKeysMatch &&
    clerkKeyHealth.secretKeyMatchesPublishableKey;
  const isHealthy = health.status === "ok" && clerkConfigured && keysMatch;
  const healthResponse = {
    ...health,
    status: isHealthy ? "ok" : "error",
    db: health.db,
    clerkSecretKeyConfigured: clerkKeyHealth.secretKeyConfigured,
    clerkPublishableKeyConfigured: clerkKeyHealth.publishableKeyConfigured,
    clerkKeyHealth,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    ...(health.status === "error"
      ? { error: health.error ?? "Database health check failed." }
      : !clerkKeyHealth.secretKeyConfigured
      ? { error: "Clerk secret key is not configured." }
      : !clerkKeyHealth.publishableKeyConfigured
        ? { error: "Clerk publishable key is not configured." }
        : !keysMatch
          ? { error: "Clerk keys could not be validated as belonging to one instance." }
          : {}),
  };
  response.setHeader("Cache-Control", "no-store");
  response.status(isHealthy ? 200 : 503).json(healthResponse);
});

app.get("/api/store/catalog", (_request, response) => {
  response.setHeader("Cache-Control", "public, max-age=60");
  response.json({ items: STORE_CATALOG });
});

if (clerkConfigured) {
  app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }));
}

app.use(express.json({ limit: "256kb" }));

if (clerkConfigured && database) {
  app.use(createProfileApi(database));
  app.use(createWorldRewardsApi(database));
  app.use(createDuelApi(database));
  app.use(createStoreApi(database));
} else {
  const accountApiUnavailable: express.RequestHandler = (request, response) => {
    const authUnavailable = !clerkConfigured;
    if (!authUnavailable && !requireAuthenticatedUserId(request, response)) {
      return;
    }
    response.status(503).json({
      error: authUnavailable ? "authentication_unavailable" : "database_unavailable",
      message: authUnavailable
        ? "Kimlik doğrulama yapılandırılmamış."
        : databaseConnection.error ??
          "Veritabanı bağlantısı kurulamadı. Supabase bağlantı ayarlarını kontrol edin.",
    });
  };

  app.use("/api/profile", accountApiUnavailable);
  app.use("/api/duels", accountApiUnavailable);
  app.use("/api/store", accountApiUnavailable);
  console.warn(
    clerkConfigured
      ? "[shafak-server] DATABASE_URL is unavailable; persistent account and duel APIs are disabled."
      : "[shafak-server] Clerk is not configured; account, store mutation, and duel APIs are disabled.",
  );
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
  const health = await checkDatabaseHealth(databaseConnection);
  if (health.status === "error") {
    console.warn(
      `${health.error} The local game server will start without persistent database features.`,
    );
  }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(
      `[shafak-server] listening on port ${port}; database=${health.database}`,
    );
  });
}

async function stopServer() {
  sockets.close(async () => {
    await database?.end();
  });
}

process.once("SIGINT", () => void stopServer());
process.once("SIGTERM", () => void stopServer());

void startServer();
