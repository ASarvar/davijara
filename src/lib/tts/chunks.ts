/*
  How a page is cut into things that can be spoken, and how a request's text
  is compared against the page it claims to come from.

  CLIENT-SAFE, and read from both sides on purpose: the player walks the DOM
  with `TTS_BLOCK_SELECTOR` and splits with `splitIntoChunks`, and the API
  route re-derives the same normalisation to check that what it is asked to
  synthesise is actually written on the page.
*/

/*
  The elements that carry the page's prose, in document order.

  Headings are included because they are how a listener knows where they are —
  a reading that skipped them would be a wall of paragraphs. Table cells are
  NOT here: a rate table read left to right, cell after cell, is noise, and
  /statistika prints its figures as tables precisely so they can be READ
  rather than heard.

  `[data-tts-skip]` is the escape hatch for anything a page knows is not worth
  speaking, and the player also drops its own controls.
*/
export const TTS_BLOCK_TAGS = "h1,h2,h3,h4,p,li,blockquote,dt,dd,figcaption";

/** The same tags, but only inside the page's own content. */
export const TTS_BLOCK_SELECTOR = TTS_BLOCK_TAGS.split(",")
  .map((tag) => `main ${tag}`)
  .join(", ");

/*
  Azure takes far longer inputs than this; the limit is about LATENCY, not the
  service. A chunk is fetched, then played, and the reader waits for the first
  one — so chunks are kept to roughly a long paragraph, and the next one is
  fetched while the current is still speaking.
*/
export const MAX_CHUNK_CHARS = 480;

/**
 * Splits one block's text into pieces small enough to synthesise.
 *
 * SENTENCE FIRST, and a hard cut only when a single sentence is longer than
 * the limit — a cut mid-sentence is audible, and on this site the long
 * sentences are legal ones, where the break would land inside a decree's
 * title.
 */
export function splitIntoChunks(
  text: string,
  limit = MAX_CHUNK_CHARS,
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];

  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;

    if (piece.length > limit) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // A sentence longer than the limit: cut at the last space that fits, so
      // the break lands between words rather than inside one.
      let rest = piece;
      while (rest.length > limit) {
        const cut = rest.lastIndexOf(" ", limit);
        const at = cut > limit / 2 ? cut : limit;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) current = rest;
      continue;
    }

    if (!current) current = piece;
    else if (current.length + 1 + piece.length <= limit) current += ` ${piece}`;
    else {
      chunks.push(current);
      current = piece;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * The comparison form used to check a chunk against its page.
 *
 * WHITESPACE IS DROPPED ENTIRELY, not just collapsed. The browser's
 * `innerText` and the server's HTML disagree about spacing in ways that are
 * invisible to a reader and fatal to a substring test — a line break inside a
 * <p>, a space either side of an inline <a>, a non-breaking space in a
 * formatted number. What is left still contains every word and every mark of
 * punctuation, so the check stays meaningful.
 *
 * Case is folded and the text is NFKC-normalised, because the same apostrophe
 * arrives as ' or ʼ depending on which editor typed it.
 */
export function comparisonForm(text: string): string {
  return text.normalize("NFKC").replace(/\s+/gu, "").toLowerCase();
}
