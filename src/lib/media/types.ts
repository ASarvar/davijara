/*
  Media types that BOTH the server store and the browser picker need.

  Split out of store.ts for the same reason password.client.ts is split out of
  password.ts: that module is `server-only` (it touches the filesystem), and
  the upload form needs the accept list and the size cap to tell an editor
  what is allowed BEFORE they wait for a 6 MB upload to be rejected.

  Nothing secret goes in here — it ships in the client bundle.
*/

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ SVG IS NOT ON THIS LIST, AND MUST NOT BE ADDED.                          │
  │                                                                          │
  │ An SVG is a document, not a picture: it can carry <script>, event        │
  │ handlers and external references. Served from this site's own origin it  │
  │ would run with this site's privileges — a stored XSS that an editor can  │
  │ upload through the front door. The whole block model exists to keep      │
  │ editor-supplied markup out of the page (see src/types/blocks.ts); an     │
  │ SVG upload would walk straight around it.                                │
  │                                                                          │
  │ The site's own inline SVG (logos, placeholder art) is written by hand in │
  │ this repository and reviewed in a diff. That is a different thing.       │
  └──────────────────────────────────────────────────────────────────────────┘
*/
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export type ImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** For the file input's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_MIME.join(",");

/*
  5 MB per file.

  Two other limits have to stay ABOVE this or an upload fails somewhere the
  editor cannot see, with a message that does not mention the size:

    next.config.ts    serverActions.bodySizeLimit  — 6mb
    deploy/nginx-*    client_max_body_size         — 8m

  nginx is the one that bites: its default is 1 MB, it is not set in either of
  this project's configs by default, and it rejects the request with a bare
  413 before Next ever runs. Raising this number means raising all three.
*/
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** What the panel shows about one stored file. */
export type MediaItem = {
  id: string;
  mime: ImageMime;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  originalName: string;
  createdAt: string;
};

/** Human-readable size, in Uzbek convention (space grouping, comma decimal). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
