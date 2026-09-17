/*
  Speaks the whole site once, so no reader has to wait for it.

  RUN IT AFTER EVERY DEPLOYMENT:

    TTS_WARM_TOKEN=… node scripts/warm-tts.mjs
    TTS_WARM_TOKEN=… node scripts/warm-tts.mjs --base http://[::1]:3001 --locale uz --voice female,male

  It walks the sitemap and asks the site to synthesise each page, which is
  where the work actually happens — `/api/tts/warm` reads the page out of its
  own HTML, splits it exactly as the player does, and fills the audio cache.
  This script is only the loop around it.

  ONLY NEW TEXT COSTS ANYTHING. The cache is keyed by a hash of the text, so
  an untouched paragraph is a hit and an edited one is a miss; there is no
  record of "what changed" to keep, and running this twice in a row costs
  nothing the second time. The report prints the characters actually sent to
  the speech service, which is what the provider bills for.

  The token is the same `TTS_WARM_TOKEN` the route requires. Without it the
  route answers 403 and this script tells you so rather than looping.
*/

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};

const BASE = flag(
  "base",
  process.env.TTS_SELF_ORIGIN ?? "http://127.0.0.1:3000",
);
const LOCALES = flag("locale", "uz,ru,en")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const VOICES = flag("voice", "female")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
/* For a dry run on a couple of pages before committing a whole site to it. */
const LIMIT = Number(flag("limit", "0")) || Infinity;
const TOKEN = process.env.TTS_WARM_TOKEN;

if (!TOKEN) {
  console.error(
    "TTS_WARM_TOKEN is not set. Set the same value the server has, e.g.\n" +
      "  TTS_WARM_TOKEN=$(grep TTS_WARM_TOKEN /var/www/davijara/shared/.env | cut -d= -f2) node scripts/warm-tts.mjs",
  );
  process.exit(1);
}

/** Every page in the sitemap, for the locales asked for. */
async function sitemapPaths() {
  const res = await fetch(new URL("/sitemap.xml", BASE), {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`sitemap.xml responded ${res.status}`);

  const xml = await res.text();
  const paths = new Set();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let path;
    try {
      path = new URL(match[1]).pathname;
    } catch {
      continue;
    }
    const locale = path.split("/")[1];
    if (LOCALES.includes(locale)) paths.add(path);
  }
  return [...paths].sort().slice(0, LIMIT);
}

async function warm(path, locale, voice) {
  const res = await fetch(new URL("/api/tts/warm", BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tts-warm": TOKEN },
    body: JSON.stringify({ path, locale, voice }),
    // A long page is a few hundred blocks; the route speaks them one by one.
    signal: AbortSignal.timeout(15 * 60_000),
  });

  if (res.status === 403) throw new Error("the server rejected the warm token");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail.slice(0, 120)}`);
  }
  return res.json();
}

const started = Date.now();
let chunks = 0;
let spoken = 0;
let failed = 0;
let characters = 0;

const paths = await sitemapPaths();
console.log(
  `${paths.length} pages, ${LOCALES.join("/")} · ${VOICES.join("/")} · ${BASE}\n`,
);

for (const path of paths) {
  const locale = path.split("/")[1];
  for (const voice of VOICES) {
    try {
      const result = await warm(path, locale, voice);
      chunks += result.chunks;
      spoken += result.spoken;
      failed += result.failed;
      characters += result.characters;
      const fresh = result.characters > 0 ? ` +${result.characters} chars` : "";
      console.log(
        `  ${path} (${voice}) — ${result.spoken}/${result.chunks}${fresh}` +
          (result.failed ? `, ${result.failed} failed` : ""),
      );
    } catch (error) {
      failed += 1;
      console.error(`  ${path} (${voice}) — ${error.message}`);
      if (String(error.message).includes("warm token")) process.exit(1);
    }
  }
}

const seconds = Math.round((Date.now() - started) / 1000);
console.log(
  `\n${spoken}/${chunks} blocks cached in ${seconds}s, ` +
    `${characters} characters newly synthesised` +
    (failed ? `, ${failed} failed` : ""),
);
process.exit(failed ? 1 : 0);
