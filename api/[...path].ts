import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import cors from "cors";
import express from "express";
import {
  checkDatabaseHealth,
  createDatabaseConnection,
} from "../db/postgres";
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
const databaseConnection = createDatabaseConnection(process.env.DATABASE_URL, {
  max: 1,
});
const database = databaseConnection.pool;
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY?.trim());

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));

app.get("/api/health", async (_request, response) => {
  const health = await checkDatabaseHealth(databaseConnection);
  response.setHeader("Cache-Control", "no-store");
  response.status(health.status === "ok" ? 200 : 503).json(health);
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

if (clerkConfigured && database) {
  app.use(createProfileApi(database));
  app.use(createWorldRewardsApi(database));
  app.use(createDuelApi(database));
  app.use(createStoreApi(database));
} else {
  const accountApiUnavailable: express.RequestHandler = (_request, response) => {
    const authUnavailable = !clerkConfigured;
    response.status(503).json({
      error: authUnavailable ? "authentication_unavailable" : "database_unavailable",
      message: authUnavailable
        ? "Kimlik doğrulama yapılandırılmamış."
        : databaseConnection.error ??
          "Veritabanı bağlantısı kurulamadı. Supabase bağlantı ayarlarını kontrol edin.",
    });
  };
  if (!clerkConfigured) app.use(CLERK_PROXY_PATH, accountApiUnavailable);
  app.use("/api/profile", accountApiUnavailable);
  app.use("/api/duels", accountApiUnavailable);
  app.use("/api/store", accountApiUnavailable);
}

export default app;
