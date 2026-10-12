import type { NextFunction, Request, Response } from "express";

type ApiHandler = (request: Request, response: Response) => void;

let apiHandlerPromise: Promise<ApiHandler> | undefined;

async function createApiHandler(): Promise<ApiHandler> {
  const [
    expressModule,
    corsModule,
    databaseModule,
    clerkModule,
    authModule,
    clerkHealthModule,
    duelApiModule,
    profileApiModule,
    storeApiModule,
    worldRewardsApiModule,
  ] = await Promise.all([
    import("express"),
    import("cors"),
    import("../db/postgres.ts"),
    import("@clerk/express"),
    import("../server/auth.ts"),
    import("../server/clerk-health.ts"),
    import("../server/duelApi.ts"),
    import("../server/profileApi.ts"),
    import("../server/storeApi.ts"),
    import("../server/worldRewardsApi.ts"),
  ]);

  const express = expressModule.default;
  const cors = corsModule.default;
  const app = express();
  const databaseConnection = databaseModule.createDatabaseConnection(
    process.env.DATABASE_URL,
    { max: 1 },
  );
  const database = databaseConnection.pool;
  const clerkConfigured = Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
    process.env.CLERK_PUBLISHABLE_KEY?.trim(),
  );
  app.use(cors({ credentials: true, origin: true }));

  app.get("/api/health", async (_request, response) => {
    const [health, clerkKeyHealth] = await Promise.all([
      databaseModule.checkDatabaseHealth(databaseConnection),
      clerkHealthModule.checkClerkKeyHealth(),
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

  if (clerkConfigured) {
    app.use(clerkModule.clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    }));
  }
  app.use(express.json({ limit: "16kb" }));

  if (clerkConfigured && database) {
    app.use(profileApiModule.createProfileApi(database));
    app.use(worldRewardsApiModule.createWorldRewardsApi(database));
    app.use(duelApiModule.createDuelApi(database));
    app.use(storeApiModule.createStoreApi(database));
  } else {
    const accountApiUnavailable: import("express").RequestHandler = (
      request,
      response,
    ) => {
      const authUnavailable = !clerkConfigured;
      if (!authUnavailable && !authModule.requireAuthenticatedUserId(request, response)) {
        return;
      }
      response.status(503).json({
        error: authUnavailable
          ? "authentication_unavailable"
          : "database_unavailable",
        message: authUnavailable
          ? "Kimlik doğrulama yapılandırılmamış."
          : databaseConnection.error ??
            "Veritabanı bağlantısı kurulamadı. Supabase bağlantı ayarlarını kontrol edin.",
      });
    };
    app.use("/api/profile", accountApiUnavailable);
    app.use("/api/duels", accountApiUnavailable);
    app.use("/api/store", accountApiUnavailable);
  }

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (response.headersSent) {
        next(error);
        return;
      }

      console.error(
        "[vercel-api] Request failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      response.status(500).json({
        error: "internal_server_error",
        message: "API isteği işlenemedi.",
      });
    },
  );

  return app;
}

async function getApiHandler(): Promise<ApiHandler> {
  apiHandlerPromise ??= createApiHandler();

  try {
    return await apiHandlerPromise;
  } catch (error) {
    apiHandlerPromise = undefined;
    throw error;
  }
}

export default async function handler(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const apiHandler = await getApiHandler();
    apiHandler(request, response);
  } catch (error) {
    console.error(
      "[vercel-api] Initialization failed",
      error instanceof Error ? error.name : "UnknownError",
    );

    if (response.headersSent) {
      if (!response.writableEnded) response.end();
      return;
    }

    response.statusCode = 500;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: "function_initialization_failed",
        message: "API başlatılamadı.",
      }),
    );
  }
}
