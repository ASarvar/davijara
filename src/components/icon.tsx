import {
  BadgePercent,
  Building2,
  Calculator,
  CircleCheck,
  Cpu,
  FileSearch,
  FileText,
  Gavel,
  GraduationCap,
  Heart,
  Home,
  IdCard,
  Landmark,
  LandPlot,
  MapPin,
  PieChart,
  Scale,
  Send,
  Star,
  TrendingDown,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon registry.
 *
 * Content modules reference icons by name (`icon: "MapPin"`), which keeps the
 * data serialisable and API-ready. Resolving those names through a fixed map —
 * rather than a dynamic `lucide-react` lookup — keeps tree-shaking working, so
 * only the icons listed here reach the bundle.
 *
 * The legacy davijara-v2.html pulled the entire Font Awesome stylesheet from a
 * CDN for 112 icons; this ships bytes for exactly the ones in use.
 */
const registry = {
  BadgePercent,
  Building2,
  Calculator,
  CircleCheck,
  Cpu,
  FileSearch,
  FileText,
  Gavel,
  GraduationCap,
  Heart,
  Home,
  IdCard,
  Landmark,
  LandPlot,
  MapPin,
  PieChart,
  Scale,
  Send,
  Star,
  TrendingDown,
  User,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof registry;

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Component = registry[name as IconName];
  if (!Component) return null;
  return <Component aria-hidden="true" className={className} />;
}
