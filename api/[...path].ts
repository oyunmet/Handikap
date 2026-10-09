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
import { createWorldRewardsApi } from "../server/worldRewardsApi";

const app = express();
const database = new Pool();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(
  clerkMiddleware((request) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(request) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use(express.json({ limit: "16kb" }));
app.use(createProfileApi(database));
app.use(createWorldRewardsApi(database));
app.use(createDuelApi(database));

app.get("/api/health", async (_request, response) => {
  try {
    await database.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch {
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});

export default app;
