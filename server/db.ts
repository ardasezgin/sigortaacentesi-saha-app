import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ============================================
// AGENCY DATABASE FUNCTIONS
// ============================================

import { agencies, Agency, InsertAgency } from "../drizzle/schema";
import { like, or } from "drizzle-orm";

/**
 * Get all agencies from database
 */
export async function getAllAgencies(): Promise<Agency[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agencies: database not available");
    return [];
  }

  try {
    const result = await db.select().from(agencies);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get agencies:", error);
    return [];
  }
}

/**
 * Find agency by levha number (case-insensitive)
 */
export async function findAgencyByLevhaNo(levhaNo: string): Promise<Agency | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find agency: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(agencies)
      .where(eq(agencies.levhaNo, levhaNo))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find agency by levhaNo:", error);
    return null;
  }
}

/**
 * Find agency by name (partial match, case-insensitive)
 */
export async function findAgencyByName(name: string): Promise<Agency | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find agency: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(agencies)
      .where(like(agencies.acenteUnvani, `%${name}%`))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find agency by name:", error);
    return null;
  }
}

/**
 * Search agencies by levha no, name, il, or ilce
 */
export async function searchAgencies(query: string): Promise<Agency[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search agencies: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(agencies)
      .where(
        or(
          like(agencies.levhaNo, `%${query}%`),
          like(agencies.acenteUnvani, `%${query}%`),
          like(agencies.il, `%${query}%`),
          like(agencies.ilce, `%${query}%`)
        )
      )
      .limit(100); // Limit to 100 results for performance

    return result;
  } catch (error) {
    console.error("[Database] Failed to search agencies:", error);
    return [];
  }
}

/**
 * Create a new agency
 */
export async function createAgency(data: InsertAgency): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(agencies).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create agency:", error);
    throw error;
  }
}

/**
 * Bulk insert agencies (for Excel import)
 */
export async function bulkInsertAgencies(data: InsertAgency[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Insert in batches of 500 to avoid query size limits
    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(agencies).values(batch);
      console.log(`[Database] Inserted batch ${i / batchSize + 1}: ${batch.length} agencies`);
    }
    console.log(`[Database] Successfully inserted ${data.length} agencies`);
  } catch (error) {
    console.error("[Database] Failed to bulk insert agencies:", error);
    throw error;
  }
}

/**
 * Update agency
 */
export async function updateAgency(
  levhaNo: string,
  data: Partial<InsertAgency>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(agencies).set(data).where(eq(agencies.levhaNo, levhaNo));
  } catch (error) {
    console.error("[Database] Failed to update agency:", error);
    throw error;
  }
}

/**
 * Delete agency
 */
export async function deleteAgency(levhaNo: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(agencies).where(eq(agencies.levhaNo, levhaNo));
  } catch (error) {
    console.error("[Database] Failed to delete agency:", error);
    throw error;
  }
}

/**
 * Get agency count
 */
export async function getAgencyCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agency count: database not available");
    return 0;
  }

  try {
    const result = await db.select().from(agencies);
    return result.length;
  } catch (error) {
    console.error("[Database] Failed to get agency count:", error);
    return 0;
  }
}
