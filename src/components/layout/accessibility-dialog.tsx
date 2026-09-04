"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AccessibilityControls } from "@/components/sections/accessibility-controls";

/**
 * "Maxsus imkoniyatlar" — opened as a dialog from the topbar rather than as a
 * separate route, so the user can change contrast or text size without leaving
 * the page they are reading and losing their place.
 *
 * Nothing is lost by dropping the standalone page: these controls write
 * `data-contrast` / `data-text-size` to <html> and persist them to
 * localStorage, so they were always JavaScript-dependent — a no-JS visitor
 * could not have used the page either. The pre-paint script in <head> is what
 * makes the saved preference survive navigation, and that is unaffected.
 */
export function AccessibilityDialog() {
  const t = useTranslations("topbar");
  const tCommon = useTranslations("common");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          // Hover tooltip, since the label no longer prints. Paired with the
          // sr-only span below, not a substitute for it: `title` is not
          // reliably announced by screen readers and is unreachable by touch.
          title={t("accessibility")}
          className="text-muted-foreground hover:text-accent-foreground focus-visible:ring-ring flex items-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Eye aria-hidden="true" className="size-4" />
          {/*
            ICON ONLY at every width now, so the header's contact stack stays
            narrow. `sr-only` rather than deleting the text: an unlabelled icon
            button would be exactly the wrong thing to ship on the control that
            opens the accessibility settings — it is what gives the button its
            accessible name.
          */}
          <span className="sr-only">{t("accessibility")}</span>
        </button>
      </DialogTrigger>

      <DialogContent
        data-tone="deep"
        className="sm:max-w-lg"
        closeLabel={tCommon("close")}
      >
        <DialogHeader>
          <DialogTitle>{t("accessibility")}</DialogTitle>
          <DialogDescription>
            {t("accessibilityDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <AccessibilityControls />
        </div>

        <div className="border-border mt-4 border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">{t("keyboardTitle")}</h3>
          {/*
            The <dt> keys are the literal key names printed on the keyboard —
            Tab, Esc — so they are not translated. Only the <dd> descriptions
            are. The em-dash is punctuation and stays in the markup.
          */}
          <dl className="text-muted-foreground grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Tab</dt>
              <dd>— {t("keyNext")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Shift + Tab</dt>
              <dd>— {t("keyPrev")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Enter / Space</dt>
              <dd>— {t("keyActivate")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Esc</dt>
              <dd>— {t("keyClose")}</dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
