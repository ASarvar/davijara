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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-accent-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Eye aria-hidden="true" className="size-3.5" />
          {t("accessibility")}
        </button>
      </DialogTrigger>

      <DialogContent data-tone="deep" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("accessibility")}</DialogTitle>
          <DialogDescription>
            Saytni o&apos;zingizga qulay ko&apos;rinishda sozlang. Tanlovingiz
            brauzeringizda saqlanadi.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <AccessibilityControls />
        </div>

        <div className="border-border mt-4 border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">
            Klaviatura bilan boshqarish
          </h3>
          <dl className="text-muted-foreground grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Tab</dt>
              <dd>— keyingi element</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Shift + Tab</dt>
              <dd>— oldingi element</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Enter / Space</dt>
              <dd>— faollashtirish</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground font-medium">Esc</dt>
              <dd>— oynani yopish</dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
