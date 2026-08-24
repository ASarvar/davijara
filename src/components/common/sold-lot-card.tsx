import { LotImage } from "@/components/common/lot-image";
import { SurfaceCard } from "@/components/common/surface-card";
import { formatArea, formatDate, formatNumber } from "@/lib/format";
import type { SoldLot } from "@/types/content";

/*
  One concluded sale, as a card.

  A SEPARATE COMPONENT FROM `LotCard`, not a variant of it. The two share a
  shell and nothing else: a listing has an asking price and a countdown to an
  auction that has not happened, a sale has two prices and no future. Threading
  a `sold` flag through LotCard would have meant three branches inside every
  block of it.

  THE FIGURE THAT MATTERS IS THE RISE. A final price alone says nothing — 45
  mln so'm is either a bargain or a bidding war depending on where it started.
  The pair, with the multiple between them, is the whole story of the sitting:
  half these lots go at exactly the opening price and half go at five times it.

  WHAT IS NOT ON THIS CARD, and must not be added: the buyer. The order
  endpoint returns their full name, passport number, PINFL, phone and home
  address; publishing any of it would be a personal-data breach. The sale is
  public, the buyer is not. See `getRecentlySold`.
*/
export function SoldLotCard({
  lot,
  regionName,
  labels,
  showDate = false,
  className,
}: {
  lot: SoldLot;
  /** Resolved region label — the card does no data access of its own. */
  regionName: string;
  labels: { start: string; sold: string; noRise: string };
  /**
   * Print the auction date on the card. Off on the homepage strip, where every
   * card is from the one sitting named in the heading above them; on for the
   * list page, which mixes days and would otherwise leave the reader unable to
   * tell last Friday's prices from yesterday's.
   */
  showDate?: boolean;
  /** Track sizing from the carousel — see recently-sold.tsx. */
  className?: string;
}) {
  /*
    Guarded rather than assumed: `startPrice` is 0 when upstream omits it, and
    a division would print "Infinity×". Without a start price there is no rise
    to report, so the badge is simply absent.
  */
  const multiple = lot.startPrice > 0 ? lot.soldPrice / lot.startPrice : null;
  const rose = multiple != null && multiple > 1.0001;

  return (
    <SurfaceCard
      as="li"
      radius="md"
      padding="none"
      interactive
      /*
        No `h-full`. The carousel track is a flex row, so `align-items:
        stretch` already gives every card the height of the tallest — but only
        while their own height is auto. `height: 100%` against a track whose
        height is content-driven resolves to auto AND opts the card out of the
        stretch, which left cards with no area line 20px shorter than the rest.
        The inner `<a>` keeps its `h-full`: by then the card HAS a definite
        height to resolve against.
      */
      className={`group overflow-hidden ${className ?? ""}`}
    >
      <a
        href={lot.auctionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <LotImage
            orderId={lot.orderId}
            region={lot.region}
            /*
              350ms, matching the card's own lift. At LotCard's 600ms the
              photograph was still easing after the card had settled, which
              reads as two hovers rather than one.

              A prop, because the transform belongs to the `<img>` and
              LotImage already puts one there. Setting the duration by
              repeating the whole transform on this wrapper — which is what
              this was — left both scaling on hover, so the photograph grew
              by 1.05 twice.
            */
            zoom="fast"
            className="h-full w-full"
          />

          {/*
            The rise, over the photograph rather than in the body, because it
            is the one thing worth reading at a glance across a scrolling row.
            `×1,1` and `×5,9` are the shapes this takes — a percentage would
            read as "+490%" for the same lot, which is a harder number to
            compare at speed.

            Card surface and the body ink, the same pair the prices below use.
            It was a gold pill and read as a promotional sticker rather than as
            a figure; on a light theme where cobalt already carries the brand,
            one more warm accent per card was one too many. Navy on the card
            colour also survives whatever photograph lands behind it, which a
            translucent tint did not.
          */}
          {rose ? (
            <span className="bg-card text-foreground border-hairline absolute top-2.5 right-2.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums [box-shadow:var(--shadow-1)]">
              ×{multiple.toFixed(1).replace(".", ",")}
            </span>
          ) : multiple != null ? (
            <span className="bg-card text-muted-foreground border-hairline absolute top-2.5 right-2.5 rounded-full border px-2.5 py-1 text-xs font-medium [box-shadow:var(--shadow-1)]">
              {labels.noRise}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="group-hover:text-accent-foreground line-clamp-3 min-h-[4.125rem] text-base font-semibold transition-colors">
            {lot.title}
          </h3>

          <p className="text-muted-foreground mt-2 text-sm">
            {lot.district ? `${lot.district} · ` : ""}
            {regionName}
          </p>

          {lot.area > 0 ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {formatArea(lot.area)}
              {lot.lotNumber ? ` · Lot №${lot.lotNumber}` : ""}
            </p>
          ) : null}

          {showDate ? (
            <p className="text-muted-foreground mt-1 text-sm tabular-nums">
              {formatDate(lot.auctionDate)}
            </p>
          ) : null}

          {/*
            `mt-auto` so the price block sits on the card's floor whatever the
            title above it did — in a horizontal row of cards a figure that
            floats at a different height in each one is the thing the eye
            catches first.
          */}
          {/*
            `formatNumber` with the currency appended, not `formatSom`'s
            "45,9 mln" shorthand — same rule as LotCard: the abbreviation is
            right for an average over many lots and wrong for one lot's actual
            price, where "how much, exactly" is the question.

            Each figure is built as ONE string expression rather than
            `{formatNumber(…)} so'm` as two JSX children: split that way the
            space between them is stripped before it reaches the DOM and the
            output reads "45979465so'm".
          */}
          <div className="border-hairline mt-auto border-t pt-3">
            <p className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
              <span>{labels.start}</span>
              <span className="tabular-nums line-through">
                {`${formatNumber(lot.startPrice)} so'm`}
              </span>
            </p>
            <p className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                {labels.sold}
              </span>
              <span className="font-heading text-heading text-lg font-semibold tabular-nums">
                {`${formatNumber(lot.soldPrice)} so'm`}
              </span>
            </p>
          </div>
        </div>
      </a>
    </SurfaceCard>
  );
}
