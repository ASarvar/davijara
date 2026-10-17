import { site } from "@/content/site";
import { withBasePath } from "@/lib/base-path";
import {
  AUCTION_WINDOW_KEY,
  FILTER_KEYS,
  SOLD_FROM_KEY,
  SOLD_TO_KEY,
} from "@/lib/data/listings";
import { MARKET_KEY, VIEW_KEY } from "@/lib/listings-view";

/*
  robots.txt — a Route Handler rather than app/robots.ts, for ONE directive:
  Yandex's `Clean-param`, which Next's typed Robots object cannot emit.

  WHY CLEAN-PARAM. The catalogue, the homepage map and the contract register
  are filtered through the URL (?hudud=&tuman=&narx=…, ?sahifa=2, ?q=…), so
  every combination is a crawlable address with near-identical content.
  Google is told which one counts by each page's canonical (lib/seo.ts).
  Yandex honours canonicals too, but `Clean-param` is its own, stronger
  instruction: "these parameters do not change the document — fold every
  such URL into the one without them", which also stops it spending its
  crawl budget on thousands of filter permutations.

  TWO GROUPS, deliberately. A crawler obeys only the MOST SPECIFIC group that
  names it, so a `User-agent: Yandex` group must repeat every Disallow of the
  `*` group or Yandex would be allowed into /admin. Clean-param sits only in
  the Yandex group so Google's robots.txt report shows no unknown directive.

  The admin Disallow is belt and braces — the binding instruction is
  `robots: { index: false }` in app/admin/layout.tsx.
*/

/** Query parameters that filter or page a view — never a different page. */
const VIEW_PARAMS = [
  ...FILTER_KEYS,
  AUCTION_WINDOW_KEY,
  VIEW_KEY,
  MARKET_KEY,
  SOLD_FROM_KEY,
  SOLD_TO_KEY,
  "sahifa", // pager, objects-explorer + catalogue
  "q", // free-text search, /ijara-shartnomalari
  "davr", // period select, /malumotlar/ochiq-malumotlar
];

const DISALLOW = [
  // Internal design reference — should never surface in search results.
  ...["uz", "ru", "en"].map((l) => withBasePath(`/${l}/styleguide`)),
  withBasePath("/admin"),
];

function group(userAgent: string, extra: string[] = []): string {
  return [
    `User-Agent: ${userAgent}`,
    `Allow: ${withBasePath("/")}`,
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    ...extra,
  ].join("\n");
}

export function GET(): Response {
  const body = [
    group("*"),
    group("Yandex", [`Clean-param: ${VIEW_PARAMS.join("&")}`]),
    `Sitemap: ${site.url}/sitemap.xml`,
  ].join("\n\n");

  return new Response(`${body}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
