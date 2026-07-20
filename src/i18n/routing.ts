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
});
