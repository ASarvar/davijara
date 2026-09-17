"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Check, Contrast, Mic, Type, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ContrastMode = "normal" | "high";
type TextSize = "normal" | "large" | "xlarge";
type ReadAloud = "off" | "on";
type ReadAloudVoice = "female" | "male";

const CONTRAST_KEY = "davijara-contrast";
const TEXT_SIZE_KEY = "davijara-text-size";
const READ_ALOUD_KEY = "davijara-read-aloud";
const READ_ALOUD_VOICE_KEY = "davijara-read-aloud-voice";

/**
 * Subscribe to attribute changes on <html>.
 *
 * The <html> element is the single source of truth for these preferences: the
 * blocking script in <head> sets the attributes before paint, and this reads
 * them back. Using useSyncExternalStore rather than useState + useEffect means
 * no setState-in-effect cascade, and the server snapshot ("normal") matches
 * what the server actually rendered, so hydration stays consistent even for a
 * user who already has high-contrast enabled — the pre-paint script has
 * already styled the page correctly by then.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      "data-contrast",
      "data-text-size",
      "data-read-aloud",
      "data-read-aloud-voice",
    ],
  });
  return () => observer.disconnect();
}

function useHtmlAttribute<T extends string>(attr: string, fallback: T): T {
  const getSnapshot = useCallback(
    () => (document.documentElement.getAttribute(attr) as T) ?? fallback,
    [attr, fallback],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function AccessibilityControls() {
  /*
    `topbar`, not a namespace of its own: this is a client component, and
    NextIntlClientProvider is only sent the namespaces in `clientMessages`
    (app/[locale]/layout.tsx; see the i18n note in CLAUDE.md). A new namespace
    here would have to widen that payload on every page to serve one dialog.
  */
  const t = useTranslations("topbar");
  const contrast = useHtmlAttribute<ContrastMode>("data-contrast", "normal");
  const textSize = useHtmlAttribute<TextSize>("data-text-size", "normal");
  /*
    ON unless switched off: the attribute is absent for a reader who never
    chose, which is why "off" is written out rather than removed.
  */
  const readAloud = useHtmlAttribute<ReadAloud>("data-read-aloud", "on");
  const voice = useHtmlAttribute<ReadAloudVoice>(
    "data-read-aloud-voice",
    "female",
  );

  const applyContrast = (value: ContrastMode) => {
    const root = document.documentElement;
    if (value === "high") root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");
    try {
      localStorage.setItem(CONTRAST_KEY, value);
    } catch {
      // localStorage throws in some privacy modes; the setting still applies
      // for this session, it just won't persist.
    }
  };

  const applyTextSize = (value: TextSize) => {
    const root = document.documentElement;
    if (value === "normal") root.removeAttribute("data-text-size");
    else root.setAttribute("data-text-size", value);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, value);
    } catch {
      // See above.
    }
  };

  /*
    The reader itself lives in the layout and watches these attributes; all
    this control does is set them. It reads the voice at the moment it speaks,
    so a change here applies to the next press without a reload.
  */
  const applyReadAloud = (value: ReadAloud) => {
    document.documentElement.setAttribute("data-read-aloud", value);
    try {
      localStorage.setItem(READ_ALOUD_KEY, value);
    } catch {
      // See above.
    }
  };

  const applyVoice = (value: ReadAloudVoice) => {
    const root = document.documentElement;
    if (value === "male") root.setAttribute("data-read-aloud-voice", "male");
    else root.removeAttribute("data-read-aloud-voice");
    try {
      localStorage.setItem(READ_ALOUD_VOICE_KEY, value);
    } catch {
      // See above.
    }
  };

  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
      selected
        ? "border-[color:var(--color-gold)] bg-accent text-accent-foreground font-semibold"
        : "border-border hover:bg-secondary",
    );

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <fieldset>
        <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Contrast aria-hidden="true" className="size-4" />
          {t("colorScheme")}
        </legend>
        <div className="space-y-2">
          {(
            [
              ["normal", "contrastNormal", "contrastNormalHint"],
              ["high", "contrastHigh", "contrastHighHint"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyContrast(value)}
              aria-pressed={contrast === value}
              className={optionClass(contrast === value)}
            >
              <span>
                <span className="block">{t(label)}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                  {t(hint)}
                </span>
              </span>
              {contrast === value ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Type aria-hidden="true" className="size-4" />
          {t("textSize")}
        </legend>
        <div className="space-y-2">
          {/* The hints are percentages, not prose — no translation key. */}
          {(
            [
              ["normal", "sizeNormal", "100%"],
              ["large", "sizeLarge", "125%"],
              ["xlarge", "sizeXlarge", "150%"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyTextSize(value)}
              aria-pressed={textSize === value}
              className={optionClass(textSize === value)}
            >
              <span>
                <span className="block">{t(label)}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                  {hint}
                </span>
              </span>
              {textSize === value ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Volume2 aria-hidden="true" className="size-4" />
          {t("readAloud")}
        </legend>
        <div className="space-y-2">
          {(
            [
              ["on", "readAloudOn", "readAloudOnHint"],
              ["off", "readAloudOff", "readAloudOffHint"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyReadAloud(value)}
              aria-pressed={readAloud === value}
              className={optionClass(readAloud === value)}
            >
              <span>
                <span className="block">{t(label)}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                  {t(hint)}
                </span>
              </span>
              {readAloud === value ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      {/*
        Disabled rather than hidden while reading is off, so the dialog keeps
        its shape and the choice is still visible for when it is turned on.
      */}
      <fieldset disabled={readAloud === "off"} className="disabled:opacity-50">
        <legend className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Mic aria-hidden="true" className="size-4" />
          {t("readAloudVoice")}
        </legend>
        <div className="space-y-2">
          {(
            [
              ["female", "readAloudVoiceFemale"],
              ["male", "readAloudVoiceMale"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyVoice(value)}
              aria-pressed={voice === value}
              className={optionClass(voice === value)}
            >
              <span className="block">{t(label)}</span>
              {voice === value ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
