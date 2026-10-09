import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool, PoolClient } from "pg";
import { createDefaultPlayerProfile, validatePlayerProfile } from "./profileApi";
import {
  getWorldChapter,
  isValidChapterId,
  MAX_PICKUPS_PER_CLAIM,
  pickupRewardTotals,
  validatePickupIds,
} from "../src/shafak/world/world-content";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseChapterId(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,6})$/.test(value)) return null;
  const parsed = Number(value);
  return isValidChapterId(parsed) ? parsed : null;
}

function authenticatedUserId(request: Request, response: Response) {
  const userId = getAuth(request).userId;
  if (!userId) {
    response.status(401).json({ error: "authentication_required" });
    return null;
  }
  return userId;
}

export function createWorldRewardsApi(database: Pool) {
  const router = Router();
  const rewardLimit = rateLimit({
    windowMs: 60_000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get("/api/profile/pickups", rewardLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    const chapterId = parseChapterId(request.query.chapterId);
    if (chapterId === null) {
      response.status(400).json({ error: "invalid_chapter" });
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    try {
      const result = await database.query<{ pickup_id: string }>(
        "SELECT pickup_id FROM shafak_pickup_claims WHERE user_id = $1 AND chapter_id = $2",
        [userId, chapterId],
      );
      response.json({ claimedPickupIds: result.rows.map((row) => row.pickup_id) });
    } catch {
      response.status(503).json({ error: "pickup_storage_unavailable" });
    }
  });

  router.post("/api/profile/pickups", rewardLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    if (
      !isRecord(request.body) ||
      Object.keys(request.body).length !== 2 ||
      !Object.hasOwn(request.body, "chapterId") ||
      !Object.hasOwn(request.body, "pickupIds") ||
      !isValidChapterId(request.body.chapterId)
    ) {
      response.status(400).json({ error: "invalid_pickup_claim" });
      return;
    }
    const chapterId = request.body.chapterId;
    const pickups = validatePickupIds(chapterId, request.body.pickupIds);
    if (!pickups) {
      response.status(400).json({ error: "invalid_pickup_ids" });
      return;
    }

    let client: PoolClient;
    try {
      client = await database.connect();
    } catch {
      response.status(503).json({ error: "pickup_storage_unavailable" });
      return;
    }
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;

      await client.query(
        `INSERT INTO shafak_player_profiles (user_id, profile, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, JSON.stringify(createDefaultPlayerProfile())],
      );
      const profileResult = await client.query<{ profile: unknown }>(
        "SELECT profile FROM shafak_player_profiles WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      const currentProfile = validatePlayerProfile(profileResult.rows[0]?.profile);
      if (!currentProfile) {
        response.status(503).json({ error: "profile_storage_invalid" });
        await client.query("ROLLBACK");
        transactionOpen = false;
        return;
      }

      const existingResult = await client.query<{ pickup_id: string }>(
        "SELECT pickup_id FROM shafak_pickup_claims WHERE user_id = $1 AND pickup_id = ANY($2::text[])",
        [userId, pickups.map((pickup) => pickup.id)],
      );
      const alreadyClaimed = new Set(existingResult.rows.map((row) => row.pickup_id));
      const newlyClaimed = pickups.filter((pickup) => !alreadyClaimed.has(pickup.id));
      const reward = pickupRewardTotals(newlyClaimed);
      const nextGold = currentProfile.gold + reward.gold;
      const nextDiamonds = currentProfile.diamonds + reward.diamonds;
      const nextMaterials = {
        emberCrystals: currentProfile.materials.emberCrystals + reward.materials.emberCrystals,
        sealFragments: currentProfile.materials.sealFragments + reward.materials.sealFragments,
        ironShards: currentProfile.materials.ironShards + reward.materials.ironShards,
      };
      if (
        nextGold > 1_000_000_000 ||
        nextDiamonds > 1_000_000_000 ||
        nextMaterials.emberCrystals > 1_000_000_000 ||
        nextMaterials.sealFragments > 1_000_000_000 ||
        nextMaterials.ironShards > 1_000_000_000
      ) {
        response.status(409).json({ error: "reward_limit_reached" });
        await client.query("ROLLBACK");
        transactionOpen = false;
        return;
      }

      if (newlyClaimed.length) {
        await client.query(
          `INSERT INTO shafak_pickup_claims (user_id, chapter_id, pickup_id)
           SELECT $1, $2, ids.pickup_id FROM unnest($3::text[]) AS ids(pickup_id)
           ON CONFLICT (user_id, pickup_id) DO NOTHING`,
          [userId, chapterId, newlyClaimed.map((pickup) => pickup.id)],
        );
      }
      const nextProfile = {
        ...currentProfile,
        gold: nextGold,
        diamonds: nextDiamonds,
        materials: nextMaterials,
      };
      if (newlyClaimed.length) {
        await client.query(
          "UPDATE shafak_player_profiles SET profile = $2::jsonb, updated_at = NOW() WHERE user_id = $1",
          [userId, JSON.stringify(nextProfile)],
        );
      }
      await client.query("COMMIT");
      transactionOpen = false;

      response.json({
        profile: nextProfile,
        claimedPickupIds: pickups.map((pickup) => pickup.id),
        awardedPickupIds: newlyClaimed.map((pickup) => pickup.id),
        rewards: reward,
      });
    } catch {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Keep the original database error as the API response.
        }
      }
      response.status(503).json({ error: "pickup_storage_unavailable" });
    } finally {
      client.release();
    }
  });

  return router;
}

export function validatePickupClaimBody(value: unknown) {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, "chapterId") ||
    !Object.hasOwn(value, "pickupIds") ||
    !isValidChapterId(value.chapterId)
  ) return null;
  const pickups = validatePickupIds(value.chapterId, value.pickupIds);
  if (!pickups || pickups.length > MAX_PICKUPS_PER_CLAIM) return null;
  return { chapterId: value.chapterId, pickups, reward: pickupRewardTotals(pickups) };
}
