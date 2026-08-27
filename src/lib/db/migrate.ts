import "server-only";

import type { Database } from "better-sqlite3";

/*
  Imported for the v2 seed only — the one-time copy of the hand-written news
  items into the database. Nothing at RUNTIME reads this module any more;
  lib/data/news.ts queries the tables below. Keep the import here rather than
  inlining the records: a seed that quotes its source module is checkable
  against it, and a seed that re-types 5 records is not.
*/
import { news as legacyNews } from "@/content/news";
import { privileges as legacyPrivileges } from "@/content/privileges";
import * as legacyAbout from "@/content/about";
import * as legacyDuties from "@/content/duties";

/*
  Schema migrations.

  DELIBERATELY NOT AN ORM. The whole schema is a few tables read by a handful
  of queries; Prisma or Drizzle would add a generator step, a second source of
  schema truth and tens of megabytes to a `standalone` build that is currently
  measured in tens of megabytes total. Plain SQL against better-sqlite3 keeps
  the schema readable in one file, which for a state portal is worth more than
  type-generated query builders.

  HOW IT RUNS: `user_version` is a SQLite integer stored in the file header.
  Each migration below bumps it by one, and `migrate()` applies only the ones
  the file has not seen, inside a transaction. That means:

    * a fresh file gets every migration in order;
    * an existing file gets only what is new;
    * a half-applied migration rolls back rather than leaving the schema
      in a state no migration expects.

  Migrations are APPEND-ONLY. Never edit one that has shipped — the servers'
  files have already run it, so an edit changes what new installs get without
  touching them, and the two schemas drift apart silently. Add a new one.

  DATES ARE ISO 8601 TEXT, always UTC, always `YYYY-MM-DDTHH:MM:SS.sssZ`.
  SQLite has no date type; text in this shape sorts chronologically as a
  plain string, which is what every ORDER BY here relies on.
*/

type Migration = {
  readonly version: number;
  readonly name: string;
  readonly up: string;
  /**
   * Optional data step, run inside the SAME transaction as `up`.
   *
   * For migrations that move existing content into a new table, where the
   * source is a TypeScript module rather than something expressible as SQL
   * literals. Runs exactly once, like the schema half it belongs to.
   */
  readonly seed?: (db: Database) => void;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: "auth, audit log",
    up: `
      /*
        Editors. There is no public registration route and no self-service
        password reset — the legacy site shipped an open /register page, which
        on a state portal is an open door. Accounts are created by an admin,
        or by scripts/create-admin.mjs for the very first one.
      */
      CREATE TABLE users (
        id            INTEGER PRIMARY KEY,
        username      TEXT    NOT NULL UNIQUE,
        full_name     TEXT    NOT NULL,
        -- scrypt, self-describing: see lib/auth/password.ts for the format.
        password_hash TEXT    NOT NULL,
        role          TEXT    NOT NULL CHECK (role IN ('admin', 'editor')),
        is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at    TEXT    NOT NULL,
        last_login_at TEXT
      );

      /*
        Sessions, server-side and revocable.

        NOT JWT: a signed token cannot be withdrawn before it expires, so
        deactivating a compromised account would not actually log it out. A
        row that can be deleted can.

        The id column is the SHA-256 of the cookie value, never the value —
        someone reading this table (a backup, a support dump) still cannot
        impersonate anyone with what they find.
      */
      CREATE TABLE sessions (
        id         TEXT NOT NULL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        ip         TEXT,
        user_agent TEXT
      );
      CREATE INDEX sessions_user_idx    ON sessions(user_id);
      CREATE INDEX sessions_expires_idx ON sessions(expires_at);

      /*
        Login attempts, for rate limiting. Recorded per username AND per IP so
        neither a single account nor a single source can be hammered. Pruned
        by the same sweep that clears expired sessions.
      */
      CREATE TABLE login_attempts (
        id       INTEGER PRIMARY KEY,
        username TEXT    NOT NULL,
        ip       TEXT    NOT NULL,
        at       TEXT    NOT NULL,
        ok       INTEGER NOT NULL CHECK (ok IN (0, 1))
      );
      CREATE INDEX login_attempts_at_idx ON login_attempts(at);

      /*
        The audit log — the reason statutory text can safely be editable.

        The privileges, the org chart and the two Markaz pages are verbatim
        transcriptions of binding documents (PQ-239, VM-23 …). Once they are
        editable from a browser instead of by a reviewed git diff, the only
        thing standing between a mistyped legalBasis and a citizen reading
        it is this table. So it stores the FULL before and after of every
        change, not a description of one: that is what makes a bad edit
        reversible rather than merely traceable.

        The username column is denormalised on purpose. Its foreign key is
        nullable and ON DELETE SET NULL: deleting a user must not erase what
        they did — but a NULL user_id with no name beside it would be an audit
        log that has forgotten its own subject.
      */
      CREATE TABLE audit_log (
        id          INTEGER PRIMARY KEY,
        at          TEXT NOT NULL,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username    TEXT NOT NULL,
        action      TEXT NOT NULL,
        entity      TEXT NOT NULL,
        entity_id   TEXT,
        summary     TEXT NOT NULL,
        before_json TEXT,
        after_json  TEXT
      );
      CREATE INDEX audit_log_at_idx     ON audit_log(at);
      CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id);
    `,
  },

  {
    version: 2,
    name: "news",
    up: `
      /*
        A news item's language-independent facts. Everything a reader sees as
        WORDS lives in news_translations; what lives here is what is true of
        the item regardless of which language it is read in.

        published_at is a DATE (YYYY-MM-DD), not a timestamp, and is NULL
        while the item is a draft. The public ordering depends on it, and a
        NULL is what keeps an unpublished item from having a position in a
        list it is not in.

        The slug is shared across all three locales rather than translated.
        /uz/yangiliklar/<slug> and /ru/yangiliklar/<slug> are the same
        article, so the language switcher can stay on the page the reader is
        looking at — a per-locale slug would send them to the section index
        instead, every time.
      */
      CREATE TABLE news (
        id           INTEGER PRIMARY KEY,
        slug         TEXT    NOT NULL UNIQUE,
        category     TEXT    NOT NULL,
        status       TEXT    NOT NULL CHECK (status IN ('draft', 'published')),
        published_at TEXT,
        image        TEXT,
        created_at   TEXT    NOT NULL,
        updated_at   TEXT,
        created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX news_published_idx ON news(status, published_at DESC);

      /*
        One row per language that HAS been written.

        A missing row means "not translated yet" and the reader falls back to
        Uzbek — which is exactly how messages/ru.json and en.json already
        behave (see src/i18n/request.ts). Modelling that as an absent row
        rather than a NULL column makes "which languages is this available
        in?" a question the editor UI can answer with a COUNT, and lets a
        fourth locale arrive without four more columns on the parent table.

        uz is required by the application, not by the schema: a CHECK cannot
        express "at least one row must have locale = uz", so createNews()
        enforces it.
      */
      CREATE TABLE news_translations (
        news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
        locale  TEXT    NOT NULL CHECK (locale IN ('uz', 'ru', 'en')),
        title   TEXT    NOT NULL,
        excerpt TEXT    NOT NULL,
        -- JSON array of blocks; see src/types/blocks.ts. Never HTML.
        blocks  TEXT    NOT NULL DEFAULT '[]',
        PRIMARY KEY (news_id, locale)
      );
    `,

    /*
      Carry across the five items that were in src/content/news.ts.

      They are not placeholder copy: each states something checkable — a lot
      number that can be looked up on e-auksion.uz, a count the site prints
      elsewhere, or a portal feature the reader can go and use (the file's own
      header explains the sourcing). Dropping them to start the table empty
      would throw away real, verified content and leave the operator with a
      blank news section on day one.

      The TypeScript module STAYS as the source of this seed and is not
      deleted, so what was imported remains readable in git. After this
      migration the application reads the database and nothing else.
    */
    seed(db) {
      const insertItem = db.prepare(
        `INSERT INTO news (slug, category, status, published_at, image, created_at, updated_at)
         VALUES (?, ?, 'published', ?, ?, ?, ?)`,
      );
      const insertText = db.prepare(
        `INSERT INTO news_translations (news_id, locale, title, excerpt, blocks)
         VALUES (?, 'uz', ?, ?, ?)`,
      );

      for (const item of legacyNews) {
        /*
          `body?: string[]` was one string per paragraph — which is precisely
          a list of paragraph blocks, so the conversion is total and loses
          nothing. An item with no body keeps none: its excerpt IS its
          content, which the article page already renders as the lead.
        */
        const blocks = (item.body ?? []).map((text) => ({
          type: "paragraph" as const,
          text,
        }));

        const info = insertItem.run(
          item.slug,
          item.category,
          item.publishedAt,
          item.image ?? null,
          new Date().toISOString(),
          item.updatedAt ?? null,
        );

        insertText.run(
          Number(info.lastInsertRowid),
          item.title,
          item.excerpt,
          JSON.stringify(blocks),
        );
      }
    },
  },

  {
    version: 3,
    name: "media",
    up: `
      /*
        Uploaded images.

        The id is the SHA-256 of the file's bytes, so the same photograph
        uploaded twice is one row and one file — and the URL built from it can
        be cached forever, because those bytes cannot become different bytes.

        The FILE ITSELF is not here. SQLite would happily hold a 5 MB blob,
        but then every backup carries every photograph, the page cache holds
        image data it will never look inside, and a single file grows without
        limit. The bytes live under DATA_DIR/uploads; this table is the index
        that says which of them may be served, and as what.

        The mime column is the SNIFFED type, never the browser's claim: it
        becomes the Content-Type header when the file is served, so a wrong
        value here is a wrong value on the wire. See lib/media/sniff.ts.

        No foreign key from news.image to this table, deliberately: that
        column also holds paths to files in public/ and, in principle, an
        external URL. A constraint would forbid both.
      */
      CREATE TABLE media (
        id            TEXT    NOT NULL PRIMARY KEY,
        mime          TEXT    NOT NULL,
        bytes         INTEGER NOT NULL,
        width         INTEGER,
        height        INTEGER,
        alt           TEXT    NOT NULL DEFAULT '',
        original_name TEXT    NOT NULL,
        created_at    TEXT    NOT NULL,
        created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX media_created_idx ON media(created_at DESC);
    `,
  },

  {
    version: 4,
    name: "pages",
    up: `
      /*
        Editor-written pages.

        TWO KINDS OF ROW, ONE TABLE.

        1. A route that ALREADY EXISTS as a file under app/[locale]/ and is
           currently rendering the "being prepared" placeholder. Its nav_key
           is set, and that key is what the placeholder component matches on.
           Its TITLE is not stored here at all — it comes from messages/nav,
           the same string the menu item uses, so the menu and the page it
           opens cannot end up disagreeing about their own name.

        2. A page invented in the panel, at a path no route file covers. Its
           nav_key is NULL and the title comes from the translation row.
           Served by the catch-all route, which only runs when nothing more
           specific matched.

        The path column carries NO leading slash and NO locale prefix: it is
        between /uz/ and the end. Storing the locale would make one page three
        rows that could drift apart.

        Deleting a row of kind 1 does not delete anything an editor can see: it
        returns the route to its placeholder. That is the intended way to
        "unpublish permanently", and it is why there is no separate archive
        state.
      */
      CREATE TABLE pages (
        id         INTEGER PRIMARY KEY,
        path       TEXT    NOT NULL UNIQUE,
        nav_key    TEXT    UNIQUE,
        status     TEXT    NOT NULL CHECK (status IN ('draft', 'published')),
        created_at TEXT    NOT NULL,
        updated_at TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX pages_status_idx ON pages(status);

      /*
        Same shape and same fallback rule as news_translations: a missing row
        means "not translated yet" and the reader gets Uzbek.

        The title may be empty for a nav-key page, where messages/nav supplies
        it. The description is the meta description — a sentence for search
        results and link previews, not shown on the page itself.
      */
      CREATE TABLE page_translations (
        page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        locale      TEXT    NOT NULL CHECK (locale IN ('uz', 'ru', 'en')),
        title       TEXT    NOT NULL DEFAULT '',
        description TEXT    NOT NULL DEFAULT '',
        blocks      TEXT    NOT NULL DEFAULT '[]',
        PRIMARY KEY (page_id, locale)
      );
    `,
  },

  {
    version: 5,
    name: "privileges",
    up: `
      /*
        The 24 statutory rent privileges.

        ┌────────────────────────────────────────────────────────────────────┐
        │ NO TRANSLATIONS TABLE, AND THAT IS THE POINT.                      │
        │                                                                    │
        │ News and pages get one row per language. These do not, because     │
        │ they are not prose about a subject — they are a transcription of   │
        │ what binding documents say (PQ-239, PF-93, VM-626, PQ-3782 …).     │
        │ CLAUDE.md has said from the start that UI chrome may be translated │
        │ and legal text may not: a machine-translated legalBasis is a       │
        │ citation to a document that does not exist under that name.        │
        │                                                                    │
        │ So there is exactly one Uzbek text per field, shown to every       │
        │ reader in every locale. Adding a translations table here later     │
        │ would need a decision about who is authorised to translate a legal │
        │ citation, which is not a schema question.                          │
        └────────────────────────────────────────────────────────────────────┘

        TWO NUMBERS, AND ONLY ONE IS STORED. The public list shows a badge —
        01, 02, 03 — which used to be the record's own id in the TypeScript
        module. Now that an editor can delete one, an id-based badge would
        leave a visible gap (…06, 08…) that looks like a missing privilege
        rather than a renumbered list. So the position column is what orders
        the list, and the badge is the 1-based index computed at read time;
        the id is a stable key that is never displayed.
      */
      CREATE TABLE privileges (
        id          INTEGER PRIMARY KEY,
        position    INTEGER NOT NULL,
        category    TEXT    NOT NULL
                    CHECK (category IN ('ijtimoiy', 'talim', 'it', 'boshqa')),
        tag         TEXT    NOT NULL,
        title       TEXT    NOT NULL,
        description TEXT    NOT NULL,
        subject     TEXT    NOT NULL,
        duration    TEXT    NOT NULL,
        legal_basis TEXT    NOT NULL,
        updated_at  TEXT,
        updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX privileges_position_idx ON privileges(position);
    `,

    /*
      Carry across all 24 records from src/content/privileges.ts, verbatim.

      This is the migration that ends non-negotiable 1 in CLAUDE.md as it was
      originally written ("statutory content is verbatim, and lives in
      src/content/"). The operator decided these should be editable from the
      panel; the audit log's complete before/after snapshots are what replaces
      the reviewed git diff that used to be the only way this text could
      change. The TypeScript module stays on disk as the seed's source, so
      what was imported remains readable in git for ever.
    */
    seed(db) {
      const insert = db.prepare(
        `INSERT INTO privileges
           (position, category, tag, title, description, subject, duration, legal_basis)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      legacyPrivileges.forEach((privilege, index) => {
        insert.run(
          index + 1,
          privilege.category,
          privilege.tag,
          privilege.title,
          privilege.description,
          privilege.subject,
          privilege.duration,
          privilege.legalBasis,
        );
      });
    },
  },
  {
    version: 6,
    name: "statutory documents",
    up: `
      /*
        The two statutory documents whose shape is neither a record list nor
        free prose: Markaz haqida and Vazifa va funksiyalar.

        ONE ROW EACH, keyed by name, with the whole document as validated
        JSON. The alternative — six normalised tables for three official
        names, seven duties and seven lettered function groups — would be
        joined back together on every read and never queried into separately.
        See src/types/documents.ts for the schemas, and for why these are
        modelled rather than flattened into blocks.

        The org chart (src/content/structure.ts) is deliberately NOT here.
        It comes from the director's order, its nested reporting lines were
        read out of the source PDF's vector paths rather than guessed, and
        the operator asked for it to stay in code.
      */
      CREATE TABLE documents (
        key        TEXT NOT NULL PRIMARY KEY,
        data       TEXT NOT NULL,
        updated_at TEXT,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `,

    /*
      Copy both documents out of src/content/about.ts and duties.ts, verbatim.

      Shaped here to match the schemas in types/documents.ts rather than the
      modules' own export names, so the stored JSON is what the reader and the
      editor both expect. Those modules stay on disk as this seed's source.
    */
    seed(db) {
      const insert = db.prepare(
        "INSERT INTO documents (key, data) VALUES (?, ?)",
      );

      insert.run(
        "about",
        JSON.stringify({
          establishmentOrder: legacyAbout.establishmentOrder,
          establishment: legacyAbout.establishment,
          officialNaming: legacyAbout.officialNaming,
        }),
      );

      insert.run(
        "duties",
        JSON.stringify({
          order: legacyDuties.dutiesOrder,
          duties: {
            heading: legacyDuties.dutiesHeading,
            intro: legacyDuties.dutiesIntro,
            items: legacyDuties.duties,
          },
          functions: {
            heading: legacyDuties.functionsHeading,
            intro: legacyDuties.functionsIntro,
            groups: legacyDuties.functionGroups,
          },
        }),
      );
    },
  },
  {
    version: 7,
    name: "menu placement",
    up: `
      /*
        Where a panel-created page appears in the site's menu.

        Until now a custom page was reachable only by typing its URL: the
        catch-all route served it, and nothing linked to it. A page nobody can
        navigate to is not published in any sense that matters to a citizen.

        menu_parent is either a key from mainNav in src/content/site.ts (the
        six institutional sections, which stay in code) or a key from
        menu_sections below (a section the operator invented). NULL means the
        page exists at its URL but is deliberately not in the menu — a policy
        document linked only from another page, for instance.

        NOT a foreign key, because the two possible targets live in two
        different places and only one of them is a table. An orphaned value —
        a section deleted while pages still point at it — is handled where the
        menu is assembled: the page simply drops out of the menu and keeps its
        URL. See lib/data/navigation.ts.
      */
      ALTER TABLE pages ADD COLUMN menu_parent TEXT;
      ALTER TABLE pages ADD COLUMN menu_position INTEGER NOT NULL DEFAULT 0;

      /*
        Top-level menu sections the operator adds themselves.

        The six that ship in src/content/site.ts are the portal's information
        architecture and stay in code — they were laid out deliberately, they
        carry translated labels from messages/nav, and a state portal whose
        top-level navigation can be rearranged by accident is worse off for
        it. What this table adds is the ability to append a NEW section
        alongside them.

        Labels are three columns rather than a translations table: a menu
        label is one short string, there are at most a handful of these rows,
        and ru/en are NULL when untranslated so the same Uzbek fallback the
        rest of the site uses applies without a join.

        A section with no pages under it renders nothing at all — see the
        note in lib/data/navigation.ts about why an empty section is skipped
        rather than shown as a dead menu entry.
      */
      CREATE TABLE menu_sections (
        key        TEXT    NOT NULL PRIMARY KEY,
        label_uz   TEXT    NOT NULL,
        label_ru   TEXT,
        label_en   TEXT,
        position   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `,
  },
];

export function migrate(db: Database): void {
  const current = (db.pragma("user_version", { simple: true }) as number) ?? 0;

  for (const migration of migrations) {
    if (migration.version <= current) continue;

    /*
      `db.transaction()` wraps the callback in BEGIN/COMMIT and rolls back on
      a throw. The `user_version` bump is INSIDE it, so a migration that fails
      halfway leaves the file at its previous version and can be retried once
      the cause is fixed — rather than being skipped for ever because the
      counter moved before the statements ran.

      It is set with a template literal because PRAGMA does not accept bound
      parameters; the value is an integer literal from the table above, never
      anything a request can influence.
    */
    db.transaction(() => {
      db.exec(migration.up);
      migration.seed?.(db);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
}

/** Highest migration this build knows about — surfaced on the admin health view. */
export const SCHEMA_VERSION = migrations[migrations.length - 1].version;
