import "server-only";

import { getDb } from "@/lib/db";
import { mainNav, type NavItem } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";
import uzMessages from "../../../messages/uz.json";

/*
  The site menu — the sections in code, plus whatever the panel added.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE TOP-LEVEL ARCHITECTURE STAYS IN CODE.                                │
  │                                                                          │
  │ `mainNav` in src/content/site.ts is the portal's information             │
  │ architecture — the institutional sections, laid out deliberately, with   │
  │ translated labels in messages/nav and active-state rules in              │
  │ lib/nav-active.ts that assume them. This module ADDS to that. It never   │
  │ reorders, renames or removes what is already there.                      │
  │                                                                          │
  │ What an editor can do is put a new page inside one of those sections, or │
  │ create a new section of their own, appended after those. That is the     │
  │ difference between extending a menu and being able to break the way a   │
  │ citizen finds anything.                                                  │
  └──────────────────────────────────────────────────────────────────────────┘

  LABELS COME FROM TWO PLACES AND THAT IS DELIBERATE. A static item carries a
  `key` and the component resolves it through `messages/nav`, so the menu and
  the page it opens can never disagree about their own name. A database item
  has no message key, so it carries a literal `label` already resolved for the
  requested locale. `NavItem.label` being optional is what lets both live in
  one tree.
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

function customSections(): SectionRow[] {
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
    sections = customSections();
  } catch {
    /*
      The menu is on EVERY page. A database that cannot be read — a restore in
      progress, a permissions problem after a bad deploy — must degrade to the
      six sections that live in code, not take the whole site down with it.
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

  /* Static sections, each with its own pages appended after its children. */
  const merged: NavItem[] = mainNav.map((item) => {
    const added = byParent.get(item.key);
    if (!added?.length) return item;
    return { ...item, children: [...(item.children ?? []), ...added] };
  });

  /*
    Operator-created sections, appended after the ones in code.

    An empty one is SKIPPED rather than rendered. A top-level menu entry whose
    panel opens on nothing is a dead end a citizen has to discover by clicking,
    and a section is created before its first page exists — so this state is
    normal and temporary, not an error worth surfacing on the public site.
  */
  for (const section of sections) {
    const children = byParent.get(section.key);
    if (!children?.length) continue;

    merged.push({
      key: `section:${section.key}`,
      /*
        A section is a real link in this design (see the note on
        NavItem.children), but an operator-created one has no page of its
        own — so it points at its first child rather than at an invented URL.
      */
      href: children[0]!.href,
      label: sectionLabel(section, resolved),
      children,
    });
  }

  return merged;
}

export type MenuTarget = {
  key: string;
  label: string;
  /** True for an operator-created section, false for one that lives in code. */
  custom: boolean;
};

/**
 * Every place a page may be put, for the panel's dropdown.
 *
 * Labels are Uzbek — the panel's chrome is Uzbek-only — and for the static
 * sections they are read from messages/nav rather than retyped here, so the
 * dropdown says exactly what the header says.
 */
export function menuTargets(): MenuTarget[] {
  const navLabels = uzMessages.nav as Record<string, string | undefined>;

  const staticTargets: MenuTarget[] = mainNav
    /*
      Only sections that already have a submenu. Adding a child to a
      childless top-level entry ("Bosh sahifa") would turn a plain link into
      a dropdown — a change to the header's shape, made by accident, from a
      page form.
    */
    .filter((item) => item.children?.length)
    .map((item) => ({
      key: item.key,
      label: navLabels[item.key] ?? item.key,
      custom: false,
    }));

  let custom: MenuTarget[] = [];
  try {
    custom = customSections().map((row) => ({
      key: row.key,
      label: row.label_uz,
      custom: true,
    }));
  } catch {
    custom = [];
  }

  return [...staticTargets, ...custom];
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

/** Operator-created sections, with how many published pages each holds. */
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
