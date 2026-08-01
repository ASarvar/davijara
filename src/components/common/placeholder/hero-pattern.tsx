import { cn } from "@/lib/utils";

/*
  Decorative blueprint motif for the hero's right half, which was empty at
  `lg:` because the hero is a single left-aligned column.

  A blueprint/plan drawing rather than a photograph: it evokes property and
  planning without depicting any specific building, which is the right
  register for a state portal. Inline SVG so it picks up the tone tokens and
  costs no request.

  Purely presentational and `aria-hidden`. It also animates in via the shared
  `data-enter` hook rather than any bespoke keyframes.
*/
export function HeroPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 420"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id="hp-fade" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="hp-mask">
          <rect width="480" height="420" fill="url(#hp-fade)" />
        </mask>
      </defs>

      <g
        mask="url(#hp-mask)"
        fill="none"
        stroke="var(--color-gold)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Plan grid */}
        <g strokeOpacity="0.12" strokeWidth="1">
          {Array.from({ length: 13 }, (_, i) => (
            <path key={`v${i}`} d={`M${i * 40} 0v420`} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <path key={`h${i}`} d={`M0 ${i * 40}h480`} />
          ))}
        </g>

        {/* Floor plan outline */}
        <g strokeOpacity="0.5" strokeWidth="2">
          <path d="M80 300V120h140v-40h180v220H80z" />
          <path d="M220 120h180" />
          <path d="M220 200h180" />
          <path d="M300 200v100" />
        </g>

        {/* Dimension lines */}
        <g strokeOpacity="0.3" strokeWidth="1.25">
          <path d="M80 330h320" />
          <path d="M80 322v16M400 322v16" />
          <path d="M430 80v220" />
          <path d="M422 80h16M422 300h16" />
        </g>

        {/* Elevation stack */}
        <g strokeOpacity="0.35" strokeWidth="1.5">
          <path d="M120 380h80v-40h-80z" />
          <path d="M220 380h80v-64h-80z" />
          <path d="M320 380h80v-28h-80z" />
        </g>
      </g>

      {/* Accent nodes at the plan's corners */}
      <g fill="var(--color-gold)" fillOpacity="0.55" mask="url(#hp-mask)">
        <circle cx="80" cy="120" r="3.5" />
        <circle cx="220" cy="80" r="3.5" />
        <circle cx="400" cy="80" r="3.5" />
        <circle cx="400" cy="300" r="3.5" />
        <circle cx="80" cy="300" r="3.5" />
      </g>
    </svg>
  );
}
