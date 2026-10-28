#!/usr/bin/env node
/*
  IndexNow: tell Yandex (and, through the shared protocol, Bing) which pages
  exist or changed, instead of waiting for their robots to come round.

  WHY: on 27.10.2026 Google had davijara.uz indexed and Yandex still showed
  nothing for "davijara.uz" — its crawler visits new sites rarely, and a
  sitemap only says where pages are, not that anything is new. IndexNow is
  Yandex's own push channel: one POST, and the listed URLs are queued for a
  crawl.

  THE KEY is public by design — the protocol proves you own the host by
  serving it at keyLocation. It lives in public/<key>.txt (32 hex chars), and
  this script reads it from there, so there is one copy of it and nothing to
  keep in .env.

  Usage (after a deploy, from any machine that can reach the internet):

    npm run indexnow                    # every URL in the live sitemap
    npm run indexnow -- --dry-run       # print what would be sent
    npm run indexnow -- https://davijara.uz/uz/yangiliklar/...   # just these

  Sends nothing on --dry-run. Exits non-zero if an endpoint refuses, with the
  status, so a deploy log shows it.
*/
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://davijara.uz";
const ENDPOINTS = [
  "https://yandex.com/indexnow",
  "https://api.indexnow.org/indexnow",
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keyFile = readdirSync(join(root, "public")).find((f) =>
  /^[0-9a-f]{32}\.txt$/.test(f),
);
if (!keyFile) {
  console.error("No IndexNow key file (public/<32 hex>.txt) found.");
  process.exit(1);
}
const key = readFileSync(join(root, "public", keyFile), "utf8").trim();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
let urls = args.filter((a) => a.startsWith("http"));

if (urls.length === 0) {
  const res = await fetch(`${SITE}/sitemap.xml`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.error(`sitemap.xml answered ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
urls = [...new Set(urls)].filter((u) => u.startsWith(`${SITE}/`));
if (urls.length === 0) {
  console.error("No davijara.uz URLs to submit.");
  process.exit(1);
}

const body = {
  host: new URL(SITE).host,
  key,
  keyLocation: `${SITE}/${keyFile}`,
  // The protocol allows up to 10 000 per request; the site is far below it.
  urlList: urls.slice(0, 10_000),
};

console.log(`${urls.length} URL(s), key file ${body.keyLocation}`);
if (dryRun) {
  for (const u of body.urlList) console.log(`  ${u}`);
  process.exit(0);
}

let failed = false;
for (const endpoint of ENDPOINTS) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    // 200 and 202 are both success: 202 means "key not verified yet".
    const ok = res.status === 200 || res.status === 202;
    console.log(
      `${endpoint}: ${res.status}${ok ? "" : ` ${await res.text()}`}`,
    );
    if (!ok) failed = true;
  } catch (error) {
    console.log(
      `${endpoint}: ${error instanceof Error ? error.message : error}`,
    );
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
