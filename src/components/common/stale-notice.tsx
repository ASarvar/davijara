import { History } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * "These figures are real, but they are from a stated moment, not from now."
 *
 * Shown wherever a page is rendering a SNAPSHOT — the last answer an upstream
 * service gave before it became unreachable (see lib/data/snapshot.ts). It is
 * not optional decoration: printing stored figures in the place live ones
 * normally sit claims something untrue about today, which CLAUDE.md
 * non-negotiable 6 forbids just as firmly as typing a number would. The date
 * is what makes serving them honest, so every path that can return `asOf`
 * renders this.
 *
 * DELIBERATELY QUIETER THAN THE MOCK NOTICE, and the difference is the point.
 * Sample lots get a dashed alarm box because they are not real property; these
 * are real records with a timestamp on them, so they get a muted line. Reading
 * both as equally alarming would train readers to ignore the one that matters.
 *
 * Uzbek is hardcoded here rather than read from `messages/`, matching the mock
 * notice this sits beside — `objects-explorer` is a client component and the
 * locale layout deliberately ships it only the `nav`/`common`/`topbar`
 * namespaces. Move both strings together if that changes.
 */
export function StaleNotice({
  asOf,
  className,
}: {
  /** ISO 8601 instant the data was fetched. */
  asOf: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-start gap-2 text-xs",
        className,
      )}
    >
      <History
        aria-hidden="true"
        className="text-accent-foreground mt-0.5 size-3.5 shrink-0"
      />
      <span>
        {
          "Maʼlumot xizmati vaqtincha javob bermayapti. Koʻrsatilgan maʼlumotlar "
        }
        <strong className="text-foreground font-semibold">
          {formatDateTime(asOf)}
        </strong>
        {" holatiga koʻra."}
      </span>
    </p>
  );
}
