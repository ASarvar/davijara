import { z } from "zod";

/*
  The block model — what an editor actually composes a news item or a page out
  of.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ EVERY BLOCK STORES PLAIN TEXT. NO HTML, ANYWHERE, EVER.                  │
  │                                                                          │
  │ This is the whole reason the operator was offered blocks instead of a    │
  │ CKEditor-style rich text box (which is what the legacy site used, storing │
  │ raw HTML under a column misleadingly named `markdown`). Two consequences, │
  │ both of which matter more on a state portal than editing convenience:    │
  │                                                                          │
  │   XSS is not a risk that has to be MANAGED, it is a risk that does not   │
  │   EXIST. React escapes every string it renders. There is no              │
  │   `dangerouslySetInnerHTML` behind any of this, so there is no sanitiser │
  │   to keep up to date and no sanitiser bypass to worry about. An editor   │
  │   who pastes `<script>` publishes the literal characters `<script>`.     │
  │                                                                          │
  │   The design cannot drift. A heading renders through the site's own      │
  │   tokens and type scale; it cannot arrive carrying `style="color:red"`   │
  │   from a paste out of Word. Non-negotiable 2 in CLAUDE.md — components   │
  │   consume semantic tokens — stays true for content nobody reviewed.      │
  │                                                                          │
  │ If a future block genuinely needs inline emphasis, add a structured      │
  │ field for it (`emphasis: [{ start, end }]`) or a new block type. Do not  │
  │ add an HTML field. That is the door this design exists to keep shut.     │
  └──────────────────────────────────────────────────────────────────────────┘

  STORED AS JSON in a TEXT column. SQLite has no array type, and the shape is
  read and written whole — never queried into — so a JSON document is the
  honest representation. `parseBlocks()` below is the only way it is read
  back, and it validates rather than trusting the column.
*/

const MAX_TEXT = 5000;
const MAX_ITEMS = 100;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1).max(MAX_TEXT),
  }),
  z.object({
    type: z.literal("heading"),
    /*
      2 or 3 only. The page's own <h1> is the article title, so a heading
      inside the body starts at <h2>; allowing <h1> here would put two of
      them on the page and break the document outline for a screen reader.
      Nothing below <h3> — a body that needs four levels needs to be two
      pages.
    */
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(z.string().min(1).max(MAX_TEXT)).min(1).max(MAX_ITEMS),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().min(1).max(MAX_TEXT),
    /** Who said it. Optional — an unattributed pull-quote is legitimate. */
    cite: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string().max(200)).min(1).max(8),
    rows: z.array(z.array(z.string().max(1000)).max(8)).max(200),
  }),
  z.object({
    type: z.literal("image"),
    /*
      A PATH, not markup and not a data URI. In practice `/api/media/<hash>`
      from the upload store, but a file in public/ or an external https URL is
      also legitimate, so this is not narrowed to the media route — see the
      note on the media table in migrate.ts for why the same looseness is in
      the schema.

      `mediaSrc()` is what turns it into an src at render time; nothing stores
      the basePath, so the site can be re-mounted without rewriting content.
    */
    src: z.string().min(1).max(500),
    /*
      REQUIRED, and may be the empty string.

      Those are different statements. An image inside an article body is often
      illustrative, and `alt=""` is the CORRECT markup for that — it tells a
      screen reader to skip an element that carries no information. What is
      wrong is omitting the attribute, which makes assistive software fall
      back to announcing the filename. Making the field required-but-emptiable
      is how the editor is asked the question every time without being forced
      to invent an answer.
    */
    alt: z.string().max(300),
    caption: z.string().max(300).optional(),
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export const blocksSchema = z.array(blockSchema).max(300);

/**
 * Read a blocks column.
 *
 * Returns `[]` for anything unparseable rather than throwing. The alternative
 * is that one malformed row — a hand-edited database, a half-finished
 * migration — takes down the public news page for every reader. An article
 * that renders its title and no body is a bad day; a 500 on a government
 * portal is a different kind of day.
 */
export function parseBlocks(json: string | null | undefined): Block[] {
  if (!json) return [];
  try {
    const parsed = blocksSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Uzbek labels for the editor's "add block" menu. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Xatboshi",
  heading: "Sarlavha",
  list: "Roʻyxat",
  quote: "Iqtibos",
  table: "Jadval",
  image: "Rasm",
};

/** A new block of the given type, with the minimum a valid one needs. */
export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "list":
      return { type: "list", ordered: false, items: [""] };
    case "quote":
      return { type: "quote", text: "" };
    case "table":
      return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "image":
      return { type: "image", src: "", alt: "" };
  }
}

/**
 * Plain text of a block, for excerpts and search.
 *
 * Deliberately lossy: it flattens structure to a single string and is not a
 * reversible representation of the block.
 */
export function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "table":
      return [block.headers, ...block.rows].flat().join(" ");
    case "image":
      /* The caption and alt are words; the src is a path and is not text. */
      return [block.caption, block.alt].filter(Boolean).join(" ");
  }
}
