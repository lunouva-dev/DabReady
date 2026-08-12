import { getD1 } from "../../../db";

const ACTIVE_WINDOW_MS = 90_000;
const ALLOWED_PHASES = new Set(["heating", "cooling"]);
const ALLOWED_VIBES = new Set(["lifted", "smacked", "flavor", "smooth", "too-hot", "too-cool"]);
const ALLOWED_BANGERS = new Set(["unknown", "flat", "thermal", "slurper"]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function clampDuration(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(180, Math.max(5, Math.round(numeric))) : 30;
}

async function ensureTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS active_sessions (
      device_id TEXT PRIMARY KEY NOT NULL,
      nickname TEXT NOT NULL,
      phase TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions (last_seen_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      vibe TEXT NOT NULL,
      note TEXT DEFAULT '' NOT NULL,
      heat_seconds INTEGER NOT NULL,
      cool_seconds INTEGER NOT NULL,
      banger_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins (created_at)"),
  ]);
}

export async function GET(): Promise<Response> {
  try {
    const db = getD1();
    await ensureTables(db);
    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    await db.prepare("DELETE FROM active_sessions WHERE last_seen_at < ?").bind(cutoff).run();
    const [active, feed] = await db.batch([
      db.prepare("SELECT nickname, phase, started_at AS startedAt FROM active_sessions WHERE last_seen_at >= ? ORDER BY started_at DESC LIMIT 24").bind(cutoff),
      db.prepare("SELECT id, nickname, vibe, note, heat_seconds AS heatSeconds, cool_seconds AS coolSeconds, banger_type AS bangerType, created_at AS createdAt FROM check_ins ORDER BY created_at DESC LIMIT 24"),
    ]);
    return Response.json({ active: active.results, feed: feed.results });
  } catch {
    return Response.json({ error: "The live room is taking a breather." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const action = cleanText(payload.action, 20);
    const deviceId = cleanText(payload.deviceId, 64);
    const nickname = cleanText(payload.nickname, 18);
    if (!deviceId || !nickname) return Response.json({ error: "Choose a nickname first." }, { status: 400 });

    const db = getD1();
    await ensureTables(db);
    const now = Date.now();

    if (action === "presence") {
      const phase = cleanText(payload.phase, 12);
      if (!ALLOWED_PHASES.has(phase)) return Response.json({ error: "Invalid timer phase." }, { status: 400 });
      await db.prepare(`INSERT INTO active_sessions (device_id, nickname, phase, started_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET nickname = excluded.nickname, phase = excluded.phase, last_seen_at = excluded.last_seen_at`)
        .bind(deviceId, nickname, phase, now, now)
        .run();
      return Response.json({ ok: true });
    }

    if (action === "leave") {
      await db.prepare("DELETE FROM active_sessions WHERE device_id = ?").bind(deviceId).run();
      return Response.json({ ok: true });
    }

    if (action === "check-in") {
      const vibe = cleanText(payload.vibe, 20);
      if (!ALLOWED_VIBES.has(vibe)) return Response.json({ error: "Pick a vibe." }, { status: 400 });
      const requestedBanger = cleanText(payload.bangerType, 20);
      const bangerType = ALLOWED_BANGERS.has(requestedBanger) ? requestedBanger : "unknown";
      await db.batch([
        db.prepare(`INSERT INTO check_ins (id, device_id, nickname, vibe, note, heat_seconds, cool_seconds, banger_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), deviceId, nickname, vibe, cleanText(payload.note, 100), clampDuration(payload.heatSeconds), clampDuration(payload.coolSeconds), bangerType, now),
        db.prepare("DELETE FROM active_sessions WHERE device_id = ?").bind(deviceId),
      ]);
      return Response.json({ ok: true }, { status: 201 });
    }

    return Response.json({ error: "Unknown community action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Could not update the live room." }, { status: 503 });
  }
}
