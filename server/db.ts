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
    console.log('[getAllAgencies] Fetched', result.length, 'agencies');
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

// ============================================
// VISIT DATABASE FUNCTIONS
// ============================================

import { visits, Visit, InsertVisit, communications, Communication, InsertCommunication, requests, Request, InsertRequest } from "../drizzle/schema";
import { desc, and, gte, lte, count, sql } from "drizzle-orm";

/**
 * Get all visits
 */
export async function getAllVisits(): Promise<Visit[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get visits: database not available");
    return [];
  }

  try {
    const result = await db.select().from(visits).orderBy(desc(visits.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get visits:", error);
    return [];
  }
}

/**
 * Get visits by agency levha number
 */
export async function getVisitsByAgency(levhaNo: string): Promise<Visit[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(visits)
      .where(eq(visits.levhaNo, levhaNo))
      .orderBy(desc(visits.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get visits by agency:", error);
    return [];
  }
}

/**
 * Get recent visits (limited)
 */
export async function getRecentVisits(limit: number = 10): Promise<Visit[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(visits)
      .orderBy(desc(visits.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get recent visits:", error);
    return [];
  }
}

/**
 * Add a new visit
 */
export async function addVisit(data: InsertVisit): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(visits).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to add visit:", error);
    throw error;
  }
}

/**
 * Update a visit
 */
export async function updateVisit(id: number, data: Partial<InsertVisit>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(visits).set(data).where(eq(visits.id, id));
  } catch (error) {
    console.error("[Database] Failed to update visit:", error);
    throw error;
  }
}

/**
 * Delete a visit
 */
export async function deleteVisit(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(visits).where(eq(visits.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete visit:", error);
    throw error;
  }
}

// ============================================
// COMMUNICATION DATABASE FUNCTIONS
// ============================================

/**
 * Get all communications
 */
export async function getAllCommunications(): Promise<Communication[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db.select().from(communications).orderBy(desc(communications.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get communications:", error);
    return [];
  }
}

/**
 * Add a new communication
 */
export async function addCommunication(data: InsertCommunication): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(communications).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to add communication:", error);
    throw error;
  }
}

// ============================================
// REQUEST DATABASE FUNCTIONS
// ============================================

/**
 * Get all requests
 */
export async function getAllRequests(): Promise<Request[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db.select().from(requests).orderBy(desc(requests.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get requests:", error);
    return [];
  }
}

/**
 * Get recent requests (limited)
 */
export async function getRecentRequests(limit: number = 10): Promise<Request[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(requests)
      .orderBy(desc(requests.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get recent requests:", error);
    return [];
  }
}

/**
 * Add a new request
 */
export async function addRequest(data: InsertRequest): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(requests).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to add request:", error);
    throw error;
  }
}

/**
 * Update a request
 */
export async function updateRequest(id: number, data: Partial<InsertRequest>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(requests).set(data).where(eq(requests.id, id));
  } catch (error) {
    console.error("[Database] Failed to update request:", error);
    throw error;
  }
}

// ============================================
// DASHBOARD METRICS FUNCTIONS
// ============================================

/**
 * Get dashboard metrics (active/passive agencies, visits, requests)
 */
export async function getDashboardMetrics() {
  const db = await getDb();
  if (!db) {
    return {
      totalAgencies: 0,
      activeAgencies: 0,
      passiveAgencies: 0,
      totalVisitsThisWeek: 0,
      totalVisitsThisMonth: 0,
      newAgenciesThisMonth: 0,
      openRequests: 0,
    };
  }

  try {
    // Get agency counts
    const totalAgenciesResult = await db.select({ count: count() }).from(agencies);
    const totalAgencies = totalAgenciesResult[0]?.count || 0;

    const activeAgenciesResult = await db
      .select({ count: count() })
      .from(agencies)
      .where(eq(agencies.isActive, 1));
    const activeAgencies = activeAgenciesResult[0]?.count || 0;

    const passiveAgencies = totalAgencies - activeAgencies;

    // Get visit counts (this week and this month)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const visitsThisWeekResult = await db
      .select({ count: count() })
      .from(visits)
      .where(gte(visits.createdAt, startOfWeek));
    const totalVisitsThisWeek = visitsThisWeekResult[0]?.count || 0;

    const visitsThisMonthResult = await db
      .select({ count: count() })
      .from(visits)
      .where(gte(visits.createdAt, startOfMonth));
    const totalVisitsThisMonth = visitsThisMonthResult[0]?.count || 0;

    // Get new agencies this month
    const newAgenciesResult = await db
      .select({ count: count() })
      .from(agencies)
      .where(gte(agencies.createdAt, startOfMonth));
    const newAgenciesThisMonth = newAgenciesResult[0]?.count || 0;

    // Get open requests count
    const openRequestsResult = await db
      .select({ count: count() })
      .from(requests)
      .where(eq(requests.status, "Açık"));
    const openRequests = openRequestsResult[0]?.count || 0;

    return {
      totalAgencies,
      activeAgencies,
      passiveAgencies,
      totalVisitsThisWeek,
      totalVisitsThisMonth,
      newAgenciesThisMonth,
      openRequests,
    };
  } catch (error) {
    console.error("[Database] Failed to get dashboard metrics:", error);
    return {
      totalAgencies: 0,
      activeAgencies: 0,
      passiveAgencies: 0,
      totalVisitsThisWeek: 0,
      totalVisitsThisMonth: 0,
      newAgenciesThisMonth: 0,
      openRequests: 0,
    };
  }
}

// ============================================
// USER DATABASE FUNCTIONS (for ClickUp integration)
// ============================================

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find user: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to find user by email:", error);
    return null;
  }
}

/**
 * Update user's ClickUp user ID
 */
export async function updateUserClickUpId(userId: number, clickupUserId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    await db
      .update(users)
      .set({ clickupUserId })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user ClickUp ID:", error);
    throw error;
  }
}
