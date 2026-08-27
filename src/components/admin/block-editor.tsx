"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextArea, TextInput } from "@/components/admin/field";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  BLOCK_LABELS,
  emptyBlock,
  type Block,
  type BlockType,
} from "@/types/blocks";

/*
  The block editor.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE STATE LIVES HERE; THE FORM SUBMITS ONE HIDDEN JSON FIELD.            │
  │                                                                          │
  │ Every keystroke updates a React array, and a single <input type="hidden">│
  │ carries `JSON.stringify(blocks)` to the Server Action. The alternative — │
  │ named inputs per block, decoded from FormData — needs an index encoded   │
  │ into every field name and falls apart the moment a block is reordered.   │
  │                                                                          │
  │ The Server Action re-validates the JSON with `blocksSchema` regardless.  │
  │ This component is a convenience for a person, never a guarantee about    │
  │ what arrives: a hidden field is as editable as any other by anyone who   │
  │ opens devtools.                                                          │
  └──────────────────────────────────────────────────────────────────────────┘

  NO DRAG AND DROP. Move up / move down buttons instead, on purpose: drag
  targets are hard to hit, invisible to keyboard users, and hostile on a
  touchscreen. Two buttons are reorderable by anyone, work with a screen
  reader, and cannot drop a block somewhere unintended.
*/

const ADDABLE: BlockType[] = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "image",
  "table",
];

export function BlockEditor({
  name,
  initial,
}: {
  /** Name of the hidden field carrying the JSON. */
  name: string;
  initial: Block[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const baseId = useId();

  function update(index: number, next: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function remove(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function add(type: BlockType) {
    setBlocks((prev) => [...prev, emptyBlock(type)]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 ? (
        <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Matn hali qoʻshilmagan. Quyidan blok tanlang.
        </p>
      ) : null}

      {blocks.map((block, index) => (
        <div
          key={`${baseId}-${index}`}
          className="border-border bg-card rounded-lg border p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {BLOCK_LABELS[block.type]}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${index + 1}-blokni yuqoriga koʻchirish`}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => move(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label={`${index + 1}-blokni pastga koʻchirish`}
              >
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => remove(index)}
                aria-label={`${index + 1}-blokni oʻchirish`}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <BlockFields
            block={block}
            onChange={(next) => update(index, next)}
            idPrefix={`${baseId}-${index}`}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        {ADDABLE.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add(type)}
          >
            <Plus />
            {BLOCK_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
  idPrefix,
}: {
  block: Block;
  onChange: (next: Block) => void;
  idPrefix: string;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <TextArea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Xatboshi matni"
          aria-label="Xatboshi matni"
        />
      );

    case "heading":
      return (
        <div className="flex gap-2">
          {/*
            Level as two radio-like buttons rather than a <select>: there are
            exactly two choices, and both are visible at a glance.
          */}
          <div
            role="group"
            aria-label="Sarlavha darajasi"
            className="flex shrink-0 gap-1"
          >
            {([2, 3] as const).map((level) => (
              <Button
                key={level}
                type="button"
                variant={block.level === level ? "secondary" : "outline"}
                size="sm"
                aria-pressed={block.level === level}
                onClick={() => onChange({ ...block, level })}
              >
                H{level}
              </Button>
            ))}
          </div>
          <TextInput
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Sarlavha matni"
            aria-label="Sarlavha matni"
          />
        </div>
      );

    case "list":
      return (
        <div className="space-y-2">
          <div role="group" aria-label="Roʻyxat turi" className="flex gap-1">
            <Button
              type="button"
              variant={block.ordered ? "outline" : "secondary"}
              size="sm"
              aria-pressed={!block.ordered}
              onClick={() => onChange({ ...block, ordered: false })}
            >
              • Belgili
            </Button>
            <Button
              type="button"
              variant={block.ordered ? "secondary" : "outline"}
              size="sm"
              aria-pressed={block.ordered}
              onClick={() => onChange({ ...block, ordered: true })}
            >
              1. Raqamli
            </Button>
          </div>

          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <TextInput
                value={item}
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((v, j) =>
                      j === i ? e.target.value : v,
                    ),
                  })
                }
                placeholder={`${i + 1}-band`}
                aria-label={`${i + 1}-band`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={block.items.length === 1}
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, j) => j !== i),
                  })
                }
                aria-label={`${i + 1}-bandni oʻchirish`}
              >
                <X />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...block, items: [...block.items, ""] })}
          >
            <Plus />
            Band qoʻshish
          </Button>
        </div>
      );

    case "quote":
      return (
        <div className="space-y-2">
          <TextArea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Iqtibos matni"
            aria-label="Iqtibos matni"
          />
          <TextInput
            value={block.cite ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                /*
                  Empty string becomes undefined, so an untouched field does
                  not store `cite: ""` — which would render an em-dash with
                  nothing after it.
                */
                cite: e.target.value.trim() === "" ? undefined : e.target.value,
              })
            }
            placeholder="Kim aytgan (ixtiyoriy)"
            aria-label="Iqtibos muallifi"
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-2">
          <ImagePicker
            name={`${idPrefix}-src`}
            initialValue={block.src}
            onPick={(src) => onChange({ ...block, src })}
          />
          <TextInput
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Rasm tavsifi — koʻrmaydiganlar uchun"
            aria-label="Rasm tavsifi"
          />
          <TextInput
            value={block.caption ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                caption:
                  e.target.value.trim() === "" ? undefined : e.target.value,
              })
            }
            placeholder="Rasm ostidagi izoh (ixtiyoriy)"
            aria-label="Rasm ostidagi izoh"
          />
        </div>
      );

    case "table":
      return <TableFields block={block} onChange={onChange} id={idPrefix} />;
  }
}

function TableFields({
  block,
  onChange,
  id,
}: {
  block: Extract<Block, { type: "table" }>;
  onChange: (next: Block) => void;
  id: string;
}) {
  const columns = block.headers.length;

  /*
    Adding or removing a COLUMN has to rewrite every row, or the rows and the
    headers drift out of step and the rendered table grows ragged edges. Both
    operations below rebuild the rows to match, which is why they are here
    rather than inline in the JSX.
  */
  function setColumns(next: number) {
    if (next < 1 || next > 8) return;
    onChange({
      ...block,
      headers: Array.from({ length: next }, (_, i) => block.headers[i] ?? ""),
      rows: block.rows.map((row) =>
        Array.from({ length: next }, (_, i) => row[i] ?? ""),
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Ustunlar:</span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => setColumns(columns - 1)}
          disabled={columns <= 1}
          aria-label="Ustunni kamaytirish"
        >
          −
        </Button>
        <span className="text-sm tabular-nums">{columns}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => setColumns(columns + 1)}
          disabled={columns >= 8}
          aria-label="Ustun qoʻshish"
        >
          +
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {block.headers.map((header, i) => (
                <th key={i} className="p-1">
                  <TextInput
                    value={header}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        headers: block.headers.map((v, j) =>
                          j === i ? e.target.value : v,
                        ),
                      })
                    }
                    placeholder={`${i + 1}-ustun`}
                    aria-label={`${i + 1}-ustun sarlavhasi`}
                    className="font-semibold"
                  />
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c} className="p-1">
                    <TextInput
                      value={row[c] ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          rows: block.rows.map((rr, j) =>
                            j === r
                              ? rr.map((v, k) => (k === c ? e.target.value : v))
                              : rr,
                          ),
                        })
                      }
                      aria-label={`${r + 1}-qator, ${c + 1}-ustun`}
                    />
                  </td>
                ))}
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      onChange({
                        ...block,
                        rows: block.rows.filter((_, j) => j !== r),
                      })
                    }
                    aria-label={`${r + 1}-qatorni oʻchirish`}
                  >
                    <X />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        id={`${id}-add-row`}
        onClick={() =>
          onChange({
            ...block,
            rows: [...block.rows, Array.from({ length: columns }, () => "")],
          })
        }
      >
        <Plus />
        Qator qoʻshish
      </Button>
    </div>
  );
}
