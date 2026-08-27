"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import {
  getPageRecord,
  getPageRecordByNavKey,
  pagePathTaken,
} from "@/lib/data/pages-admin";
import { reservedPathReason, routeForNavKey } from "@/lib/data/page-routes";
import { isMenuTarget } from "@/lib/data/navigation";
import { createMenuSection, setPageMenu } from "@/lib/data/menu-admin";
import { slugify } from "@/lib/data/news-admin";
import { blocksSchema } from "@/types/blocks";
import { routing, type Locale } from "@/i18n/routing";

/*
  Page mutations.

  Same rules as the news actions: every export calls requireUserForAction()
  before anything else, and the blocks arriving in a hidden field are
  re-validated here rather than trusted.

  Where this differs from news is IDENTITY. A page is either:

    * one of the site's own 26 section routes, identified by its nav_key,
      whose path is fixed by the route file and cannot be edited; or
    * a page invented here, identified by a path the editor chooses.

  Mixing the two up is the failure this file guards against — an editor must
  not be able to move /hujjatlar somewhere else, because the route file would
  stay where it is and the content would vanish from it.
*/

export type PageFormState = { error?: string; ok?: string };

const translationSchema = z.object({
  title: z.string().trim().max(300),
  description: z.string().trim().max(500),
  blocks: z.string(),
});

const saveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  /** Set when creating/editing one of the site's own routes. */
  navKey: z.string().trim().max(64).optional().default(""),
  /** Only meaningful for a custom page. */
  path: z.string().trim().max(200).optional().default(""),
  /*
    Which menu the page hangs under. Only meaningful for a custom page: a
    registered route is already in the menu, in code, and accepting a value
    for one would put the same entry in the header twice.
  */
  menuParent: z.string().trim().max(64).optional().default(""),
  newMenuLabel: z.string().trim().max(80).optional().default(""),
});

/** The dropdown value that means "and create the menu while you are at it". */
const NEW_MENU = "__new__";

function nowIso(): string {
  return new Date().toISOString();
}

function revalidatePage(path: string): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/${path}`);
  }
  revalidatePath("/sitemap.xml");
}

/*
  The menu is rendered by the header, which is in the root layout, so every
  page of the site carries it. A placement change therefore invalidates the
  whole tree and not just the page that moved — revalidating only the moved
  page would leave the new menu entry missing everywhere a citizen actually
  starts from.
*/
function revalidateMenu(): void {
  revalidatePath("/", "layout");
}

type Filled = Partial<
  Record<Locale, { title: string; description: string; blocks: string }>
>;

/**
 * Read the three language tabs.
 *
 * Unlike news, a title is NOT required for a nav-key page: its heading comes
 * from messages/nav. What makes a language "written" here is having any
 * blocks — because a page with a title and no body is not a page, it is the
 * placeholder with extra steps.
 */
function readTranslations(
  formData: FormData,
  requireTitle: boolean,
): { filled: Filled; error?: string } {
  const filled: Filled = {};

  for (const locale of routing.locales) {
    const parsed = translationSchema.safeParse({
      title: formData.get(`${locale}.title`) ?? "",
      description: formData.get(`${locale}.description`) ?? "",
      blocks: formData.get(`${locale}.blocks`) ?? "[]",
    });

    if (!parsed.success) {
      return { filled, error: `${locale.toUpperCase()}: maʼlumot notoʻgʻri.` };
    }

    const { title, description, blocks } = parsed.data;

    let blockCount = 0;
    try {
      const validated = blocksSchema.safeParse(JSON.parse(blocks));
      if (!validated.success) {
        return {
          filled,
          error: `${locale.toUpperCase()}: matn bloklarida xato bor. Boʻsh bloklarni oʻchiring.`,
        };
      }
      blockCount = validated.data.length;
    } catch {
      return {
        filled,
        error: `${locale.toUpperCase()}: matn bloklari buzilgan.`,
      };
    }

    if (blockCount === 0 && title === "" && description === "") continue;

    if (requireTitle && title === "") {
      return {
        filled,
        error: `${locale.toUpperCase()}: sarlavha toʻldirilishi shart, yoki bu tilni butunlay boʻsh qoldiring.`,
      };
    }

    filled[locale] = { title, description, blocks };
  }

  if (!filled.uz) {
    return { filled, error: "Oʻzbekcha matn toʻldirilishi shart." };
  }

  return { filled };
}

export async function savePageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    navKey: formData.get("navKey") ?? "",
    path: formData.get("path") ?? "",
    menuParent: formData.get("menuParent") ?? "",
    newMenuLabel: formData.get("newMenuLabel") ?? "",
  });
  if (!parsed.success) {
    return { error: "Maʼlumotlar notoʻgʻri." };
  }

  const { id, navKey } = parsed.data;
  const isRegistered = navKey !== "";

  /*
    A nav-key page's path is NOT taken from the form. It comes from the
    registry, which mirrors the route files — so the path cannot be edited
    into something the route no longer serves, no matter what is posted.
  */
  let path: string;
  if (isRegistered) {
    const route = routeForNavKey(navKey);
    if (!route) return { error: "Bunday sahifa mavjud emas." };
    path = route.path;
  } else {
    path = parsed.data.path
      .split("/")
      .map((segment) => slugify(segment))
      .filter(Boolean)
      .join("/");

    if (!path) return { error: "Sahifa manzilini kiriting." };

    const reserved = reservedPathReason(path);
    if (reserved) return { error: reserved };

    if (pagePathTaken(path, id)) {
      return { error: `Bu manzil band: /${path}. Boshqa manzil kiriting.` };
    }
  }

  /*
    Resolve the menu BEFORE anything is written, so an unknown target fails
    the save rather than leaving a page stranded at a key nothing renders.
  */
  let menuParent: string | null = null;
  let createMenu: string | null = null;

  if (!isRegistered) {
    const requested = parsed.data.menuParent;

    if (requested === NEW_MENU) {
      createMenu = parsed.data.newMenuLabel;
      if (!createMenu) return { error: "Yangi menyu nomini kiriting." };
    } else if (requested !== "") {
      if (!isMenuTarget(requested)) {
        return { error: "Bunday menyu topilmadi. Sahifani yangilab koʻring." };
      }
      menuParent = requested;
    }
  }

  const translations = readTranslations(formData, !isRegistered);
  if (translations.error) return { error: translations.error };

  const db = getDb();

  /*
    An existing row is found by id, or — for a registered route being filled
    in for the first time — by nav_key. Without the second lookup, opening
    the same section page twice and saving would try to insert a duplicate
    nav_key and fail on the UNIQUE constraint with a database error rather
    than simply updating what is there.
  */
  const before =
    (id ? getPageRecord(id) : undefined) ??
    (isRegistered ? getPageRecordByNavKey(navKey) : undefined);

  const pageId = db.transaction(() => {
    let rowId = before?.id;

    if (rowId) {
      db.prepare(
        "UPDATE pages SET path = ?, updated_at = ?, updated_by = ? WHERE id = ?",
      ).run(path, nowIso(), user.id, rowId);
    } else {
      const info = db
        .prepare(
          `INSERT INTO pages (path, nav_key, status, created_at, created_by)
           VALUES (?, ?, 'draft', ?, ?)`,
        )
        .run(path, isRegistered ? navKey : null, nowIso(), user.id);
      rowId = Number(info.lastInsertRowid);
    }

    // Replace wholesale, so emptying a language tab actually removes it.
    db.prepare("DELETE FROM page_translations WHERE page_id = ?").run(rowId);

    const insert = db.prepare(
      `INSERT INTO page_translations (page_id, locale, title, description, blocks)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const locale of routing.locales) {
      const text = translations.filled[locale];
      if (!text) continue;
      insert.run(rowId, locale, text.title, text.description, text.blocks);
    }

    /*
      The section is created in the SAME transaction as the page. Two
      statements would leave an empty menu behind whenever the page save
      failed after it — a heading nobody asked for, invisible on the site
      (empty sections are skipped) and confusing in the manager.
    */
    if (createMenu) setPageMenu(rowId, createMenuSection(createMenu, user.id));
    else if (!isRegistered) setPageMenu(rowId, menuParent);

    return rowId;
  })();

  const after = getPageRecord(pageId);

  audit({
    user,
    action: before ? "update" : "create",
    entity: "page",
    entityId: pageId,
    summary: `Sahifa ${before ? "tahrirlandi" : "yaratildi"}: /${path}`,
    before,
    after,
  });

  if (before?.status === "published" || after?.status === "published") {
    revalidatePage(path);
    if (before && before.path !== path) revalidatePage(before.path);
    if (before?.menuParent !== after?.menuParent) revalidateMenu();
  }

  if (!id) redirect(`/admin/sahifalar/${pageId}`);
  return { ok: "Saqlandi." };
}

const idSchema = z.coerce.number().int().positive();

export async function publishPageAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));
  const publish = formData.get("publish") === "1";

  const before = getPageRecord(id);
  if (!before) return;

  getDb()
    .prepare(
      "UPDATE pages SET status = ?, updated_at = ?, updated_by = ? WHERE id = ?",
    )
    .run(publish ? "published" : "draft", nowIso(), user.id, id);

  audit({
    user,
    action: publish ? "publish" : "unpublish",
    entity: "page",
    entityId: id,
    summary: `${publish ? "Chop etildi" : "Chop etish bekor qilindi"}: /${before.path}`,
    before,
    after: getPageRecord(id),
  });

  revalidatePage(before.path);
  /*
    The menu lists published pages only, so publishing IS what puts the entry
    there — and unpublishing is what takes it away.
  */
  if (before.menuParent) revalidateMenu();
}

export async function deletePageAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));

  const before = getPageRecord(id);
  if (!before) return;

  getDb().prepare("DELETE FROM pages WHERE id = ?").run(id);

  audit({
    user,
    action: "delete",
    entity: "page",
    entityId: id,
    summary: `Sahifa oʻchirildi: /${before.path}`,
    before,
  });

  /*
    Deleting a registered route's row does not remove anything a citizen can
    reach — the route file is still there and returns to showing the "being
    prepared" placeholder. For a custom page the URL stops resolving. Both
    are recoverable from the audit snapshot above.
  */
  revalidatePage(before.path);
  if (before.menuParent) revalidateMenu();
  redirect("/admin/sahifalar");
}
