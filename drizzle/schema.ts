import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Agencies table - stores insurance agency data
 * Shared across all users and devices
 */
export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  /** Levha No - unique identifier for each agency */
  levhaNo: varchar("levhaNo", { length: 50 }).notNull().unique(),
  /** Agency type: TÜZEL or GERÇEK */
  acenteTuru: varchar("acenteTuru", { length: 20 }),
  /** Agency name/title */
  acenteUnvani: text("acenteUnvani").notNull(),
  /** Full address */
  adres: text("adres"),
  /** Province/City */
  il: varchar("il", { length: 100 }),
  /** District */
  ilce: varchar("ilce", { length: 100 }),
  /** Phone number */
  telefon: varchar("telefon", { length: 50 }),
  /** Email address */
  ePosta: varchar("ePosta", { length: 320 }),
  /** Technical personnel info (can be multiple) */
  teknikPersonel: text("teknikPersonel"),
  /** Registration date from Excel */
  levhaKayTar: varchar("levhaKayTar", { length: 50 }),
  /** Renewal date from Excel */
  levhaYenKayTar: varchar("levhaYenKayTar", { length: 50 }),
  /** Active/Inactive status */
  isActive: int("isActive").default(1).notNull(), // 1=active, 0=inactive
  /** Notes field for user annotations */
  notlar: text("notlar"),
  /** Last update timestamp */
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
