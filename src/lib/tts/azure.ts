import "server-only";

import { cacheKey, readCached, writeCached } from "@/lib/tts/cache";
import type { TtsAudio, TtsProvider } from "@/lib/tts/provider";
import { voiceFor, type TtsLocale, type TtsVoice } from "@/lib/tts/voices";

/*
  Azure AI Speech as the speech service.

  AZURE'S REST ENDPOINT, NOT THE SDK: one POST with SSML returns the audio,
  which is the whole of what this needs, and the SDK would add a dependency
  with a websocket stack for it.

    POST https://<region>.tts.speech.microsoft.com/cognitiveservices/v1
    Ocp-Apim-Subscription-Key: <key>
    X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3
    Content-Type: application/ssml+xml
    → audio/mpeg

  MP3 AND NOT WAV. The format matters more than it looks: Azure will return
  24 kHz PCM, and a minute of it is ~2,8 MB — on a portal read over a phone
  connection in a district that is the difference between a feature and a
  wait. 48 kbit/s mono mp3 is ~360 KB a minute for speech that sounds the
  same.

  THE KEY NEVER REACHES THE BROWSER, which is why this file is server-only and
  the player talks to `/api/tts` instead. Azure bills per character ($15 per
  million at the time of writing, with 0,5 million a month free on the F0
  tier), so an endpoint that would synthesise anything anyone sent it is a
  budget line item with no floor — the route's checks are not a formality.
*/

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

/*
  The synthesis URL. Derived from the region, which is how an ordinary Speech
  resource is addressed, and overridable because not every deployment is
  ordinary: a private-link or sovereign-cloud resource is reached at its own
  host, and so is a gateway an operator puts in front of it.
*/
const ENDPOINT =
  process.env.AZURE_SPEECH_ENDPOINT ??
  (REGION
    ? `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`
    : null);

const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

/*
  Azure accepts far longer inputs than this; the cap is the route's sanity
  bound, not the service's — the player chunks at 480 characters for latency,
  and nothing on this site writes a 3 000-character paragraph.
*/
const MAX_CHARS = 3000;

/*
  HOW MANY CALLS MAY BE IN FLIGHT, and why a speech service needs a queue at
  all: Azure's free F0 tier allows twenty transactions per sixty seconds and
  says so is not adjustable. Two readers moving through a page at once reach
  that, the service answers 429, and — before this — the player told them the
  speech service was not responding.

  So calls are queued two at a time and a 429 is waited out rather than
  reported. The cache is what keeps this rare: a paragraph is only ever
  synthesised once, and `npm run tts:warm` synthesises the whole site after a
  deployment, so a reader normally hits the disk and never the service.
*/
const MAX_IN_FLIGHT = 2;
const RETRY_DELAYS_MS = [1_500, 4_000];

let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight += 1;
  try {
    return await run();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const LOCALE_TAGS: Record<TtsLocale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/*
  SSML is XML, so the text is escaped before it goes in. The site's own prose
  is not the threat — the route only synthesises what is written on a page —
  but an apostrophe or an ampersand in a decree's title would otherwise
  produce a malformed document and a 400 from Azure.
*/
const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

/*
  A line break is where one piece of the page ended and the next began — a
  card title and its address, a price and its label — which the reader joins
  into one request so a selected card costs one synthesis instead of seven.
  Spoken without a pause they would run together, so each becomes a short
  break. The break is markup, added after escaping, never text from the page.
*/
const toSsmlText = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => escapeXml(line.trim()))
    .filter(Boolean)
    .join('<break time="350ms"/>');

async function synthesize({
  text,
  locale,
  voice,
}: {
  text: string;
  locale: TtsLocale;
  voice: TtsVoice;
}): Promise<TtsAudio | null> {
  if (!KEY || !ENDPOINT) return null;

  const voiceName = voiceFor(locale, voice);
  const key = cacheKey("azure", voiceName, text);

  const cached = await readCached(key);
  if (cached) return cached;

  const ssml =
    `<speak version="1.0" xml:lang="${LOCALE_TAGS[locale]}">` +
    `<voice name="${voiceName}">${toSsmlText(text)}</voice>` +
    `</speak>`;

  try {
    const audio = await withSlot(async () => {
      for (let attempt = 0; ; attempt += 1) {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
            "User-Agent": "davijara.uz",
          },
          body: ssml,
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });

        /*
          429 is the tier's rate limit, not a fault: the same request a moment
          later succeeds. `Retry-After` is honoured when the service sends one
          and capped, so a reader waits seconds rather than being told the
          service is down.
        */
        if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
          const header = Number(res.headers.get("retry-after"));
          const wait = Number.isFinite(header)
            ? Math.min(header * 1000, 8_000)
            : RETRY_DELAYS_MS[attempt];
          console.warn(`[tts] azure rate-limited, waiting ${wait}ms`);
          await sleep(wait);
          continue;
        }

        if (!res.ok) {
          throw new Error(
            `Speech service responded ${res.status} ${res.statusText}`,
          );
        }

        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length === 0) {
          throw new Error("Speech service returned no audio");
        }
        return bytes;
      }
    });

    const value: TtsAudio = { audio, contentType: "audio/mpeg" };
    await writeCached(key, value);
    return value;
  } catch (error) {
    console.warn(
      "[tts] azure synthesis failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export const azureProvider: TtsProvider = {
  name: "azure",
  maxChars: MAX_CHARS,
  isConfigured: () => Boolean(KEY && ENDPOINT),
  // Uzbek (Latin), Russian and English all have prebuilt neural voices.
  supports: () => true,
  synthesize,
};
