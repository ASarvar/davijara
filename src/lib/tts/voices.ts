/*
  Which voice reads the page, per locale.

  CLIENT-SAFE ON PURPOSE: the player component needs the voice ids to ask for
  one, and `lib/tts/azure.ts` opens with `import "server-only"` because it
  holds the key. Same split as `lib/listings-view.ts` — the shared constant
  lives where both sides can reach it.

  AZURE, BECAUSE IT IS THE ONE THAT SPEAKS UZBEK. Measured against the two
  providers' own voice lists on 16.09.2026: Google Cloud Text-to-Speech lists
  no Uzbek at all (4 073 locale rows, no `uz-UZ`), and the browsers' built-in
  `speechSynthesis` ships none either — a Windows/Chrome install offers
  ru-RU and en-US and nothing for uz. Azure has two Uzbek neural voices, and
  they are Uzbek (LATIN), which is the script this site is written in.
*/

export type TtsVoice = "male" | "female";

/*
  Locale → the two Azure voices. `uz` is the site's default and the one the
  whole feature exists for; ru and en are here because a reader who switches
  language must not lose the control they just turned on.

  Neither Uzbek voice supports phonemes or a custom lexicon (footnote 3 in
  Azure's language-support table), so an abbreviation it reads oddly cannot be
  corrected with a pronunciation dictionary — it would have to be spelled out
  in the text itself, which is not something we may do to statutory wording.
*/
export const TTS_VOICES = {
  uz: { male: "uz-UZ-SardorNeural", female: "uz-UZ-MadinaNeural" },
  ru: { male: "ru-RU-DmitryNeural", female: "ru-RU-SvetlanaNeural" },
  en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural" },
} as const satisfies Record<string, Record<TtsVoice, string>>;

export type TtsLocale = keyof typeof TTS_VOICES;

export function isTtsLocale(value: string): value is TtsLocale {
  return value in TTS_VOICES;
}

export function voiceFor(locale: TtsLocale, voice: TtsVoice): string {
  return TTS_VOICES[locale][voice];
}
