import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

/*
  The rounded accent tile behind a section icon.

  This exact class string was copy-pasted byte-identically three times
  (services, how-it-works, privileges-teaser) with four more near-variants at
  other sizes elsewhere. All seven now come from here.
*/
const iconTile = cva(
  "bg-accent text-accent-foreground flex shrink-0 items-center justify-center transition-colors duration-200",
  {
    variants: {
      size: {
        sm: "size-9 rounded-md",
        md: "size-11 rounded-lg",
        lg: "size-14 rounded-full",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const glyphSize = { sm: "size-4", md: "size-5", lg: "size-7" } as const;

interface IconTileProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof iconTile> {
  /** Name from the icon registry in `components/icon.tsx`. */
  name?: string;
  /** Arbitrary content instead of a registry icon — e.g. a step numeral. */
  children?: React.ReactNode;
}

export function IconTile({
  name,
  size,
  className,
  children,
  ...props
}: IconTileProps) {
  return (
    <span className={cn(iconTile({ size }), className)} {...props}>
      {children ?? (name ? <Icon name={name} className={glyphSize[size ?? "md"]} /> : null)}
    </span>
  );
}
