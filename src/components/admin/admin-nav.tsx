"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Gauge,
  Landmark,
  ListTree,
  Newspaper,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
  The panel's sidebar.

  `next/link` and `next/navigation` HERE, not `@/i18n/navigation` — the rule
  in the root CLAUDE.md is about the public site, where every route carries a
  locale prefix. The admin tree lives outside `[locale]` and has no prefix, so
  the localised wrappers would produce `/uz/admin/...`, which does not exist.
  This is the one directory where the plain imports are correct.

  A client component only because the active item is derived from the current
  path. It reads nothing else.
*/

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const ITEMS: Item[] = [
  { href: "/admin", label: "Boshqaruv", icon: Gauge },
  { href: "/admin/yangiliklar", label: "Yangiliklar", icon: Newspaper },
  { href: "/admin/sahifalar", label: "Sahifalar", icon: FileText },
  { href: "/admin/menyu", label: "Menyu", icon: ListTree },
  { href: "/admin/rahbariyat", label: "Rahbariyat", icon: UserRound },
  {
    href: "/admin/hujjatlar",
    label: "Huquqiy matnlar",
    icon: ScrollText,
    adminOnly: true,
  },
  {
    href: "/admin/foydalanuvchilar",
    label: "Foydalanuvchilar",
    icon: Users,
    adminOnly: true,
  },
  {
    href: "/admin/jurnal",
    label: "Audit jurnali",
    icon: Landmark,
    adminOnly: true,
  },
];

export function AdminNav({ role }: { role: "admin" | "editor" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Boshqaruv menyusi" className="space-y-1">
      {ITEMS.filter((item) => !item.adminOnly || role === "admin").map(
        (item) => {
          /*
            Exact match for the dashboard, prefix match for the rest —
            otherwise "/admin" would light up on every single page, since
            every admin route starts with it.
          */
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                /*
                  Active state is a FILL PLUS A WEIGHT CHANGE, not a colour
                  swap — the rule from davijara-ui: in high contrast every ink
                  is the same, so a state carried by hue alone disappears.
                */
                active
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        },
      )}
    </nav>
  );
}
