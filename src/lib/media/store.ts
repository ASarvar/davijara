import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getDb } from "@/lib/db";
import { extensionFor, readDimensions, sniffImageMime } from "./sniff";
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  type ImageMime,
  type MediaItem,
} from "./types";

/*
  Where uploaded files live, and how they get there.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ NOT IN public/. THAT IS THE WHOLE POINT.                                 │
  │                                                                          │
  │ Writing uploads into public/ is the obvious approach and is wrong here    │
  │ for two independent reasons:                                             │
  │                                                                          │
  │  1. public/ is inside the release directory, which deploy.sh rebuilds    │
  │     from git every deploy and prunes to the last five. Every photograph  │
  │     an editor uploaded would vanish — not at once, which would be        │
  │     noticed, but five deploys later, which would not.                     │
  │  2. Next serves public/ verbatim. A file there is reachable by its name  │
  │     with no code in between, so the only thing standing between an       │
  │     upload and the web would be the upload check itself.                  │
  │                                                                          │
  │ Files go to DATA_DIR/uploads instead — beside the database, on the       │
  │ persistent volume — and are served by a route handler that looks the id  │
  │ up in the database first (app/api/media/[id]/route.ts).                  │
  └──────────────────────────────────────────────────────────────────────────┘

  CONTENT-ADDRESSED. The id is the SHA-256 of the bytes, which buys three
  things for free: the same photograph uploaded twice is stored once; the URL
  can be cached `immutable`, because those bytes can never be different; and
  nothing an editor types influences a path on disk.

  SHARDED TWO DEEP. `uploads/ab/cdef…jpg` rather than one flat directory —
  ext4 copes with tens of thousands of entries but `ls` in that directory
  during an incident does not.
*/

function uploadsDir(): string {
  const dataDir = process.env.DATA_DIR ?? join(process.cwd(), ".data");
  return join(dataDir, "uploads");
}

function pathFor(id: string, mime: ImageMime): string {
  return join(uploadsDir(), id.slice(0, 2), `${id}.${extensionFor(mime)}`);
}

export type UploadResult =
  { ok: true; item: MediaItem } | { ok: false; error: string };

export async function storeUpload(
  file: File,
  userId: number,
  alt: string,
): Promise<UploadResult> {
  if (file.size === 0) return { ok: false, error: "Fayl boʻsh." };

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Fayl juda katta (${formatBytes(file.size)}). Eng koʻpi ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  /*
    The type comes from the bytes, never from file.type or the filename —
    see sniff.ts. This is the check that makes the rest of this function safe.
  */
  const mime = sniffImageMime(bytes);
  if (!mime) {
    return {
      ok: false,
      error:
        "Bu fayl turi qabul qilinmaydi. Faqat JPEG, PNG, WebP, GIF yoki AVIF rasm yuklang.",
    };
  }

  const id = createHash("sha256").update(bytes).digest("hex");
  const db = getDb();

  const existing = db.prepare("SELECT id FROM media WHERE id = ?").get(id) as
    { id: string } | undefined;

  if (existing) {
    /*
      Same bytes already stored. Return the existing record rather than
      writing it again — but do NOT overwrite its alt text: the file may be in
      use on another page whose caption someone wrote deliberately.
    */
    const item = getMedia(id);
    if (item) return { ok: true, item };
  }

  const dimensions = readDimensions(bytes, mime);
  const target = pathFor(id, mime);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);

  /*
    The database row is written AFTER the file. If the process dies between
    the two, the result is an orphan file on disk — invisible, harmless, and
    findable later. The other order would leave a row pointing at a file that
    does not exist, which is a broken image on a public page.
  */
  db.prepare(
    `INSERT INTO media (id, mime, bytes, width, height, alt, original_name, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    mime,
    bytes.byteLength,
    dimensions?.width ?? null,
    dimensions?.height ?? null,
    alt.slice(0, 300),
    /*
      Kept for the editor's benefit only — it is what they will recognise the
      file by in the library. It is never used to build a path, and never
      sent as a Content-Disposition filename.
    */
    file.name.slice(0, 200),
    new Date().toISOString(),
    userId,
  );

  const item = getMedia(id);
  return item
    ? { ok: true, item }
    : { ok: false, error: "Faylni saqlashda xato." };
}

type Row = {
  id: string;
  mime: ImageMime;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  original_name: string;
  created_at: string;
};

function toItem(row: Row): MediaItem {
  return {
    id: row.id,
    mime: row.mime,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    alt: row.alt,
    originalName: row.original_name,
    createdAt: row.created_at,
  };
}

export function getMedia(id: string): MediaItem | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, mime, bytes, width, height, alt, original_name, created_at
         FROM media WHERE id = ?`,
    )
    .get(id) as Row | undefined;
  return row ? toItem(row) : undefined;
}

export function listMedia(limit = 60): MediaItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, mime, bytes, width, height, alt, original_name, created_at
         FROM media ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Row[];
  return rows.map(toItem);
}

/** The bytes, for the serving route. */
export async function readMediaFile(item: MediaItem): Promise<Buffer | null> {
  try {
    return await readFile(pathFor(item.id, item.mime));
  } catch {
    /*
      A row whose file is missing — a half-restored backup, a hand-cleaned
      uploads directory. Returning null lets the route answer 404 instead of
      throwing a 500 on a public page.
    */
    return null;
  }
}

export async function deleteMedia(id: string): Promise<MediaItem | undefined> {
  const item = getMedia(id);
  if (!item) return undefined;

  getDb().prepare("DELETE FROM media WHERE id = ?").run(id);

  /*
    Row first, then file: after the DELETE nothing can serve it, so a failure
    to unlink leaves an orphan file rather than a live URL for something that
    was supposed to be gone.
  */
  try {
    await unlink(pathFor(item.id, item.mime));
  } catch {
    // Already gone, or never written. Nothing useful to do about it here.
  }

  return item;
}

/*
  Where an uploaded file is served from.

  NOT prefixed with basePath here. The value is stored in the database and
  rendered by `mediaSrc()` at display time — baking `/site` into stored data
  would break every image the day the mount point changes.
*/
export function mediaPath(id: string): string {
  return `/api/media/${id}`;
}
