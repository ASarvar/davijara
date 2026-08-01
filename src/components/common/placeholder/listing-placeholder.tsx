import { cn } from "@/lib/utils";

/*
  Branded placeholder for a listing card.

  Why abstract architectural line-art rather than a stock building photo:
  this is a state property portal, and a photograph on a listing card reads
  as a photograph OF THAT PROPERTY. Using generic stock imagery would imply
  facts about a specific state asset that we cannot support. The legacy site
  did exactly this — it hotlinked one Unsplash photo onto all three cards.

  Inline SVG rather than a file in /public because it costs no network
  request, cannot 404, needs no next/image configuration, leaves the CSP
  untouched, and — most usefully — inherits the tone tokens, so the same
  component renders correctly on navy and on bone with no props.
*/

/**
 * Four architectural motifs. Callers pick by index so that a set rendered
 * together is visibly varied — see the note at the call site in
 * `featured-listings.tsx` for why hashing the listing id does not work here.
 */
export type ListingVariant = 0 | 1 | 2 | 3;

function Towers() {
  return (
    <g>
      <rect x="40" y="96" width="52" height="94" rx="2" />
      <rect x="104" y="60" width="64" height="130" rx="2" />
      <rect x="180" y="112" width="44" height="78" rx="2" />
      <rect x="236" y="78" width="56" height="112" rx="2" />
      <g className="opacity-60">
        <path d="M52 112h28M52 128h28M52 144h28M52 160h28" />
        <path d="M116 78h40M116 96h40M116 114h40M116 132h40M116 150h40M116 168h40" />
        <path d="M192 128h20M192 146h20M192 164h20" />
        <path d="M248 96h32M248 114h32M248 132h32M248 150h32M248 168h32" />
      </g>
    </g>
  );
}

function Warehouse() {
  return (
    <g>
      <path d="M36 190v-64l64-32 64 32v64" />
      <path d="M36 126h128" />
      <rect x="72" y="146" width="56" height="44" rx="2" />
      <path d="M100 146v44" />
      <rect x="184" y="112" width="108" height="78" rx="2" />
      <g className="opacity-60">
        <path d="M198 130h80M198 150h80M198 170h80" />
      </g>
    </g>
  );
}

function OfficeBlock() {
  return (
    <g>
      <rect x="56" y="52" width="152" height="138" rx="3" />
      <path d="M56 86h152M56 120h152M56 154h152" />
      <path d="M94 52v138M132 52v138M170 52v138" />
      <rect x="224" y="120" width="60" height="70" rx="2" />
      <g className="opacity-60">
        <path d="M236 138h36M236 158h36" />
      </g>
    </g>
  );
}

function RetailRow() {
  return (
    <g>
      <path d="M40 190v-58h248v58" />
      <path d="M40 132l18-40h212l18 40" />
      <path d="M98 132V92M156 132V92M214 132V92" />
      <rect x="64" y="150" width="44" height="40" rx="2" />
      <rect x="140" y="150" width="44" height="40" rx="2" />
      <rect x="216" y="150" width="44" height="40" rx="2" />
    </g>
  );
}

const VARIANTS = [Towers, Warehouse, OfficeBlock, RetailRow];

export function ListingPlaceholder({
  variant = 0,
  className,
}: {
  variant?: ListingVariant;
  className?: string;
}) {
  const Shape = VARIANTS[variant];

  /*
    The gradient and grid come from CSS on the wrapper, not from SVG
    <defs>/url(#id). SVG ids are document-global: two cards rendering the
    same variant would emit duplicate ids, and every url(#…) in the document
    would then resolve to whichever def came first. Keeping the SVG free of
    ids removes that whole failure class — nothing here can collide no matter
    how many placeholders a page renders.
  */
  return (
    <div className={cn("placeholder-blueprint h-full w-full", className)}>
      <svg
        viewBox="0 0 328 208"
        // Decorative: the card's heading already names the property.
        aria-hidden="true"
        focusable="false"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          fill="none"
          stroke="var(--color-gold)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Shape />
        </g>

        {/* Ground line, anchoring the silhouette. */}
        <path
          d="M0 190h328"
          stroke="var(--color-gold)"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
