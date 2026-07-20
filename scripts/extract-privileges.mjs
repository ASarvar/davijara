/*
  One-off migration script — extracts the 24 statutory rent privileges out of
  legacy/imtiyozlar.html and emits src/content/privileges.ts.

  Why a script rather than hand-transcription: every record cites a real Uzbek
  legal act (PQ-239, PF-93, VM-626, PQ-3782 …). A typo in a citation on a
  government portal is a genuine defect, and 24 records x 7 fields is exactly
  the volume where manual copying goes wrong silently. Parsing is verifiable;
  retyping is not.

  Run:  node scripts/extract-privileges.mjs
  Delete once src/content/privileges.ts is reviewed and committed.
*/

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "legacy/imtiyozlar.html");
const OUT = resolve(root, "src/content/privileges.ts");

const VALID_CATEGORIES = ["ijtimoiy", "talim", "it", "boshqa"];
const EXPECTED_COUNT = 24;

/** Collapse the whitespace that hand-written HTML indentation introduces. */
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

const doc = parse(readFileSync(SRC, "utf8"));
const cards = doc.querySelectorAll(".privilege-card");

if (cards.length !== EXPECTED_COUNT) {
  throw new Error(
    `Expected ${EXPECTED_COUNT} privilege cards, found ${cards.length}. ` +
      `The source markup changed — re-check before trusting this output.`,
  );
}

const privileges = cards.map((card, i) => {
  const category = card.getAttribute("data-category");
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Card ${i + 1}: unknown data-category "${category}"`);
  }

  // The meta grid is three fixed cells: subject, duration, legal basis.
  // Match them by their <h5> label rather than by position, so a reordered
  // source can't silently swap a duration into a legal citation.
  const meta = {};
  for (const item of card.querySelectorAll(".privilege-meta-item")) {
    const label = clean(item.querySelector("h5")?.text);
    const value = clean(item.querySelector("p")?.text);
    meta[label] = value;
  }

  const pick = (label) => {
    const v = meta[label];
    if (!v) {
      throw new Error(
        `Card ${i + 1}: missing meta field "${label}" (found: ${Object.keys(meta).join(", ")})`,
      );
    }
    return v;
  };

  const record = {
    id: i + 1,
    category,
    tag: clean(card.querySelector(".privilege-tag")?.text),
    title: clean(card.querySelector("h4")?.text),
    description: clean(card.querySelector(".privilege-desc")?.text),
    subject: pick("Foydalanuvchi subyekt"),
    duration: pick("Davriylik"),
    legalBasis: pick("Asos"),
  };

  for (const [k, v] of Object.entries(record)) {
    if (v === "" || v == null) throw new Error(`Card ${i + 1}: empty field "${k}"`);
  }
  return record;
});

// Serialise as a .ts module rather than JSON so the union type is enforced at
// compile time and the data can never drift from the Privilege interface.
const body = privileges
  .map(
    (p) => `  {
    id: ${p.id},
    category: ${JSON.stringify(p.category)},
    tag: ${JSON.stringify(p.tag)},
    title: ${JSON.stringify(p.title)},
    description: ${JSON.stringify(p.description)},
    subject: ${JSON.stringify(p.subject)},
    duration: ${JSON.stringify(p.duration)},
    legalBasis: ${JSON.stringify(p.legalBasis)},
  },`,
  )
  .join("\n");

const file = `import type { Privilege } from "@/types/content";

/*
  AUTO-GENERATED from legacy/imtiyozlar.html by scripts/extract-privileges.mjs.

  This is statutory legal content. Do not reword, reformat, summarise, or
  machine-translate any field — \`legalBasis\` in particular cites binding Uzbek
  legal acts and must stay verbatim. Corrections should come from the source
  legislation, not from editing prose here.
*/

export const privileges: Privilege[] = [
${body}
];
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, file, "utf8");

const counts = privileges.reduce((acc, p) => {
  acc[p.category] = (acc[p.category] ?? 0) + 1;
  return acc;
}, {});

console.log(`✓ Extracted ${privileges.length} privileges -> src/content/privileges.ts`);
console.log("  Derived category counts:", counts);
console.log("  Legacy chip counts:      { ijtimoiy: 8, talim: 4, it: 3, boshqa: 9 }");
