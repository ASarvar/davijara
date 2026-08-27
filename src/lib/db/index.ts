import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import Database from "better-sqlite3";

import { migrate } from "./migrate";

/*
  The admin panel's database — one SQLite file, no daemon.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ WHY SQLITE, AND WHY THE FILE LIVES WHERE IT DOES.                        │
  │                                                                          │
  │ This site is not on a cloud platform: it runs from systemd on an         │
  │ internal box (see DEPLOY.md), one CPU and little RAM, behind two nginx   │
  │ hops. A Postgres or MySQL daemon on that machine would be a second       │
  │ service to install, tune, monitor and back up, for a workload of a few   │
  │ editors writing news. SQLite is a file: no port, no daemon, no memory    │
  │ floor, and a backup is a copy.                                           │
  │                                                                          │
  │ THE PATH IS THE PART THAT BITES. deploy.sh builds each release into      │
  │ `releases/<timestamp>/` and KEEPS ONLY THE LAST FIVE — anything written  │
  │ inside the release directory is deleted five deploys later. So the       │
  │ database (and uploads) must live in `shared/`, beside the .env that is   │
  │ already kept there for exactly this reason, and DATA_DIR must point at   │
  │ it in production. The dev fallback below is a local `.data/` folder,     │
  │ which is gitignored.                                                     │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE CONNECTION IS LAZY, AND THAT IS NOT AN OPTIMISATION.                 │
  │                                                                          │
  │ An earlier version opened the file at module scope:                      │
  │                                                                          │
  │     export const db = (globalThis.__db ??= open());                      │
  │                                                                          │
  │ …which meant merely IMPORTING this module opened the database and ran    │
  │ the migrations. `next build` collects page data with 23 parallel worker  │
  │ processes, every one of which imports the module graph — so 23 processes │
  │ raced to run CREATE TABLE against the same file and the build died with  │
  │ SQLITE_BUSY, on pages that are `force-dynamic` and were never going to   │
  │ query anything at build time.                                            │
  │                                                                          │
  │ Opening on first USE instead means importing costs nothing, and the file │
  │ is touched only by a request that actually needs a row. Call getDb()     │
  │ inside the function that queries — never hoist it to module scope, or    │
  │ the build breaks again in exactly the same way.                          │
  └──────────────────────────────────────────────────────────────────────────┘

  ONE CONNECTION, REUSED. better-sqlite3 is synchronous and the handle is
  cheap to keep open, but Next's dev server re-evaluates modules on every hot
  reload — so the handle is cached on `globalThis`, or dev would leak a file
  handle per edit until SQLite refused to open another.

  better-sqlite3 is PINNED TO ^12 deliberately. Version 13.0.3's prebuilt
  binary loads and then segfaults (0xC0000005) the moment a database is
  opened on Node 22 — the same class of native-binary failure DEPLOY.md
  already records as "Bus error". 12.11.1 was verified working here before
  anything was built on top of it. Do not bump this major without checking
  that `new Database(":memory:")` actually survives.
*/

const DEFAULT_DEV_DIR = join(process.cwd(), ".data");

function resolveDatabasePath(): string {
  const explicit = process.env.DATABASE_PATH;
  if (explicit) return explicit;

  const dataDir = process.env.DATA_DIR ?? DEFAULT_DEV_DIR;
  return join(dataDir, "davijara.db");
}

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ DURING `next build` THE DATABASE IS IN MEMORY, AND THE REAL FILE IS NOT  │
  │ TOUCHED AT ALL.                                                          │
  │                                                                          │
  │ Some routes are prerendered at build time — the 26 filled-in section     │
  │ pages, whose locale layout enumerates uz/ru/en — so the build renders    │
  │ components that call getDb(). On the server the build runs as the        │
  │ deploying user while the service runs as `davijara`, so a database file  │
  │ (or, just as bad, a -wal and -shm pair) created by the build is owned by │
  │ the wrong user, and the panel's first write fails with a permission      │
  │ error that nothing in the deploy output explains.                        │
  │                                                                          │
  │ An in-memory database sidesteps it completely: the migrations run, every │
  │ query is valid, and every one of them returns nothing. Those pages       │
  │ prerender as the "being prepared" placeholder and are replaced by real   │
  │ content on the first revalidation — which the panel triggers on publish, │
  │ and which their own `revalidate` window does anyway.                     │
  │                                                                          │
  │ No call site knows this happened. That is the point: a future page that  │
  │ reads the database can be prerendered without re-learning any of the     │
  │ above.                                                                   │
  └──────────────────────────────────────────────────────────────────────────┘
*/
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function open(): Database.Database {
  if (isBuildPhase()) {
    const memory = new Database(":memory:");
    memory.pragma("foreign_keys = ON");
    migrate(memory);
    return memory;
  }

  const file = resolveDatabasePath();
  mkdirSync(dirname(file), { recursive: true });

  const db = new Database(file);

  /*
    ORDER MATTERS HERE, and the first line is the one that fixes a real bug.

    `busy_timeout` must be set BEFORE anything that takes a lock. Setting
    `journal_mode = WAL` needs a brief exclusive lock on the file, so with the
    default zero timeout a second process doing the same thing at the same
    instant gets SQLITE_BUSY immediately rather than waiting the five seconds
    it would need. That is what turned a survivable race during `next build`
    into a hard failure.

    - `busy_timeout` — wait, don't throw, when another connection holds a
      lock. Also covers two editors pressing Save in the same instant.
    - `journal_mode = WAL` — a reader (a page being revalidated) and a writer
      (an editor saving) no longer block each other. Persistent: stored in the
      file, not the connection, but setting it every open is harmless and
      means a hand-restored backup gets it too.
    - `foreign_keys` — OFF by default in SQLite, and per-connection. Every
      ON DELETE CASCADE in the schema is inert without this line.
    - `synchronous = NORMAL` — the documented safe pairing with WAL: durable
      across a process crash, and only at risk from OS-level power loss,
      which on this box is a UPS question rather than a database one.
  */
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as {
  __davijaraDb?: Database.Database;
};

/*
  Migrations run once per MODULE EVALUATION, not once per handle — and the
  difference only shows up in development, where it is the difference between
  a new migration applying and appearing to do nothing.

  The handle is cached on `globalThis` so hot reload does not leak file
  handles. But that cache outlives the module: after an edit, this file is
  re-evaluated while `__davijaraDb` still points at the connection opened
  before the edit — so a migration added in that edit would never run, and the
  first query against the new table would fail with "no such table" on a
  schema that looks correct in the source. (Observed, while adding migration
  2 for the news tables.)

  A module-scoped flag fixes it: hot reload resets it, `migrate()` runs again
  against the existing handle, and it no-ops when the file is already current.
  In production the module evaluates once and this is exactly equivalent to
  migrating at open time.
*/
let migratedThisEvaluation = false;

/**
 * The database handle, opened on first call.
 *
 * Call this INSIDE the function that queries. Assigning it to a module-level
 * const re-creates the build failure described above.
 */
export function getDb(): Database.Database {
  const db = (globalForDb.__davijaraDb ??= open());

  if (!migratedThisEvaluation) {
    migratedThisEvaluation = true;
    migrate(db);
  }

  return db;
}

/** Where the file actually is — used by the backup docs and the health view. */
export function databasePath(): string {
  return resolveDatabasePath();
}

/** True once the schema exists and at least one admin can log in. */
export function isInstalled(): boolean {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1",
    )
    .get() as { n: number };
  return row.n > 0;
}
