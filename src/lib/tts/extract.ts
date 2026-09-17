import "server-only";

import { TTS_BLOCK_TAGS } from "@/lib/tts/chunks";

/*
  The page's readable blocks, taken from its HTML.

  A SECOND IMPLEMENTATION OF A RULE THAT LIVES IN THE PLAYER, and the reason
  is unavoidable: the browser walks a DOM and reads `innerText`, and the
  server has a string of markup and no DOM. What it must NOT differ on is the
  splitting — a chunk warmed here has to be the same chunk the reader's
  browser later asks for, or the cache is warmed with audio nobody ever
  requests. So both sides call `splitIntoChunks`, and the cache is keyed on
  text with whitespace removed and case folded, which is what absorbs the
  small differences between rendered text and markup.

  The rules follow what a reader can select and have read: the same tags,
  innermost only, and nothing from <nav>, from a `data-tts-skip` subtree or
  from anything hidden from assistive technology. The reader splits a
  selection at block boundaries, so a selected whole paragraph asks for the
  same chunk this produced.
*/

const TAGS = TTS_BLOCK_TAGS.split(",");
const BLOCK_RE = new RegExp(
  `<(${TAGS.join("|")})\\b[^>]*>([\\s\\S]*?)</\\1>`,
  "gi",
);
const NESTED_RE = new RegExp(`<(${TAGS.join("|")})\\b`, "i");

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  shy: "",
};

/** Turns markup entities back into the characters a reader would see. */
export function decodeEntities(value: string): string {
  return value.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
    (entity, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X")) {
        return String.fromCodePoint(parseInt(body.slice(2), 16));
      }
      if (body.startsWith("#")) {
        return String.fromCodePoint(parseInt(body.slice(1), 10));
      }
      const named = NAMED_ENTITIES[body.toLowerCase()];
      return named === undefined ? entity : named;
    },
  );
}

/** Everything inside tags, with the tags themselves removed. */
export function stripTags(html: string): string {
  return html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function blocksFromHtml(html: string): string[] {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) return [];

  /*
    Whole subtrees dropped before anything is matched.

    `aria-hidden` is narrowed to the elements that actually carry it on this
    site — icons, icon buttons, decorative spans. Written as "any element", it
    swallowed 48 000 characters of the homepage in a single non-greedy bite,
    and a block wrongly dropped here is worse than one wrongly kept: kept
    costs a few characters of synthesis, dropped costs a reader a live call.
  */
  const body = withoutUnreadable(
    main.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " "),
  );

  const blocks: string[] = [];
  collect(body, blocks, 0);
  return blocks;
}

/*
  The markup with everything the reader never speaks taken out: scripts, any
  `data-tts-skip` subtree (the ticking auction countdown above all), and what
  is hidden from assistive technology.

  SHARED WITH /api/tts's page check, and it has to be. The reader removes the
  same things from a selection before sending it, so a selected card arrives
  as "…Savdo boshlanishiga" followed directly by the next card's title. Left
  in here, the countdown would sit between those words on the server's copy
  of the page and a perfectly genuine selection would be refused.
*/
export function withoutUnreadable(html: string): string {
  return html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z0-9]+)\b[^>]*\bdata-tts-skip\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(
      /<(svg|button|span|i)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi,
      " ",
    );
}

/*
  RECURSES INTO A BLOCK THAT CONTAINS BLOCKS, and this is the difference
  between warming the site and warming a twentieth of it. `matchAll` consumes
  what it matches, so an <li> wrapping three <p>s is ONE match — and simply
  skipping it, as the first version did, threw those three paragraphs away
  with it. On the homepage that left 35 blocks where the player reads 180.

  The depth cap guards against pathological markup rather than expressing a
  rule: six levels of nested prose containers do not occur here.
*/
function collect(html: string, out: string[], depth: number): void {
  for (const match of html.matchAll(BLOCK_RE)) {
    const inner = match[2];

    if (NESTED_RE.test(inner)) {
      if (depth < 6) collect(inner, out, depth + 1);
      continue;
    }

    const text = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  }
}
