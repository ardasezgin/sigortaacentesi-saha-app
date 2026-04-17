import { eq, asc } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: any = null;
let _pgClient: any = null; // raw postgres-js client for direct SQL queries

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      
      // Check if it's PostgreSQL or MySQL
      if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
        console.log('[Database] Connecting to PostgreSQL...');
        _pgClient = postgres(dbUrl);
        _db = drizzlePostgres(_pgClient);
      } else {
        console.log('[Database] Connecting to MySQL/TiDB...');
        _db = drizzleMysql(dbUrl);
      }
      
      console.log('[Database] Connection established');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Get raw postgres-js client for direct SQL queries (bypasses Drizzle ORM schema issues)
export async function getPgClient() {
  await getDb(); // ensure connection is initialized
  return _pgClient;
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

    const textFields = ["name", "email", "loginMethod", "clickupUserId"] as const;
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

    const dbUrl = process.env.DATABASE_URL ?? "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

    if (isPostgres) {
      // PostgreSQL: Try upsert by openId first.
      // If email already exists with a different openId (legacy password user),
      // update that existing row to link it with the ClickUp openId.
      try {
        await db.insert(users).values(values).onConflictDoUpdate({
          target: users.openId,
          set: updateSet,
        });
      } catch (pgErr: unknown) {
        // email unique constraint violation: legacy user exists, update their openId
        const errCode = (pgErr as { cause?: { code?: string } })?.cause?.code;
        if (errCode === "23505" && user.email) {
          console.log("[Database] Email exists, linking ClickUp openId to existing user:", user.email);
          await db
            .update(users)
            .set({ openId: user.openId, loginMethod: user.loginMethod, lastSignedIn: values.lastSignedIn ?? new Date() })
            .where(eq(users.email, user.email));
        } else {
          throw pgErr;
        }
      }
    } else {
      // MySQL / TiDB
      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    }
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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ============================================
// AGENCY DATABASE FUNCTIONS
// ============================================

import { agencies, Agency, InsertAgency } from "../drizzle/schema";
import { like, or, ilike, sql as drizzleSql } from "drizzle-orm";

/**
 * Türkçe büyük/küçük harf duyarsız arama için metin normalize eder.
 * i→i, İ→i, ı→i, I→i, ş→s, Ş→s, ğ→g, Ğ→g, ü→u, Ü→u, ö→o, Ö→o, ç→c, Ç→c
 */
function normalizeTurkish(text: string): string {
  // Önce Türkçe özel karakterleri ASCII'ye çevir, sonra lowercase yap
  return text
    .replace(/İ/g, 'I')  // İ → I (sonra toLowerCase ile i olur)
    .replace(/ı/g, 'i')  // ı → i
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .toLowerCase();
}

/**
 * MySQL'de Türkçe karakter duyarsız arama için SQL expression üretir.
 * LOWER(REPLACE(REPLACE(..., 'İ','i'), 'I','i'), ...) LIKE '%normalized%'
 */
function turkishLike(column: any, normalizedSearch: string) {
  const s = `%${normalizedSearch}%`;
  // MySQL LOWER + REPLACE zinciri ile Türkçe karakterleri normalize et
  const normalized = drizzleSql`LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${column},'İ','i'),'I','i'),'ı','i'),'Ş','s'),'ş','s'),'Ğ','g'),'ğ','g'),'Ü','u'),'ü','u'),'Ö','o'),'ö','o'),'Ç','c'),'ç','c'),'â','a'))`;
  return drizzleSql`${normalized} LIKE ${s}`;
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
    const normalized = normalizeTurkish(name);
    const result = await db
      .select()
      .from(agencies)
      .where(turkishLike(agencies.acenteUnvani, normalized))
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
    const normalized = normalizeTurkish(query);
    const result = await db
      .select()
      .from(agencies)
      .where(
        or(
          ilike(agencies.levhaNo, `%${query}%`),
          turkishLike(agencies.acenteUnvani, normalized),
          turkishLike(agencies.il, normalized),
          turkishLike(agencies.ilce, normalized)
        )
      )
      .limit(100);

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
    const result = await db.select({ count: count() }).from(agencies);
    return Number(result[0]?.count ?? 0);
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
 * Get agencies with pagination (for mobile performance)
 */
export async function getAgenciesPaginated(
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<{ agencies: Agency[]; total: number; hasMore: boolean }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agencies: database not available");
    return { agencies: [], total: 0, hasMore: false };
  }
  try {
    const offset = (page - 1) * limit;
    let query: any;
    let countQuery: any;

    if (search && search.trim()) {
      const normalized = normalizeTurkish(search.trim());
      const whereClause = or(
        ilike(agencies.levhaNo, `%${search.trim()}%`),
        turkishLike(agencies.acenteUnvani, normalized),
        turkishLike(agencies.il, normalized),
        turkishLike(agencies.ilce, normalized)
      );
      query = db.select().from(agencies).where(whereClause).orderBy(asc(agencies.acenteUnvani)).limit(limit).offset(offset);
      countQuery = db.select({ count: count() }).from(agencies).where(whereClause);
    } else {
      query = db.select().from(agencies).orderBy(asc(agencies.acenteUnvani)).limit(limit).offset(offset);
      countQuery = db.select({ count: count() }).from(agencies);
    }

    const [rows, countResult] = await Promise.all([query, countQuery]);
    const total = Number(countResult[0]?.count ?? 0);
    console.log(`[getAgenciesPaginated] page=${page} limit=${limit} search=${search} fetched=${rows.length} total=${total}`);
    return { agencies: rows, total, hasMore: offset + rows.length < total };
  } catch (error) {
    console.error("[Database] Failed to get agencies paginated:", error);
    return { agencies: [], total: 0, hasMore: false };
  }
}

/**
 * Get all agencies from database (kept for backward compat, use getAgenciesPaginated for mobile)
 */
export async function getAllAgencies(): Promise<Agency[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agencies: database not available");
    return [];
  }
  try {
    const result = await db.select().from(agencies).orderBy(asc(agencies.acenteUnvani));
    console.log('[getAllAgencies] Fetched', result.length, 'agencies');
    return result;
  } catch (error) {
    console.error("[Database] Failed to get agencies:", error);
    return [];
  }
}

/**
 * Get all visits
 */
export async function getAllVisits(): Promise<Visit[]> {
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`SELECT * FROM visits ORDER BY "createdAt" DESC`;
      return result as Visit[];
    } catch (error) {
      console.error("[Database] Failed to get visits (raw SQL):", error);
      return [];
    }
  }
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`SELECT * FROM visits WHERE "levhaNo" = ${levhaNo} ORDER BY "createdAt" DESC`;
      return result as Visit[];
    } catch (error) {
      console.error("[Database] Failed to get visits by agency (raw SQL):", error);
      return [];
    }
  }
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`SELECT * FROM visits ORDER BY "createdAt" DESC LIMIT ${limit}`;
      return result as Visit[];
    } catch (error) {
      console.error("[Database] Failed to get recent visits (raw SQL):", error);
      return [];
    }
  }
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
  // Use raw SQL to bypass Drizzle ORM MySQL/PostgreSQL schema incompatibility
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`
        INSERT INTO visits (
          "iletisimTuru", "isOrtagi", "levhaNo", "acenteAdi",
          "kimleGorusuldu", "tarih", "gundem", "detayAciklama",
          "hatirlatma", "hatirlatmaTarihi", "dosyalar", "createdBy"
        ) VALUES (
          ${data.iletisimTuru}, ${data.isOrtagi}, ${data.levhaNo}, ${data.acenteAdi ?? null},
          ${data.kimleGorusuldu}, ${data.tarih}, ${data.gundem}, ${data.detayAciklama},
          ${data.hatirlatma ?? null}, ${data.hatirlatmaTarihi ?? null}, ${data.dosyalar ?? null}, ${data.createdBy}
        ) RETURNING id
      `;
      return result[0]?.id ?? 0;
    } catch (error) {
      console.error("[Database] Failed to add visit (raw SQL):", error);
      throw error;
    }
  }

  // Fallback to Drizzle ORM (MySQL)
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      // Build SET clause dynamically from provided fields
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) {
          setClauses.push(`"${key}" = $${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
      }
      if (setClauses.length === 0) return;
      values.push(id);
      await pgClient.unsafe(
        `UPDATE visits SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        values
      );
      return;
    } catch (error) {
      console.error("[Database] Failed to update visit (raw SQL):", error);
      throw error;
    }
  }
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      await pgClient`DELETE FROM visits WHERE id = ${id}`;
      return;
    } catch (error) {
      console.error("[Database] Failed to delete visit (raw SQL):", error);
      throw error;
    }
  }
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`SELECT * FROM requests ORDER BY "createdAt" DESC`;
      return result as Request[];
    } catch (error) {
      console.error("[Database] Failed to get requests (raw SQL):", error);
      return [];
    }
  }
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`SELECT * FROM requests ORDER BY "createdAt" DESC LIMIT ${limit}`;
      return result as Request[];
    } catch (error) {
      console.error("[Database] Failed to get recent requests (raw SQL):", error);
      return [];
    }
  }
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
  // Use raw SQL to bypass Drizzle ORM MySQL/PostgreSQL schema incompatibility
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const result = await pgClient`
        INSERT INTO requests (
          "levhaNo", "acenteAdi", "requestType", "priority",
          "status", "subject", "description", "response", "createdBy"
        ) VALUES (
          ${data.levhaNo}, ${data.acenteAdi ?? null}, ${data.requestType}, ${data.priority},
          ${data.status}, ${data.subject}, ${data.description}, ${data.response ?? null}, ${data.createdBy}
        ) RETURNING id
      `;
      return result[0]?.id ?? 0;
    } catch (error) {
      console.error("[Database] Failed to add request (raw SQL):", error);
      throw error;
    }
  }

  // Fallback to Drizzle ORM (MySQL)
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
  const pgClient = await getPgClient();
  if (pgClient) {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) {
          setClauses.push(`"${key}" = $${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
      }
      if (setClauses.length === 0) return;
      values.push(id);
      await pgClient.unsafe(
        `UPDATE requests SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        values
      );
      return;
    } catch (error) {
      console.error("[Database] Failed to update request (raw SQL):", error);
      throw error;
    }
  }
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
 * Uses getPgClient() for PostgreSQL compatibility
 */
export async function getDashboardMetrics() {
  try {
    const sql = await getPgClient();
    if (!sql) {
      console.warn('[getDashboardMetrics] No database client available');
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

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [agencyResult, visitsWeekResult, visitsMonthResult, newAgenciesResult, openRequestsResult] = await Promise.allSettled([
      sql`SELECT COUNT(*)::int as totalcount, SUM(CASE WHEN "isActive" = 1 THEN 1 ELSE 0 END)::int as activecount FROM agencies`,
      sql`SELECT COUNT(*)::int as cnt FROM visits WHERE "createdAt" >= ${startOfWeek}`,
      sql`SELECT COUNT(*)::int as cnt FROM visits WHERE "createdAt" >= ${startOfMonth}`,
      sql`SELECT COUNT(*)::int as cnt FROM agencies WHERE "createdAt" >= ${startOfMonth}`,
      sql`SELECT COUNT(*)::int as cnt FROM requests WHERE status = 'Açık'`,
    ]);

    if (agencyResult.status === 'rejected') console.error('[getDashboardMetrics] agencyRows failed:', agencyResult.reason?.message);
    if (visitsWeekResult.status === 'rejected') console.error('[getDashboardMetrics] visitsWeek failed:', visitsWeekResult.reason?.message);

    const agencyRows = agencyResult.status === 'fulfilled' ? agencyResult.value : [];
    const visitsWeekRows = visitsWeekResult.status === 'fulfilled' ? visitsWeekResult.value : [];
    const visitsMonthRows = visitsMonthResult.status === 'fulfilled' ? visitsMonthResult.value : [];
    const newAgenciesRows = newAgenciesResult.status === 'fulfilled' ? newAgenciesResult.value : [];
    const openRequestsRows = openRequestsResult.status === 'fulfilled' ? openRequestsResult.value : [];

    const totalAgencies = Number((agencyRows as any)[0]?.totalcount) || 0;
    const activeAgencies = Number((agencyRows as any)[0]?.activecount) || 0;
    const passiveAgencies = totalAgencies - activeAgencies;
    const totalVisitsThisWeek = Number((visitsWeekRows as any)[0]?.cnt) || 0;
    const totalVisitsThisMonth = Number((visitsMonthRows as any)[0]?.cnt) || 0;
    const newAgenciesThisMonth = Number((newAgenciesRows as any)[0]?.cnt) || 0;
    const openRequests = Number((openRequestsRows as any)[0]?.cnt) || 0;

    console.log('[getDashboardMetrics] totalAgencies:', totalAgencies, 'activeAgencies:', activeAgencies);

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
    console.error('[Database] Failed to get dashboard metrics:', error);
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

/**
 * Update user's last signed in timestamp
 */
export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user last signed in:", error);
    throw error;
  }
}

// ============================================
// ACENTE KARNESİ DATABASE FUNCTIONS
// ============================================

export interface AgencyKarne {
  // Sistem alanları (otomatik dolan, Sayfa2'den)
  id: number;
  levhaNo: string;
  acenteUnvani: string;
  il: string | null;
  ilce: string | null;
  kurucuPersonel: string | null;
  kurulusTarihi: string | null;
  kurulusTarihiSacom: string | null;
  personelSayisi: string | null;
  subeMudurSayisi: string | null;
  organizasyoncu: string | null;
  subeSayisi: string | null;
  kacSirketleCalisiyor: string | null;
  acenteSegmenti: string | null;
  // Saha giriş/edit alanları (kullanıcı doldurur)
  yonetimIliskisi: string | null;
  acenteyeVerilenSoz: string | null;
  hayatHayatDisi: string | null;
  uretim2025: string | null;
  portfoyAgirligi: string | null;
  trafikYuzde: string | null;
  kaskoYuzde: string | null;
  otoDisiYuzde: string | null;
  saglikYuzde: string | null;
  cmYapilanmasi: string | null;
  acenteKararAlicisi: string | null;
  teknolojiIlgisi: string | null;
  hizliTeklifEkrani: string | null;
  hizliTeklifPartneri: string | null;
  whatsappKullanimi: string | null;
  whatsappPartneri: string | null;
  webSitesi: string | null;
  webPartneri: string | null;
  mobilUygulama: string | null;
  appPartneri: string | null;
  dijitalPazarlama: string | null;
  musteriNeredenGeliyor: string | null;
  operasyonelVerimlilik: string | null;
  leadYonlendirme: string | null;
  dijitallesmeHarcama: string | null;
  filoMusteriYogunlugu: string | null;
  galeriMusterisi: string | null;
  karneLastUpdated: string | null;
}

/**
 * Get agency karne (full card data) by agency id
 */
export async function getAgencyKarneById(agencyId: number): Promise<AgencyKarne | null> {
  const pg = await getPgClient();
  if (!pg) {
    console.warn("[Database] Cannot get agency karne: database not available");
    return null;
  }
  try {
    const result = await pg`
      SELECT 
        id, "levhaNo", "acenteUnvani", il, ilce,
        "kurucuPersonel", "kurulusTarihi", "kurulusTarihiSacom",
        "personelSayisi", "subeMudurSayisi", "organizasyoncu",
        "subeSayisi", "kacSirketleCalisiyor", "acenteSegmenti",
        "yonetimIliskisi", "acenteyeVerilenSoz", "hayatHayatDisi",
        "uretim2025", "portfoyAgirligi", "trafikYuzde", "kaskoYuzde",
        "otoDisiYuzde", "saglikYuzde", "cmYapilanmasi", "acenteKararAlicisi",
        "teknolojiIlgisi", "hizliTeklifEkrani", "hizliTeklifPartneri",
        "whatsappKullanimi", "whatsappPartneri", "webSitesi", "webPartneri",
        "mobilUygulama", "appPartneri", "dijitalPazarlama", "musteriNeredenGeliyor",
        "operasyonelVerimlilik", "leadYonlendirme", "dijitallesmeHarcama",
        "filoMusteriYogunlugu", "galeriMusterisi",
        to_char("karneLastUpdated", 'DD.MM.YYYY HH24:MI') as "karneLastUpdated"
      FROM agencies WHERE id = ${agencyId} LIMIT 1
    `;
    return result.length > 0 ? (result[0] as AgencyKarne) : null;
  } catch (error) {
    console.error("[Database] Failed to get agency karne:", error);
    return null;
  }
}

/**
 * Get agency karne (full card data) by levhaNo
 */
export async function getAgencyKarneByLevhaNo(levhaNo: string): Promise<AgencyKarne | null> {
  const pg = await getPgClient();
  if (!pg) {
    console.warn("[Database] Cannot get agency karne: database not available");
    return null;
  }
  try {
    const result = await pg`
      SELECT 
        id, "levhaNo", "acenteUnvani", il, ilce,
        "kurucuPersonel", "kurulusTarihi", "kurulusTarihiSacom",
        "personelSayisi", "subeMudurSayisi", "organizasyoncu",
        "subeSayisi", "kacSirketleCalisiyor", "acenteSegmenti",
        "yonetimIliskisi", "acenteyeVerilenSoz", "hayatHayatDisi",
        "uretim2025", "portfoyAgirligi", "trafikYuzde", "kaskoYuzde",
        "otoDisiYuzde", "saglikYuzde", "cmYapilanmasi", "acenteKararAlicisi",
        "teknolojiIlgisi", "hizliTeklifEkrani", "hizliTeklifPartneri",
        "whatsappKullanimi", "whatsappPartneri", "webSitesi", "webPartneri",
        "mobilUygulama", "appPartneri", "dijitalPazarlama", "musteriNeredenGeliyor",
        "operasyonelVerimlilik", "leadYonlendirme", "dijitallesmeHarcama",
        "filoMusteriYogunlugu", "galeriMusterisi",
        to_char("karneLastUpdated", 'DD.MM.YYYY HH24:MI') as "karneLastUpdated"
      FROM agencies WHERE "levhaNo" = ${levhaNo} LIMIT 1
    `;
    return result.length > 0 ? (result[0] as AgencyKarne) : null;
  } catch (error) {
    console.error("[Database] Failed to get agency karne by levhaNo:", error);
    return null;
  }
}

export type KarneEditFields = {
  personelSayisi?: string | null;
  organizasyoncu?: string | null;
  subeSayisi?: string | null;
  yonetimIliskisi?: string | null;
  acenteyeVerilenSoz?: string | null;
  hayatHayatDisi?: string | null;
  uretim2025?: string | null;
  portfoyAgirligi?: string | null;
  trafikYuzde?: string | null;
  kaskoYuzde?: string | null;
  otoDisiYuzde?: string | null;
  saglikYuzde?: string | null;
  cmYapilanmasi?: string | null;
  acenteKararAlicisi?: string | null;
  teknolojiIlgisi?: string | null;
  hizliTeklifEkrani?: string | null;
  hizliTeklifPartneri?: string | null;
  whatsappKullanimi?: string | null;
  whatsappPartneri?: string | null;
  webSitesi?: string | null;
  webPartneri?: string | null;
  mobilUygulama?: string | null;
  appPartneri?: string | null;
  dijitalPazarlama?: string | null;
  musteriNeredenGeliyor?: string | null;
  operasyonelVerimlilik?: string | null;
  leadYonlendirme?: string | null;
  dijitallesmeHarcama?: string | null;
  filoMusteriYogunlugu?: string | null;
  galeriMusterisi?: string | null;
};

/**
 * Save agency karne edit fields by levhaNo
 */
export async function saveAgencyKarneByLevhaNo(levhaNo: string, data: KarneEditFields): Promise<void> {
  const pg = await getPgClient();
  if (!pg) {
    throw new Error("Database not available");
  }
  try {
    await pg`
      UPDATE agencies SET
        "personelSayisi" = ${data.personelSayisi ?? null},
        "organizasyoncu" = ${data.organizasyoncu ?? null},
        "subeSayisi" = ${data.subeSayisi ?? null},
        "yonetimIliskisi" = ${data.yonetimIliskisi ?? null},
        "acenteyeVerilenSoz" = ${data.acenteyeVerilenSoz ?? null},
        "hayatHayatDisi" = ${data.hayatHayatDisi ?? null},
        "uretim2025" = ${data.uretim2025 ?? null},
        "portfoyAgirligi" = ${data.portfoyAgirligi ?? null},
        "trafikYuzde" = ${data.trafikYuzde ?? null},
        "kaskoYuzde" = ${data.kaskoYuzde ?? null},
        "otoDisiYuzde" = ${data.otoDisiYuzde ?? null},
        "saglikYuzde" = ${data.saglikYuzde ?? null},
        "cmYapilanmasi" = ${data.cmYapilanmasi ?? null},
        "acenteKararAlicisi" = ${data.acenteKararAlicisi ?? null},
        "teknolojiIlgisi" = ${data.teknolojiIlgisi ?? null},
        "hizliTeklifEkrani" = ${data.hizliTeklifEkrani ?? null},
        "hizliTeklifPartneri" = ${data.hizliTeklifPartneri ?? null},
        "whatsappKullanimi" = ${data.whatsappKullanimi ?? null},
        "whatsappPartneri" = ${data.whatsappPartneri ?? null},
        "webSitesi" = ${data.webSitesi ?? null},
        "webPartneri" = ${data.webPartneri ?? null},
        "mobilUygulama" = ${data.mobilUygulama ?? null},
        "appPartneri" = ${data.appPartneri ?? null},
        "dijitalPazarlama" = ${data.dijitalPazarlama ?? null},
        "musteriNeredenGeliyor" = ${data.musteriNeredenGeliyor ?? null},
        "operasyonelVerimlilik" = ${data.operasyonelVerimlilik ?? null},
        "leadYonlendirme" = ${data.leadYonlendirme ?? null},
        "dijitallesmeHarcama" = ${data.dijitallesmeHarcama ?? null},
        "filoMusteriYogunlugu" = ${data.filoMusteriYogunlugu ?? null},
        "galeriMusterisi" = ${data.galeriMusterisi ?? null},
        "karneLastUpdated" = NOW()
      WHERE "levhaNo" = ${levhaNo}
    `;
  } catch (error) {
    console.error("[Database] Failed to save agency karne by levhaNo:", error);
    throw error;
  }
}

/**
 * Save agency karne edit fields
 */
export async function saveAgencyKarne(agencyId: number, data: KarneEditFields): Promise<void> {
  const pg = await getPgClient();
  if (!pg) {
    throw new Error("Database not available");
  }
  try {
    await pg`
      UPDATE agencies SET
        "personelSayisi" = ${data.personelSayisi ?? null},
        "organizasyoncu" = ${data.organizasyoncu ?? null},
        "subeSayisi" = ${data.subeSayisi ?? null},
        "yonetimIliskisi" = ${data.yonetimIliskisi ?? null},
        "acenteyeVerilenSoz" = ${data.acenteyeVerilenSoz ?? null},
        "hayatHayatDisi" = ${data.hayatHayatDisi ?? null},
        "uretim2025" = ${data.uretim2025 ?? null},
        "portfoyAgirligi" = ${data.portfoyAgirligi ?? null},
        "trafikYuzde" = ${data.trafikYuzde ?? null},
        "kaskoYuzde" = ${data.kaskoYuzde ?? null},
        "otoDisiYuzde" = ${data.otoDisiYuzde ?? null},
        "saglikYuzde" = ${data.saglikYuzde ?? null},
        "cmYapilanmasi" = ${data.cmYapilanmasi ?? null},
        "acenteKararAlicisi" = ${data.acenteKararAlicisi ?? null},
        "teknolojiIlgisi" = ${data.teknolojiIlgisi ?? null},
        "hizliTeklifEkrani" = ${data.hizliTeklifEkrani ?? null},
        "hizliTeklifPartneri" = ${data.hizliTeklifPartneri ?? null},
        "whatsappKullanimi" = ${data.whatsappKullanimi ?? null},
        "whatsappPartneri" = ${data.whatsappPartneri ?? null},
        "webSitesi" = ${data.webSitesi ?? null},
        "webPartneri" = ${data.webPartneri ?? null},
        "mobilUygulama" = ${data.mobilUygulama ?? null},
        "appPartneri" = ${data.appPartneri ?? null},
        "dijitalPazarlama" = ${data.dijitalPazarlama ?? null},
        "musteriNeredenGeliyor" = ${data.musteriNeredenGeliyor ?? null},
        "operasyonelVerimlilik" = ${data.operasyonelVerimlilik ?? null},
        "leadYonlendirme" = ${data.leadYonlendirme ?? null},
        "dijitallesmeHarcama" = ${data.dijitallesmeHarcama ?? null},
        "filoMusteriYogunlugu" = ${data.filoMusteriYogunlugu ?? null},
        "galeriMusterisi" = ${data.galeriMusterisi ?? null},
        "karneLastUpdated" = NOW()
      WHERE id = ${agencyId}
    `;
  } catch (error) {
    console.error("[Database] Failed to save agency karne:", error);
    throw error;
  }
}
