import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
  "See all X →" link used in section headers. Was five identical copies.

  The arrow nudges on hover, and the underline is animated from a
  pseudo-element rather than using `hover:underline`, so it grows out of the
  left edge instead of snapping in.
*/
export function ActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-accent-foreground group/action relative inline-flex items-center gap-1.5 text-sm font-medium",
        className,
      )}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="bg-current absolute -bottom-0.5 left-0 h-px w-0 transition-[width] duration-300 ease-out group-hover/action:w-full"
        />
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform duration-300 ease-out group-hover/action:translate-x-1"
      />
    </Link>
  );
}
