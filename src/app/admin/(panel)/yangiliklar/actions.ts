"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { audit } from "@/lib/auth/audit";
import { NotAuthorisedError, requireUserForAction } from "@/lib/auth/guard";
import {
  getNewsRecord,
  slugify,
  slugTaken,
  uniqueSlug,
} from "@/lib/data/news-admin";
import { blocksSchema } from "@/types/blocks";
import { routing, type Locale } from "@/i18n/routing";

/*
  News mutations.

  EVERY EXPORT HERE CALLS requireUserForAction() FIRST. A Server Action is a
  POST endpoint reachable without the page that renders its form, so the
  panel layout's guard protects nothing here — see lib/auth/guard.ts for the
  full reasoning. It is repeated per action rather than factored into a
  wrapper precisely so that a new action cannot be added without writing the
  line and noticing why.
*/

const CATEGORIES = [
  "obyektlar",
  "xizmatlar",
  "imtiyozlar",
  "tadbirlar",
  "portal",
] as const;

/*
  One language's text.

  ru and en may be entirely blank — that is "not translated yet", and the
  public site falls back to Uzbek. But a language that is PARTLY filled is
  rejected: a Russian title with no Russian body would render a Russian
  headline above Uzbek paragraphs, which reads as a bug to the citizen and is
  invisible to the editor who caused it.
*/
const translationSchema = z.object({
  title: z.string().trim().max(300),
  excerpt: z.string().trim().max(1000),
  blocks: z.string(),
});

const saveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  slug: z.string().trim().max(90),
  category: z.enum(CATEGORIES),
  /** ISO date, or empty while it is a draft with no date chosen yet. */
  publishedAt: z
    .string()
    .trim()
    .regex(
      /^(\d{4}-\d{2}-\d{2})?$/,
      "Sana YYYY-MM-DD koʻrinishida boʻlishi kerak.",
    )
    .optional()
    .default(""),
  image: z.string().trim().max(500).optional().default(""),
});

export type NewsFormState = { error?: string; ok?: string };

function nowIso(): string {
  return new Date().toISOString();
}

/** Re-render every public surface an item can appear on. */
function revalidateNews(slug: string): void {
  /*
    `type: "page"` on the two collection routes, per-locale, because the site
    is served under a locale prefix and revalidatePath does not expand a
    dynamic segment on its own. The homepage carries the three most recent
    items, so it needs clearing as well — an editor publishing a story and not
    seeing it on the front page would reasonably conclude the panel is broken.
  */
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/yangiliklar`);
    revalidatePath(`/${locale}/yangiliklar/${slug}`);
  }
  revalidatePath("/sitemap.xml");
}

type ParsedTranslations = {
  filled: Partial<
    Record<Locale, { title: string; excerpt: string; blocks: string }>
  >;
  error?: string;
};

/** Pull the three language tabs out of the form and validate each. */
function readTranslations(formData: FormData): ParsedTranslations {
  const filled: ParsedTranslations["filled"] = {};

  for (const locale of routing.locales) {
    const parsed = translationSchema.safeParse({
      title: formData.get(`${locale}.title`) ?? "",
      excerpt: formData.get(`${locale}.excerpt`) ?? "",
      blocks: formData.get(`${locale}.blocks`) ?? "[]",
    });

    if (!parsed.success) {
      return { filled, error: `${locale.toUpperCase()}: maʼlumot notoʻgʻri.` };
    }

    const { title, excerpt, blocks } = parsed.data;

    /*
      Blocks are re-parsed from the hidden field rather than trusted. The
      editor component produced this JSON, but a hidden input is as editable
      as any other — this is the boundary, not the component.
    */
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

    const empty = title === "" && excerpt === "" && blockCount === 0;
    if (empty) continue;

    if (title === "" || excerpt === "") {
      return {
        filled,
        error: `${locale.toUpperCase()}: sarlavha va qisqacha mazmun toʻldirilishi shart, yoki bu tilni butunlay boʻsh qoldiring.`,
      };
    }

    filled[locale] = { title, excerpt, blocks };
  }

  if (!filled.uz) {
    return {
      filled,
      error: "Oʻzbekcha sarlavha va qisqacha mazmun toʻldirilishi shart.",
    };
  }

  return { filled };
}

export async function saveNewsAction(
  _prev: NewsFormState,
  formData: FormData,
): Promise<NewsFormState> {
  let user;
  try {
    user = await requireUserForAction();
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { error: error.message };
    throw error;
  }

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug") ?? "",
    category: formData.get("category"),
    publishedAt: formData.get("publishedAt") ?? "",
    image: formData.get("image") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notoʻgʻri.",
    };
  }

  const translations = readTranslations(formData);
  if (translations.error) return { error: translations.error };

  const { id, category, publishedAt, image } = parsed.data;
  const uzTitle = translations.filled.uz!.title;

  /*
    An empty slug field means "derive it from the title" — which is what an
    editor who never touched the field intends. A slug they DID type is
    normalised rather than rejected: silently fixing `Bo'sh Obyektlar` into
    `bosh-obyektlar` is friendlier than an error about characters.
  */
  let slug = parsed.data.slug ? slugify(parsed.data.slug) : "";
  if (!slug) slug = uniqueSlug(uzTitle, id);
  if (slugTaken(slug, id)) {
    return { error: `Bu manzil band: /${slug}. Boshqa manzil kiriting.` };
  }

  const db = getDb();
  const before = id ? getNewsRecord(id) : undefined;

  if (id && !before) return { error: "Yangilik topilmadi." };

  /*
    One transaction for the parent row and all three translations. A partial
    save — the item's date updated but its Russian text not — would be a
    silent inconsistency that nothing later would detect.
  */
  const newId = db.transaction(() => {
    let itemId = id;

    if (itemId) {
      db.prepare(
        `UPDATE news
            SET slug = ?, category = ?, published_at = ?, image = ?,
                updated_at = ?, updated_by = ?
          WHERE id = ?`,
      ).run(
        slug,
        category,
        publishedAt || null,
        image || null,
        nowIso(),
        user.id,
        itemId,
      );
    } else {
      const info = db
        .prepare(
          `INSERT INTO news (slug, category, status, published_at, image, created_at, created_by)
           VALUES (?, ?, 'draft', ?, ?, ?, ?)`,
        )
        .run(
          slug,
          category,
          publishedAt || null,
          image || null,
          nowIso(),
          user.id,
        );
      itemId = Number(info.lastInsertRowid);
    }

    /*
      Replace the translation set wholesale: delete then insert what is
      filled. That is what makes CLEARING a language work — an editor who
      empties the Russian tab means "this is not translated after all", and an
      UPDATE-only strategy would leave the old Russian text in place with no
      way to remove it from the form.
    */
    db.prepare("DELETE FROM news_translations WHERE news_id = ?").run(itemId);

    const insert = db.prepare(
      `INSERT INTO news_translations (news_id, locale, title, excerpt, blocks)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const locale of routing.locales) {
      const text = translations.filled[locale];
      if (!text) continue;
      insert.run(itemId, locale, text.title, text.excerpt, text.blocks);
    }

    return itemId;
  })();

  const after = getNewsRecord(newId);

  audit({
    user,
    action: id ? "update" : "create",
    entity: "news",
    entityId: newId,
    summary: id
      ? `Yangilik tahrirlandi: ${uzTitle}`
      : `Yangilik yaratildi: ${uzTitle}`,
    before,
    after,
  });

  if (before?.status === "published" || after?.status === "published") {
    revalidateNews(slug);
    if (before && before.slug !== slug) revalidateNews(before.slug);
  }

  /*
    A new item redirects to its own edit page. Staying on /yangi would leave
    the form still saying "new", so a second Save would create a duplicate —
    which is exactly what a nervous editor does when nothing appears to have
    happened.
  */
  if (!id) redirect(`/admin/yangiliklar/${newId}`);

  return { ok: "Saqlandi." };
}

const idSchema = z.coerce.number().int().positive();

export async function publishNewsAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));
  const publish = formData.get("publish") === "1";

  const before = getNewsRecord(id);
  if (!before) return;

  /*
    Publishing with no date set stamps today, in TASHKENT's calendar. Using
    the server's UTC date would file anything published before 05:00 local
    under the previous day — and the public list orders by this column, so the
    item would appear below yesterday's news on the morning it went out.
  */
  const publishedAt =
    before.publishedAt ??
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(
      new Date(),
    );

  getDb()
    .prepare(
      `UPDATE news SET status = ?, published_at = ?, updated_at = ?, updated_by = ?
        WHERE id = ?`,
    )
    .run(
      publish ? "published" : "draft",
      publish ? publishedAt : before.publishedAt,
      nowIso(),
      user.id,
      id,
    );

  const uzTitle = before.translations.uz?.title ?? before.slug;
  audit({
    user,
    action: publish ? "publish" : "unpublish",
    entity: "news",
    entityId: id,
    summary: publish
      ? `Chop etildi: ${uzTitle}`
      : `Chop etish bekor qilindi: ${uzTitle}`,
    before,
    after: getNewsRecord(id),
  });

  revalidateNews(before.slug);
}

export async function deleteNewsAction(formData: FormData): Promise<void> {
  const user = await requireUserForAction();
  const id = idSchema.parse(formData.get("id"));

  const before = getNewsRecord(id);
  if (!before) return;

  /*
    A hard delete, with the whole record kept in the audit log's `before`
    snapshot. A soft-delete flag would mean every public query carrying a
    condition that exists only for the panel's benefit — and this is the
    reason audit_log stores complete objects rather than descriptions: what
    was deleted can be read back and re-entered.
  */
  getDb().prepare("DELETE FROM news WHERE id = ?").run(id);

  audit({
    user,
    action: "delete",
    entity: "news",
    entityId: id,
    summary: `Yangilik oʻchirildi: ${before.translations.uz?.title ?? before.slug}`,
    before,
  });

  revalidateNews(before.slug);
  redirect("/admin/yangiliklar");
}
