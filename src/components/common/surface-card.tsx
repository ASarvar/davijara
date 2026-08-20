import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  The card shell.

  Before this existed the same surface was hand-written nine times across nine
  section files, with three different radii, three different paddings, and —
  worse — three different hover treatments for cards that read as one
  component. `services` glowed gold-ink, `privileges-teaser` glowed gold, and
  `how-it-works` did nothing at all. `featured-listings`, the most important
  card on the page, also did nothing.

  Written as `[box-shadow:var(--shadow-1)]`, an arbitrary PROPERTY, not as
  `shadow-[var(--shadow-1)]`. Tailwind's shadow utility composes its value
  with --tw-shadow-color and a ring slot, and handed a var it cannot inspect
  it recolours the whole thing to transparent — the shadow was there in the
  DOM and painted nothing. The arbitrary property emits the declaration
  verbatim.

  DEPTH IS A TOKEN, NOT A UTILITY. `--shadow-1` at rest and `--shadow-2` on
  hover, both defined per theme in globals.css. That indirection is what lets
  the light theme put a white card on a near-white ground — 1.06:1, invisible
  without a shadow — while the navy theme keeps level 1 at `none`, where a
  card is already the lighter surface and a resting shadow would be soot.
  High contrast sets both to none: there, every boundary is a solid line.

  The hover border is `--outline`, the gold ornament token, NOT `--ring`.
  Ring is the focus colour and in the light theme it is now cobalt, which
  would have quietly turned every card hover blue; gold is the brand's warm
  note and hovering a card is exactly where it belongs.
*/
const surfaceCard = cva(
  /*
    350ms, not 200. The reference sites (250broadway, era-residence,
    white-desert) all sit in the 300-400ms band for hover; 200ms reads as a
    state flip rather than as movement.
  */
  "border-border bg-card border [box-shadow:var(--shadow-1)] transition-[border-color,box-shadow,transform] duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
  {
    variants: {
      radius: {
        md: "rounded-lg",
        lg: "rounded-xl",
        xl: "rounded-2xl",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-6 sm:p-8",
        inline: "px-5",
      },
      /**
       * Cards that are themselves a link or contain one. Adds the lift.
       * Static cards keep the transition classes but never trigger them,
       * which costs nothing and keeps the class list uniform.
       */
      interactive: {
        true: "hover:border-outline hover:-translate-y-1 hover:[box-shadow:var(--shadow-2)]",
        false: "",
      },
    },
    defaultVariants: { radius: "lg", padding: "md", interactive: false },
  },
);

/*
  Props are typed against HTMLAttributes<HTMLElement> rather than
  ComponentProps<"div">, because the element is chosen at the call site — a
  div-specific ref type will not assign to an <li>.
*/
export interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof surfaceCard> {
  /** Render as a different element — `li` inside lists, `article`, etc. */
  as?: "div" | "li" | "article" | "section";
}

export function SurfaceCard({
  as: Tag = "div",
  radius,
  padding,
  interactive,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <Tag
      className={cn(surfaceCard({ radius, padding, interactive }), className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { surfaceCard };
