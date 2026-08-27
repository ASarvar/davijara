"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/admin/field";

/*
  An ordered list of paragraphs that an editor can add to, remove from and
  reorder — the seven duties, the items inside a lettered function group.

  Controlled: the parent owns the array, this renders it. Nothing here submits
  anything, because the statutory editors serialise their whole document into
  one hidden JSON field (see document-editor.tsx) rather than relying on named
  inputs — which is what makes reordering possible at all.

  MOVE BUTTONS, NOT DRAG AND DROP, for the third time in this panel and the
  same reason each time: a drag target is invisible to a keyboard, hostile on
  a touchscreen, and can drop an item somewhere nobody intended.
*/
export function StringList({
  items,
  onChange,
  label,
  addLabel = "Band qoʻshish",
  /** Statutory text runs long; a one-line input would hide most of it. */
  rows = 2,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  /** Used to build the per-row accessible names, e.g. "1-vazifa". */
  label: string;
  addLabel?: string;
  rows?: number;
}) {
  function update(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-muted-foreground mt-2.5 w-6 shrink-0 text-right font-mono text-xs tabular-nums">
            {index + 1}.
          </span>

          <TextArea
            value={item}
            rows={rows}
            onChange={(event) => update(index, event.target.value)}
            aria-label={`${index + 1}-${label}`}
            className="min-h-0"
          />

          <div className="flex shrink-0 flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`${index + 1}-${label} — yuqoriga`}
            >
              <ChevronUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              aria-label={`${index + 1}-${label} — pastga`}
            >
              <ChevronDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => remove(index)}
              /*
                The schemas require at least one item in every list, so the
                last one cannot be removed. Disabling the button says that
                before the save does.
              */
              disabled={items.length === 1}
              aria-label={`${index + 1}-${label} — oʻchirish`}
            >
              <X />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-8"
        onClick={() => onChange([...items, ""])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}
