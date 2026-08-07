import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Neutral "image goes here" placeholder.

  Distinct from `ListingPlaceholder`, which draws stylised architecture: that
  reads as artwork — as though the card were *illustrated* — and at a glance
  is easy to mistake for a picture of the property. This one is unmistakably a
  gap waiting for a photograph, which is the honest state until real,
  self-hosted photography exists.

  Deliberately NOT a stock photo. On a state property portal a photograph on a
  lot card reads as a photograph OF THAT LOT, so generic imagery would imply
  facts about a specific state asset that nothing supports. The legacy site
  did exactly that — one hotlinked Unsplash photo repeated across every card.

  The hatching is a CSS gradient rather than an SVG <pattern>. SVG pattern ids
  are document-global: several cards on a page would emit the same id, every
  `url(#…)` would resolve to whichever came first, and duplicate ids are
  invalid HTML. A gradient has no such identity, so any number of these can
  render safely.
*/
export function ImagePlaceholder({
  className,
  label,
}: {
  className?: string;
  /** Optional caption, e.g. the region name. Keep it short. */
  label?: string;
}) {
  return (
    <div
      // Decorative: the card's heading already carries the meaning.
      aria-hidden="true"
      className={cn(
        "bg-secondary relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, color-mix(in srgb, currentColor 7%, transparent) 0 1px, transparent 1px 9px)",
      }}
    >
      <div className="text-muted-foreground/70 relative flex flex-col items-center gap-1.5">
        <ImageIcon className="size-6" />
        {label ? (
          <span className="max-w-[12rem] truncate px-3 text-center text-[11px]">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
