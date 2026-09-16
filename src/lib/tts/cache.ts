import "server-only";

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import type { TtsAudio } from "@/lib/tts/provider";

/*
  Speech already made, kept so it is not paid for or waited on twice.

  THIS IS WHAT MAKES THE FEATURE AFFORDABLE. The site's readable text is about
  31 500 characters in Uzbek — measured across the 24 pages in the sitemap —
  so the whole portal, in all three languages, is roughly 95 000 characters.
  Synthesised once, that is a one-off; without a cache it would be that much
  again for every reader who pressed play, and on a metered provider that is
  a bill that scales with how useful the feature turns out to be.

  BESIDE THE DATABASE, in DATA_DIR: the one directory that survives a
  deployment and is writable by the service account. Nothing here is precious
  — every file can be regenerated from the text it was made from — so a lost
  cache costs money and latency, not data.
*/

const CACHE_DIR = join(
  process.env.DATA_DIR ?? join(process.cwd(), ".data"),
  "tts",
);

/*
  A ceiling, swept when it is crossed. The whole site in mp3 is a few tens of
  megabytes; a provider that answers in WAV needs roughly eight times that, so
  this is sized for the worse case and still bounded enough that a crawler
  cannot fill the disk.
*/
const CACHE_MAX_BYTES = 256 * 1024 * 1024;

const EXTENSIONS: Record<TtsAudio["contentType"], string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};
const TYPES: Record<string, TtsAudio["contentType"]> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/**
 * A stable name for one rendering of one text.
 *
 * The provider and the voice are both in the key. The same paragraph read by
 * Sardor and by Madina are two different files, and so would be the same text
 * rendered by a different service — switching provider must not serve the old
 * one's audio out of cache.
 */
export function cacheKey(
  provider: string,
  voice: string,
  text: string,
): string {
  return createHash("sha256")
    .update(`${provider}\u0000${voice}\u0000${text}`)
    .digest("hex");
}

export async function readCached(key: string): Promise<TtsAudio | null> {
  for (const [ext, contentType] of Object.entries(TYPES)) {
    try {
      const audio = await readFile(join(CACHE_DIR, `${key}.${ext}`));
      return { audio, contentType };
    } catch {
      // Not this format; try the next.
    }
  }
  return null;
}

export async function writeCached(key: string, value: TtsAudio): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(
      join(CACHE_DIR, `${key}.${EXTENSIONS[value.contentType]}`),
      value.audio,
    );
    await sweep();
  } catch (error) {
    // A cache that cannot be written is a slower site, not a broken one.
    console.warn(
      "[tts] cache write failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

/*
  Oldest first, until the directory is back under the ceiling. Called after a
  write rather than on a timer: the only moment the cache can grow is the
  moment something was added to it.
*/
async function sweep(): Promise<void> {
  const names = await readdir(CACHE_DIR);
  const files = await Promise.all(
    names
      .filter((name) => /\.(mp3|wav)$/.test(name))
      .map(async (name) => {
        const path = join(CACHE_DIR, name);
        const info = await stat(path);
        return { path, size: info.size, at: info.mtimeMs };
      }),
  );

  let total = files.reduce((sum, file) => sum + file.size, 0);
  if (total <= CACHE_MAX_BYTES) return;

  for (const file of files.sort((a, b) => a.at - b.at)) {
    if (total <= CACHE_MAX_BYTES) break;
    try {
      await unlink(file.path);
      total -= file.size;
    } catch {
      // Already gone, or held open — the next sweep will see it.
    }
  }
}
