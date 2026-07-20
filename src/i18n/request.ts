import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/**
 * Deep-merge translated messages over the Uzbek baseline.
 *
 * ru.json and en.json are intentionally incomplete — the site's source
 * language is Uzbek and translation is a separate, human task. Without this
 * merge next-intl would surface raw keys (or throw) for anything untranslated,
 * so a half-translated page would look broken. With it, a missing key falls
 * back to the Uzbek string and the page stays usable while translation
 * catches up, key by key.
 */
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing as Messages, value as Messages);
    } else if (value !== "" && value != null) {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const base = (await import("../../messages/uz.json")).default as Messages;
  const messages =
    locale === routing.defaultLocale
      ? base
      : deepMerge(
          base,
          (await import(`../../messages/${locale}.json`)).default as Messages,
        );

  return {
    locale,
    messages,
    // Tashkent time — keeps server/client date rendering consistent.
    timeZone: "Asia/Tashkent",
  };
});
