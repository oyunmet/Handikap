import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool, PoolClient } from "pg";
import { isCombatItemId } from "../src/shafak/game/combat-items.ts";
import {
  createDefaultPlayerProfile,
  validatePlayerProfile,
} from "./profileApi.ts";
import {
  calculatePlayerCombatModifiers,
  getStoreItem,
  isDailySpecialAvailable,
  STARTER_ITEM_IDS,
  STORE_CATALOG,
} from "./storeCatalog.ts";
import type { PlayerProfile } from "../src/shafak/game/profile.ts";
import {
  getEquipmentLoadoutKey,
  getItemSellValue,
  getSalvageYield,
  getUpgradeCost,
  isStoreItemUnlocked,
  MAX_UPGRADE_LEVEL,
  rollUpgradeSuccess,
  type EquipmentLoadout,
  type EquipmentLoadoutKey,
  type EquipmentSlot,
  type StoreItem,
} from "../src/shafak/game/store-types.ts";
import { sendAuthenticationRequired } from "./auth.ts";

type StoreOperation = "purchase" | "upgrade" | "sell" | "salvage";
type StoredOperationResponse = {
  profile: unknown;
  itemId: string;
  operation: StoreOperation;
  cost: Record<string, number>;
  upgradeSucceeded?: boolean;
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

function validateEquipBody(value: unknown): { itemId: string; equipmentKey?: EquipmentLoadoutKey } | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !["itemId", "equipmentKey"].includes(key)) ||
    (Object.keys(value).length !== 1 && Object.keys(value).length !== 2) ||
    !Object.hasOwn(value, "itemId") ||
    typeof value.itemId !== "string" ||
    !/^[a-z0-9_-]{1,60}$/.test(value.itemId) ||
    (value.equipmentKey !== undefined && ![
      "weaponId", "offhandId", "helmetId", "armorId", "glovesId", "bootsId", "capeId",
      "ringOneId", "ringTwoId", "effectId", "dyeId",
    ].includes(String(value.equipmentKey)))
  ) return null;
  return {
    itemId: value.itemId,
    ...(typeof value.equipmentKey === "string" ? { equipmentKey: value.equipmentKey as EquipmentLoadoutKey } : {}),
  };
}

function validateCombatLoadoutBody(value: unknown): {
  quickSlots: (string | null)[];
  secondaryWeaponId: string | null;
} | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    !Array.isArray(value.quickSlots) ||
    value.quickSlots.length !== 4 ||
    value.quickSlots.some((itemId) => itemId !== null && !isCombatItemId(itemId)) ||
    (value.secondaryWeaponId !== null &&
      (typeof value.secondaryWeaponId !== "string" || !/^[a-z0-9_-]{1,60}$/.test(value.secondaryWeaponId)))
  ) return null;
  const quickSlots = value.quickSlots as (string | null)[];
  const assigned = quickSlots.filter((itemId): itemId is string => itemId !== null);
  if (new Set(assigned).size !== assigned.length) return null;
  return { quickSlots, secondaryWeaponId: value.secondaryWeaponId as string | null };
}

function equipmentKey(slot: EquipmentSlot, ringKey?: EquipmentLoadoutKey): keyof EquipmentLoadout {
  return getEquipmentLoadoutKey(slot, ringKey === "ringTwoId" ? "ringTwoId" : "ringOneId");
}

function removeOwnedItem(profile: PlayerProfile, itemId: string): PlayerProfile {
  const equipmentContainsItem = Object.values(profile.equipment).includes(itemId);
  if (equipmentContainsItem || profile.inventory.secondaryWeaponId === itemId) {
    throw new StoreServiceError(409, "item_equipped");
  }
  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      ownedItemIds: profile.inventory.ownedItemIds.filter((id) => id !== itemId),
      newItemIds: profile.inventory.newItemIds.filter((id) => id !== itemId),
      upgrades: Object.fromEntries(Object.entries(profile.inventory.upgrades).filter(([id]) => id !== itemId)),
    },
  };
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
  const loadoutLimit = rateLimit({ windowMs: 60_000, limit: 24, standardHeaders: true, legacyHeaders: false });
  const upgradeLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });

  function authenticatedUserId(request: Request, response: Response): string | null {
    const userId = resolveUserId(request);
    if (!userId) {
      sendAuthenticationRequired(request, response);
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
      if (storeItem.dropOnly) throw new StoreServiceError(403, "item_drop_only");
      if (storeItem.category === "specials" && !isDailySpecialAvailable(storeItem.id)) {
        throw new StoreServiceError(409, "special_offer_expired");
      }
      if (!isStoreItemUnlocked(storeItem, profile.level)) throw new StoreServiceError(403, "item_level_locked");
      if (storeItem.kind === "equipment" && profile.inventory.ownedItemIds.includes(storeItem.id)) {
        throw new StoreServiceError(409, "item_already_owned");
      }
      if (profile.gold < storeItem.price.gold || profile.diamonds < storeItem.price.diamonds) {
        throw new StoreServiceError(409, "insufficient_funds");
      }
      let nextProfile: PlayerProfile = {
        ...profile,
        gold: profile.gold - storeItem.price.gold,
        diamonds: profile.diamonds - storeItem.price.diamonds,
      };
      if (storeItem.kind === "equipment") {
        if (profile.inventory.ownedItemIds.length >= 120) throw new StoreServiceError(409, "inventory_full");
        nextProfile = {
          ...nextProfile,
          inventory: {
            ...profile.inventory,
            ownedItemIds: [...profile.inventory.ownedItemIds, storeItem.id],
            newItemIds: [...profile.inventory.newItemIds, storeItem.id],
          },
        };
      } else if (storeItem.reward?.type === "combat-item") {
        const current = profile.inventory.combatItemCounts[storeItem.reward.itemId];
        if (current + storeItem.reward.amount > 999) throw new StoreServiceError(409, "stack_limit");
        nextProfile = {
          ...nextProfile,
          inventory: {
            ...profile.inventory,
            combatItemCounts: {
              ...profile.inventory.combatItemCounts,
              [storeItem.reward.itemId]: current + storeItem.reward.amount,
            },
          },
        };
      } else if (storeItem.reward?.type === "material") {
        const current = profile.materials[storeItem.reward.material];
        if (current + storeItem.reward.amount > 1_000_000_000) throw new StoreServiceError(409, "stack_limit");
        nextProfile = {
          ...nextProfile,
          materials: {
            ...profile.materials,
            [storeItem.reward.material]: current + storeItem.reward.amount,
          },
        };
      } else {
        throw new StoreServiceError(400, "store_item_has_no_reward");
      }
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
    const body = validateEquipBody(request.body);
    if (!body) {
      response.status(400).json({ error: "invalid_equipment" });
      return;
    }
    const storeItem = getStoreItem(body.itemId);
    if (!storeItem) {
      response.status(404).json({ error: "item_not_found" });
      return;
    }
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      if (!isStoreItemUnlocked(storeItem, profile.level)) throw new StoreServiceError(403, "item_level_locked");
      if (!profile.inventory.ownedItemIds.includes(storeItem.id)) throw new StoreServiceError(403, "item_not_owned");
      if (storeItem.kind !== "equipment" || !storeItem.slot) throw new StoreServiceError(400, "item_not_equippable");
      const expectedKey = equipmentKey(storeItem.slot, storeItem.slot === "ring" ? body.equipmentKey : undefined);
      if (body.equipmentKey && body.equipmentKey !== expectedKey) throw new StoreServiceError(400, "invalid_equipment_slot");
      const key = expectedKey;
      const nextProfile: PlayerProfile = {
        ...profile,
        equipment: {
          ...profile.equipment,
          ...(storeItem.slot === "ring" && key === "ringOneId" && profile.equipment.ringTwoId === storeItem.id ? { ringTwoId: null } : {}),
          ...(storeItem.slot === "ring" && key === "ringTwoId" && profile.equipment.ringOneId === storeItem.id ? { ringOneId: null } : {}),
          [key]: storeItem.id,
        },
        inventory: {
          ...profile.inventory,
          newItemIds: profile.inventory.newItemIds.filter((id) => id !== storeItem.id),
        },
      };
      await updateProfile(client, userId, nextProfile);
      return { profile: publicProfile(nextProfile), itemId: storeItem.id, equipped: true };
    });
  });

  router.post("/api/store/combat-loadout", loadoutLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");
    const body = validateCombatLoadoutBody(request.body);
    if (!body) {
      response.status(400).json({ error: "invalid_combat_loadout" });
      return;
    }
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      for (const itemId of body.quickSlots) {
        if (itemId && profile.inventory.combatItemCounts[itemId as keyof typeof profile.inventory.combatItemCounts] <= 0) {
          throw new StoreServiceError(409, "combat_item_unavailable");
        }
      }
      if (body.secondaryWeaponId) {
        const weapon = getStoreItem(body.secondaryWeaponId);
        if (!weapon || weapon.slot !== "weapon" || !profile.inventory.ownedItemIds.includes(weapon.id)) {
          throw new StoreServiceError(403, "secondary_weapon_not_owned");
        }
      }
      const nextProfile: PlayerProfile = {
        ...profile,
        inventory: {
          ...profile.inventory,
          quickSlots: body.quickSlots as PlayerProfile["inventory"]["quickSlots"],
          secondaryWeaponId: body.secondaryWeaponId,
        },
      };
      await updateProfile(client, userId, nextProfile);
      return { profile: publicProfile(nextProfile) };
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
    if (!storeItem.upgradeable || storeItem.kind !== "equipment" || !storeItem.slot) {
      response.status(400).json({ error: "item_not_upgradeable" });
      return;
    }
    const upgradeSlot = storeItem.slot;
    await runAccountOperation(database, userId, response, async (client) => {
      const profile = await loadProfileForUpdate(client, userId);
      const replay = await checkIdempotency(client, userId, "upgrade", storeItem.id, body.idempotencyKey);
      if (replay) return { ...replay, profile, replayed: true };
      if (!isStoreItemUnlocked(storeItem, profile.level)) throw new StoreServiceError(403, "item_level_locked");
      if (!profile.inventory.ownedItemIds.includes(storeItem.id)) throw new StoreServiceError(403, "item_not_owned");
      const currentLevel = profile.inventory.upgrades[storeItem.id] ?? 0;
      if (currentLevel >= MAX_UPGRADE_LEVEL) throw new StoreServiceError(409, "upgrade_max_level");
      const cost = getUpgradeCost(upgradeSlot, currentLevel);
      if (
        profile.gold < cost.gold ||
        profile.materials.ironShards < cost.ironShards ||
        profile.materials.emberCrystals < cost.emberCrystals ||
        profile.materials.sealFragments < cost.sealFragments
      ) throw new StoreServiceError(409, "insufficient_upgrade_materials");
      const upgradeSucceeded = rollUpgradeSuccess(body.idempotencyKey, currentLevel);
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
          upgrades: upgradeSucceeded
            ? { ...profile.inventory.upgrades, [storeItem.id]: currentLevel + 1 }
            : profile.inventory.upgrades,
        },
      };
      await updateProfile(client, userId, nextProfile);
      const result: StoredOperationResponse = {
        profile: publicProfile(nextProfile),
        itemId: storeItem.id,
        operation: "upgrade",
        cost,
        upgradeSucceeded,
      };
      await saveOperation(client, userId, body.idempotencyKey, "upgrade", storeItem.id, result);
      return result;
    });
  });

  for (const operation of ["sell", "salvage"] as const) {
    router.post(`/api/store/${operation}`, upgradeLimit, async (request, response) => {
      const userId = authenticatedUserId(request, response);
      if (!userId) return;
      response.setHeader("Cache-Control", "no-store");
      const body = validateOperationBody(request.body);
      if (!body) {
        response.status(400).json({ error: `invalid_${operation}` });
        return;
      }
      const storeItem = getStoreItem(body.itemId);
      if (!storeItem) {
        response.status(404).json({ error: "item_not_found" });
        return;
      }
      if (storeItem.kind !== "equipment" || !storeItem.slot) {
        response.status(400).json({ error: "item_not_equipment" });
        return;
      }
      await runAccountOperation(database, userId, response, async (client) => {
        let profile = await loadProfileForUpdate(client, userId);
        const replay = await checkIdempotency(client, userId, operation, storeItem.id, body.idempotencyKey);
        if (replay) return { ...replay, profile, replayed: true };
        if (STARTER_ITEM_IDS.includes(storeItem.id as (typeof STARTER_ITEM_IDS)[number])) {
          throw new StoreServiceError(409, "starter_item_cannot_be_removed");
        }
        if (!profile.inventory.ownedItemIds.includes(storeItem.id)) {
          throw new StoreServiceError(403, "item_not_owned");
        }
        const salvageUpgradeLevel = profile.inventory.upgrades[storeItem.id] ?? 0;
        profile = removeOwnedItem(profile, storeItem.id);
        let result: StoredOperationResponse;
        if (operation === "sell") {
          const payout = getItemSellValue(storeItem);
          if (payout.gold <= 0 && payout.diamonds <= 0) throw new StoreServiceError(409, "item_has_no_sale_value");
          const nextProfile = {
            ...profile,
            gold: Math.min(1_000_000_000, profile.gold + payout.gold),
            diamonds: Math.min(1_000_000_000, profile.diamonds + payout.diamonds),
          };
          await updateProfile(client, userId, nextProfile);
          result = {
            profile: publicProfile(nextProfile),
            itemId: storeItem.id,
            operation,
            cost: {},
          };
        } else {
          const yieldAmount = getSalvageYield(storeItem, salvageUpgradeLevel);
          const nextProfile = {
            ...profile,
            materials: {
              ironShards: Math.min(1_000_000_000, profile.materials.ironShards + yieldAmount.ironShards),
              emberCrystals: Math.min(1_000_000_000, profile.materials.emberCrystals + yieldAmount.emberCrystals),
              sealFragments: Math.min(1_000_000_000, profile.materials.sealFragments + yieldAmount.sealFragments),
            },
          };
          await updateProfile(client, userId, nextProfile);
          result = {
            profile: publicProfile(nextProfile),
            itemId: storeItem.id,
            operation,
            cost: {},
          };
        }
        await saveOperation(client, userId, body.idempotencyKey, operation, storeItem.id, result);
        return result;
      });
    });
  }

  return router;
}

export function calculateAccountCombatStats(profileValue: unknown) {
  const profile = validatePlayerProfile(profileValue);
  return profile ? calculatePlayerCombatModifiers(profile) : null;
}

export function storeItemSlot(item: StoreItem) {
  return item.slot ? equipmentKey(item.slot) : null;
}

export function validateStoreOperationBody(value: unknown) {
  return validateOperationBody(value);
}
