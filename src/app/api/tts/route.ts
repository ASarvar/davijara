import { comparisonForm } from "@/lib/tts/chunks";
import { activeProvider } from "@/lib/tts/provider";
import { isTtsLocale, type TtsLocale, type TtsVoice } from "@/lib/tts/voices";

/*
  Speech for one block of the page the reader is on.

  IT ONLY SPEAKS WORDS THAT ARE ON THAT PAGE, and that is the load-bearing
  rule here. Azure bills per character, so a route that synthesised whatever
  text it was handed would be a free text-to-speech service for anyone who
  found it, paid for out of the portal's budget. The browser therefore sends
  the path it is reading along with the block, and the server fetches that
  page itself and checks the words are in it before spending anything.

  The check is a substring test on text with all whitespace removed (see
  `comparisonForm`), because the browser's `innerText` and the server's HTML
  disagree about spacing in ways no reader can see.

  Not locale-prefixed: `src/proxy.ts` excludes `api` from its matcher.
*/

/** How long a fetched page's text is reused for. */
const PAGE_TEXT_TTL_MS = 5 * 60_000;
/** Pages remembered at once — the whole site is smaller than this. */
const PAGE_TEXT_MAX = 60;

/** Blocks one address may ask for, and the window it may ask in. */
const RATE_LIMIT = 300;
const RATE_WINDOW_MS = 10 * 60_000;

const pageTexts = new Map<string, { text: string; at: number }>();
const rates = new Map<string, { count: number; resetAt: number }>();

/*
  WHERE THE SERVER FINDS ITS OWN PAGES, and the production bug that put this
  list here: reading the page back from `new URL(request.url).origin` meant
  the server asking for https://davijara.uz — its own public name — from
  inside the network it is hosted in. That connection is refused in about 30
  milliseconds, and every synthesis answered `page-unavailable` while the site
  itself was perfectly healthy.

  So the loopback address is tried FIRST and the public origin is kept only as
  the last resort — and loopback means BOTH families: this site's own server
  listens on `[::1]:3001` (nginx proxies to it there), and a candidate list of
  127.0.0.1 alone found nothing. `TTS_SELF_ORIGIN` remains for a deployment
  where neither fits, and is the cheapest thing to set when the port is not in
  `PORT` either — as it was not here.

  The origin that answers is remembered, so this costs one extra connection
  once and nothing afterwards.
*/
let workingOrigin: string | null = null;

function selfOrigins(request: Request): string[] {
  const configured = process.env.TTS_SELF_ORIGIN?.trim();
  const port = process.env.PORT ?? "3000";
  const candidates = [
    configured,
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
    new URL(request.url).origin,
  ].filter((value): value is string => Boolean(value));

  const ordered = workingOrigin
    ? [workingOrigin, ...candidates.filter((o) => o !== workingOrigin)]
    : candidates;
  return [...new Set(ordered)];
}

/*
  A path this server will fetch from itself. Locale-prefixed, no scheme, no
  host, no traversal — the browser sends `location.pathname`, which already
  carries the base path when the app is mounted under one, so the URL is built
  from the request's own origin and nothing else.
*/
const PATH_PATTERN = /^\/(?!\/)[A-Za-z0-9\-._~/%]{0,300}$/;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const entry = rates.get(ip);

  if (!entry || now > entry.resetAt) {
    rates.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Bounded: the map is swept whenever it grows past a few thousand keys.
    if (rates.size > 5_000) {
      for (const [key, value] of rates) {
        if (now > value.resetAt) rates.delete(key);
      }
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

/*
  Tags out, entities in. Everything inside <script>, <style> and <template>
  goes first — a Next page carries its RSC payload in a script tag, and that
  payload contains the page's words, which would make the check pass for text
  the reader cannot see.
*/
function htmlToComparisonText(html: string): string {
  const stripped = html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X"))
        return String.fromCodePoint(parseInt(body.slice(2), 16));
      if (body.startsWith("#"))
        return String.fromCodePoint(parseInt(body.slice(1), 10));
      const named: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
        laquo: "«",
        raquo: "»",
        mdash: "—",
        ndash: "–",
        hellip: "…",
      };
      return named[body.toLowerCase()] ?? entity;
    });

  return comparisonForm(stripped);
}

async function pageComparisonText(
  path: string,
  origins: string[],
): Promise<string | null> {
  const cached = pageTexts.get(path);
  if (cached && Date.now() - cached.at < PAGE_TEXT_TTL_MS) return cached.text;

  let lastError: unknown = null;
  for (const origin of origins) {
    try {
      const res = await fetch(new URL(path, origin), {
        headers: { Accept: "text/html" },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) {
        lastError = `${origin} answered ${res.status}`;
        continue;
      }

      const text = htmlToComparisonText(await res.text());
      workingOrigin = origin;
      if (pageTexts.size >= PAGE_TEXT_MAX) {
        // Oldest out. A map iterates in insertion order, so this is the first.
        const oldest = pageTexts.keys().next().value;
        if (oldest) pageTexts.delete(oldest);
      }
      pageTexts.set(path, { text, at: Date.now() });
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  /*
    Logged rather than swallowed: from the browser this is one 502 among many,
    and the difference between "the page moved" and "the server cannot reach
    itself" is only visible here.
  */
  console.warn(
    "[tts] could not read",
    path,
    "from",
    origins.join(", "),
    "-",
    lastError instanceof Error ? lastError.message : lastError,
  );
  return null;
}

/**
 * Whether the site can speak THIS locale — the player asks before offering to.
 *
 * Per locale, because a provider need not cover all three. Azure covers uz,
 * ru and en; a service that declined one would simply hand that locale to the
 * reader's own browser, which is where ru and en voices come from anyway.
 *
 * `pageCheck` REPORTS THE OTHER HALF, and it is here because of a production
 * failure that was invisible from outside: the key was configured, the
 * service was reachable, and every synthesis still answered 502 because the
 * server could not read its own pages back. A boolean, not a diagnosis — it
 * says whether the check can run, and the server log says why it cannot.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("locale") ?? "uz";
  const locale: TtsLocale = isTtsLocale(raw) ? raw : "uz";
  const provider = await activeProvider();

  const pageCheck =
    (await pageComparisonText(`/${locale}`, selfOrigins(request))) !== null;

  return Response.json(
    { available: Boolean(provider?.supports(locale)) && pageCheck, pageCheck },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const provider = await activeProvider();
  if (!provider) {
    return Response.json({ error: "not-configured" }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (tooMany(ip)) {
    return Response.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const { path, text, locale, voice } = (body ?? {}) as {
    path?: unknown;
    text?: unknown;
    locale?: unknown;
    voice?: unknown;
  };

  if (
    typeof path !== "string" ||
    typeof text !== "string" ||
    typeof locale !== "string" ||
    (voice !== "male" && voice !== "female") ||
    !isTtsLocale(locale) ||
    !PATH_PATTERN.test(path)
  ) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  if (!provider.supports(locale)) {
    return Response.json({ error: "locale-unsupported" }, { status: 503 });
  }

  /*
    The provider's own ceiling, not the player's. The player chunks at 480 for
    latency; what may not be exceeded is what the service accepts, which is
    500 for Soliq and far more for Azure.
  */
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > provider.maxChars) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const pageText = await pageComparisonText(path, selfOrigins(request));
  if (!pageText) {
    return Response.json({ error: "page-unavailable" }, { status: 502 });
  }
  if (!pageText.includes(comparisonForm(trimmed))) {
    return Response.json({ error: "text-not-on-page" }, { status: 400 });
  }

  const spoken = await provider.synthesize({
    text: trimmed,
    locale,
    voice: voice as TtsVoice,
  });
  if (!spoken) {
    return Response.json({ error: "synthesis-failed" }, { status: 502 });
  }

  return new Response(new Uint8Array(spoken.audio), {
    headers: {
      "Content-Type": spoken.contentType,
      "Content-Length": String(spoken.audio.length),
      // The server-side file cache is what makes a re-read cheap; nothing in
      // between should keep a POST response.
      "Cache-Control": "no-store",
    },
  });
}
