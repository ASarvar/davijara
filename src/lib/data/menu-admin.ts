import "server-only";

import { getDb } from "@/lib/db";
import { slugify } from "./news-admin";
import { listMenuSections, type MenuSection } from "./navigation";

/*
  Menu sections — the panel's write side. Every menu, whether it is one of
  the five institutional sections migration 8 seeded from mainNav or a
  section an operator created afterwards, is a plain row in this table and
  every function below treats them identically. See the note at the top of
  lib/data/navigation.ts for how a built-in row keeps its hard-coded
  mainNav children across a rename, and what deleting one actually does.

  KEYS ARE GENERATED, NEVER TYPED, for a NEW section — createMenuSection()
  slugifies the label. A section's key is only ever an internal identifier:
  pages point at it, and nothing else does. An operator who renames
  "Hamkorlar" to "Hamkorlarimiz" keeps the same key, so every page under it
  stays where it is — which is the whole reason the label is not the key.
  This is what makes renaming a built-in row safe too: "Markaz" can become
  anything without its 26 registered routes noticing, because they are
  matched by the key "centre", never by the label.
*/

export type { MenuSection };

export type MenuSectionRecord = {
  key: string;
  labelUz: string;
  labelRu: string | null;
  labelEn: string | null;
  position: number;
};

type Row = {
  key: string;
  label_uz: string;
  label_ru: string | null;
  label_en: string | null;
  position: number;
};

export function getMenuSection(key: string): MenuSectionRecord | undefined {
  const row = getDb()
    .prepare(
      "SELECT key, label_uz, label_ru, label_en, position FROM menu_sections WHERE key = ?",
    )
    .get(key) as Row | undefined;

  if (!row) return undefined;
  return {
    key: row.key,
    labelUz: row.label_uz,
    labelRu: row.label_ru,
    labelEn: row.label_en,
    position: row.position,
  };
}

/**
 * A key that is free.
 *
 * Two sections may legitimately want the same name, so a collision suffixes
 * rather than fails. An empty slug — a label written entirely in punctuation,
 * or in a script slugify drops — falls back to a stable prefix instead of
 * producing "" and colliding with itself.
 */
function freeKey(label: string): string {
  const base = slugify(label) || "menyu";
  const taken = getDb().prepare("SELECT 1 FROM menu_sections WHERE key = ?");

  let key = base;
  let n = 2;
  while (taken.get(key)) key = `${base}-${n++}`;
  return key;
}

/** Creates a section and returns its generated key. */
export function createMenuSection(
  label: string,
  userId: number,
  translations?: { ru?: string; en?: string },
): string {
  const db = getDb();
  const key = freeKey(label);

  const next = db
    .prepare("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM menu_sections")
    .get() as { n: number };

  db.prepare(
    `INSERT INTO menu_sections
       (key, label_uz, label_ru, label_en, position, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    key,
    label,
    translations?.ru?.trim() || null,
    translations?.en?.trim() || null,
    next.n,
    new Date().toISOString(),
    userId,
  );

  return key;
}

export function updateMenuSection(
  key: string,
  labels: { uz: string; ru?: string; en?: string },
): void {
  getDb()
    .prepare(
      "UPDATE menu_sections SET label_uz = ?, label_ru = ?, label_en = ? WHERE key = ?",
    )
    .run(labels.uz, labels.ru?.trim() || null, labels.en?.trim() || null, key);
}

/**
 * Deletes a section. The pages under it are NOT deleted.
 *
 * Their menu_parent is cleared instead, so they keep their URLs and their
 * content and simply stop appearing in the menu. Cascading here would turn
 * "this heading was a bad idea" into "the four pages under it are gone", and
 * the operator would find out from a citizen.
 */
export function deleteMenuSection(key: string): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      "UPDATE pages SET menu_parent = NULL, menu_position = 0 WHERE menu_parent = ?",
    ).run(key);
    db.prepare("DELETE FROM menu_sections WHERE key = ?").run(key);
  })();
}

/**
 * Swaps a section with its neighbour.
 *
 * Swapping the two rows' stored positions rather than renumbering the whole
 * table keeps this a two-row write, and any gaps left in the sequence are
 * harmless — the menu only ever reads them as an ORDER BY.
 */
export function moveMenuSection(key: string, direction: -1 | 1): void {
  const sections = listMenuSections();
  const index = sections.findIndex((section) => section.key === key);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= sections.length) return;

  const a = sections[index]!;
  const b = sections[target]!;

  const db = getDb();
  const update = db.prepare(
    "UPDATE menu_sections SET position = ? WHERE key = ?",
  );
  db.transaction(() => {
    update.run(b.position, a.key);
    update.run(a.position, b.key);
  })();
}

export type MenuPage = {
  id: number;
  path: string;
  title: string | null;
  published: boolean;
};

/** The pages sitting under one menu, in menu order — used by the manager. */
export function pagesInMenu(key: string): MenuPage[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.path, p.status,
              (SELECT title FROM page_translations
                WHERE page_id = p.id AND locale = 'uz') AS title
         FROM pages p
        WHERE p.menu_parent = ?
        ORDER BY p.menu_position, p.id`,
    )
    .all(key) as Array<{
    id: number;
    path: string;
    status: string;
    title: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    title: row.title,
    published: row.status === "published",
  }));
}

/** Appends a page to the end of a menu, or takes it out of the menu. */
export function setPageMenu(pageId: number, parent: string | null): void {
  const db = getDb();

  if (!parent) {
    db.prepare(
      "UPDATE pages SET menu_parent = NULL, menu_position = 0 WHERE id = ?",
    ).run(pageId);
    return;
  }

  const current = db
    .prepare("SELECT menu_parent FROM pages WHERE id = ?")
    .get(pageId) as { menu_parent: string | null } | undefined;

  /*
    Already there — leave the position alone. Recomputing it would shuffle a
    page to the bottom of its own menu every time somebody fixed a typo in it.
  */
  if (current?.menu_parent === parent) return;

  const next = db
    .prepare(
      "SELECT COALESCE(MAX(menu_position), 0) + 1 AS n FROM pages WHERE menu_parent = ?",
    )
    .get(parent) as { n: number };

  db.prepare(
    "UPDATE pages SET menu_parent = ?, menu_position = ? WHERE id = ?",
  ).run(parent, next.n, pageId);
}

/** Swaps a page with its neighbour inside its own menu. */
export function movePageInMenu(pageId: number, direction: -1 | 1): void {
  const db = getDb();
  const page = db
    .prepare("SELECT menu_parent FROM pages WHERE id = ?")
    .get(pageId) as { menu_parent: string | null } | undefined;
  if (!page?.menu_parent) return;

  const siblings = db
    .prepare(
      "SELECT id, menu_position FROM pages WHERE menu_parent = ? ORDER BY menu_position, id",
    )
    .all(page.menu_parent) as Array<{ id: number; menu_position: number }>;

  const index = siblings.findIndex((sibling) => sibling.id === pageId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= siblings.length) return;

  const a = siblings[index]!;
  const b = siblings[target]!;

  const update = db.prepare("UPDATE pages SET menu_position = ? WHERE id = ?");
  db.transaction(() => {
    /*
      menu_position defaults to 0, so a menu nobody has reordered holds every
      row at 0 and swapping two zeroes changes nothing at all. Renumbering
      first is cheap — these lists are a handful of rows — and it is what
      makes the very first press of an arrow do something visible.
    */
    if (siblings.every((sibling) => sibling.menu_position === 0)) {
      siblings.forEach((sibling, i) => update.run(i + 1, sibling.id));
      update.run(target + 1, a.id);
      update.run(index + 1, b.id);
      return;
    }
    update.run(b.menu_position, a.id);
    update.run(a.menu_position, b.id);
  })();
}
