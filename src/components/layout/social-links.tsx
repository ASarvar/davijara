import { socialLinks } from "@/content/site";

/**
 * The operator's social accounts, as a row of icon links.
 *
 * ── WHY THESE ARE NOT LUCIDE ICONS ────────────────────────────────────────
 *
 * They cannot be. lucide-react ships 1 997 icons in the installed version
 * (1.25.0) and NOT ONE of them is a brand mark — Telegram, Instagram and
 * Facebook were all removed from the set at v1.0 over trademark concerns.
 * Verified against node_modules, not assumed.
 *
 * So these are the official marks, drawn as solid paths on the same 24x24
 * grid lucide uses — that part stays: the shapes are what make Telegram's
 * plane, Instagram's camera and Facebook's "f" recognisable at 16px, where a
 * generic circle-outline set would not read as any platform at all.
 *
 * ── ONE COLOUR, NOT EACH PLATFORM'S OWN ───────────────────────────────────
 *
 * An earlier version filled each mark with its brand colour (Telegram blue,
 * the Instagram gradient, Facebook blue) and that was corrected: three
 * unrelated brights sitting under `Phone` and `Mail` — which are drawn in
 * `currentColor`, matching every other icon on the site — made the social
 * row read as three foreign stickers pasted under the site's own palette.
 *
 * `currentColor` here means the SAME rule this project already applies
 * everywhere: components consume semantic tokens, not raw brand colours (see
 * the second non-negotiable in the root CLAUDE.md). The marks now take
 * `text-muted-foreground` at rest, matching the phone and email links beside
 * them, and `--accent-foreground` on hover — the same transition those links
 * already use.
 */

const SIZE = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
  className: "size-[18px] shrink-0",
} as const;

function TelegramIcon() {
  return (
    <svg {...SIZE}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...SIZE}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg {...SIZE}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const ICONS = {
  telegram: TelegramIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
} as const;

/** Platform keys this component can draw. */
export type SocialPlatform = keyof typeof ICONS;

export function SocialLinks({ className }: { className?: string }) {
  if (socialLinks.length === 0) return null;

  return (
    <ul className={className}>
      {socialLinks.map(({ platform, href, label }) => {
        const Icon = ICONS[platform];
        return (
          <li key={platform}>
            <a
              href={href}
              /*
                External, and on a government portal that matters twice over:
                `noopener` denies the opened page a handle on this one, and
                `noreferrer` keeps the citizen's path through the portal out
                of a third party's analytics.
              */
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              /*
                Colour AND a small lift together, matching the lift/shadow
                hover language `SurfaceCard` uses elsewhere on the site rather
                than inventing a second motion vocabulary for one row of
                links. `scale` alone would have been enough for "this is
                interactive"; adding `-translate-y-0.5` is what reads as
                animation rather than a static colour swap.

                Group-scoped so the icon can animate independently of the
                link's own hover state — see the icon's classes below.
              */
              className="group text-muted-foreground hover:text-accent-foreground focus-visible:ring-ring flex items-center rounded transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="inline-flex transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-110">
                <Icon />
              </span>
              {/* The mark is decorative; this is the link's accessible name.
                  An unlabelled icon link announces only its URL. */}
              <span className="sr-only">{label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
