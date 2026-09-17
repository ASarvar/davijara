import "server-only";

import type { TtsLocale, TtsVoice } from "@/lib/tts/voices";

/*
  What a speech service has to be able to do, and who is configured to do it.

  ONE PROVIDER TODAY, AND A SEAM WHERE THE NEXT ONE GOES. Azure is the only
  commercial service of the big two that speaks Uzbek at all — Google Cloud
  Text-to-Speech lists no uz-UZ, and no browser ships an Uzbek voice.

  THE TAX COMMITTEE'S SERVICE WAS EVALUATED AND RULED OUT, which is worth
  recording so it is not rediscovered. ai.soliq.uz has a real Uzbek voice and
  is free, and its endpoint works as documented (POST {text, voice} →
  audio/wav, 500 characters). What it does not have is a machine credential:
  the cabinet authenticates a PERSON through MySoliq SSO, and the token that
  comes back is a session token measured at minutes — one inspected on
  16.09.2026 expired two minutes after it was issued. A server cannot hold
  that, and working around the anonymous rate limit instead is not something
  one state body does to another. If Soliq issues an API key or OAuth client
  credentials to the operator, a sibling of `azure.ts` is all that is needed.

  A PROVIDER MAY NOT SPEAK EVERY LOCALE, so `supports` is per locale and
  `/api/tts` answers per locale. The player falls back to the reader's own
  device for anything the service declines — which is the right way round,
  since ru and en are exactly the voices a browser DOES ship.
*/

export type TtsAudio = {
  audio: Buffer;
  /** What to send back to the browser: providers differ (wav vs mp3). */
  contentType: "audio/mpeg" | "audio/wav";
  /** True when it came from the cache — the warm-up counts what it paid for. */
  cached?: boolean;
};

export type TtsProvider = {
  /** For logs and for the cache key, so switching provider cannot serve the
      other one's audio for the same text. */
  name: string;
  /** The longest text this service accepts in one request. */
  maxChars: number;
  isConfigured(): boolean;
  supports(locale: TtsLocale): boolean;
  synthesize(input: {
    text: string;
    locale: TtsLocale;
    voice: TtsVoice;
  }): Promise<TtsAudio | null>;
};

/*
  Read through a function rather than a module constant: `isConfigured` looks
  at the environment, and a route that is rendered once at build time and
  served for a week must not carry a decision made before the key was set.
*/
export async function activeProvider(): Promise<TtsProvider | null> {
  const { azureProvider } = await import("@/lib/tts/azure");
  return azureProvider.isConfigured() ? azureProvider : null;
}
