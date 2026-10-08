import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { completeDuel, createDuelChallenge, DuelServiceError } from "./duelService";

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
    const userId = getAuth(request).userId;
    if (!userId) {
      response.status(401).json({ error: "authentication_required" });
      return null;
    }
    return userId;
  }

  router.post("/api/duels/start", startLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    if (
      !isRecord(request.body) ||
      Object.keys(request.body).join(",") !== "opponentId" ||
      typeof request.body.opponentId !== "string"
    ) {
      response.status(400).json({ error: "invalid_challenge" });
      return;
    }

    try {
      const challenge = await createDuelChallenge(database, userId, request.body.opponentId);
      response.status(201).json(challenge);
    } catch (error) {
      sendServiceError(response, error);
    }
  });

  router.post("/api/duels/complete", completeLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    let client;
    try {
      client = await database.connect();
      const result = await completeDuel(client, userId, request.body);
      response.json(result);
    } catch (error) {
      sendServiceError(response, error);
    } finally {
      client?.release();
    }
  });

  return router;
}
