import { withBasePath } from "@/lib/base-path";

/*
  Turn a stored image reference into an `<img src>`.

  Two shapes reach this function and they must be treated differently:

    /api/media/<id>         an upload — needs the basePath prefix
    /news/qabul-kunlari.jpg a file in public/ — needs it too
    https://example/x.jpg   an external URL — must be left alone

  The prefix matters because these render as raw <img> elements, which Next
  does NOT rewrite (only `<Link>` and its own asset URLs are prefixed — see
  lib/base-path.ts). A missed prefix does not 404 cleanly here: it resolves
  against the DIFFERENT project sitting at davijara.uz/, so the request
  succeeds against something unrelated.

  Not `server-only`: cards render on both sides of the boundary.
*/
export function mediaSrc(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith("/")) return value;
  return withBasePath(value);
}
