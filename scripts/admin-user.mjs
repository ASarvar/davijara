#!/usr/bin/env node
/*
  Break-glass account tool — for the server, not for daily use.

  Everything here is also possible from the panel itself, EXCEPT the one case
  the panel cannot help with: the last remaining administrator has forgotten
  their password. There is deliberately no "forgot password" e-mail flow (the
  Markaz has no outbound mail configured, and adding one would put a password
  reset behind an inbox), so recovery is a person with shell access on the
  box. That person is this script's only audience.

    node scripts/admin-user.mjs list
    node scripts/admin-user.mjs create <login> "<Ism Familiya>" <admin|editor>
    node scripts/admin-user.mjs passwd <login>
    node scripts/admin-user.mjs disable <login>
    node scripts/admin-user.mjs enable  <login>

  The password is read from STDIN, never from an argument — a command line is
  visible in `ps` output and lands in the shell history file:

    node scripts/admin-user.mjs passwd admin < /dev/null   # generates one
    echo -n 'uzun-parol-ibora' | node scripts/admin-user.mjs passwd admin

  With nothing on stdin it generates a strong password and prints it once.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE HASH FORMAT IS DUPLICATED FROM src/lib/auth/password.ts, ON PURPOSE. │
  │                                                                          │
  │ That module starts with `import "server-only"`, which throws outside a   │
  │ Next.js server — so it cannot be imported here, and the alternatives     │
  │ (running the tool through an experimental TypeScript loader) would make  │
  │ the ONE tool that has to work when everything else is broken depend on   │
  │ the build toolchain. Ten duplicated lines with no dependencies is the    │
  │ more reliable trade.                                                     │
  │                                                                          │
  │ ⚠ The parameters and the `scrypt$N$r$p$salt$key` layout below MUST stay  │
  │ identical to password.ts. If you change them there, change them here —   │
  │ a mismatch produces a hash the site cannot verify, and the symptom is a  │
  │ correct password being rejected with no error anywhere.                  │
  └──────────────────────────────────────────────────────────────────────────┘

  It talks to the database file directly and does NOT write to audit_log:
  every row in that table names a person who was signed in, and this tool
  runs as root on a console with nobody signed in. A shell-level change shows
  up as a password that suddenly works — the audit trail for that is the
  server's own access log, not a row claiming to be a user action.
*/

import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

// ── keep in step with src/lib/auth/password.ts ──────────────────────────────
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 192 * N * R;
const PASSWORD_MIN_LENGTH = 12;

function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}
// ────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Find the database the same way lib/db/index.ts does.
 *
 * `.env` is parsed by hand rather than with a dotenv dependency — this script
 * has to run from a bare `node` on a server where `npm install` may be the
 * very thing that is broken.
 */
function databasePath() {
  const env = {};
  const envFile = join(ROOT, ".env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const explicit = process.env.DATABASE_PATH ?? env.DATABASE_PATH;
  if (explicit) return explicit;

  const dataDir = process.env.DATA_DIR ?? env.DATA_DIR ?? join(ROOT, ".data");
  return join(dataDir, "davijara.db");
}

function readStdin() {
  try {
    // fd 0; throws EAGAIN when nothing is piped and the terminal is idle.
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function generatePassword() {
  /*
    Unambiguous alphabet: no O/0, no l/1/I. This password gets read off a
    terminal and typed into a browser, often by two different people over the
    phone, and a homoglyph there costs a support call.
  */
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(24);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function openDb() {
  const file = databasePath();
  if (!existsSync(file)) {
    fail(
      `Baza topilmadi: ${file}\n` +
        `  DATA_DIR yoki DATABASE_PATH ni tekshiring (.env), yoki avval saytni bir marta oching.`,
    );
  }
  const db = new Database(file);
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  return db;
}

function requireUserRow(db, username) {
  const row = db
    .prepare("SELECT id, username, role, is_active FROM users WHERE username = ?")
    .get(username.toLowerCase());
  if (!row) fail(`Bunday foydalanuvchi yoʻq: ${username}`);
  return row;
}

/** Resolve the new password from stdin, or generate one. */
function resolveNewPassword() {
  const piped = readStdin().replace(/\r?\n$/, "");
  if (piped.length === 0) {
    const generated = generatePassword();
    console.log(`\n  Yangi parol:  ${generated}\n`);
    console.log("  Bu parol boshqa hech qayerda saqlanmaydi — hozir nusxa oling.");
    console.log("  Kirgandan soʻng panelda oʻzingizning parolingizga almashtiring.\n");
    return generated;
  }
  if (piped.normalize("NFKC").length < PASSWORD_MIN_LENGTH) {
    fail(`Parol kamida ${PASSWORD_MIN_LENGTH} ta belgi boʻlishi kerak.`);
  }
  return piped;
}

const [command, ...args] = process.argv.slice(2);
const db = openDb();

switch (command) {
  case "list": {
    const rows = db
      .prepare(
        `SELECT username, full_name, role, is_active, created_at, last_login_at
           FROM users ORDER BY id`,
      )
      .all();
    if (rows.length === 0) {
      console.log("Foydalanuvchilar yoʻq. /admin/setup sahifasini oching.");
      break;
    }
    for (const r of rows) {
      const state = r.is_active ? "faol" : "oʻchirilgan";
      const seen = r.last_login_at ?? "hech qachon";
      console.log(
        `${r.username.padEnd(18)} ${r.role.padEnd(7)} ${state.padEnd(12)} ${r.full_name}  (oxirgi kirish: ${seen})`,
      );
    }
    break;
  }

  case "create": {
    const [username, fullName, role] = args;
    if (!username || !fullName || !role) {
      fail('Foydalanish: create <login> "<Ism Familiya>" <admin|editor>');
    }
    if (!/^[a-z0-9_-]{3,32}$/.test(username)) {
      fail("Login 3–32 ta belgi: kichik lotin harflari, raqamlar, _ va - .");
    }
    if (role !== "admin" && role !== "editor") {
      fail("Rol faqat 'admin' yoki 'editor' boʻlishi mumkin.");
    }
    const exists = db
      .prepare("SELECT 1 FROM users WHERE username = ?")
      .get(username);
    if (exists) fail(`Bu login band: ${username}`);

    const password = resolveNewPassword();
    db.prepare(
      `INSERT INTO users (username, full_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
    ).run(
      username,
      fullName,
      hashPassword(password),
      role,
      new Date().toISOString(),
    );
    console.log(`✔ Yaratildi: ${username} (${role})`);
    break;
  }

  case "passwd": {
    const [username] = args;
    if (!username) fail("Foydalanish: passwd <login>");
    const user = requireUserRow(db, username);

    const password = resolveNewPassword();
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashPassword(password),
      user.id,
    );
    /*
      Every existing session for this account is destroyed. A password reset
      that leaves the old sessions alive does not lock anyone out — which is
      the entire point when the reason for the reset is a suspected
      compromise.
    */
    const gone = db
      .prepare("DELETE FROM sessions WHERE user_id = ?")
      .run(user.id).changes;
    console.log(`✔ Parol yangilandi: ${user.username} (${gone} ta sessiya yopildi)`);
    break;
  }

  case "disable":
  case "enable": {
    const [username] = args;
    if (!username) fail(`Foydalanish: ${command} <login>`);
    const user = requireUserRow(db, username);
    const active = command === "enable" ? 1 : 0;

    if (!active && user.role === "admin") {
      const others = db
        .prepare(
          "SELECT COUNT(*) AS n FROM users WHERE role='admin' AND is_active=1 AND id != ?",
        )
        .get(user.id).n;
      /*
        Refuse to disable the last administrator. Doing so locks the panel
        for everyone with no way back in except this script — and someone
        reaching for `disable` is usually not expecting to need it again
        five seconds later.
      */
      if (others === 0) fail("Bu yagona faol administrator — oʻchirib boʻlmaydi.");
    }

    db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(
      active,
      user.id,
    );
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    console.log(`✔ ${user.username}: ${active ? "faollashtirildi" : "oʻchirildi"}`);
    break;
  }

  default:
    console.log(
      [
        "Davijara boshqaruv paneli — foydalanuvchilar bilan ishlash",
        "",
        "  node scripts/admin-user.mjs list",
        '  node scripts/admin-user.mjs create <login> "<Ism Familiya>" <admin|editor>',
        "  node scripts/admin-user.mjs passwd <login>",
        "  node scripts/admin-user.mjs disable <login>",
        "  node scripts/admin-user.mjs enable  <login>",
        "",
        "Parol stdin orqali beriladi. Hech narsa berilmasa, kuchli parol yaratiladi:",
        "  echo -n 'uzun-parol-ibora' | node scripts/admin-user.mjs passwd admin",
        "",
        `Baza: ${databasePath()}`,
      ].join("\n"),
    );
}

db.close();
