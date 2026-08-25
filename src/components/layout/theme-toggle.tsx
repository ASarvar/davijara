"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/*
  Dark / light switch for the header's utility strip.

  The theme itself is one attribute on <html> (`data-theme="light"`, absent
  for dark) plus a localStorage key. This component only flips them — every
  colour decision lives in globals.css, bound to that attribute, so nothing
  here knows what any surface actually looks like.

  It does NOT apply the saved preference on mount. AccessibilityScript already
  does that from a blocking script in <head>, which is the only way to avoid a
  flash of the navy palette on every navigation. Re-applying it here would be
  both redundant and a frame too late.
*/

/*
  <html>'s `data-theme` IS the state, so it is read straight from the DOM
  rather than mirrored into React.

  A `useState` + `useEffect` pair is the obvious shape and is wrong twice
  over: it schedules a second render purely to learn something the DOM already
  knew, the project's React Compiler lint rejects it
  (react-hooks/set-state-in-effect), and it would miss the attribute being
  changed by anything other than this button.

  The observer covers that last case — high-contrast mode, a future settings
  panel, or a second instance of this toggle all write the same attribute.
*/
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

const getSnapshot = () =>
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

/*
  The server cannot know: the preference lives in this visitor's localStorage
  and is applied by an inline script AFTER the HTML is generated. Returning
  the default here is what useSyncExternalStore is for — React renders the
  server snapshot, then swaps to the client one, with no hydration mismatch.

  "light", matching the `data-theme="light"` the layout prints. It must track
  that default: returning the wrong one makes the server send the wrong icon
  and the wrong `aria-pressed` for every visitor who has no stored preference,
  which is most of them.
*/
const getServerSnapshot = () => "light" as const;

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations("topbar");

  const toggle = () => {
    const root = document.documentElement;

    /*
      Read the CURRENT value off the DOM rather than using the `theme`
      snapshot above.

      The snapshot is refreshed by a MutationObserver, which fires
      asynchronously — so between two clicks in quick succession React may not
      have re-rendered yet, and deriving `next` from the stale value flips to
      the same theme twice and the toggle appears stuck. Observed exactly
      that: two clicks in one tick both resolved to "light".

      `theme` still drives the label and aria-pressed, where being one frame
      behind is invisible; the state change itself must not depend on render
      timing.
    */
    const next =
      root.getAttribute("data-theme") === "light" ? "dark" : "light";

    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");

    try {
      localStorage.setItem("davijara-theme", next);
    } catch {
      // Private modes throw on write. The theme still applies for this page
      // view; it just will not survive a reload, which is the right failure.
    }
  };

  const label = theme === "light" ? t("themeToDark") : t("themeToLight");

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      /*
        `aria-pressed` rather than a live region: this is a two-state control,
        and a screen reader announcing "pressed" is more useful than an
        announcement of a colour change the user cannot see anyway.
      */
      aria-pressed={theme === "light"}
      className={cn(
        "text-muted-foreground hover:text-accent-foreground focus-visible:ring-ring flex items-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {/*
        Both icons ship in the HTML and CSS hides one, keyed on the same <html>
        attribute the pre-paint script sets. So the correct icon is already in
        the server response with no flash — swapping them from `theme` instead
        would paint the dark icon first and correct it a frame later, on every
        page load, for exactly the users who chose the other theme.
      */}
      <Sun
        aria-hidden="true"
        className="size-4 shrink-0 [:root[data-theme='light']_&]:hidden"
      />
      <Moon
        aria-hidden="true"
        className="hidden size-4 shrink-0 [:root[data-theme='light']_&]:block"
      />
    </button>
  );
}
