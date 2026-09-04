#!/usr/bin/env node
/*
  Finds user-visible text written into a component instead of `messages/`.

    node scripts/check-hardcoded-strings.mjs          # report, exit 1 if any
    node scripts/check-hardcoded-strings.mjs --quiet  # exit code only

  WHY THIS EXISTS. A sweep in 2026-09 turned up ~50 hardcoded strings across 25
  files — an accessibility dialog and a rent-calculator label entirely in
  Uzbek, ten "hozircha kiritilmagan" empty states, chart labels, and
  `aria-label="Breadcrumb"` repeated in eighteen files. None of it was visible
  from `messages/`: every one of those pages already called `t()` for its
  headings, so the catalogue looked complete while a quarter of the page was
  not in it. That is the failure this guards against — not a missing
  translation, which the deep-merge in i18n/request.ts handles quietly, but a
  string the translator can never see because it is not in the catalogue at
  all.

  ARIA LABELS AND ALT TEXT COUNT. A screen reader speaks them, so they are as
  visible as body text; `aria-label="Breadcrumb"` is exactly the kind of thing
  that survives a review because nobody LOOKS at it. Hence PROPS below.

  WHAT IT CANNOT SEE, so do not read a clean run as proof of anything wider:

    · `src/content/*.ts` — the statutory material there is deliberately never
      translated (CLAUDE.md non-negotiable 1), so scanning it would be noise.
    · Menu section labels, which live in the `menu_sections` table and are
      filled in from the panel. A blank `label_ru` shows Uzbek on /ru and no
      amount of code scanning will find it — check /admin/menyu.
    · Anything assembled at runtime from data.

  It is a lint, not a test: heuristics, tuned so that a clean tree reports
  zero. If it flags something that is genuinely not user-visible text, widen
  the detector rather than the allowlist — ALLOW is for strings that really do
  reach the reader and really should stay as they are.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUIET = process.argv.includes("--quiet");

/* Directories whose strings are not translatable material. */
const SKIP_DIRS = [
  ["src/components/ui/", "shadcn CLI output — kept re-addable, see CLAUDE.md"],
  ["src/app/admin/", "the panel is Uzbek-only by design"],
  ["src/components/admin/", "the panel is Uzbek-only by design"],
  ["src/app/[locale]/styleguide/", "internal design reference, noindex"],
];

/*
  Strings that ARE user-visible and are staying. Each one needs a reason, and
  the reason has to be in the code too — a future reader hits the component
  before they hit this file.
*/
const ALLOW = [
  {
    file: "src/components/layout/accessibility-dialog.tsx",
    text: ["Shift + Tab", "Enter / Space"],
    why: "literal key names printed on the keyboard; not language",
  },
  {
    file: "src/components/sections/objects-explorer.tsx",
    text: ["Xarita yuklanmoqda…"],
    why: "next/dynamic loading fallback — renders before the component that owns the namespace mounts; see the comment there",
  },
];

/* Props whose value is read out or displayed. */
const PROPS =
  /\b(placeholder|aria-label|aria-description|alt|title|label|heading|eyebrow|caption|description|summary|tooltip|emptyText|legend|badge|cta|note|hint|closeLabel|startedLabel|emptyLabel)\s*=\s*"([^"\n]{2,})"/g;

/*
  A JSX text run: >…< , newlines allowed so prose wrapped by the formatter is
  still caught as one string.

  The lookbehind is load-bearing. Without it the `>` of an ARROW FUNCTION opens
  a match that runs to the next type argument — `=>\n document\n
  .querySelectorAll<HTMLElement>` read as the text "document .querySelectorAll".
  Real JSX text is always preceded by the `>` that closes a tag, never by `=`.
*/
const JSXTEXT = /(?<![=\-!<>])>([^<>{}]{3,300})</g;

/* Reject code that the two patterns above pick up incidentally. */
const CODEY =
  /[;=(){}[\]|&]|=>|\b(return|const|let|var|null|undefined|true|false|Promise|useRef|useState|useMemo|Array|Record|Readonly|Partial|number|string|boolean|typeof|keyof|extends|as|await|async|function|import|export|interface|type|VariantProps|ComponentProps|React)\b|\?\?|\.\w+\(|::|\$\{/;

function isProse(t) {
  if (t.length < 4) return false;
  if (!/[A-Za-zʻʼ]/.test(t)) return false;
  if (CODEY.test(t)) return false;
  // Leading comma/dot/arrow: the tail of a split type argument.
  if (/^[,.<>|&]/.test(t)) return false;
  if (/^[\d\s,.:;•—–\-+/%]+$/.test(t)) return false;
  if (/^(https?:|\/|#|@|\$|&[a-z]+;?$)/.test(t)) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    // A lone word is a label only if it is capitalised and a real word.
    return /^[A-ZʻʼĀ-ſ][A-Za-zʻʼ’]{3,}$/.test(t.replace(/&apos;|['’]/g, ""));
  }
  // A class list / path list: every token lowercase-with-punctuation.
  if (words.every((w) => /^[a-z0-9:[\]/.\-]+$/.test(w))) return false;
  // Needs at least one word of three or more letters.
  return words.some((w) => /[A-Za-zʻʼ]{3,}/.test(w));
}

/*
  Blank out comments and import lines, preserving offsets so the line numbers
  stay right. Prose inside a comment is documentation, not UI.
*/
function stripNonMarkup(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, (m) => " ".repeat(m.length))
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?$/gm, (m) =>
      " ".repeat(m.length),
    );
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const findings = [];

for (const abs of walk(path.join(ROOT, "src"))) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (SKIP_DIRS.some(([prefix]) => rel.startsWith(prefix))) continue;

  const raw = fs.readFileSync(abs, "utf8");
  const src = stripNonMarkup(raw);
  const allowed = ALLOW.filter((a) => a.file === rel).flatMap((a) => a.text);
  const seen = new Set();

  const add = (index, kind, value) => {
    const text = value.replace(/\s+/g, " ").trim();
    if (!isProse(text)) return;
    if (allowed.includes(text)) return;
    if (seen.has(text)) return;
    seen.add(text);
    findings.push({
      file: rel,
      line: src.slice(0, index).split("\n").length,
      kind,
      text: text.length > 90 ? text.slice(0, 87) + "…" : text,
    });
  };

  let m;
  PROPS.lastIndex = 0;
  while ((m = PROPS.exec(src))) add(m.index, m[1], m[2]);
  JSXTEXT.lastIndex = 0;
  while ((m = JSXTEXT.exec(src))) add(m.index, "text", m[1]);
}

if (!QUIET) {
  if (findings.length === 0) {
    console.log("No hardcoded user-visible strings found.");
  } else {
    let current = "";
    for (const f of findings.sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
    )) {
      if (f.file !== current) {
        current = f.file;
        console.log(`\n${current}`);
      }
      console.log(`  ${String(f.line).padStart(4)}  ${f.kind}: ${f.text}`);
    }
    console.log(
      `\n${findings.length} hardcoded string(s). Move them into messages/uz.json` +
        " and read them with t(); see the i18n section of CLAUDE.md.",
    );
  }
}

process.exit(findings.length === 0 ? 0 : 1);
