import { getMedia, readMediaFile } from "@/lib/media/store";

/*
  Serves an uploaded image.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE URL NEVER TOUCHES THE FILESYSTEM.                                    │
  │                                                                          │
  │ `id` from the path is checked against a 64-hex-character pattern and     │
  │ then used ONLY as a database key. The path on disk is built from the     │
  │ row that comes back — its id and its sniffed mime type — so there is no  │
  │ arrangement of dots and slashes in a URL that can reach a file outside   │
  │ the uploads directory, and no filename an editor chose is ever part of   │
  │ a path. Path traversal is not defended against here; it is structurally  │
  │ absent.                                                                  │
  └──────────────────────────────────────────────────────────────────────────┘

  PUBLIC, WITH NO SESSION CHECK, and that is correct rather than an omission:
  these are the photographs on public news articles. Anyone who can read the
  news can read the images in it. It does mean an upload is public the moment
  it is made, whether or not the article using it has been published — worth
  knowing before uploading something that is not meant to be seen yet.
*/

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[0-9a-f]{64}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Next.js 16: route params are async and must be awaited.
  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const item = getMedia(id);
  if (!item) return new Response("Not found", { status: 404 });

  const bytes = await readMediaFile(item);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      /*
        The SNIFFED type from the database, which is the only type this file
        was ever allowed to be. Paired with the global `X-Content-Type-Options:
        nosniff` (next.config.ts), the browser will not reinterpret it as
        anything else.
      */
      "Content-Type": item.mime,
      "Content-Length": String(bytes.byteLength),
      /*
        Immutable, for a year. The id IS the hash of the content, so this URL
        can never return different bytes — the strongest case there is for
        `immutable`, and it takes repeat loads of every news photograph off a
        server that has one CPU.
      */
      "Cache-Control": "public, max-age=31536000, immutable",
      /*
        Inline, with no filename. A Content-Disposition carrying the editor's
        original filename would put an attacker-influenced string into a
        response header for no benefit — nothing here is meant to be
        downloaded as a document.
      */
      "Content-Disposition": "inline",
    },
  });
}
