import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/*
  Locale-aware navigation primitives.

  Always import `Link` from here rather than from `next/link` — these variants
  prefix the active locale automatically, so `<Link href="/imtiyozlar">`
  resolves to /uz/imtiyozlar, /ru/imtiyozlar, etc. Using next/link directly
  would drop the user out of their locale.
*/
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
