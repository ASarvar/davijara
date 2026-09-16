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
    `<voice name="${voiceName}">${escapeXml(text)}</voice>` +
    `</speak>`;

  try {
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

    if (!res.ok) {
      throw new Error(
        `Speech service responded ${res.status} ${res.statusText}`,
      );
    }

    const audio = Buffer.from(await res.arrayBuffer());
    if (audio.length === 0) throw new Error("Speech service returned no audio");

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
