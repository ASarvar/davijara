import { defineRouting } from "next-intl/routing";

export const locales = ["uz", "ru", "en"] as const;
export type Locale = (typeof locales)[number];

/** Labels for the language switcher, matching the legacy O'z / Ru / En chips. */
export const localeLabels: Record<Locale, string> = {
  uz: "O'z",
  ru: "Ru",
  en: "En",
};

/** Full names, used for `hreflang` titles and accessible labels. */
export const localeNames: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "uz",
  /*
    "always" keeps the locale explicit in every URL (/uz/imtiyozlar rather than
    /imtiyozlar). For a state portal that serves three languages this is worth
    the extra segment: every page is unambiguously addressable and shareable,
    and there is no hidden default that behaves differently from the others.
  */
  localePrefix: "always",
  /*
    UZBEK FOR EVERY FIRST VISIT, whatever the browser is set to.

    next-intl defaults this to `true`, which resolves an unprefixed request in
    four steps: route prefix, then the NEXT_LOCALE cookie, then the
    `accept-language` header, then `defaultLocale`. Steps 2 and 3 meant the
    front door was not deterministic — a visitor whose browser reports `ru`
    landed on /ru and never saw the Uzbek site, even though ru.json and en.json
    are partial by design and deep-merge over uz.json. On the state portal of a
    country whose state language is Uzbek, the language of the front page is
    not a browser setting's decision.

    `false` disables both inference steps, so an unprefixed request always
    redirects to /uz. Nothing else is lost: every locale still has real,
    linkable URLs and the switcher still moves between them — the choice is
    just made by the reader rather than guessed from a header.
  */
  localeDetection: false,
});
