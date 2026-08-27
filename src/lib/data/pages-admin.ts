import "server-only";

import { getDb } from "@/lib/db";
import { parseBlocks, type Block } from "@/types/blocks";
import { PAGE_ROUTES, type PageRoute } from "./page-routes";
import { menuTargets } from "./navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
  The panel's view of pages.

  Sees drafts, and does NOT fall back between languages — an editor has to be
  able to tell an empty Russian tab from one that merely inherits Uzbek. Same
  split, for the same reasons, as news.ts / news-admin.ts.
*/

export type PageStatus = "draft" | "published";

export type PageTranslation = {
  title: string;
  description: string;
  blocks: Block[];
};

export type PageRecord = {
  id: number;
  path: string;
  navKey: string | null;
  status: PageStatus;
  /*
    Which menu the page hangs under — a key from mainNav or from
    menu_sections, or null for a page that is deliberately not in the menu.
    Part of the record, and therefore part of every audit snapshot: taking a
    page out of the navigation is a change a citizen notices, so it has to be
    a change the log can show and undo.
  */
  menuParent: string | null;
  menuPosition: number;
  translations: Partial<Record<Locale, PageTranslation>>;
};

/**
 * One row in the panel's list.
 *
 * `id` is null for a registered route that has no database row yet — it is
 * still shown, because "this page exists and is empty" is the single most
 * useful thing the list can tell an editor. Those 26 rows are the work queue.
 */
export type PageSummary = {
  id: number | null;
  path: string;
  navKey: string | null;
  group: string;
  status: PageStatus | "empty";
  locales: Locale[];
  /** Set only for custom pages; a registered route's title comes from `nav`. */
  title: string | null;
  /** The menu this page hangs under, already resolved to an Uzbek label. */
  menuLabel: string | null;
};

type ListRow = {
  id: number;
  path: string;
  nav_key: string | null;
  status: PageStatus;
  locales: string | null;
  title: string | null;
  menu_parent: string | null;
};

function localesOf(concatenated: string | null): Locale[] {
  return (concatenated?.split(",") ?? []).filter((l): l is Locale =>
    routing.locales.includes(l as Locale),
  );
}

/**
 * Every registered route, plus every custom page.
 *
 * The two are merged HERE rather than in the UI so the list has one shape and
 * one sort. Registered routes come first, in menu order, because those are
 * the pages the site already links to from its own navigation — an empty one
 * is a visible gap for a citizen, while an unwritten custom page is a gap
 * nobody can see.
 */
export function listPages(): PageSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT
         p.id, p.path, p.nav_key, p.status,
         (SELECT GROUP_CONCAT(locale) FROM page_translations WHERE page_id = p.id) AS locales,
         (SELECT title FROM page_translations WHERE page_id = p.id AND locale = 'uz') AS title,
         p.menu_parent
       FROM pages p`,
    )
    .all() as ListRow[];

  const byNavKey = new Map(
    rows.filter((r) => r.nav_key).map((r) => [r.nav_key!, r]),
  );

  const registered: PageSummary[] = PAGE_ROUTES.map((route: PageRoute) => {
    const row = byNavKey.get(route.navKey);
    return {
      id: row?.id ?? null,
      path: route.path,
      navKey: route.navKey,
      group: route.group,
      status: row?.status ?? "empty",
      locales: localesOf(row?.locales ?? null),
      title: null,
      /*
        A registered route is already in the menu, in code. Showing a menu
        column for it would invite an editor to "fix" a placement that is not
        theirs to change.
      */
      menuLabel: null,
    };
  });

  const menuLabels = new Map(
    menuTargets().map((target) => [target.key, target.label]),
  );

  const custom: PageSummary[] = rows
    .filter((r) => !r.nav_key)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((r) => ({
      id: r.id,
      path: r.path,
      navKey: null,
      group: "Qoʻshimcha sahifalar",
      status: r.status,
      locales: localesOf(r.locales),
      title: r.title,
      /*
        `?? null` and not the raw key: a menu_parent pointing at a section
        that has since been deleted must read as "not in the menu", which is
        exactly what the public menu does with it.
      */
      menuLabel: r.menu_parent ? (menuLabels.get(r.menu_parent) ?? null) : null,
    }));

  return [...registered, ...custom];
}

export function getPageRecord(id: number): PageRecord | undefined {
  const page = getDb()
    .prepare(
      "SELECT id, path, nav_key, status, menu_parent, menu_position FROM pages WHERE id = ?",
    )
    .get(id) as PageRow | undefined;

  if (!page) return undefined;
  return withTranslations(page);
}

/** The row for a registered route, or undefined if it has never been written. */
export function getPageRecordByNavKey(navKey: string): PageRecord | undefined {
  const page = getDb()
    .prepare(
      "SELECT id, path, nav_key, status, menu_parent, menu_position FROM pages WHERE nav_key = ?",
    )
    .get(navKey) as PageRow | undefined;

  if (!page) return undefined;
  return withTranslations(page);
}

type PageRow = {
  id: number;
  path: string;
  nav_key: string | null;
  status: PageStatus;
  menu_parent: string | null;
  menu_position: number;
};

function withTranslations(page: PageRow): PageRecord {
  const rows = getDb()
    .prepare(
      "SELECT locale, title, description, blocks FROM page_translations WHERE page_id = ?",
    )
    .all(page.id) as Array<{
    locale: Locale;
    title: string;
    description: string;
    blocks: string;
  }>;

  const translations: Partial<Record<Locale, PageTranslation>> = {};
  for (const row of rows) {
    translations[row.locale] = {
      title: row.title,
      description: row.description,
      blocks: parseBlocks(row.blocks),
    };
  }

  return {
    id: page.id,
    path: page.path,
    navKey: page.nav_key,
    status: page.status,
    menuParent: page.menu_parent,
    menuPosition: page.menu_position,
    translations,
  };
}

/** True if the path belongs to a DIFFERENT page. */
export function pagePathTaken(path: string, exceptId?: number): boolean {
  const row = getDb()
    .prepare("SELECT id FROM pages WHERE path = ?")
    .get(path) as { id: number } | undefined;
  return row != null && row.id !== exceptId;
}
