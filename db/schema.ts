import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const activeSessions = sqliteTable(
  "active_sessions",
  {
    deviceId: text("device_id").primaryKey(),
    nickname: text("nickname").notNull(),
    phase: text("phase", { enum: ["heating", "cooling"] }).notNull(),
    startedAt: integer("started_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [index("idx_active_sessions_last_seen").on(table.lastSeenAt)],
);

export const checkIns = sqliteTable(
  "check_ins",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    nickname: text("nickname").notNull(),
    vibe: text("vibe").notNull(),
    note: text("note").notNull().default(""),
    heatSeconds: integer("heat_seconds").notNull(),
    coolSeconds: integer("cool_seconds").notNull(),
    bangerType: text("banger_type").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_check_ins_created_at").on(table.createdAt)],
);
