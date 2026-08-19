import { AuctionCountdown } from "@/components/common/auction-countdown";
import { LotImage } from "@/components/common/lot-image";
import { SurfaceCard } from "@/components/common/surface-card";
import { formatArea, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { Listing } from "@/types/content";

/*
  One rental lot, as a card.

  Shared by the homepage's upcoming-auctions strip and the map/list
  explorer, because they render the same thing and had drifted: different
  placeholder art, different type scale, one linking to a route that does not
  exist. A single definition is the only thing that keeps them identical.

  Deliberately NO "use client" and no hooks. That is what lets it be rendered
  both from a Server Component (upcoming-auctions) and from inside a client
  one (objects-explorer) — a component with a directive could only be used in
  one of the two, and importing the explorer's copy into the homepage would
  have dragged the whole Leaflet dynamic import along with it.
*/
export function LotCard({
  listing,
  regionName,
  countdown = false,
  className,
}: {
  listing: Listing;
  /** Resolved region label — the card does no data access of its own. */
  regionName: string;
  /**
   * Show a live countdown to the auction opening instead of its date. Only
   * for lots whose auction has not opened yet — `getUpcomingAuctions` is what
   * guarantees that, so a card in the catalogue keeps the plain date.
   */
  countdown?: boolean;
  className?: string;
}) {
  return (
    <SurfaceCard
      as="li"
      radius="md"
      padding="none"
      interactive
      data-reveal="up"
      className={`group overflow-hidden ${className ?? ""}`}
    >
      {/*
        Links to e-auksion, where the lot actually lives and where a citizen
        bids. The previous homepage card pointed at
        `/obyektlar/{id}` — a detail route that has never existed, so every
        "Batafsil" button on the homepage returned a 404.
      */}
      <a
        href={listing.auctionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
      >
        {/* `data-clip` — wipes up from its own bottom edge as the card
            arrives. The provider batches every clip entering together, so a
            row uncovers one after another rather than all at once. */}
        <div data-clip className="relative aspect-[16/9] overflow-hidden">
          {/*
            A photo only when upstream supplies one for THIS lot, otherwise
            the placeholder. Never stock imagery: on a state portal a photo on
            a lot card reads as a photo OF that lot.

            `listing.image` is used directly when the list endpoint happens to
            carry one; otherwise LotImage resolves it from the order endpoint,
            lazily, once the card is near the viewport. Sample records never
            get a lookup — they have no real order behind them.
          */}
          {listing.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote lot photo on a host we do not control; see the note in lot-image.tsx.
            <img
              src={listing.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <LotImage
              orderId={listing.isMock ? undefined : listing.orderId}
              region={listing.region}
              className="h-full w-full"
            />
          )}

          {listing.isMock ? (
            <span className="bg-[color:var(--color-navy)]/85 text-[color:var(--color-gold-light)] absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs backdrop-blur-sm">
              Namunaviy
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {/*
            Fixed three-line box: `line-clamp-3` caps a long title, `min-h`
            reserves the same space for a short one.

            Both halves are needed and neither is cosmetic. These cards sit in
            a CSS grid, so the row stretches to its tallest card — a title that
            wrapped to three lines made every card in the row taller, and the
            next one that wrapped to two made them all shorter again. In the
            rotator that happens mid-swap, so the whole row jumped as the
            content changed. The clamp stops tall titles pushing the row out;
            the min-height stops short ones letting it collapse.

            4.125rem === 3 x leading-snug (1.375) at text-base. If either the
            size or the leading changes here, this number has to change with
            them.
          */}
          <h3 className="group-hover:text-accent-foreground line-clamp-3 min-h-[4.125rem] text-base leading-snug font-semibold text-balance transition-colors duration-200">
            {listing.title}
          </h3>

          {/*
            Two lines, not one run-on: where it is, then what it is. Wrapped
            together they broke mid-address ("Do`stlik tumani · Jizzax viloyati
            · 112 m² · Lot №…"), so the place and its measurements read as one
            undifferentiated string.
          */}
          <p className="text-muted-foreground mt-2 truncate text-sm">
            {listing.district ? `${listing.district} · ` : ""}
            {regionName}
          </p>
          {/* `truncate` for the same reason as the line above it: a long
              district plus a six-digit lot number wraps to two lines on a
              narrow card, and one card wrapping while its neighbours do not
              is another way the row height moves. */}
          <p className="text-muted-foreground mt-1 truncate text-sm">
            {`Maydoni: ${formatArea(listing.area)}`}
            {listing.lotNumber ? ` · Lot №${listing.lotNumber}` : ""}
          </p>

          {/*
            No lot status here: `isOpenForApplications` in the data layer drops
            concluded lots before they ever reach a card, so every card on
            screen is open for applications and repeating that adds nothing.

            `mt-auto` pins the price row to the bottom so it lines up across a
            row of cards whose titles run to different line counts.

            `formatNumber`, not `formatSom` — the full figure, thousands-
            grouped, same as e-auksion's own lot pages show it ("1 095 412,50
            UZS" there; whole so'm here, since a citizen has no use for kopek
            precision on an annual rent). `formatSom`'s "1,1 mln" shorthand is
            right for the region-summary AVERAGE in objects-explorer.tsx —
            many lots collapsed into one figure — but wrong for one specific
            lot's price, where "how much, exactly" is the actual question.

            One string expression, not `{formatNumber(…)} so'm` as two JSX
            children — split like that the space between them was stripped by
            the time it reached the DOM (payload arrived as
            ["7 600 000","so'm"], rendered "7 600 000so'm"). Building the
            string in JS sidesteps JSX's whitespace rules entirely.
          */}
          <div className="border-border mt-auto flex items-end justify-between gap-3 border-t pt-4">
            <span>
              <span className="text-muted-foreground block text-xs">
                Boshlang&apos;ich narx
              </span>
              <span className="font-heading text-accent-foreground block text-xl font-semibold">
                {`${formatNumber(listing.pricePerYear)} so'm`}
              </span>
            </span>

            {listing.auctionDate ? (
              <span className="shrink-0 text-right">
                {/*
                  "Savdo boshlanishiga", never "ariza berishga qolgan vaqt".
                  `auction_date` is when the auction OPENS; applications close
                  an hour before it. See auction-countdown.tsx.
                */}
                <span className="text-muted-foreground block text-xs">
                  {countdown ? "Savdo boshlanishiga" : "Savdo kuni"}
                </span>
                {countdown ? (
                  <AuctionCountdown
                    iso={listing.auctionDate}
                    // Server-rendered and shown without JavaScript: the real
                    // date and time, never a placeholder.
                    fallback={formatDateTime(listing.auctionDate)}
                    className="font-heading text-accent-foreground block text-sm font-semibold tabular-nums"
                  />
                ) : (
                  <span className="block text-sm font-medium">
                    {formatDate(listing.auctionDate)}
                  </span>
                )}
              </span>
            ) : null}
          </div>
        </div>
      </a>
    </SurfaceCard>
  );
}
