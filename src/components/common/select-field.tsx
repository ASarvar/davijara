"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Labelled dropdown for the homepage search form.
 *
 * A shadcn/Radix `Select` rather than a native `<select>` — the trade-off
 * (see CLAUDE.md §3 and the comment this replaces in search-widget.tsx) is
 * client JS instead of a zero-JS native control, taken deliberately so the
 * open dropdown panel can carry the site's rounded/gold-bordered styling,
 * which a native `<select>` popup cannot be styled to match in Chromium.
 *
 * Radix forbids an empty-string `Select.Item` value (it's reserved for
 * "no selection" internally), so the "any/all" option uses the sentinel
 * `ALL_VALUE` instead of `""`. The GET form still submits `name=value` via
 * Radix's hidden native-select bubble input, so results stay linkable.
 */
export const ALL_VALUE = "all";

export function SelectField({
  id,
  name,
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  placeholder,
  className,
}: {
  id: string;
  /** Omit for a controlled (`value`/`onValueChange`) select outside a form. */
  name?: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  /** Controlled value — pairs with `onValueChange`, e.g. the rent calculator. */
  value?: string;
  /** Uncontrolled starting value — e.g. a GET form submitted via `name`. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** For a select whose options depend on another field not yet chosen. */
  disabled?: boolean;
  /** Shown when there is no value — e.g. the reason a select is disabled. */
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="text-muted-foreground mb-1.5 block text-xs"
      >
        {label}
      </label>

      <Select
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="border-input bg-card text-foreground hover:border-ring/50 data-[size=default]:h-11 w-full rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
