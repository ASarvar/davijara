import { splitIntoChunks } from "@/lib/tts/chunks";
import { blocksFromHtml } from "@/lib/tts/extract";
import { activeProvider } from "@/lib/tts/provider";
import { isTtsLocale, type TtsVoice } from "@/lib/tts/voices";

/*
  Speaks a whole page ahead of time, so nobody has to wait for it.

  WHY THIS EXISTS. Azure's free tier allows twenty synthesis calls a minute,
  and two readers moving through a page at once reach that — the service
  answers 429 and the player reports a fault. The cache already means each
  paragraph is only ever paid for once; what it lacked was a way to pay for
  them all BEFORE the first reader arrives. Run after a deployment, this
  leaves the site entirely served from disk, and the speech service is only
  touched by text that is genuinely new.

  ONLY CHANGED TEXT COSTS ANYTHING, and that falls out of the cache key
  rather than from any comparison: the key is a hash of the text itself, so an
  edited paragraph is a new key and an untouched one is a hit. There is no
  "what changed since last deploy" state to keep and get wrong.

  NOT PUBLIC. It is a loop over a synthesis service, which is exactly what an
  open endpoint must never be, so it requires `TTS_WARM_TOKEN` — and with the
  variable unset the route refuses everything, including a caller who guesses
  an empty token.
*/

export const maxDuration = 300;

export async function POST(request: Request) {
  const expected = process.env.TTS_WARM_TOKEN;
  if (!expected || request.headers.get("x-tts-warm") !== expected) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const provider = await activeProvider();
  if (!provider) {
    return Response.json({ error: "not-configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const { path, locale, voice } = (body ?? {}) as {
    path?: unknown;
    locale?: unknown;
    voice?: unknown;
  };
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    typeof locale !== "string" ||
    !isTtsLocale(locale) ||
    (voice !== "male" && voice !== "female")
  ) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!provider.supports(locale)) {
    return Response.json({ error: "locale-unsupported" }, { status: 503 });
  }

  const page = await fetch(new URL(path, new URL(request.url).origin), {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!page.ok) {
    return Response.json({ error: "page-unavailable" }, { status: 502 });
  }

  const chunks = blocksFromHtml(await page.text()).flatMap((block) =>
    splitIntoChunks(block),
  );

  let spoken = 0;
  let failed = 0;
  let characters = 0;

  /*
    One at a time, and deliberately: the provider's own queue allows two in
    flight, and those two are better spent on a reader who is waiting than on
    a warm-up that nobody is watching.
  */
  for (const text of chunks) {
    if (text.length > provider.maxChars) continue;
    const audio = await provider.synthesize({
      text,
      locale,
      voice: voice as TtsVoice,
    });
    if (audio) {
      spoken += 1;
      if (!audio.cached) characters += text.length;
    } else {
      failed += 1;
    }
  }

  return Response.json(
    { path, locale, voice, chunks: chunks.length, spoken, failed, characters },
    { headers: { "Cache-Control": "no-store" } },
  );
}
