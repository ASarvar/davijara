import { timingSafeEqual } from "node:crypto";

import { warmNames } from "@/lib/data/lease-contracts";

/*
  Fills the cadastre-name cache ahead of readers — one bounded step per call.

  WHY. /ijara-shartnomalari asks the cadastre only about the twenty objects
  it shows, one request each, so the first reader of any page waited for it:
  8 s for a page nobody had opened, with some names still missing. The
  register names ~17 000 objects; this walks all of them, newest first, and
  caches every answer, so readers are served from the database. Answers
  already cached and still fresh are skipped, so a nightly run only asks
  about what is new or expired (see the TTLs in lib/data/cadastre.ts).

  ONE STEP, NOT THE WHOLE RUN. Each call works for at most `seconds` (default
  50, at most 240) and reports what is left; scripts/warm-cadastre.mjs calls
  again until nothing is. Short steps keep every request inside a proxy's
  read timeout, and an interrupted run loses nothing — each answer is cached
  the moment it arrives.

  NOT PUBLIC. It is a loop over an external service, so it requires
  `CADASTRE_WARM_TOKEN`; with the variable unset every caller is refused,
  including one who sends an empty token. The response carries counts only.
*/

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_SECONDS = 50;
const MAX_SECONDS = 240;

function authorized(request: Request): boolean {
  const expected = process.env.CADASTRE_WARM_TOKEN;
  const given = request.headers.get("x-cadastre-warm");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let seconds = DEFAULT_SECONDS;
  try {
    const body = (await request.json()) as { seconds?: unknown };
    if (typeof body.seconds === "number" && body.seconds > 0) {
      seconds = Math.min(body.seconds, MAX_SECONDS);
    }
  } catch {
    // No body is fine — the default step.
  }

  const result = await warmNames(seconds * 1000);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
