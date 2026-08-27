import "server-only";

import { getDb } from "@/lib/db";
import { mainNav, type NavItem } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";

/*
  The site menu — two loose links in code, and every dropdown menu in the
  database.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ EVERY MENU IS EDITABLE. THAT WAS A DELIBERATE REVERSAL.                  │
  │                                                                          │
  │ The five institutional sections (Markaz, Faoliyat, Hujjatlar, Ochiq      │
  │ maʼlumotlar, Yangiliklar) used to be hard-coded and un-renamable — see   │
  │ migration 7's own comment for that reasoning. The operator asked for     │
  │ them to be as editable as anything an editor creates, accepting the risk │
  │ explicitly: renaming or deleting one of these changes the portal's own   │
  │ navigation, and migration 8 is what carried them into `menu_sections`.   │
  │                                                                          │
  │ `mainNav` in src/content/site.ts still exists and still matters — it is  │
  │ now the SEED and the FALLBACK, not the source of truth. Each of those    │
  │ five keys ("centre", "activity", …) still names the 26 registered site   │
  │ routes that hang under it (`/markaz`, `/markaz/vazifalar`, …), which are │
  │ real route files and cannot be renamed or moved from a database row. A   │
  │ menu row is recognised as carrying those hard-coded children purely by   │
  │ KEY MATCH against `mainNav` — rename the row's label all you like, the   │
  │ key never changes, so the children never detach. Delete the row instead  │
  │ and those 26 routes simply stop being linked from the header — they stay │
  │ reachable at their URLs, same as an operator's own page losing its menu  │
  │ slot. Recreating a menu with the same label mints a NEW key (slugified   │
  │ fresh) and does not reattach them; that is a known, accepted edge case.  │
  │                                                                          │
  │ "Bosh sahifa", "Statistika" and "Aloqa" are NOT in this table. They are   │
  │ plain links with no dropdown — "Bosh sahifa" then "Statistika" leading,   │
  │ "Aloqa" trailing — turning one of them into a manageable "menu" was      │
  │ never asked for and would be a different feature (a link, not a menu),  │
  │ so they stay literal. "Statistika" was added 2026-08-28 as the second    │
  │ leading link, at the operator's request that it sit right after "Bosh    │
  │ sahifa" rather than live under "Ma'lumotlar".                            │
  └──────────────────────────────────────────────────────────────────────────┘

  A database row has no message key, so it always carries a literal
  `label` already resolved for the requested locale, falling back through
  Uzbek exactly like every other translated field on this site. The two
  literal links still resolve through `messages/nav`, which is the whole
  reason `NavItem.label` stayed optional rather than becoming required.
*/

type PageRow = {
  path: string;
  menu_parent: string;
  label: string;
};

type SectionRow = {
  key: string;
  label_uz: string;
  label_ru: string | null;
  label_en: string | null;
};

/**
 * The mainNav entries that are plain links, not manageable dropdowns.
 * Order matters: LEADING_KEYS render in this order, before every managed
 * section; TRAILING_KEY renders last.
 */
const LEADING_KEYS = ["home", "statistics"];
const TRAILING_KEY = "contact";

function safeLocale(locale?: string): Locale {
  return routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

/**
 * Menu entries for published, menu-placed pages.
 *
 * The label is the page's own title in the requested locale, falling back to
 * Uzbek per column — the same NULLIF/COALESCE pattern as lib/data/pages.ts,
 * and for the same reason: a translation row exists as soon as an editor
 * types one field in it, so a present-but-empty title must still fall back.
 */
function menuPages(locale: Locale): PageRow[] {
  return getDb()
    .prepare(
      `SELECT
         p.path,
         p.menu_parent,
         COALESCE(NULLIF(t.title, ''), uz.title) AS label
       FROM pages p
       JOIN page_translations uz ON uz.page_id = p.id AND uz.locale = 'uz'
       LEFT JOIN page_translations t ON t.page_id = p.id AND t.locale = ?
      WHERE p.status = 'published'
        AND p.menu_parent IS NOT NULL
        AND p.menu_parent != ''
      ORDER BY p.menu_position, p.id`,
    )
    .all(locale) as PageRow[];
}

function allSections(): SectionRow[] {
  return getDb()
    .prepare(
      "SELECT key, label_uz, label_ru, label_en FROM menu_sections ORDER BY position, key",
    )
    .all() as SectionRow[];
}

function sectionLabel(row: SectionRow, locale: Locale): string {
  const translated = locale === "ru" ? row.label_ru : locale === "en" ? row.label_en : null;
  return translated?.trim() || row.label_uz;
}

const mainNavByKey = new Map(mainNav.map((item) => [item.key, item]));

/**
 * The full menu for one locale.
 *
 * Server-only, so the two client nav components receive the result as a prop
 * rather than importing `mainNav` themselves — that is the whole reason
 * site-header passes it down.
 */
export async function getNavigation(locale?: string): Promise<NavItem[]> {
  const resolved = safeLocale(locale);

  let pages: PageRow[];
  let sections: SectionRow[];
  try {
    pages = menuPages(resolved);
    sections = allSections();
  } catch {
    /*
      The menu is on EVERY page. A database that cannot be read — a restore in
      progress, a permissions problem after a bad deploy — must degrade to
      `mainNav` exactly as it ships in code, not take the whole site down
      with it. This is the one place the seed still doubles as a fallback.
    */
    return mainNav;
  }

  const byParent = new Map<string, NavItem[]>();
  for (const page of pages) {
    const list = byParent.get(page.menu_parent) ?? [];
    list.push({
      // Prefixed so a page key can never collide with a `messages/nav` key.
      key: `page:${page.path}`,
      href: `/${page.path}`,
      label: page.label,
    });
    byParent.set(page.menu_parent, list);
  }

  const leading = LEADING_KEYS.map((key) => mainNavByKey.get(key)).filter(
    (item): item is NavItem => Boolean(item),
  );
  const trailing = mainNavByKey.get(TRAILING_KEY);

  /*
    One list, DB-ordered, whether the row came from migration 8's seed or
    from an operator's own "+ Yangi menyu". A row whose key matches a
    `mainNav` entry keeps that entry's hard-coded children (the routes a
    database row can never own); an operator-created row has only whatever
    pages are attached to it, and is SKIPPED entirely if that is none — a
    menu entry that opens on nothing is a dead end a citizen has to discover
    by clicking, and a section is routinely created before its first page
    exists, so this state is normal and temporary rather than an error worth
    surfacing on the public site. A built-in row is never skipped this way:
    its mainNav children exist unconditionally.
  */
  const managed: NavItem[] = [];
  for (const section of sections) {
    const builtin = mainNavByKey.get(section.key);
    const attached = byParent.get(section.key) ?? [];
    const children = [...(builtin?.children ?? []), ...attached];
    if (!children.length) continue;

    managed.push({
      key: section.key,
      /*
        A section is a real link in this design (see the note on
        NavItem.children). A built-in row keeps its original href; an
        operator-created one has no page of its own, so it points at its
        first child rather than at an invented URL.
      */
      href: builtin?.href ?? children[0]!.href,
      label: sectionLabel(section, resolved),
      /*
        Carried across from the mainNav entry, if there is one — this is what
        makes "Faoliyat"/"Hujjatlar" stay non-clickable after passing through
        the database merge. An operator-created row has no mainNav
        counterpart and is always a real link (`undefined` here means
        "clickable", per the field's own default).
      */
      clickable: builtin?.clickable,
      children,
    });
  }

  return [...leading, ...managed, ...(trailing ? [trailing] : [])];
}

export type MenuTarget = {
  key: string;
  label: string;
  /** True for a menu with no mainNav counterpart — purely an operator's own. */
  custom: boolean;
};

/**
 * Every place a page may be put, for the panel's dropdown.
 *
 * Labels are Uzbek — the panel's chrome is Uzbek-only — and now come straight
 * from `menu_sections`, migration 8 having seeded it with the five
 * institutional labels verbatim, so this still says exactly what the header
 * says without a separate messages/nav lookup.
 */
export function menuTargets(): MenuTarget[] {
  try {
    return allSections().map((row) => ({
      key: row.key,
      label: row.label_uz,
      custom: !mainNavByKey.has(row.key),
    }));
  } catch {
    // A database an editor cannot read yet cannot offer menu placement either
    // — the page form just shows "not in the menu" and nothing to pick from.
    return [];
  }
}

/** True if the key names a menu a page may actually be placed in. */
export function isMenuTarget(key: string): boolean {
  return menuTargets().some((target) => target.key === key);
}

export type MenuSection = {
  key: string;
  labelUz: string;
  labelRu: string | null;
  labelEn: string | null;
  position: number;
  pageCount: number;
};

/** Every menu row, built-in or operator-created, with its published page count. */
export function listMenuSections(): MenuSection[] {
  const rows = getDb()
    .prepare(
      `SELECT s.key, s.label_uz, s.label_ru, s.label_en, s.position,
              (SELECT COUNT(*) FROM pages p
                WHERE p.menu_parent = s.key AND p.status = 'published') AS page_count
         FROM menu_sections s
        ORDER BY s.position, s.key`,
    )
    .all() as Array<SectionRow & { position: number; page_count: number }>;

  return rows.map((row) => ({
    key: row.key,
    labelUz: row.label_uz,
    labelRu: row.label_ru,
    labelEn: row.label_en,
    position: row.position,
    pageCount: row.page_count,
  }));
}
