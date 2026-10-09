import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import cors from "cors";
import express from "express";
import { Pool } from "pg";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "../server/middlewares/clerkProxyMiddleware";
import { createDuelApi } from "../server/duelApi";
import { createProfileApi } from "../server/profileApi";
import { createStoreApi } from "../server/storeApi";
import { createWorldRewardsApi } from "../server/worldRewardsApi";

const app = express();
const database = new Pool();
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY?.trim());

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));

app.get("/api/health", async (_request, response) => {
  let status: "connected" | "unavailable" | "not_configured" =
    process.env.DATABASE_URL || process.env.PGHOST ? "unavailable" : "not_configured";
  if (status !== "not_configured") {
    try {
      await database.query("SELECT 1");
      status = "connected";
    } catch {
      status = "unavailable";
    }
  }
  response.setHeader("Cache-Control", "no-store");
  response.json({ status: "ok", database: status });
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
app.use(express.json({ limit: "16kb" }));

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
}

export default app;
