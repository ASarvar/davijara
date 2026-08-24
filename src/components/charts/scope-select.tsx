"use client";

import { MapPin } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/*
  The region cut, as one control instead of fifteen chips.

  Fifteen chips wrapped to two full rows above the figures and pushed the
  headline off the first screen — on a page whose first job is to state four
  numbers. A select says the same thing in one line.

  ── IT IS STILL A URL, NOT STATE ───────────────────────────────────────────
  Choosing a region navigates to `/statistika?hudud=…`, so every view stays
  addressable, back-button-correct and crawlable — the rule the privileges
  filter and the catalogue search both follow. The chips were plain links and
  needed no JavaScript; a select cannot be, so this is the one client
  component the page has, and it does nothing but navigate.

  `router.replace`, not `push`: fourteen regions tried in a row should leave
  one entry in the history, not fourteen. The reader's Back should return to
  wherever they came from, not walk them backwards through their own browsing
  of the same page.

  ALL is a sentinel rather than an empty string because Radix treats "" as
  "nothing selected" and would render the placeholder instead of "Respublika".
*/
const ALL = "all";

export function ScopeSelect({
  value,
  regions,
  labels,
}: {
  /** Current region slug, or undefined for the republic. */
  value?: string;
  regions: { slug: string; name: string }[];
  labels: { republic: string; label: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground text-sm">{labels.label}</span>
      <Select
        value={value ?? ALL}
        onValueChange={(next) =>
          router.replace(
            next === ALL ? pathname : `${pathname}?hudud=${next}`,
            { scroll: false },
          )
        }
      >
        <SelectTrigger
          aria-label={labels.label}
          className="border-outline bg-card h-11 min-w-[16rem] gap-2 rounded-full px-4 text-sm font-semibold"
        >
          <MapPin
            aria-hidden="true"
            className="text-accent-foreground size-4 shrink-0"
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.republic}</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r.slug} value={r.slug}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
