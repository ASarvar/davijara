---
name: davijara-admin
description: The Boshqaruv paneli (/admin) — how it sits outside [locale], where its pieces live (db, auth, media, navigation, blocks), and the seven load-bearing rules each written against a real or silent failure (getDb() scoping, per-action guards, DATA_DIR, the admin cookie path, the build never opening the DB, editable menus, plain-text editor content). Load BEFORE touching src/app/admin/, src/lib/{db,auth,media}/, admin data modules, panel migrations, or the deploy/systemd files for the admin service.
---

# Boshqaruv paneli (`/admin`)

Editors write news and pages here instead of through a git commit. It sits
**outside `[locale]`** — its own root layout, no locale prefix, Uzbek-only
chrome, and `admin` is excluded from the proxy matcher so it is not
locale-redirected. The content it edits is still trilingual.

| Where | What |
|---|---|
| `src/lib/db/` | SQLite (better-sqlite3, pinned `^12`), append-only migrations |
| `src/lib/auth/` | scrypt passwords, DB-backed sessions, rate limit, audit log |
| `src/lib/media/` | uploads: byte-sniffed type, content-addressed, served by a route |
| `src/lib/data/page-routes.ts` | which of the site's own routes an editor can fill in |
| `src/lib/data/navigation.ts` | the menu: `mainNav` in code, plus pages the panel placed |
| `src/types/blocks.ts` | the block model editors compose content out of |
| `src/app/admin/` | `(panel)` route group = signed-in; `login` / `setup` outside it |
| `scripts/admin-user.mjs` | break-glass CLI for a locked-out administrator |

Seven rules that are load-bearing, each written against a failure that
already happened or would be silent:

1. **`getDb()` is called inside the function that queries — never hoisted to
   module scope.** `next build` collects page data in 23 worker processes; an
   eager module-level connection made all 23 race to run the migrations and
   the build died with `SQLITE_BUSY`.
2. **Every page *and every Server Action* calls its own guard.** A layout
   check only protects rendering; a Server Action is a POST endpoint that can
   be reached without the layout ever running. `requireUser()` redirects,
   `requireUserForAction()` throws — an action must not redirect, because a
   redirect reads as success to the client.
3. **The database and uploads live in `DATA_DIR` (`shared/`), never in the
   release tree.** `deploy.sh` keeps five releases; anything written inside
   one is deleted five deploys later, silently. The systemd unit needs a
   matching `ReadWritePaths` or `ProtectSystem=strict` makes it read-only.
4. **The session cookie is scoped to `${BASE_PATH}/admin`, never `/`.** The
   site serves davijara.uz itself now, but the domain is still SHARED:
   `/obyektlar` (davlat mulki monitoring), `/kadastr`, `/api2`, `*.php` and
   `/api/search` belong to other projects — and `/api/search` proxies to an
   external host, otchet.davbaho.uz. A `/` cookie would send admin session
   tokens to all of them, one of them off the domain entirely. Pinning to the
   panel is tighter than the old `/site` mount was, which is what kept the
   move to the root from widening the blast radius. Nothing outside `/admin`
   reads the session, so nothing is lost by it.
5. **The build never opens the database.** `getDb()` returns an in-memory
   handle during `phase-production-build`, so prerendered routes get empty
   results instead of the build creating root-owned files the service cannot
   write. Verified by building with a throwaway `DATA_DIR` and checking that
   nothing was written to it.
6. **Every menu is editable — the operator reversed this rule from the panel
   build.** `mainNav` in `src/content/site.ts` still exists, but only as the
   seed migration 8 copied into `menu_sections` and the fallback
   `getNavigation()` returns if the database can't be read. The five
   institutional sections (Markaz, Faoliyat, Hujjatlar, Ochiq maʼlumotlar,
   Yangiliklar) can be renamed, reordered or deleted from `/admin/menyu`
   exactly like a section an operator created — see the note at the top of
   `lib/data/navigation.ts` for how a renamed row keeps its 26 hard-coded
   site routes (matched by `key`, not by label) and what deleting one
   actually does to them. Only `home` and `contact` stay literal, plain
   links with no dropdown. A menu with no page under it is skipped rather
   than rendered, so an empty one is never a dead entry. Because the header
   sits in the root layout, a placement or menu change revalidates `/` as a
   layout, and `[locale]/layout.tsx` carries a 300 s window so a fresh
   deploy's build-time menus cannot stay wrong.
7. **Editor content is plain text; nothing renders editor HTML.** Blocks
   store strings, `BlockContent` renders them as React children, and there is
   no `dangerouslySetInnerHTML` anywhere in that path. That is what makes
   editor-supplied content safe without a sanitiser — do not add one, add a
   structured field instead. Uploads follow the same principle: the type comes
   from the file's bytes, never its name or `Content-Type`, and SVG is
   refused because it is a document that can carry script.

Statutory content is being moved here at the operator's request, which is what
the audit log's full before/after snapshots are for: they replace the reviewed
git diff that used to be the only way that text could change. Until that
migration lands, non-negotiable 1 in the root `CLAUDE.md` still applies as
written — nothing may write to `privileges` or `documents` without going
through `audit()`.
