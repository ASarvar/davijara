import { mediaSrc } from "@/lib/media/src";
import type { Block } from "@/types/blocks";

/*
  Renders what an editor composed in the panel.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ NO `dangerouslySetInnerHTML` IN THIS FILE, AND NONE MAY BE ADDED.        │
  │                                                                          │
  │ Every field below is a plain string rendered as a React child, so React  │
  │ escapes it. That is the guarantee the whole block model exists to give   │
  │ (see src/types/blocks.ts): editor-supplied content on a government       │
  │ portal cannot inject markup, because no path here interprets markup.     │
  │                                                                          │
  │ The moment one `dangerouslySetInnerHTML` appears, that guarantee is gone │
  │ for the entire site — not just for the block it was added to.            │
  └──────────────────────────────────────────────────────────────────────────┘

  Styling comes from the semantic tokens, exactly as a hand-written section
  would: a heading an editor typed is indistinguishable from one in the
  source, in every theme and tone. There is no per-block colour, size or
  alignment control, and that is the feature — see CLAUDE.md non-negotiable 2.
*/

export function BlockContent({
  blocks,
  className,
}: {
  blocks: Block[];
  className?: string;
}) {
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-muted-foreground mt-4 text-pretty">{block.text}</p>
      );

    case "heading": {
      /*
        h2 or h3 only, and the level is the EDITOR'S choice rather than being
        derived from position — a document outline is a meaning, not a
        layout. The article's own <h1> is its title, so these start at 2.
      */
      const Tag = block.level === 2 ? "h2" : "h3";
      return (
        <Tag
          className={
            block.level === 2
              ? "mt-8 text-lg font-semibold text-pretty sm:text-xl"
              : "mt-6 font-semibold text-pretty"
          }
        >
          {block.text}
        </Tag>
      );
    }

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`text-muted-foreground marker:text-muted-foreground mt-4 space-y-2 pl-5 text-pretty ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Tag>
      );
    }

    case "quote":
      return (
        <figure className="border-outline mt-6 border-l-2 pl-4">
          <blockquote className="text-foreground/90 text-pretty italic">
            {block.text}
          </blockquote>
          {block.cite ? (
            <figcaption className="text-muted-foreground mt-2 text-sm">
              — {block.cite}
            </figcaption>
          ) : null}
        </figure>
      );

    case "image":
      if (!block.src) return null;
      return (
        <figure className="mt-6">
          {/*
            A raw <img>, not next/image — the same decision the article's own
            cover image already makes. The source is a route handler, so the
            optimiser would need it allow-listed in `remotePatterns`, and it
            cannot resize a response it is not allowed to fetch.

            `aspect-[16/9]` on the frame with `object-cover` inside it: a body
            image of unknown proportions must not shift the paragraphs below
            it while it loads, and the stored width/height are not carried in
            the block. This crops rather than letterboxes, which for editorial
            photography is the right trade.
          */}
          <div className="bg-secondary border-hairline aspect-[16/9] w-full overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaSrc(block.src)}
              alt={block.alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          {block.caption ? (
            <figcaption className="text-muted-foreground mt-2 text-sm text-pretty">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case "table":
      return (
        /*
          The scroll container is on the WRAPPER, not the table. A wide table
          must scroll inside its own box; letting it widen the page instead
          gives every other paragraph a horizontal scrollbar, which on a phone
          is how a page becomes unreadable.
        */
        <div className="border-hairline mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-secondary">
                {block.headers.map((header, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-hairline border-b px-3 py-2 text-left font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-hairline border-b last:border-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="text-muted-foreground px-3 py-2 text-pretty"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
