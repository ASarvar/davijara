"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Check, Contrast, Type } from "lucide-react";

import { cn } from "@/lib/utils";

type ContrastMode = "normal" | "high";
type TextSize = "normal" | "large" | "xlarge";

const CONTRAST_KEY = "davijara-contrast";
const TEXT_SIZE_KEY = "davijara-text-size";

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
    attributeFilter: ["data-contrast", "data-text-size"],
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
  const contrast = useHtmlAttribute<ContrastMode>("data-contrast", "normal");
  const textSize = useHtmlAttribute<TextSize>("data-text-size", "normal");

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
          Rang sxemasi
        </legend>
        <div className="space-y-2">
          {(
            [
              ["normal", "Oddiy rejim", "Standart rang sxemasi"],
              ["high", "Yuqori kontrast", "Qora fon, oq matn, sariq urg'u"],
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
                <span className="block">{label}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                  {hint}
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
          Matn o&apos;lchami
        </legend>
        <div className="space-y-2">
          {(
            [
              ["normal", "Oddiy", "100%"],
              ["large", "Katta", "125%"],
              ["xlarge", "Juda katta", "150%"],
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
                <span className="block">{label}</span>
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
    </div>
  );
}
