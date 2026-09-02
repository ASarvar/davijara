import { createHash, randomBytes } from "node:crypto";

import { getDb } from "@/lib/db";
import { TASHKENT_OFFSET_MS } from "@/lib/format";

/*
  The visitor beacon.

  <TrafficBeacon> (a client component in the locale layout) calls
  navigator.sendBeacon() here on every page view. This endpoint's whole job is
  to record that a browser was active, without keeping anything that
  identifies the person or the device:

    · no cookie is set or read — so this needs no consent banner;
    · the request body is ignored entirely;
    · the only thing stored is sha256(ip + ua + that day's random salt),
      truncated to 16 hex chars, which cannot be reversed to an address and
      does not link the same visitor across two days.

  It always answers 204 — for a bot, a malformed request or a database error
  alike. A caller learns nothing from the response and nothing retries.

  Not locale-prefixed: src/proxy.ts excludes `api` from its matcher. Callers
  build the URL with withBasePath().
*/

export const dynamic = "force-dynamic";

/*
  Bots that execute JavaScript still name themselves in the UA. Keeping them
  out here is what stops "Onlayn" from being a count of crawlers.
*/
const BOT =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|preview|monitor|lighthouse|pagespeed|axios|curl|wget|python-requests/i;

const VISIT_KEEP_MS = 3 * 24 * 60 * 60 * 1000;

/** Tashkent calendar day, YYYY-MM-DD. An auction at 10:00 local is 05:00Z. */
function tashkentDay(now: number): string {
  return new Date(now + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

export async function POST(request: Request): Promise<Response> {
  const noContent = new Response(null, { status: 204 });

  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return noContent;

    /* Same two proxy hops as lib/auth/session.ts reads. */
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]!.trim().slice(0, 64)
      : (request.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown");

    const now = Date.now();
    const day = tashkentDay(now);
    const db = getDb();

    db.transaction(() => {
      /* This day's salt, created once on the first hit of the day. */
      let row = db
        .prepare("SELECT salt FROM traffic_day WHERE day = ?")
        .get(day) as { salt: string } | undefined;
      if (!row) {
        db.prepare(
          "INSERT OR IGNORE INTO traffic_day (day, salt) VALUES (?, ?)",
        ).run(day, randomBytes(16).toString("hex"));
        row = db
          .prepare("SELECT salt FROM traffic_day WHERE day = ?")
          .get(day) as { salt: string };
      }

      const visitor = createHash("sha256")
        .update(`${ip}\n${ua}\n${row.salt}`)
        .digest("hex")
        .slice(0, 16);

      /* Every hit is a page view — "Amallar". */
      db.prepare("UPDATE traffic_day SET hits = hits + 1 WHERE day = ?").run(
        day,
      );

      const visit = db
        .prepare("SELECT 1 FROM traffic_visit WHERE day = ? AND visitor = ?")
        .get(day, visitor);

      if (visit) {
        db.prepare(
          "UPDATE traffic_visit SET last_ts = ?, hits = hits + 1 WHERE day = ? AND visitor = ?",
        ).run(now, day, visitor);
      } else {
        db.prepare(
          "INSERT INTO traffic_visit (day, visitor, first_ts, last_ts, hits) VALUES (?, ?, ?, ?, 1)",
        ).run(day, visitor, now, now);
        /* First sight of this visitor today → a new "Tashrif". */
        db.prepare(
          "UPDATE traffic_day SET visitors = visitors + 1 WHERE day = ?",
        ).run(day);
      }

      /* Opportunistic prune — an indexed delete on a small table. */
      db.prepare("DELETE FROM traffic_visit WHERE day < ?").run(
        tashkentDay(now - VISIT_KEEP_MS),
      );
    })();
  } catch {
    /* A visitor counter must never be able to break a page load. */
  }

  return noContent;
}
