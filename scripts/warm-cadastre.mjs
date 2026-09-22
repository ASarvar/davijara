/*
  Fills the cadastre-name cache for /ijara-shartnomalari, so no reader waits.

  RUN NIGHTLY FROM CRON (see DEPLOY.md), or by hand after a deployment:

    node --env-file=/var/www/davijara/shared/.env scripts/warm-cadastre.mjs
    node --env-file=… scripts/warm-cadastre.mjs --base http://[::1]:3001 --hours 5

  It calls /api/cadastre/warm in steps; the route does the work — it walks
  every object in the register, newest first, asks the cadastre about each
  one whose name is not cached (or has expired), and caches the answer. This
  script is only the loop, and it stops when:

    - nothing is left to ask,
    - a whole step made no progress (the cadastre is down, or every remaining
      number is one no service can be asked about), or
    - `--hours` have passed (default 5) — so a slow night never runs into
      the working day.

  A second run straight after the first costs nothing: fresh answers are
  skipped. The token is `CADASTRE_WARM_TOKEN`, the same value the server has;
  without it the route answers 403 and this script says so.
*/

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};

const BASE = flag(
  "base",
  process.env.CADASTRE_WARM_BASE ??
    process.env.TTS_SELF_ORIGIN ??
    "http://127.0.0.1:3000",
);
const HOURS = Number(flag("hours", "5")) || 5;
/* Per request. Short enough for any proxy; the loop makes up the rest. */
const STEP_SECONDS = Number(flag("step", "50")) || 50;
const TOKEN = process.env.CADASTRE_WARM_TOKEN;

if (!TOKEN) {
  console.error(
    "CADASTRE_WARM_TOKEN is not set. Run with the server's .env, e.g.\n" +
      "  node --env-file=/var/www/davijara/shared/.env scripts/warm-cadastre.mjs",
  );
  process.exit(1);
}

async function step() {
  const res = await fetch(new URL("/api/cadastre/warm", BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cadastre-warm": TOKEN },
    body: JSON.stringify({ seconds: STEP_SECONDS }),
    // The step itself, plus loading the register on a cold server.
    signal: AbortSignal.timeout((STEP_SECONDS + 120) * 1000),
  });
  if (res.status === 403) throw new Error("the server rejected the warm token");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail.slice(0, 120)}`);
  }
  return res.json();
}

const started = Date.now();
const deadline = started + HOURS * 3600_000;
let answered = 0;
let found = 0;
const failures = {};
let last;

console.log(`cadastre warm-up · ${BASE} · up to ${HOURS} h\n`);

while (Date.now() < deadline) {
  let result;
  try {
    result = await step();
  } catch (error) {
    console.error(`  step failed — ${error.message}`);
    process.exit(1);
  }
  last = result;
  answered += result.answered;
  found += result.found;
  for (const [reason, n] of Object.entries(result.failures ?? {})) {
    failures[reason] = (failures[reason] ?? 0) + n;
  }

  const minutes = Math.round((Date.now() - started) / 60_000);
  console.log(
    `  ${minutes} min — +${result.answered} answered (${result.found} named), ` +
      `${result.remaining} of ${result.total} left`,
  );

  if (result.remaining === 0) break;
  if (result.answered === 0) {
    console.log(
      result.unaskable > 0
        ? "  stopping: the rest cannot be asked (no TIN and no fallback service)"
        : "  stopping: a whole step made no progress",
    );
    break;
  }
}

const minutes = Math.round((Date.now() - started) / 60_000);
console.log(
  `\n${answered} answered, ${found} named, ${last?.remaining ?? "?"} left, ${minutes} min` +
    (Object.keys(failures).length
      ? ` · unanswered: ${JSON.stringify(failures)}`
      : ""),
);
process.exit(0);
