"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/*
  The one confirm() dialog in this whole admin panel.

  Every other delete action here (news, pages, privileges) relies on the
  audit log for recovery rather than an inline confirmation, and that is a
  deliberate, consistent choice elsewhere in this codebase. This button
  breaks that pattern on purpose: deleting a built-in menu that still shows
  "0 sahifa biriktirilgan" used to look completely harmless, because the
  panel did not show what was actually inside it. That gap made it possible
  to delete a section carrying real, published statutory pages — "Ochiq
  maʼlumotlar" and its five disclosure pages disappeared from the header
  this way — without the operator seeing what they were about to remove. The
  panel now shows those pages too (see BuiltinRow in page.tsx), but a second
  line of defence for the specific case that already caused real harm is
  worth the inconsistency.

  Only fires for a row that HAS built-in children — an operator-created menu
  with nothing but panel-attached pages goes through the plain form still,
  exactly like every other delete on this site.
*/
export function DeleteMenuButton({
  label,
  childLabels,
}: {
  label: string;
  childLabels: string[];
}) {
  if (!childLabels.length) {
    return (
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        aria-label={`${label} menyusini oʻchirish`}
      >
        <Trash2 />
        Oʻchirish
      </Button>
    );
  }

  const message =
    `"${label}" menyusini oʻchirmoqchimisiz?\n\n` +
    `Bu menyudan quyidagi ${childLabels.length} ta saytning oʻz sahifasi ` +
    `yuqori menyudan yoʻqoladi (sahifalarning oʻzi manzilida qolaveradi, ` +
    `faqat menyudan chiqib ketadi):\n\n` +
    childLabels.map((child) => `• ${child}`).join("\n") +
    `\n\nDavom etasizmi?`;

  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      aria-label={`${label} menyusini oʻchirish`}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <Trash2 />
      Oʻchirish
    </Button>
  );
}
