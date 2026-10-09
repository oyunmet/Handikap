import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool, PoolClient } from "pg";
import {
  createDefaultPlayerProfile,
  validatePlayerProfile,
} from "./profileApi";
import {
  calculatePlayerCombatModifiers,
  getStoreItem,
  STORE_CATALOG,
} from "./storeCatalog";
import type { PlayerProfile } from "../src/shafak/game/profile";
import { getUpgradeCost, MAX_UPGRADE_LEVEL, type EquipmentLoadout, type EquipmentSlot, type StoreItem } from "../src/shafak/game/store-types";

type StoreOperation = "purchase" | "upgrade";
type StoredOperationResponse = {
  profile: unknown;
  itemId: string;
  operation: StoreOperation;
  cost: Record<string, number>;
};

export class StoreServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "StoreServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOperationBody(value: unknown): { itemId: string; idempotencyKey: string } | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    !Object.hasOwn(value, "itemId") ||
    !Object.hasOwn(value, "idempotencyKey") ||
    typeof value.itemId !== "string" ||
    !/^[a-z0-9_-]{1,60}$/.test(value.itemId) ||
    typeof value.idempotencyKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.idempotencyKey)
  ) return null;
  return { itemId: value.itemId, idempotencyKey: value.idempotencyKey };
}

function validateEquipBody(value: unknown): string | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    !Object.hasOwn(value, "itemId") ||
    typeof value.itemId !== "string" ||
    !/^[a-z0-9_-]{1,60}$/.test(value.itemId)
  ) return null;
  return value.itemId;
}

function equipmentKey(slot: EquipmentSlot): keyof EquipmentLoadout {
  if (slot === "weapon") return "weaponId";
  if (slot === "armor") return "armorId";
  if (slot === "cape") return "capeId";
  if (slot === "effect") return "effectId";
  return "dyeId";
}

function publicProfile(profile: PlayerProfile) {
  return profile;
}

async function loadProfileForUpdate(client: PoolClient, userId: string) {
  await client.query(
    `INSERT INTO shafak_player_profiles (user_id, profile, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, JSON.stringify(createDefaultPlayerProfile())],
  );
  const result = await client.query<{ profile: unknown }>(
    "SELECT profile FROM shafak_player_profiles WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  const profile = validatePlayerProfile(result.rows[0]?.profile);
  if (!profile) throw new StoreServiceError(503, "profile_storage_invalid");
  return profile;
}

async function checkIdempotency(
  client: PoolClient,
  userId: string,
  operation: StoreOperation,
  itemId: string,
  idempotencyKey: string,
) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`store:${userId}:${idempotencyKey}`],
  );
  const result = await client.query<{
    operation_type: StoreOperation;
    item_id: string;
    response: StoredOperationResponse;
  }>(
    `SELECT operation_type, item_id, response
     FROM shafak_store_transactions
     WHERE user_id = $1 AND idempotency_key = $2
     FOR UPDATE`,
    [userId, idempotencyKey],
  );
  const prior = result.rows[0];
  if (!prior) return null;
  if (prior.operation_type !== operation || prior.item_id !== itemId) {
    throw new StoreServiceError(409, "idempotency_key_reused");
  }
  return prior.response;
}

async function saveOperation(
  client: PoolClient,
  userId: string,
  idempotencyKey: string,
  operation: StoreOperation,
  itemId: string,
  response: StoredOperationResponse,
) {
  await client.query(
    `INSERT INTO shafak_store_transactions
       (user_id, idempotency_key, operation_type, item_id, response)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [userId, idempotencyKey, operation, itemId, JSON.stringify(response)],
  );
}

async function updateProfile(client: PoolClient, userId: string, profile: PlayerProfile) {
  await client.query(
    "UPDATE shafak_player_profiles SET profile = $2::jsonb, updated_at = NOW() WHERE user_id = $1",
    [userId, JSON.stringify(profile)],
  );
}

async function runAccountOperation<T>(
  database: Pool,
  userId: string,
  response: Response,
  work: (client: PoolClient) => Promise<T>,
) {
  let client: PoolClient | undefined;
  let open = false;
  try {
    client = await database.connect();
    await client.query("BEGIN");
    open = true;
    const result = await work(client);
    await client.query("COMMIT");
    open = false;
    response.json(result);
  } catch (error) {
    if (open && client) {
      try { await client.query("ROLLBACK"); } catch { /* Keep the original error. */ }
    }
    if (error instanceof StoreServiceError) {
      response.status(error.status).json({ error: error.code });
    } else {
      response.status(503).json({ error: "store_storage_unavailable" });
    }
  } finally {
    client?.release();
  }
}

export function createStoreApi(
  database: Pool,
  resolveUserId: (request: Request) => string | null = (request) => getAuth(request).userId,
) {
  const router = Router();
  const catalogLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
  const purchaseLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });
  const equipLimit = rateLimit({ windowMs: 60_000, limit: 36, standardHeaders: true, legacyHeaders: false });
  const upgradeLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });

  function authenticatedUserId(request: Request, response: Response): string | null {
    const userId = resolveUserId(request);
    if (!userId) {
      response.status(401).json({ error: "authentication_required" });
      return null;
    }
    return userId;
  }

  router.get("/api/store/catalog", catalogLimit, (_request, response) => {
    response.setHeader("Cache-Control", "public, max-age=60");
    response.json({ items: STORE_CATALOG });
  });

  router.post("/api/store/purchase", purchaseLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    const body = validateOperationBody(request.body);
    if (!body) {
      response.status(400).json({ error: "invalid_purchase" });
      return;
    }
    const storeItem = getStoreItem(body.itemId);
    if (!storeItem) {
      response.status(404).json({ error: "item_not_found" });
      return;
    }
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      const replay = await checkIdempotency(client, userId, "purchase", storeItem.id, body.idempotencyKey);
      if (replay) return { ...replay, profile, replayed: true };
      if (profile.inventory.ownedItemIds.includes(storeItem.id)) throw new StoreServiceError(409, "item_already_owned");
      if (profile.gold < storeItem.price.gold || profile.diamonds < storeItem.price.diamonds) {
        throw new StoreServiceError(409, "insufficient_funds");
      }
      const nextProfile: PlayerProfile = {
        ...profile,
        gold: profile.gold - storeItem.price.gold,
        diamonds: profile.diamonds - storeItem.price.diamonds,
        inventory: {
          ...profile.inventory,
          ownedItemIds: [...profile.inventory.ownedItemIds, storeItem.id],
          newItemIds: [...profile.inventory.newItemIds, storeItem.id],
        },
      };
      await updateProfile(client, userId, nextProfile);
      const result: StoredOperationResponse = {
        profile: publicProfile(nextProfile),
        itemId: storeItem.id,
        operation: "purchase",
        cost: { gold: storeItem.price.gold, diamonds: storeItem.price.diamonds },
      };
      await saveOperation(client, userId, body.idempotencyKey, "purchase", storeItem.id, result);
      return result;
    });
  });

  router.post("/api/store/equip", equipLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    const itemId = validateEquipBody(request.body);
    if (!itemId) {
      response.status(400).json({ error: "invalid_equipment" });
      return;
    }
    const storeItem = getStoreItem(itemId);
    if (!storeItem) {
      response.status(404).json({ error: "item_not_found" });
      return;
    }
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      if (!profile.inventory.ownedItemIds.includes(storeItem.id)) throw new StoreServiceError(403, "item_not_owned");
      const key = equipmentKey(storeItem.slot);
      const nextProfile: PlayerProfile = {
        ...profile,
        equipment: { ...profile.equipment, [key]: storeItem.id },
        inventory: {
          ...profile.inventory,
          newItemIds: profile.inventory.newItemIds.filter((id) => id !== storeItem.id),
        },
      };
      await updateProfile(client, userId, nextProfile);
      return { profile: publicProfile(nextProfile), itemId: storeItem.id, equipped: true };
    });
  });

  router.post("/api/store/upgrade", upgradeLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    const body = validateOperationBody(request.body);
    if (!body) {
      response.status(400).json({ error: "invalid_upgrade" });
      return;
    }
    const storeItem = getStoreItem(body.itemId);
    if (!storeItem) {
      response.status(404).json({ error: "item_not_found" });
      return;
    }
    if (!storeItem.upgradeable || !["weapon", "armor"].includes(storeItem.slot)) {
      response.status(400).json({ error: "item_not_upgradeable" });
      return;
    }
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      const replay = await checkIdempotency(client, userId, "upgrade", storeItem.id, body.idempotencyKey);
      if (replay) return { ...replay, profile, replayed: true };
      if (!profile.inventory.ownedItemIds.includes(storeItem.id)) throw new StoreServiceError(403, "item_not_owned");
      const currentLevel = profile.inventory.upgrades[storeItem.id] ?? 0;
      if (currentLevel >= MAX_UPGRADE_LEVEL) throw new StoreServiceError(409, "upgrade_max_level");
      const cost = getUpgradeCost(storeItem.slot, currentLevel);
      if (
        profile.gold < cost.gold ||
        profile.materials.ironShards < cost.ironShards ||
        profile.materials.emberCrystals < cost.emberCrystals ||
        profile.materials.sealFragments < cost.sealFragments
      ) throw new StoreServiceError(409, "insufficient_upgrade_materials");
      const nextProfile: PlayerProfile = {
        ...profile,
        gold: profile.gold - cost.gold,
        materials: {
          ...profile.materials,
          ironShards: profile.materials.ironShards - cost.ironShards,
          emberCrystals: profile.materials.emberCrystals - cost.emberCrystals,
          sealFragments: profile.materials.sealFragments - cost.sealFragments,
        },
        inventory: {
          ...profile.inventory,
          upgrades: { ...profile.inventory.upgrades, [storeItem.id]: currentLevel + 1 },
        },
      };
      await updateProfile(client, userId, nextProfile);
      const result: StoredOperationResponse = {
        profile: publicProfile(nextProfile),
        itemId: storeItem.id,
        operation: "upgrade",
        cost,
      };
      await saveOperation(client, userId, body.idempotencyKey, "upgrade", storeItem.id, result);
      return result;
    });
  });

  return router;
}

export function calculateAccountCombatStats(profileValue: unknown) {
  const profile = validatePlayerProfile(profileValue);
  return profile ? calculatePlayerCombatModifiers(profile) : null;
}

export function storeItemSlot(item: StoreItem) {
  return equipmentKey(item.slot);
}

export function validateStoreOperationBody(value: unknown) {
  return validateOperationBody(value);
}
