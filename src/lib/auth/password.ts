import "server-only";

import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password.client";

/*
  `promisify` resolves to scrypt's THREE-argument overload, which drops the
  options object — and the options are where N, r, p and maxmem live, so
  without this cast every call would silently fall back to Node's defaults
  (N = 16384, and a 32 MB memory cap that the parameters below exceed).
  Typed explicitly rather than left inferred.
*/
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/*
  Password hashing — scrypt, from Node's own crypto module.

  NO DEPENDENCY ON PURPOSE. bcrypt and argon2 are both native modules, and
  this project has already been bitten once by a native binary that loaded and
  then segfaulted (see the note in lib/db/index.ts, and the "Bus error" row in
  DEPLOY.md). scrypt is a memory-hard KDF built into Node, it is on OWASP's
  list of acceptable password algorithms, and it cannot break on a Node
  upgrade because it ships with Node.

  THE PARAMETERS ARE A DELIBERATE COMPROMISE WITH THE HARDWARE.

  Cost is `N`, and memory used is roughly `128 * N * r` bytes:

      N = 2^17  →  ~134 MB   OWASP's headline recommendation
      N = 2^15  →   ~34 MB   what this uses
      N = 2^14  →   ~17 MB   the floor OWASP still accepts

  The production box has one CPU and little RAM (DEPLOY.md). A 134 MB
  allocation per login on that machine is a real risk of pushing the Next.js
  process into swap — and the failure mode of that is the whole public site
  getting slow, not just a slow login. 2^15 sits above OWASP's floor, costs
  about a tenth of a second, and only ever runs for a handful of editors
  signing in a few times a day. It is not sized for a consumer login wall.

  `maxmem` must be raised explicitly: Node's default cap is 32 MB, which 2^15
  exceeds, and the call would throw rather than silently use less memory.

  THE HASH IS SELF-DESCRIBING: `scrypt$N$r$p$salt$key`, all base64url. The
  parameters travel with the hash, so raising N later does not invalidate
  existing passwords — an old hash still verifies with its own parameters, and
  `needsRehash()` says which ones to upgrade on next successful login.
*/

const N = 2 ** 15;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Headroom over `128 * N * r` so scrypt's own working memory fits too. */
const MAX_MEM = 192 * N * r;

function b64(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: MAX_MEM,
  });

  return ["scrypt", N, r, p, b64(salt), b64(key)].join("$");
}

/**
 * Constant-time verification.
 *
 * Returns false rather than throwing on a malformed stored hash: a corrupted
 * row must fail the login, not crash the login route for everyone.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const [, nRaw, rRaw, pRaw, saltRaw, keyRaw] = parts;
    const storedN = Number(nRaw);
    const storedR = Number(rRaw);
    const storedP = Number(pRaw);
    if (!storedN || !storedR || !storedP) return false;

    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(keyRaw, "base64url");

    const actual = await scryptAsync(
      password.normalize("NFKC"),
      salt,
      expected.length,
      {
        N: storedN,
        r: storedR,
        p: storedP,
        maxmem: Math.max(MAX_MEM, 192 * storedN * storedR),
      },
    );

    // Lengths are equal by construction above, but timingSafeEqual throws on
    // a mismatch, so this stays defensive.
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash used weaker parameters than this build's. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < N || Number(parts[2]) < r || Number(parts[3]) < p;
}

/*
  Password rules.

  The two lengths live in `password.client.ts` and are re-exported here, so a
  form's `minLength` attribute and this validator can never disagree — see
  that file for why the split exists and what may not be put in it.
*/
export { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH };

/** The few passwords that a 12-character minimum would otherwise wave through. */
const OBVIOUS = new Set([
  "parolparol",
  "123456789012",
  "qwertyqwerty",
  "davijaradavijara",
  "administrator",
  "parol1234567",
]);

export function passwordProblem(password: string): string | null {
  const value = password.normalize("NFKC");
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgidan iborat boʻlishi kerak.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Parol juda uzun (koʻpi bilan ${PASSWORD_MAX_LENGTH} ta belgi).`;
  }
  if (OBVIOUS.has(value.toLowerCase())) {
    return "Bu parol juda oson topiladi. Boshqa parol tanlang.";
  }
  return null;
}
