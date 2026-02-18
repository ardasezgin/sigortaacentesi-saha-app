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
  /** ClickUp user ID for task assignment */
  clickupUserId: varchar("clickupUserId", { length: 64 }),
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

/**
 * Visits table - stores visit/call records
 * Each visit is linked to an agency via levhaNo
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  /** Communication type */
  iletisimTuru: varchar("iletisimTuru", { length: 50 }).notNull(),
  /** Partner type */
  isOrtagi: varchar("isOrtagi", { length: 100 }).notNull(),
  /** Agency levha number (foreign key to agencies) */
  levhaNo: varchar("levhaNo", { length: 50 }).notNull(),
  /** Agency name (denormalized for quick access) */
  acenteAdi: text("acenteAdi").notNull(),
  /** Person contacted */
  kimleGorusuldu: varchar("kimleGorusuldu", { length: 255 }).notNull(),
  /** Visit/call date */
  tarih: varchar("tarih", { length: 50 }).notNull(),
  /** Agenda/topic */
  gundem: varchar("gundem", { length: 100 }).notNull(),
  /** Detailed description */
  detayAciklama: text("detayAciklama").notNull(),
  /** Reminder note */
  hatirlatma: text("hatirlatma"),
  /** Reminder date */
  hatirlatmaTarihi: varchar("hatirlatmaTarihi", { length: 50 }),
  /** Uploaded files (JSON array) */
  dosyalar: text("dosyalar"),
  /** Created by user (email or openId) */
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * Communications table - stores communication records
 */
export const communications = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  /** Agency levha number */
  levhaNo: varchar("levhaNo", { length: 50 }).notNull(),
  /** Agency name (denormalized) */
  acenteAdi: text("acenteAdi"),
  /** Communication type */
  type: varchar("type", { length: 50 }).notNull(),
  /** Subject */
  subject: varchar("subject", { length: 255 }).notNull(),
  /** Notes/details */
  notes: text("notes").notNull(),
  /** Created by user */
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = typeof communications.$inferInsert;

/**
 * Requests table - stores request/complaint records
 */
export const requests = mysqlTable("requests", {
  id: int("id").autoincrement().primaryKey(),
  /** Agency levha number */
  levhaNo: varchar("levhaNo", { length: 50 }).notNull(),
  /** Agency name (denormalized) */
  acenteAdi: text("acenteAdi"),
  /** Request type: Talep, İstek, Şikayet */
  requestType: varchar("requestType", { length: 50 }).notNull(),
  /** Priority: Düşük, Orta, Yüksek */
  priority: varchar("priority", { length: 50 }).notNull(),
  /** Status: Açık, Devam Ediyor, Çözüldü */
  status: varchar("status", { length: 50 }).notNull(),
  /** Subject/title */
  subject: varchar("subject", { length: 255 }).notNull(),
  /** Detailed description */
  description: text("description").notNull(),
  /** Response/solution */
  response: text("response"),
  /** Created by user */
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  /** Resolved date */
  resolvedAt: timestamp("resolvedAt"),
});

export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;
