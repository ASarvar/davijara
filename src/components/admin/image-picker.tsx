"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, Images, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/admin/field";
import { mediaSrc } from "@/lib/media/src";
import {
  ACCEPT_ATTRIBUTE,
  formatBytes,
  MAX_UPLOAD_BYTES,
  type MediaItem,
} from "@/lib/media/types";
import {
  deleteImageAction,
  listImagesAction,
  uploadImageAction,
} from "@/app/admin/(panel)/media-actions";

/*
  Choosing the picture for an article.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE UPLOAD IS NOT PART OF THE SURROUNDING FORM.                          │
  │                                                                          │
  │ It cannot be: <form> elements do not nest, and the news editor is        │
  │ already a form. So the file is sent by calling the Server Action         │
  │ DIRECTLY with a FormData built here, and what the outer form submits is  │
  │ a hidden text field holding the resulting path.                          │
  │                                                                          │
  │ That separation is also what an editor wants. The image is stored the    │
  │ moment they pick it, so they see it immediately and a failed upload      │
  │ (wrong type, too large) is reported on its own instead of surfacing      │
  │ half an hour later when they press Save on the whole article.            │
  └──────────────────────────────────────────────────────────────────────────┘

  A picture on a news card is decorative rather than informative — the
  headline beside it carries the meaning — so `alt=""` on the public side is
  correct and the alt field here is deliberately optional. It is offered for
  the case where the image DOES carry information (a scanned notice, a chart).
*/

/*
  Two call sites want two different things out of this, so it does both:

    the news form  — needs the chosen path submitted with the surrounding
                     form, and passes `name` to get a hidden input;
    a block        — needs the value in the block editor's own React state,
                     and passes `onPick`; the blocks array is what submits.

  `initialValue` seeds the internal state either way, so a block whose image
  is replaced re-renders from the same source the parent already holds.
*/
export function ImagePicker({
  name,
  initialValue,
  onPick,
}: {
  /** Set to also submit the value as a hidden field of the enclosing form. */
  name?: string;
  initialValue: string;
  /** Called whenever the selection changes, including when it is cleared. */
  onPick?: (value: string) => void;
}) {
  const [value, setValueState] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const [busy, startTransition] = useTransition();
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function setValue(next: string) {
    setValueState(next);
    onPick?.(next);
  }

  function upload(file: File) {
    setError(null);

    /*
      Checked here as well as on the server. Not a security control — the
      server re-checks and is the only thing that counts — but a 5 MB upload
      that travels all the way to the box before being refused wastes the
      editor's time and the server's bandwidth for an answer available
      instantly.
    */
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `Fayl juda katta (${formatBytes(file.size)}). Eng koʻpi ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadImageAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.uploaded) {
        setValue(result.uploaded.path);
        setLibrary(null);
      }
    });
  }

  function openLibrary() {
    setError(null);
    startTransition(async () => {
      setLibrary(await listImagesAction());
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteImageAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLibrary((prev) => prev?.filter((m) => m.id !== id) ?? null);
      if (value.endsWith(id)) setValue("");
    });
  }

  return (
    <div className="space-y-3">
      {name ? <input type="hidden" name={name} value={value} /> : null}

      {error ? <FormError>{error}</FormError> : null}

      {value ? (
        <div className="border-border bg-card flex items-start gap-3 rounded-lg border p-3">
          {/*
            eslint-disable: next/image cannot be used here. The source is a
            route handler on a path this component builds at runtime, and the
            optimiser would need it in `remotePatterns` — for an admin preview
            that is loaded once, by one person, at the size it already is.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc(value)}
            alt=""
            className="bg-secondary h-20 w-32 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs break-all">{value}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setValue("")}
            >
              <X />
              Olib tashlash
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            /*
              Reset the input, or picking the SAME file twice in a row fires
              no change event and the second attempt appears to do nothing.
            */
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <ImageUp />
          {busy ? "Yuklanmoqda…" : "Rasm yuklash"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => (library ? setLibrary(null) : openLibrary())}
        >
          <Images />
          {library ? "Yopish" : "Yuklangan rasmlar"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        JPEG, PNG, WebP, GIF yoki AVIF. Eng koʻpi{" "}
        {formatBytes(MAX_UPLOAD_BYTES)}.
      </p>

      {library ? (
        library.length === 0 ? (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
            Hozircha yuklangan rasm yoʻq.
          </p>
        ) : (
          <ul className="border-hairline grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-4">
            {library.map((item) => (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setValue(`/api/media/${item.id}`);
                    setLibrary(null);
                  }}
                  className="focus-visible:ring-ring block w-full overflow-hidden rounded outline-none focus-visible:ring-2"
                  title={`${item.originalName} · ${formatBytes(item.bytes)}${
                    item.width ? ` · ${item.width}×${item.height}` : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaSrc(`/api/media/${item.id}`)}
                    alt=""
                    className="bg-secondary h-20 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-1 right-1"
                  onClick={() => remove(item.id)}
                  aria-label={`${item.originalName} rasmini oʻchirish`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
