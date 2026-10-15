import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { requireAuthenticatedUserId } from "./auth.ts";
import { completeDuel, createDuelChallenge, DuelServiceError } from "./duelService.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendServiceError(response: Response, error: unknown) {
  if (error instanceof DuelServiceError) {
    response.status(error.status).json({ error: error.code });
    return;
  }
  response.status(503).json({ error: "duel_storage_unavailable" });
}

export function createDuelApi(database: Pool) {
  const router = Router();
  const startLimit = rateLimit({
    windowMs: 60_000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const completeLimit = rateLimit({
    windowMs: 60_000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
  });

  function authenticatedUserId(request: Request, response: Response) {
    return requireAuthenticatedUserId(request, response);
  }

  router.post("/api/duels/start", startLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    if (
      !isRecord(request.body) ||
      !Object.hasOwn(request.body, "opponentId") ||
      typeof request.body.opponentId !== "string" ||
      Object.keys(request.body).some((key) => key !== "opponentId" && key !== "combatDifficulty") ||
      ("combatDifficulty" in request.body
        && !["easy", "medium", "hard"].includes(String(request.body.combatDifficulty)))
    ) {
      response.status(400).json({ error: "invalid_challenge" });
      return;
    }

    let client;
    try {
      client = await database.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
      const challenge = await createDuelChallenge(
        client,
        userId,
        request.body.opponentId,
        request.body.combatDifficulty,
      );
      await client.query("COMMIT");
      response.status(201).json(challenge);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => undefined);
      sendServiceError(response, error);
    } finally {
      client?.release();
    }
  });

  router.post("/api/duels/complete", completeLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    let client;
    try {
      client = await database.connect();
      await client.query("BEGIN");
      const result = await completeDuel(client, userId, request.body);
      await client.query("COMMIT");
      response.json(result);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => undefined);
      sendServiceError(response, error);
    } finally {
      client?.release();
    }
  });

  return router;
}
